import { NextResponse } from "next/server";

import { createSupabaseServiceClient, hasSupabaseEnv } from "@/lib/supabase";

export async function GET(request: Request) {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "BookTheCourt reservations are not configured yet." },
      { status: 503 },
    );
  }

  const accessToken = getBearerToken(request.headers.get("authorization"));

  if (!accessToken) {
    return NextResponse.json(
      { error: "Sign in with your BookTheCourt account first." },
      { status: 401 },
    );
  }

  const supabaseAdmin = createSupabaseServiceClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user?.id) {
    return NextResponse.json(
      { error: "Your BookTheCourt session is no longer valid. Please sign in again." },
      { status: 401 },
    );
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.id) {
    return NextResponse.json(
      { error: "Your BookTheCourt account does not have a player profile yet." },
      { status: 404 },
    );
  }

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from("bookings")
    .select("id,court_id,reservation_name,starts_at,ends_at,status,hold_expires_at,payment_receipt_url")
    .eq("player_id", profile.id)
    .order("starts_at", { ascending: true });

  if (bookingsError) {
    return NextResponse.json(
      { error: "We could not load your reservations yet." },
      { status: 500 },
    );
  }

  const courtIds = Array.from(
    new Set((bookings ?? []).map((booking) => String(booking.court_id ?? ""))),
  ).filter(Boolean);

  const { data: courts } = courtIds.length
    ? await supabaseAdmin
        .from("courts")
        .select("id,name,warehouse_id")
        .in("id", courtIds)
    : { data: [] as Array<{ id: string; name: string | null; warehouse_id: string | null }> };

  const warehouseIds = Array.from(
    new Set((courts ?? []).map((court) => String(court.warehouse_id ?? ""))),
  ).filter(Boolean);

  const { data: warehouses } = warehouseIds.length
    ? await supabaseAdmin
        .from("warehouses")
        .select("id,name")
        .in("id", warehouseIds)
    : { data: [] as Array<{ id: string; name: string | null }> };

  const courtMap = new Map(
    (courts ?? []).map((court) => [
      court.id,
      {
        name: court.name ?? "Court",
        warehouseId: court.warehouse_id ?? "",
      },
    ]),
  );
  const warehouseMap = new Map(
    (warehouses ?? []).map((warehouse) => [
      warehouse.id,
      warehouse.name ?? "Venue",
    ]),
  );
  const activeWarehouseId = await resolveActiveWarehouseId(supabaseAdmin);

  const groupedBookings = new Map<
    string,
    {
      id: string;
      bookingReference: string;
      reservationName: string;
      venueName: string;
      startsAt: string;
      endsAt: string;
      status: string;
      holdExpiresAt: string | null;
      paymentReceiptUrl: string | null;
      courts: Array<{
        courtName: string;
        startsAt: string;
        endsAt: string;
      }>;
    }
  >();

  for (const booking of bookings ?? []) {
    const court = courtMap.get(String(booking.court_id ?? ""));
    if (!court?.warehouseId || court.warehouseId !== activeWarehouseId) {
      continue;
    }
    const venueName = court?.warehouseId
      ? warehouseMap.get(court.warehouseId) ?? "Venue"
      : "Venue";
    const normalizedStatus = normalizeStatus(booking.status);
    const receiptKey = String(booking.payment_receipt_url ?? "").trim();
    const groupingKey = receiptKey || `single:${booking.id}`;

    const existing = groupedBookings.get(groupingKey);
    const courtEntry = {
      courtName: court?.name ?? "Court",
      startsAt: booking.starts_at,
      endsAt: booking.ends_at,
    };

    if (!existing) {
      groupedBookings.set(groupingKey, {
        id: groupingKey,
        bookingReference: String(booking.id).slice(0, 8).toUpperCase(),
        reservationName: booking.reservation_name ?? "Reservation",
        venueName,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        status: normalizedStatus,
        holdExpiresAt: booking.hold_expires_at ?? null,
        paymentReceiptUrl: booking.payment_receipt_url ?? null,
        courts: [courtEntry],
      });
      continue;
    }

    existing.startsAt =
      new Date(booking.starts_at).getTime() < new Date(existing.startsAt).getTime()
        ? booking.starts_at
        : existing.startsAt;
    existing.endsAt =
      new Date(booking.ends_at).getTime() > new Date(existing.endsAt).getTime()
        ? booking.ends_at
        : existing.endsAt;
    existing.courts.push(courtEntry);
  }

  return NextResponse.json({
    bookings: [...groupedBookings.values()].sort(
      (left, right) =>
        new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime(),
    ),
  });
}

async function resolveActiveWarehouseId(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
) {
  const preferredWarehouseId = process.env.BOOKING_WAREHOUSE_ID?.trim();
  const warehouseQuery = supabaseAdmin
    .from("warehouses")
    .select("id")
    .eq("booking_enabled", true);

  const { data: warehouse } = preferredWarehouseId
    ? await warehouseQuery.eq("id", preferredWarehouseId).maybeSingle()
    : await warehouseQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();

  return warehouse?.id ?? "";
}

function getBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return "";
  }

  const [scheme, token] = authorizationHeader.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token?.trim() ?? "" : "";
}

function normalizeStatus(value: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "on_hold") {
    return "hold";
  }

  if (normalized === "confirmed" || normalized === "rebooked") {
    return "booked";
  }

  return normalized || "pending";
}
