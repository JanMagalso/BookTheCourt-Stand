import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { createSupabaseServiceClient, hasSupabaseEnv } from "@/lib/supabase";

const BOOKING_PROOF_BUCKET = "booking-proofs";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

type BookingBlock = {
  courtId: string;
  startTime: string;
  endTime: string;
  hourlyRatePhp?: number;
};

type BookingRequestPayload = {
  reservationName: string;
  fullName: string;
  contactNumber: string;
  contactEmail: string;
  playDate: string;
  paymentMethod: string;
  paymentReference: string;
  notes: string;
  acceptedTerms: boolean;
  selectedBlocks: BookingBlock[];
  holdIds: string[];
};

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable bookings.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const payload = parseBookingPayload(formData);
  const paymentProofFile = getPaymentProofFile(formData);

  if (!isValidPayload(payload)) {
    return NextResponse.json(
      { error: "Please complete the booking details before continuing." },
      { status: 400 },
    );
  }

  if (payload.selectedBlocks.some((block) => isPastSlot(payload.playDate, block.startTime))) {
    return NextResponse.json(
      { error: "One or more selected slots are no longer available because their start time has passed." },
      { status: 409 },
    );
  }

  if (!paymentProofFile) {
    return NextResponse.json(
      { error: "Please upload your payment screenshot before submitting." },
      { status: 400 },
    );
  }

  const paymentValidation = validatePaymentProof(paymentProofFile);
  if (!paymentValidation.ok) {
    return NextResponse.json({ error: paymentValidation.error }, { status: 400 });
  }

  try {
    const supabaseAdmin = createSupabaseServiceClient();
    const fallbackPlayerId = await resolveFallbackPlayerId(supabaseAdmin);
    const warehouseId = await resolveWarehouseId(supabaseAdmin, payload.selectedBlocks);

    if (!fallbackPlayerId) {
      return NextResponse.json(
        { error: "No valid player profile is available for guest bookings yet." },
        { status: 500 },
      );
    }

    if (!warehouseId) {
      return NextResponse.json(
        { error: "One or more selected courts are no longer available." },
        { status: 400 },
      );
    }

    const uploadResult = await uploadBookingProof({
      supabaseAdmin,
      warehouseId,
      courtId: payload.selectedBlocks[0]?.courtId ?? "batch",
      file: paymentProofFile,
    });

    if (!uploadResult.ok) {
      return NextResponse.json({ error: uploadResult.error }, { status: 400 });
    }

    const bookingMutation = buildBookingMutation(payload, uploadResult);
    const bookingRows =
      payload.holdIds.length > 0
        ? await updateHeldBookings(supabaseAdmin, payload.holdIds, bookingMutation)
        : await insertPendingBookings(supabaseAdmin, payload, bookingMutation, fallbackPlayerId);

    if (!bookingRows.ok) {
      return NextResponse.json(
        { error: bookingRows.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Booking submitted. Payment proof uploaded and pending verification.",
      bookings: bookingRows.bookings.map((booking) => ({
        id: booking.id,
        bookingReference: String(booking.id).slice(0, 8).toUpperCase(),
        reservationName: booking.reservation_name ?? payload.reservationName,
        courtId: booking.court_id,
        startsAt: formatTimeForSchedule(booking.starts_at),
        endsAt: formatTimeForSchedule(booking.ends_at),
        status: "pending",
        holdExpiresAt: null,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Booking failed due to server configuration." },
      { status: 500 },
    );
  }
}

function parseBookingPayload(formData: FormData): BookingRequestPayload {
  return {
    reservationName: String(formData.get("reservationName") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    contactNumber: String(formData.get("contactNumber") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    playDate: String(formData.get("playDate") ?? "").trim(),
    paymentMethod: String(formData.get("paymentMethod") ?? "gcash").trim() || "gcash",
    paymentReference: String(formData.get("paymentReference") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    acceptedTerms: String(formData.get("acceptedTerms") ?? "") === "true",
    selectedBlocks: parseSelectedBlocks(String(formData.get("selectedBlocks") ?? "")),
    holdIds: parseHoldIds(String(formData.get("holdIds") ?? "")),
  };
}

function parseSelectedBlocks(raw: string) {
  if (!raw.trim()) {
    return [] as BookingBlock[];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [] as BookingBlock[];
    }

    return parsed
      .map((item) => ({
        courtId: String(item?.courtId ?? "").trim(),
        startTime: String(item?.startTime ?? "").trim(),
        endTime: String(item?.endTime ?? "").trim(),
        hourlyRatePhp: Number(item?.hourlyRatePhp ?? 0) || undefined,
      }))
      .filter((item) => item.courtId && item.startTime && item.endTime);
  } catch {
    return [] as BookingBlock[];
  }
}

function getPaymentProofFile(formData: FormData) {
  const file = formData.get("paymentProof");
  return file instanceof File && file.size > 0 ? file : null;
}

function parseHoldIds(raw: string) {
  if (!raw.trim()) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((value) => String(value)).filter(Boolean) : [];
  } catch {
    return [] as string[];
  }
}

function isValidPayload(payload: BookingRequestPayload) {
  return (
    Boolean(payload.reservationName) &&
    Boolean(payload.fullName) &&
    (Boolean(payload.contactNumber) || Boolean(payload.contactEmail)) &&
    Boolean(payload.playDate) &&
    payload.acceptedTerms === true &&
    payload.selectedBlocks.length > 0
  );
}

function validatePaymentProof(file: File) {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { ok: false as const, error: "Payment screenshot must be 5MB or below." };
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false as const, error: "Only PNG, JPG, and WEBP screenshots are allowed." };
  }

  return { ok: true as const };
}

async function resolveWarehouseId(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  blocks: BookingBlock[],
) {
  const courtIds = Array.from(new Set(blocks.map((block) => block.courtId)));
  const { data: courts, error } = await supabaseAdmin
    .from("courts")
    .select("id, warehouse_id")
    .in("id", courtIds);

  if (error || !courts?.length || courts.length !== courtIds.length) {
    return null;
  }

  const warehouseIds = Array.from(new Set(courts.map((court) => String(court.warehouse_id ?? ""))));
  return warehouseIds.length === 1 ? warehouseIds[0] : null;
}

async function ensureBookingProofBucket(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
) {
  const { data: existingBucket, error: existingBucketError } = await supabaseAdmin.storage.getBucket(
    BOOKING_PROOF_BUCKET,
  );

  if (!existingBucketError && existingBucket?.id) {
    return;
  }

  const { error: createBucketError } = await supabaseAdmin.storage.createBucket(BOOKING_PROOF_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_SIZE_BYTES,
    allowedMimeTypes: [...ALLOWED_IMAGE_TYPES],
  });

  if (createBucketError && !createBucketError.message.toLowerCase().includes("already exists")) {
    throw new Error(createBucketError.message);
  }
}

async function uploadBookingProof(input: {
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>;
  warehouseId: string;
  courtId: string;
  file: File;
}) {
  try {
    await ensureBookingProofBucket(input.supabaseAdmin);
  } catch {
    return { ok: false as const, error: "Unable to prepare payment upload. Please try again." };
  }

  const extension = sanitizeFileName(input.file.name.split(".").pop() || "jpg");
  const safeBaseName = sanitizeFileName(input.file.name.replace(/\.[^/.]+$/, "") || "payment");
  const objectPath = `warehouses/${input.warehouseId}/courts/${input.courtId}/${Date.now()}_${randomUUID()}_${safeBaseName}.${extension}`;
  const bytes = Buffer.from(await input.file.arrayBuffer());

  const { error: uploadError } = await input.supabaseAdmin.storage
    .from(BOOKING_PROOF_BUCKET)
    .upload(objectPath, bytes, {
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false as const, error: "Unable to upload payment screenshot." };
  }

  const { data } = input.supabaseAdmin.storage.from(BOOKING_PROOF_BUCKET).getPublicUrl(objectPath);
  return {
    ok: true as const,
    paymentReceiptUrl: data.publicUrl,
    paymentReceiptPath: objectPath,
  };
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

function buildBookingMutation(
  payload: BookingRequestPayload,
  uploadResult: { paymentReceiptUrl: string; paymentReceiptPath: string },
) {
  return {
    reservation_name: payload.reservationName,
    status: "pending",
    payment_method: payload.paymentMethod,
    payment_reference: payload.paymentReference || null,
    payment_receipt_url: uploadResult.paymentReceiptUrl,
    payment_receipt_path: uploadResult.paymentReceiptPath,
    paid_at: new Date().toISOString(),
    reservation_contact_email: payload.contactEmail || null,
    reservation_contact_phone: payload.contactNumber,
    reservation_notes: [payload.fullName, payload.notes].filter(Boolean).join(" | "),
    hold_expires_at: null,
  };
}

async function updateHeldBookings(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  holdIds: string[],
  mutation: Record<string, unknown>,
) {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update(mutation)
    .in("id", holdIds)
    .select("id, court_id, reservation_name, starts_at, ends_at, status");

  if (error || !data?.length) {
    return { ok: false as const, error: "The held booking could not be finalized." };
  }

  return { ok: true as const, bookings: data };
}

async function insertPendingBookings(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  payload: BookingRequestPayload,
  mutation: Record<string, unknown>,
  fallbackPlayerId: string,
) {
  const rows = payload.selectedBlocks.map((block) => {
    const hourlyRatePhp = block.hourlyRatePhp ?? 400;
    const startsAt = toBookingTimestamp(payload.playDate, block.startTime);
    const endsAt = toBookingTimestamp(payload.playDate, block.endTime);
    const durationHours = diffHours(block.startTime, block.endTime);

    return {
      court_id: block.courtId,
      player_id: fallbackPlayerId,
      starts_at: startsAt,
      ends_at: endsAt,
      applied_hourly_rate_php: hourlyRatePhp,
      applied_subtotal_php: hourlyRatePhp * durationHours,
      ...mutation,
    };
  });

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert(rows)
    .select("id, court_id, reservation_name, starts_at, ends_at, status");

  if (error || !data?.length) {
    if (error) {
      console.error("booking-requests insert failed", error);
    }
    return { ok: false as const, error: "The booking could not be saved to Supabase yet." };
  }

  return { ok: true as const, bookings: data };
}

async function resolveFallbackPlayerId(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
) {
  const preferredId = process.env.BOOKING_GUEST_PLAYER_ID?.trim();

  if (preferredId) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", preferredId)
      .maybeSingle();

    if (data?.id) {
      return data.id;
    }
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "player")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

function toBookingTimestamp(playDate: string, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const baseDate = new Date(`${playDate}T00:00:00+08:00`);
  baseDate.setHours(hours, minutes, 0, 0);
  return baseDate.toISOString();
}

function formatTimeForSchedule(value: string) {
  const date = new Date(value);

  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function diffHours(start: string, end: string) {
  const [startHours, startMinutes] = start.split(":").map(Number);
  const [endHours, endMinutes] = end.split(":").map(Number);
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;
  return Math.max(1, (endTotal - startTotal) / 60);
}

function isPastSlot(playDate: string, startTime: string) {
  const current = getCurrentScheduleContext();

  if (playDate < current.dateKey) {
    return true;
  }

  if (playDate > current.dateKey) {
    return false;
  }

  return timeToMinutes(startTime) < current.minutes;
}

function getCurrentScheduleContext() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const dateKey = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));

  return { dateKey, minutes };
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
