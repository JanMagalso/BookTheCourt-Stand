import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import {
  DEFAULT_BOOKING_WINDOW_DAYS,
  formatBookingWindowRestrictionMessage,
  normalizeBookingWindowDays,
} from "@/lib/booking-window";
import { toManilaBookingTimestamp } from "@/lib/booking-time";
import { isWithinOnlineBookingWindow } from "@/lib/facility-status-overrides";
import { buildReceiptId } from "@/lib/receipt";
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
  authAccessToken: string;
  playDate: string;
  paymentMethod: string;
  paymentReference: string;
  notes: string;
  acceptedTerms: boolean;
  selectedBlocks: BookingBlock[];
  holdIds: string[];
};

type OwnerNotificationInput = {
  warehouseId: string;
  receiptId: string;
  payload: BookingRequestPayload;
  bookings: Array<{
    id: string;
    court_id: string;
    reservation_name: string | null;
    starts_at: string;
    ends_at: string;
    status: string;
  }>;
  paymentReceiptUrl: string;
};

type OwnerInboxNotificationInput = {
  payload: BookingRequestPayload;
  bookings: Array<{
    id: string;
    court_id: string;
    reservation_name: string | null;
    starts_at: string;
    ends_at: string;
    status: string;
  }>;
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
    const playerResult = await resolveBookingPlayerId(
      supabaseAdmin,
      payload.authAccessToken,
    );
    const warehouseId = await resolveWarehouseId(supabaseAdmin, payload.selectedBlocks);

    if (!playerResult.playerId) {
      return NextResponse.json(
        {
          error:
            playerResult.error ??
            "No valid player profile is available for guest bookings yet.",
        },
        { status: playerResult.error ? 401 : 500 },
      );
    }

    if (!warehouseId) {
      return NextResponse.json(
        { error: "One or more selected courts are no longer available." },
        { status: 400 },
      );
    }

    const bookingWindowDays = await resolveWarehouseBookingWindowDays(
      supabaseAdmin,
      warehouseId,
    );
    if (
      payload.selectedBlocks.some((block) =>
        !isWithinOnlineBookingWindow(
          new Date(toManilaBookingTimestamp(payload.playDate, block.startTime)),
          new Date(),
          bookingWindowDays,
        ),
      )
    ) {
      return NextResponse.json(
        {
          error: formatBookingWindowRestrictionMessage(bookingWindowDays),
        },
        { status: 409 },
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
        ? await updateHeldBookings(
            supabaseAdmin,
            payload.holdIds,
            bookingMutation,
            playerResult.playerId,
          )
        : await insertPendingBookings(
            supabaseAdmin,
            payload,
            bookingMutation,
            playerResult.playerId,
          );

    if (!bookingRows.ok) {
      return NextResponse.json(
        { error: bookingRows.error },
        { status: 500 },
      );
    }

    await createOwnerInboxNotifications(supabaseAdmin, {
      payload,
      bookings: bookingRows.bookings,
    });

    const receiptId = buildReceiptId({
      playerId: playerResult.playerId,
      paymentReference: payload.paymentReference,
      bookingIds: bookingRows.bookings.map((booking) => String(booking.id)),
    });

    await persistBookingReference(
      supabaseAdmin,
      bookingRows.bookings.map((booking) => String(booking.id)),
      receiptId,
    );

    void sendOwnerBookingNotification(supabaseAdmin, {
      warehouseId,
      receiptId,
      payload,
      bookings: bookingRows.bookings,
      paymentReceiptUrl: uploadResult.paymentReceiptUrl,
    }).catch((error) => {
      console.error("owner booking notification failed", error);
    });

    return NextResponse.json({
      message: "Booking submitted. Payment proof uploaded and pending verification.",
      receiptId,
      bookings: bookingRows.bookings.map((booking) => ({
        id: booking.id,
        bookingReference: receiptId,
        reservationName: booking.reservation_name ?? payload.reservationName,
        courtId: booking.court_id,
        startsAt: formatTimeForSchedule(booking.starts_at),
        endsAt: formatTimeForSchedule(booking.ends_at),
        startMinuteOffset: getMinuteOffsetForSchedule(
          payload.playDate,
          booking.starts_at,
        ),
        endMinuteOffset: getMinuteOffsetForSchedule(
          payload.playDate,
          booking.ends_at,
        ),
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

function getOwnerNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeOwnerCourtList(courtNames: string[]) {
  const unique = Array.from(
    new Set(courtNames.map((value) => value.trim()).filter(Boolean)),
  );

  if (!unique.length) {
    return "their courts";
  }

  if (unique.length === 1) {
    return unique[0]!;
  }

  if (unique.length === 2) {
    return `${unique[0]} and ${unique[1]}`;
  }

  return `${unique.slice(0, -1).join(", ")}, and ${unique.at(-1)}`;
}

async function createOwnerInboxNotifications(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  input: OwnerInboxNotificationInput,
) {
  const courtIds = Array.from(
    new Set(input.bookings.map((booking) => String(booking.court_id ?? ""))),
  ).filter(Boolean);

  const { data: courts, error: courtsError } = courtIds.length
    ? await supabaseAdmin.from("courts").select("id,name,owner_id").in("id", courtIds)
    : { data: [], error: null };

  if (courtsError) {
    console.error("owner inbox notification court lookup failed", courtsError);
    return;
  }

  const courtById = new Map(
    (courts ?? []).map((court) => [
      String(court.id),
      {
        ownerId: String(court.owner_id ?? "").trim(),
        name: String(court.name ?? "").trim(),
      },
    ]),
  );

  const groupedByOwner = new Map<
    string,
    { courtNames: string[]; slotCount: number; earliestStart: string }
  >();

  for (const booking of input.bookings) {
    const court = courtById.get(String(booking.court_id ?? ""));
    const ownerId = court?.ownerId ?? "";

    if (!ownerId) {
      continue;
    }

    const current = groupedByOwner.get(ownerId);
    if (!current) {
      groupedByOwner.set(ownerId, {
        courtNames: court?.name ? [court.name] : [],
        slotCount: 1,
        earliestStart: booking.starts_at,
      });
      continue;
    }

    current.slotCount += 1;
    if (court?.name) {
      current.courtNames.push(court.name);
    }
    if (new Date(booking.starts_at).getTime() < new Date(current.earliestStart).getTime()) {
      current.earliestStart = booking.starts_at;
    }
  }

  const playerLabel = input.payload.reservationName.trim() || input.payload.fullName.trim() || "A player";
  const paymentReference = input.payload.paymentReference.trim();
  const rows = Array.from(groupedByOwner.entries()).map(([ownerId, group]) => ({
    owner_id: ownerId,
    type: "booking_submitted",
    title: "New reservation submitted",
    message: `${playerLabel} submitted ${group.slotCount} slot${
      group.slotCount === 1 ? "" : "s"
    } for ${normalizeOwnerCourtList(group.courtNames)} on ${getOwnerNotificationDate(
      group.earliestStart,
    )}${paymentReference ? ` (Ref: ${paymentReference})` : ""}.`,
    action_href: paymentReference
      ? `/owner/bookings?q=${encodeURIComponent(paymentReference)}`
      : "/owner/bookings?tab=pending",
  }));

  if (!rows.length) {
    return;
  }

  const { error } = await supabaseAdmin.from("owner_notifications").insert(rows);

  if (error && !error.message.toLowerCase().includes("owner_notifications")) {
    console.error("owner inbox notification insert failed", error);
  }
}

function parseBookingPayload(formData: FormData): BookingRequestPayload {
  return {
    reservationName: String(formData.get("reservationName") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    contactNumber: String(formData.get("contactNumber") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    authAccessToken: String(formData.get("authAccessToken") ?? "").trim(),
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

async function sendOwnerBookingNotification(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  input: OwnerNotificationInput,
) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.OWNER_NOTIFICATION_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim();

  if (!resendApiKey || !fromEmail) {
    return;
  }

  const { data: warehouse } = await supabaseAdmin
    .from("warehouses")
    .select("id,name,contact_email")
    .eq("id", input.warehouseId)
    .maybeSingle();

  const recipientEmail = String(warehouse?.contact_email ?? "").trim();
  if (!recipientEmail) {
    return;
  }

  const courtIds = Array.from(
    new Set(input.bookings.map((booking) => String(booking.court_id ?? ""))),
  ).filter(Boolean);

  const { data: courts } = courtIds.length
    ? await supabaseAdmin.from("courts").select("id,name").in("id", courtIds)
    : { data: [] as Array<{ id: string; name: string | null }> };

  const courtNameById = new Map(
    (courts ?? []).map((court) => [court.id, court.name ?? "Court"]),
  );

  const venueName = String(warehouse?.name ?? "BookTheCourt Venue").trim();
  const bookingReference = input.receiptId;

  const slots = input.bookings.map((booking) => {
    const courtName =
      courtNameById.get(String(booking.court_id ?? "")) ?? "Court";
    const matchingBlock = input.payload.selectedBlocks.find(
      (block) =>
        block.courtId === String(booking.court_id ?? "") &&
        block.startTime === formatTimeForSchedule(booking.starts_at),
    );
    const subtotalPhp =
      (matchingBlock?.hourlyRatePhp ?? 400) *
      diffHours(
        formatTimeForSchedule(booking.starts_at),
        formatTimeForSchedule(booking.ends_at),
      );

    return {
      courtName,
      dateTime: formatOwnerEmailDateTimeRange(
        booking.starts_at,
        booking.ends_at,
      ),
      subtotalPhp,
    };
  });
  const totalPhp = slots.reduce((total, slot) => total + slot.subtotalPhp, 0);
  const reservationDate = input.bookings[0]
    ? formatOwnerEmailDate(input.bookings[0].starts_at)
    : formatOwnerEmailDate(`${input.payload.playDate}T00:00:00+08:00`);
  const logoContent = await getOwnerEmailLogoContent();

  const subject = `New reservation pending for ${venueName} (${bookingReference})`;
  const text = [
    "A new reservation has been submitted and is pending owner approval.",
    "",
    `Venue: ${venueName}`,
    `Booking reference: ${bookingReference}`,
    `Reservation name: ${input.payload.reservationName}`,
    `Contact email: ${input.payload.contactEmail || "Not provided"}`,
    `Contact number: ${input.payload.contactNumber || "Not provided"}`,
    `Payment method: ${input.payload.paymentMethod || "Not provided"}`,
    `Payment reference: ${input.payload.paymentReference || "Not provided"}`,
    "Status: Pending",
    "",
    "Selected slots:",
    ...(slots.length
      ? slots.map(
          (slot) =>
            `${slot.courtName}: ${slot.dateTime} — ${formatOwnerEmailCurrency(slot.subtotalPhp)}`,
        )
      : ["No slots listed"]),
    "",
    `Total submitted: ${formatOwnerEmailCurrency(totalPhp)}`,
    "",
    `Payment proof: ${input.paymentReceiptUrl}`,
  ].join("\n");

  const html = buildOwnerBookingEmail({
    venueName,
    bookingReference,
    reservationDate,
    reservationName: input.payload.reservationName,
    contactEmail: input.payload.contactEmail || "Not provided",
    contactNumber: input.payload.contactNumber || "Not provided",
    paymentMethod: formatOwnerEmailPaymentMethod(input.payload.paymentMethod),
    paymentReference: input.payload.paymentReference || "Not provided",
    paymentReceiptUrl: input.paymentReceiptUrl,
    slots,
    totalPhp,
    hasLogo: Boolean(logoContent),
  });

  const replyTo =
    input.payload.contactEmail || process.env.OWNER_NOTIFICATION_REPLY_TO?.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipientEmail],
      subject,
      text,
      html,
      ...(logoContent
        ? {
            attachments: [
              {
                content: logoContent,
                filename: "facility-logo.png",
                content_id: "facility-logo",
                content_type: "image/png",
              },
            ],
          }
        : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Resend API returned ${response.status}${errorText ? `: ${errorText}` : ""}`,
    );
  }
}

function buildOwnerBookingEmail(input: {
  venueName: string;
  bookingReference: string;
  reservationDate: string;
  reservationName: string;
  contactEmail: string;
  contactNumber: string;
  paymentMethod: string;
  paymentReference: string;
  paymentReceiptUrl: string;
  slots: Array<{
    courtName: string;
    dateTime: string;
    subtotalPhp: number;
  }>;
  totalPhp: number;
  hasLogo: boolean;
}) {
  const logoMarkup = input.hasLogo
    ? `<img src="cid:facility-logo" width="148" alt="${escapeHtml(input.venueName)}" style="display:block;width:148px;max-width:100%;height:auto;border:0;" />`
    : `<span style="font-size:19px;font-weight:700;color:#173f78;">${escapeHtml(input.venueName)}</span>`;
  const contactEmailMarkup =
    input.contactEmail === "Not provided"
      ? "Not provided"
      : `<a href="mailto:${escapeHtml(input.contactEmail)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(input.contactEmail)}</a>`;
  const slotRows = input.slots.length
    ? input.slots
        .map(
          (slot) => `
            <tr>
              <td style="padding:18px 0;border-bottom:1px solid #dbe3ec;vertical-align:top;">
                <div style="font-size:16px;line-height:22px;font-weight:700;color:#10233f;">${escapeHtml(slot.courtName)}</div>
                <div style="margin-top:5px;font-size:13px;line-height:20px;color:#71839b;">${escapeHtml(slot.dateTime)}</div>
              </td>
              <td width="120" align="right" style="padding:18px 0;border-bottom:1px solid #dbe3ec;vertical-align:top;font-size:16px;line-height:22px;font-weight:700;color:#10233f;white-space:nowrap;">
                ${formatOwnerEmailCurrency(slot.subtotalPhp)}
              </td>
            </tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:18px 0;border-bottom:1px solid #dbe3ec;color:#71839b;">No slots listed</td></tr>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>New booking pending approval</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { padding: 16px 8px !important; }
        .email-card { border-radius: 20px !important; }
        .email-header, .email-body { padding-left: 22px !important; padding-right: 22px !important; }
        .detail-column { display: block !important; width: 100% !important; padding: 0 0 16px !important; text-align: left !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#edf2f7;font-family:'Segoe UI',Arial,sans-serif;color:#10233f;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">A new reservation for ${escapeHtml(input.venueName)} is waiting for your review.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#edf2f7;">
      <tr>
        <td class="email-shell" align="center" style="padding:36px 16px;">
          <table role="presentation" class="email-card" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#ffffff;border:1px solid #d7e0ea;border-radius:28px;overflow:hidden;box-shadow:0 22px 60px rgba(16,35,63,0.14);">
            <tr>
              <td class="email-header" style="padding:32px 34px 34px;background-color:#173f78;background-image:linear-gradient(135deg,#173f78 0%,#245a9a 100%);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <span style="display:inline-block;padding:8px 12px;background:#ffffff;border-radius:13px;">${logoMarkup}</span>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="display:inline-block;padding:8px 12px;border:1px solid rgba(255,255,255,0.24);border-radius:999px;background:rgba(255,255,255,0.12);font-size:11px;line-height:14px;font-weight:700;letter-spacing:1.2px;color:#bfeaff;">PENDING</span>
                    </td>
                  </tr>
                </table>
                <div style="margin-top:28px;font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;color:#9fc6eb;">NEW RESERVATION</div>
                <h1 style="margin:8px 0 0;font-size:29px;line-height:36px;font-weight:700;letter-spacing:-0.7px;color:#ffffff;">New booking pending approval</h1>
                <p style="margin:12px 0 0;max-width:500px;font-size:14px;line-height:23px;color:#c8d8eb;">A player submitted their payment proof. Review the reservation details below before confirming the booking.</p>
              </td>
            </tr>
            <tr>
              <td class="email-body" style="padding:30px 34px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:1px solid #dbe3ec;">
                  <tr>
                    <td class="detail-column" width="50%" style="padding:0 16px 22px 0;vertical-align:bottom;">
                      <div style="font-size:10px;line-height:14px;font-weight:700;letter-spacing:1.7px;color:#7a8ba2;">RESERVATION DATE</div>
                      <div style="margin-top:8px;font-size:20px;line-height:26px;font-weight:700;color:#10233f;">${escapeHtml(input.reservationDate)}</div>
                    </td>
                    <td class="detail-column" width="50%" align="right" style="padding:0 0 22px 16px;vertical-align:bottom;">
                      <div style="font-size:10px;line-height:14px;font-weight:700;letter-spacing:1.7px;color:#7a8ba2;">BOOKING REFERENCE</div>
                      <div style="margin-top:8px;font-family:Consolas,'Courier New',monospace;font-size:15px;line-height:22px;font-weight:700;color:#2563eb;">${escapeHtml(input.bookingReference)}</div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  ${slotRows}
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:22px 0 24px;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.5px;color:#7a8ba2;">TOTAL SUBMITTED</td>
                    <td align="right" style="padding:22px 0 24px;font-size:28px;line-height:34px;font-weight:700;color:#2563eb;white-space:nowrap;">${formatOwnerEmailCurrency(input.totalPhp)}</td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f7fb;border:1px solid #dbe3ec;border-radius:16px;">
                  <tr>
                    <td style="padding:20px 20px 8px;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.5px;color:#7a8ba2;">PLAYER &amp; PAYMENT DETAILS</td>
                  </tr>
                  <tr>
                    <td style="padding:0 20px 20px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        ${buildOwnerEmailDetailRow("Reservation name", input.reservationName)}
                        ${buildOwnerEmailDetailRow("Contact email", contactEmailMarkup, true)}
                        ${buildOwnerEmailDetailRow("Contact number", input.contactNumber)}
                        ${buildOwnerEmailDetailRow("Payment method", input.paymentMethod)}
                        ${buildOwnerEmailDetailRow("Payment reference", input.paymentReference)}
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding-top:24px;">
                      <a href="${escapeHtml(input.paymentReceiptUrl)}" style="display:block;padding:15px 24px;background:#2563eb;border-radius:13px;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;box-shadow:0 12px 28px rgba(37,99,235,0.24);">Review payment proof</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;text-align:center;font-size:12px;line-height:19px;color:#7a8ba2;">This booking remains pending until it is reviewed and confirmed by the venue.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 34px;background:#e9eef5;border-top:1px solid #dbe3ec;font-size:12px;line-height:18px;color:#687b93;">Sent by BookTheCourt for ${escapeHtml(input.venueName)}.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildOwnerEmailDetailRow(
  label: string,
  value: string,
  isHtml = false,
) {
  return `<tr>
    <td width="42%" style="padding:7px 12px 7px 0;font-size:13px;line-height:19px;font-weight:600;color:#657991;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:7px 0;font-size:13px;line-height:19px;font-weight:600;color:#10233f;vertical-align:top;word-break:break-word;">${isHtml ? value : escapeHtml(value)}</td>
  </tr>`;
}

async function getOwnerEmailLogoContent() {
  try {
    return await readFile(
      join(process.cwd(), "public", "brand", "court-logo.png"),
      "base64",
    );
  } catch {
    return null;
  }
}

function formatOwnerEmailCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOwnerEmailPaymentMethod(value: string) {
  const normalized = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    gcash: "GCash",
    paymaya: "Maya",
    maya: "Maya",
    bank: "Bank transfer",
  };
  return labels[normalized] ?? (value.trim() || "Not provided");
}

function formatOwnerEmailDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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

  const warehouseIds = Array.from(
    new Set(courts.map((court) => String(court.warehouse_id ?? ""))),
  );
  return warehouseIds.length === 1 ? warehouseIds[0] : null;
}

async function resolveWarehouseBookingWindowDays(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  warehouseId: string,
) {
  const { data: warehouse } = await supabaseAdmin
    .from("warehouses")
    .select("id, booking_window_days")
    .eq("id", warehouseId)
    .maybeSingle();

  return normalizeBookingWindowDays(
    warehouse?.booking_window_days,
    DEFAULT_BOOKING_WINDOW_DAYS,
  );
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
  playerId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({
      ...mutation,
      player_id: playerId,
    })
    .in("id", holdIds)
    .select("id, court_id, reservation_name, starts_at, ends_at, status");

  if (error || !data?.length) {
    return { ok: false as const, error: "The held booking could not be finalized." };
  }

  return { ok: true as const, bookings: data };
}

async function persistBookingReference(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  bookingIds: string[],
  receiptId: string,
) {
  if (!bookingIds.length) {
    return;
  }

  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ booking_reference: receiptId })
    .in("id", bookingIds);

  if (error) {
    console.error("booking-requests reference persist failed", error);
  }
}

async function insertPendingBookings(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  payload: BookingRequestPayload,
  mutation: Record<string, unknown>,
  fallbackPlayerId: string,
) {
  const rows = payload.selectedBlocks.map((block) => {
    const hourlyRatePhp = block.hourlyRatePhp ?? 400;
    const startsAt = toManilaBookingTimestamp(
      payload.playDate,
      block.startTime,
    );
    const endsAt = toManilaBookingTimestamp(payload.playDate, block.endTime);
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

async function resolveBookingPlayerId(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  accessToken?: string,
) {
  if (accessToken) {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user?.id) {
      return {
        playerId: null,
        error: "Your BookTheCourt session is no longer valid. Please sign in again.",
      };
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.id) {
      return {
        playerId: null,
        error:
          "Your BookTheCourt account does not have a player profile yet.",
      };
    }

    return { playerId: profile.id, error: null };
  }

  const fallbackPlayerId = await resolveFallbackPlayerId(supabaseAdmin);
  return { playerId: fallbackPlayerId, error: null };
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

function formatTimeForSchedule(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));

  const hours = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minutes =
    parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${hours}:${minutes}`;
}

function formatOwnerEmailDateTimeRange(startValue: string, endValue: string) {
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateFormatter.format(new Date(startValue))}, ${timeFormatter.format(
    new Date(startValue),
  )} - ${timeFormatter.format(new Date(endValue))}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getMinuteOffsetForSchedule(playDate: string, value: string) {
  const dayStart = new Date(`${playDate}T00:00:00+08:00`).getTime();
  const target = new Date(value).getTime();
  return Math.round((target - dayStart) / (60 * 1000));
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
