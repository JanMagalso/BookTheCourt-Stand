import { NextResponse } from "next/server";

import {
  buildBookingTransactionKey,
  buildReceiptId,
  normalizeReceiptId,
} from "@/lib/receipt";
import { createSupabaseServiceClient, hasSupabaseEnv } from "@/lib/supabase";

type ConfirmBookingPayload = {
  receiptId?: string;
  confirmSecret?: string;
};

type PendingBookingRow = {
  id: string | number;
  player_id: string | null;
  court_id: string | null;
  reservation_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string | null;
  payment_reference: string | null;
  payment_receipt_url: string | null;
  reservation_contact_email: string | null;
  created_at: string | null;
  booking_reference?: string | null;
};

const CONFIRMABLE_STATUSES = new Set([
  "pending",
  "pending_verification",
  "awaiting_payment",
]);

const BOOKING_SELECT =
  "id,player_id,court_id,reservation_name,reservation_contact_email,starts_at,ends_at,status,payment_reference,payment_receipt_url,created_at";

export async function POST(request: Request) {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "BookTheCourt reservations are not configured yet." },
      { status: 503 },
    );
  }

  const payload = (await request.json()) as ConfirmBookingPayload;
  const receiptId = normalizeReceiptId(String(payload.receiptId ?? ""));
  const configuredSecret = process.env.BOOKING_CONFIRM_SECRET?.trim();
  const providedSecret = String(payload.confirmSecret ?? "").trim();

  if (!receiptId || !receiptId.startsWith("BTC-") || receiptId.length < 6) {
    return NextResponse.json(
      {
        error:
          "Enter a valid booking receipt ID, for example BTC-1AB23XYZ.",
      },
      { status: 400 },
    );
  }

  if (configuredSecret && providedSecret !== configuredSecret) {
    return NextResponse.json(
      { error: "Confirm secret is invalid." },
      { status: 401 },
    );
  }

  const supabaseAdmin = createSupabaseServiceClient();
  const warehouseId = await resolveActiveWarehouseId(supabaseAdmin);

  if (!warehouseId) {
    return NextResponse.json(
      { error: "No active venue is configured for confirmation." },
      { status: 404 },
    );
  }

  const { data: venue } = await supabaseAdmin
    .from("warehouses")
    .select("name,location")
    .eq("id", warehouseId)
    .maybeSingle();

  const { data: courts, error: courtsError } = await supabaseAdmin
    .from("courts")
    .select("id,name")
    .eq("warehouse_id", warehouseId);

  if (courtsError) {
    return NextResponse.json(
      { error: "Unable to load venue courts for confirmation." },
      { status: 500 },
    );
  }

  const courtIds = (courts ?? []).map((court) => String(court.id));
  const courtNameById = new Map(
    (courts ?? []).map((court) => [String(court.id), court.name ?? "Court"]),
  );

  if (!courtIds.length) {
    return NextResponse.json(
      { error: "This venue has no courts to confirm bookings for." },
      { status: 404 },
    );
  }

  const matchedBookings = await findBookingsByReceiptId(
    supabaseAdmin,
    receiptId,
    courtIds,
  );

  if (!matchedBookings.length) {
    return NextResponse.json(
      {
        error: `No pending booking was found for receipt ${receiptId}.`,
      },
      { status: 404 },
    );
  }

  const bookingIds = matchedBookings.map((booking) => String(booking.id));
  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({ status: "booked" })
    .in("id", bookingIds)
    .select(
      "id,court_id,reservation_name,reservation_contact_email,starts_at,ends_at,status,created_at",
    );

  if (updateError || !updatedRows?.length) {
    console.error("booking confirm failed", updateError);
    return NextResponse.json(
      { error: "The booking could not be confirmed." },
      { status: 500 },
    );
  }

  const { error: referenceError } = await supabaseAdmin
    .from("bookings")
    .update({ booking_reference: receiptId })
    .in("id", bookingIds);

  if (referenceError) {
    console.error("booking confirm reference persist failed", referenceError);
  }

  return NextResponse.json({
    message: `Confirmed ${updatedRows.length} booking slot${
      updatedRows.length === 1 ? "" : "s"
    } for ${receiptId}.`,
    receiptId,
    venueName: venue?.name ?? "Venue",
    venueLocation: venue?.location ?? "",
    bookings: updatedRows.map((booking) => ({
      id: booking.id,
      bookingReference: receiptId,
      reservationName: booking.reservation_name ?? "Reservation",
      reservationEmail: booking.reservation_contact_email ?? "",
      courtName: courtNameById.get(String(booking.court_id)) ?? "Court",
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
      createdAt: booking.created_at,
      status: booking.status,
    })),
  });
}

async function findBookingsByReceiptId(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  receiptId: string,
  courtIds: string[],
) {
  const { data: byReference, error: referenceError } = await supabaseAdmin
    .from("bookings")
    .select(`${BOOKING_SELECT},booking_reference`)
    .eq("booking_reference", receiptId)
    .in("court_id", courtIds);

  if (!referenceError) {
    const referenceMatches = (
      (byReference ?? []) as PendingBookingRow[]
    ).filter((booking) => isConfirmableStatus(booking.status));

    if (referenceMatches.length) {
      return referenceMatches;
    }
  } else {
    console.error("booking confirm reference lookup failed", referenceError);
  }

  const { data: pendingRows, error: pendingError } = await supabaseAdmin
    .from("bookings")
    .select(BOOKING_SELECT)
    .in("court_id", courtIds)
    .in("status", ["pending", "pending_verification", "awaiting_payment"]);

  if (pendingError) {
    console.error("booking confirm pending lookup failed", pendingError);
    return [];
  }

  const grouped = new Map<string, PendingBookingRow[]>();

  for (const booking of (pendingRows ?? []) as PendingBookingRow[]) {
    const playerId = String(booking.player_id ?? "").trim();
    if (!playerId) {
      continue;
    }

    const groupKey = buildBookingTransactionKey({
      playerId,
      paymentReference: booking.payment_reference,
      paymentReceiptUrl: booking.payment_receipt_url,
      fallbackBookingId: String(booking.id),
    });

    const current = grouped.get(groupKey) ?? [];
    current.push(booking);
    grouped.set(groupKey, current);
  }

  for (const bookings of grouped.values()) {
    const playerId = String(bookings[0]?.player_id ?? "").trim();
    const paymentReference = String(bookings[0]?.payment_reference ?? "");
    const candidateReceiptId = buildReceiptId({
      playerId,
      paymentReference,
      bookingIds: bookings.map((booking) => String(booking.id)),
    });

    if (candidateReceiptId === receiptId) {
      return bookings;
    }
  }

  return [];
}

function isConfirmableStatus(status: string | null | undefined) {
  return CONFIRMABLE_STATUSES.has(String(status ?? "").trim().toLowerCase());
}

async function resolveActiveWarehouseId(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
) {
  const preferredWarehouseId = process.env.BOOKING_WAREHOUSE_ID?.trim();

  if (preferredWarehouseId) {
    return preferredWarehouseId;
  }

  const { data } = await supabaseAdmin
    .from("warehouses")
    .select("id")
    .eq("booking_enabled", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ? String(data.id) : null;
}
