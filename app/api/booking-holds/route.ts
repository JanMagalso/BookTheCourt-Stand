import { NextResponse } from "next/server";

import { createSupabaseServiceClient, hasSupabaseEnv } from "@/lib/supabase";

const HOLD_MINUTES = 10;

type BookingBlock = {
  courtId: string;
  startTime: string;
  endTime: string;
  hourlyRatePhp?: number;
};

type HoldRequestPayload = {
  playDate: string;
  reservationName: string;
  selectedBlocks: BookingBlock[];
};

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase is not configured yet." }, { status: 503 });
  }

  const payload = (await request.json()) as Partial<HoldRequestPayload>;
  const playDate = String(payload.playDate ?? "").trim();
  const reservationName = String(payload.reservationName ?? "").trim() || "Guest hold";
  const selectedBlocks = Array.isArray(payload.selectedBlocks) ? payload.selectedBlocks : [];

  if (!playDate || !selectedBlocks.length) {
    return NextResponse.json({ error: "Missing selected slots for hold." }, { status: 400 });
  }

  if (selectedBlocks.some((block) => isPastSlot(playDate, block.startTime))) {
    return NextResponse.json(
      { error: "One or more selected slots are no longer available because their start time has passed." },
      { status: 409 },
    );
  }

  const supabaseAdmin = createSupabaseServiceClient();
  const playerId = await resolveFallbackPlayerId(supabaseAdmin);
  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString();

  if (!playerId) {
    return NextResponse.json(
      { error: "No valid player profile is available for guest holds yet." },
      { status: 500 },
    );
  }

  const overlapping = await findOverlappingBookings(supabaseAdmin, playDate, selectedBlocks);
  if (overlapping) {
    return NextResponse.json(
      { error: "One or more selected slots are already booked, pending, or on hold." },
      { status: 409 },
    );
  }

  const rows = selectedBlocks.map((block) => ({
    court_id: block.courtId,
    player_id: playerId,
    reservation_name: reservationName,
    starts_at: toBookingTimestamp(playDate, block.startTime),
    ends_at: toBookingTimestamp(playDate, block.endTime),
    status: "on_hold",
    hold_expires_at: holdExpiresAt,
    applied_hourly_rate_php: block.hourlyRatePhp ?? 0,
    applied_subtotal_php: (block.hourlyRatePhp ?? 0) * diffHours(block.startTime, block.endTime),
  }));

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .insert(rows)
    .select("id, court_id, reservation_name, starts_at, ends_at, status, hold_expires_at");

  if (error) {
    console.error("booking-holds insert failed", error);
    return NextResponse.json({ error: "Unable to place the selected slots on hold." }, { status: 500 });
  }

  return NextResponse.json({
    message: "Selected slots are now on hold.",
    holdExpiresAt,
    bookings: (data ?? []).map((booking) => ({
      id: booking.id,
      bookingReference: String(booking.id).slice(0, 8).toUpperCase(),
      reservationName: booking.reservation_name ?? reservationName,
      courtId: booking.court_id,
      startsAt: formatTimeForSchedule(booking.starts_at),
      endsAt: formatTimeForSchedule(booking.ends_at),
      status: "hold",
      holdExpiresAt: booking.hold_expires_at ?? holdExpiresAt,
    })),
  });
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

export async function DELETE(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase is not configured yet." }, { status: 503 });
  }

  const payload = (await request.json()) as { holdIds?: string[] };
  const holdIds = Array.isArray(payload.holdIds) ? payload.holdIds.filter(Boolean) : [];

  if (!holdIds.length) {
    return NextResponse.json({ error: "No hold ids were provided." }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseServiceClient();
  const { error } = await supabaseAdmin.from("bookings").delete().in("id", holdIds);

  if (error) {
    return NextResponse.json({ error: "Unable to release held slots." }, { status: 500 });
  }

  return NextResponse.json({ message: "Hold released.", holdIds });
}

async function findOverlappingBookings(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  playDate: string,
  blocks: BookingBlock[],
) {
  const courtIds = Array.from(new Set(blocks.map((block) => block.courtId)));
  const blockStarts = blocks.map((block) => toBookingTimestamp(playDate, block.startTime));
  const blockEnds = blocks.map((block) => toBookingTimestamp(playDate, block.endTime));
  const earliestStart = [...blockStarts].sort()[0];
  const latestEnd = [...blockEnds].sort().at(-1);

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("court_id, starts_at, ends_at, status, hold_expires_at, payment_receipt_url")
    .in("court_id", courtIds)
    .in("status", ["on_hold", "pending", "confirmed", "booked"])
    .lt("starts_at", latestEnd ?? earliestStart)
    .gt("ends_at", earliestStart ?? latestEnd);

  if (error) {
    return true;
  }

  return (data ?? []).some((booking) => {
    const activeStatus =
      (booking.status === "on_hold" &&
        Boolean(booking.hold_expires_at) &&
        new Date(booking.hold_expires_at).getTime() > Date.now()) ||
      booking.status === "confirmed" ||
      booking.status === "booked" ||
      (booking.status === "pending" &&
        (!booking.hold_expires_at ||
          new Date(booking.hold_expires_at).getTime() > Date.now() ||
          booking.payment_receipt_url));

    if (!activeStatus) {
      return false;
    }

    const bookingStart = new Date(booking.starts_at).getTime();
    const bookingEnd = new Date(booking.ends_at).getTime();

    return blocks.some((block) => {
      if (block.courtId !== booking.court_id) {
        return false;
      }

      const blockStart = new Date(toBookingTimestamp(playDate, block.startTime)).getTime();
      const blockEnd = new Date(toBookingTimestamp(playDate, block.endTime)).getTime();

      return blockStart < bookingEnd && blockEnd > bookingStart;
    });
  });
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
