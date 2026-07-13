import { NextResponse } from "next/server";

import {
  DEFAULT_BOOKING_WINDOW_DAYS,
  formatBookingWindowRestrictionMessage,
  normalizeBookingWindowDays,
} from "@/lib/booking-window";
import { toManilaBookingTimestamp } from "@/lib/booking-time";
import { isWithinOnlineBookingWindow } from "@/lib/facility-status-overrides";
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
  authAccessToken?: string;
  selectedBlocks: BookingBlock[];
};

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase is not configured yet." }, { status: 503 });
  }

  const payload = (await request.json()) as Partial<HoldRequestPayload>;
  const playDate = String(payload.playDate ?? "").trim();
  const reservationName = String(payload.reservationName ?? "").trim() || "Guest hold";
  const authAccessToken = String(payload.authAccessToken ?? "").trim();
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
  const playerResult = await resolveBookingPlayerId(supabaseAdmin, authAccessToken);
  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000).toISOString();

  if (!playerResult.playerId) {
    return NextResponse.json(
      {
        error:
          playerResult.error ??
          "No valid player profile is available for guest holds yet.",
      },
      { status: playerResult.error ? 401 : 500 },
    );
  }

  const bookingWindowResult = await resolveWarehouseBookingWindowDays(
    supabaseAdmin,
    selectedBlocks,
  );
  if (!bookingWindowResult.ok) {
    return NextResponse.json({ error: bookingWindowResult.error }, { status: 400 });
  }

  if (
    selectedBlocks.some((block) =>
      !isWithinOnlineBookingWindow(
        new Date(toManilaBookingTimestamp(playDate, block.startTime)),
        new Date(),
        bookingWindowResult.bookingWindowDays,
      ),
    )
  ) {
    return NextResponse.json(
      {
        error: formatBookingWindowRestrictionMessage(
          bookingWindowResult.bookingWindowDays,
        ),
      },
      { status: 409 },
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
    player_id: playerResult.playerId,
    reservation_name: reservationName,
    starts_at: toManilaBookingTimestamp(playDate, block.startTime),
    ends_at: toManilaBookingTimestamp(playDate, block.endTime),
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
      startMinuteOffset: getMinuteOffsetForSchedule(playDate, booking.starts_at),
      endMinuteOffset: getMinuteOffsetForSchedule(playDate, booking.ends_at),
      status: "hold",
      holdExpiresAt: booking.hold_expires_at ?? holdExpiresAt,
    })),
  });
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
  const blockStarts = blocks.map((block) =>
    toManilaBookingTimestamp(playDate, block.startTime),
  );
  const blockEnds = blocks.map((block) =>
    toManilaBookingTimestamp(playDate, block.endTime),
  );
  const earliestStart = [...blockStarts].sort()[0];
  const latestEnd = [...blockEnds].sort().at(-1);

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("court_id, starts_at, ends_at, status, hold_expires_at, payment_receipt_url")
    .in("court_id", courtIds)
    .in("status", ["on_hold", "hold", "pending", "confirmed", "booked", "rebooked", "reserved"])
    .lt("starts_at", latestEnd ?? earliestStart)
    .gt("ends_at", earliestStart ?? latestEnd);

  if (error) {
    return true;
  }

  return (data ?? []).some((booking) => {
    const normalizedStatus = String(booking.status ?? "").trim().toLowerCase();
    const activeStatus =
      ((normalizedStatus === "on_hold" || normalizedStatus === "hold") &&
        Boolean(booking.hold_expires_at) &&
        new Date(booking.hold_expires_at).getTime() > Date.now()) ||
      normalizedStatus === "confirmed" ||
      normalizedStatus === "booked" ||
      normalizedStatus === "rebooked" ||
      normalizedStatus === "reserved" ||
      (normalizedStatus === "pending" &&
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

      const blockStart = new Date(
        toManilaBookingTimestamp(playDate, block.startTime),
      ).getTime();
      const blockEnd = new Date(
        toManilaBookingTimestamp(playDate, block.endTime),
      ).getTime();

      return blockStart < bookingEnd && blockEnd > bookingStart;
    });
  });
}

async function resolveWarehouseBookingWindowDays(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  blocks: BookingBlock[],
) {
  const courtIds = Array.from(new Set(blocks.map((block) => block.courtId)));
  const { data: courts, error: courtsError } = await supabaseAdmin
    .from("courts")
    .select("id, warehouse_id")
    .in("id", courtIds);

  if (courtsError || !courts?.length || courts.length !== courtIds.length) {
    return {
      ok: false as const,
      error: "Selected court is no longer available.",
    };
  }

  const warehouseIds = Array.from(
    new Set(courts.map((court) => String(court.warehouse_id ?? ""))),
  );
  if (warehouseIds.length !== 1 || !warehouseIds[0]) {
    return {
      ok: false as const,
      error: "Selected slots must belong to the same facility.",
    };
  }

  const { data: warehouse, error: warehouseError } = await supabaseAdmin
    .from("warehouses")
    .select("id, booking_window_days")
    .eq("id", warehouseIds[0])
    .maybeSingle();

  if (warehouseError) {
    return {
      ok: false as const,
      error: "Unable to validate the facility booking window right now.",
    };
  }

  return {
    ok: true as const,
    bookingWindowDays: normalizeBookingWindowDays(
      warehouse?.booking_window_days,
      DEFAULT_BOOKING_WINDOW_DAYS,
    ),
  };
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
