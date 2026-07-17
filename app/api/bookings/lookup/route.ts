import { NextResponse } from "next/server";

import {
  buildBookingTransactionKey,
  buildReceiptId,
  normalizeReceiptId,
} from "@/lib/receipt";
import { createSupabaseServiceClient, hasSupabaseEnv } from "@/lib/supabase";

type LookupPayload = {
  mode?: "receipt" | "email" | "date";
  receiptId?: string;
  email?: string;
  date?: string;
};

type BookingRow = {
  id: string | number;
  player_id: string | null;
  court_id: string | null;
  reservation_name: string | null;
  reservation_contact_email: string | null;
  starts_at: string;
  ends_at: string;
  status: string | null;
  payment_reference: string | null;
  payment_receipt_url: string | null;
  created_at: string | null;
  booking_reference?: string | null;
};

// Keep this aligned with fields known to exist in production bookings.
// `booking_reference` is optional and may be missing on older databases.
const BOOKING_SELECT =
  "id,player_id,court_id,reservation_name,reservation_contact_email,starts_at,ends_at,status,payment_reference,payment_receipt_url,created_at";

const HOLD_STATUSES = new Set(["on_hold", "hold"]);

export async function POST(request: Request) {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "BookTheCourt reservations are not configured yet." },
      { status: 503 },
    );
  }

  const payload = (await request.json()) as LookupPayload;
  const mode = payload.mode ?? "receipt";

  const supabaseAdmin = createSupabaseServiceClient();
  const warehouseId = await resolveActiveWarehouseId(supabaseAdmin);

  if (!warehouseId) {
    return NextResponse.json(
      { error: "No active venue is configured." },
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
      { error: "Unable to load venue courts." },
      { status: 500 },
    );
  }

  const courtIds = (courts ?? []).map((court) => String(court.id));
  const courtNameById = new Map(
    (courts ?? []).map((court) => [String(court.id), court.name ?? "Court"]),
  );

  if (!courtIds.length) {
    return NextResponse.json(
      { error: "This venue has no courts configured." },
      { status: 404 },
    );
  }

  let matchedBookings: BookingRow[] = [];

  if (mode === "receipt") {
    const receiptId = normalizeReceiptId(String(payload.receiptId ?? ""));
    if (!receiptId || !receiptId.startsWith("BTC-") || receiptId.length < 6) {
      return NextResponse.json(
        {
          error:
            "Enter a valid booking receipt ID, for example BTC-1AB23XYZ.",
        },
        { status: 400 },
      );
    }

    matchedBookings = await findBookingsByReceiptId(
      supabaseAdmin,
      receiptId,
      courtIds,
    );
  } else if (mode === "email") {
    const email = String(payload.email ?? "").trim().toLowerCase();
    const date = String(payload.date ?? "").trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Enter a valid email address used on the reservation." },
        { status: 400 },
      );
    }

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Enter a valid play date." },
        { status: 400 },
      );
    }

    matchedBookings = await findBookingsByEmail(
      supabaseAdmin,
      email,
      courtIds,
      date || undefined,
    );
  } else if (mode === "date") {
    const date = String(payload.date ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Enter a valid play date." },
        { status: 400 },
      );
    }

    matchedBookings = await findBookingsByDate(
      supabaseAdmin,
      date,
      courtIds,
    );
  } else {
    return NextResponse.json({ error: "Unsupported search mode." }, { status: 400 });
  }

  const visibleBookings = matchedBookings.filter(
    (booking) => !HOLD_STATUSES.has(String(booking.status ?? "").toLowerCase()),
  );

  if (!visibleBookings.length) {
    return NextResponse.json(
      {
        error:
          mode === "receipt"
            ? "No reservation was found for that booking number."
            : mode === "email"
              ? "No reservation was found for that email."
              : "No reservation was found for that date.",
      },
      { status: 404 },
    );
  }

  const results = groupBookingsIntoReceipts(
    visibleBookings,
    courtNameById,
    venue?.name ?? "Venue",
    venue?.location ?? "",
  );

  return NextResponse.json({ results });
}

type BookingLookupFilters = {
  bookingReference?: string;
  email?: string;
  playerIds?: string[];
  date?: string;
  limit?: number;
  orderAscending?: boolean;
  includeReference?: boolean;
};

async function selectVenueBookings(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  courtIds: string[],
  filters: BookingLookupFilters = {},
) {
  const includeReference = filters.includeReference !== false;
  const limit = filters.limit ?? 40;
  const orderAscending = filters.orderAscending ?? false;

  if (includeReference) {
    const withReference = await buildBookingLookupQuery(
      supabaseAdmin,
      courtIds,
      `${BOOKING_SELECT},booking_reference`,
      filters,
    )
      .order("starts_at", { ascending: orderAscending })
      .limit(limit);

    if (!withReference.error) {
      return (withReference.data ?? []) as unknown as BookingRow[];
    }

    console.error("booking lookup select with reference failed", withReference.error);

    // Don't return unfiltered rows when the caller asked for a booking_reference match.
    if (filters.bookingReference) {
      return [] as BookingRow[];
    }
  }

  const fallback = await buildBookingLookupQuery(
    supabaseAdmin,
    courtIds,
    BOOKING_SELECT,
    {
      ...filters,
      bookingReference: undefined,
    },
  )
    .order("starts_at", { ascending: orderAscending })
    .limit(limit);

  if (fallback.error) {
    console.error("booking lookup select failed", fallback.error);
    return [] as BookingRow[];
  }

  return (fallback.data ?? []) as unknown as BookingRow[];
}

function buildBookingLookupQuery(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  courtIds: string[],
  selectColumns: string,
  filters: BookingLookupFilters,
) {
  let query = supabaseAdmin
    .from("bookings")
    .select(selectColumns)
    .in("court_id", courtIds);

  if (filters.bookingReference) {
    query = query.eq("booking_reference", filters.bookingReference);
  }

  if (filters.email) {
    query = query.ilike("reservation_contact_email", filters.email);
  }

  if (filters.playerIds?.length) {
    query = query.in("player_id", filters.playerIds);
  }

  if (filters.date) {
    query = query
      .gte("starts_at", startOfDayIso(filters.date))
      .lt("starts_at", endOfDayIso(filters.date));
  }

  return query;
}

async function findBookingsByReceiptId(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  receiptId: string,
  courtIds: string[],
) {
  const byReference = await selectVenueBookings(supabaseAdmin, courtIds, {
    bookingReference: receiptId,
    limit: 40,
  });

  if (byReference.length) {
    return byReference;
  }

  // Reconstruct receipt IDs for submitted bookings when booking_reference is unset.
  const rows = await selectVenueBookings(supabaseAdmin, courtIds, {
    includeReference: false,
    limit: 300,
    orderAscending: false,
  });

  return findGroupedMatchByReceipt(rows, receiptId);
}

async function findBookingsByEmail(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  email: string,
  courtIds: string[],
  date?: string,
) {
  const byContactEmail = await selectVenueBookings(supabaseAdmin, courtIds, {
    email,
    date,
    limit: 40,
    orderAscending: false,
  });

  if (byContactEmail.length) {
    return byContactEmail;
  }

  // Some bookings only store the account email via player_id.
  const playerIds = await findPlayerIdsForEmail(supabaseAdmin, email);
  if (!playerIds.length) {
    return [];
  }

  return selectVenueBookings(supabaseAdmin, courtIds, {
    playerIds,
    date,
    limit: 40,
    orderAscending: false,
  });
}

async function findBookingsByDate(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  date: string,
  courtIds: string[],
) {
  return selectVenueBookings(supabaseAdmin, courtIds, {
    date,
    limit: 80,
    orderAscending: true,
  });
}

async function findPlayerIdsForEmail(
  supabaseAdmin: ReturnType<typeof createSupabaseServiceClient>,
  email: string,
) {
  const playerIds = new Set<string>();

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (!error) {
      for (const user of data.users ?? []) {
        if (String(user.email ?? "").trim().toLowerCase() === email) {
          playerIds.add(user.id);
        }
      }
    }
  } catch (error) {
    console.error("booking lookup auth email scan failed", error);
  }

  return [...playerIds];
}

function findGroupedMatchByReceipt(rows: BookingRow[], receiptId: string) {
  const grouped = new Map<string, BookingRow[]>();

  for (const booking of rows) {
    if (HOLD_STATUSES.has(String(booking.status ?? "").toLowerCase())) {
      continue;
    }

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

function groupBookingsIntoReceipts(
  bookings: BookingRow[],
  courtNameById: Map<string, string>,
  venueName: string,
  venueLocation: string,
) {
  const groups = new Map<string, BookingRow[]>();

  for (const booking of bookings) {
    const playerId = String(booking.player_id ?? "").trim();
    const storedReference = String(booking.booking_reference ?? "").trim();
    const groupKey =
      storedReference ||
      (playerId
        ? buildBookingTransactionKey({
            playerId,
            paymentReference: booking.payment_reference,
            paymentReceiptUrl: booking.payment_receipt_url,
            fallbackBookingId: String(booking.id),
          })
        : `solo:${booking.id}`);

    const current = groups.get(groupKey) ?? [];
    current.push(booking);
    groups.set(groupKey, current);
  }

  return [...groups.values()].map((group) => {
    const first = group[0];
    const playerId = String(first?.player_id ?? "").trim();
    const receiptId =
      String(first?.booking_reference ?? "").trim() ||
      (playerId
        ? buildReceiptId({
            playerId,
            paymentReference: String(first?.payment_reference ?? ""),
            bookingIds: group.map((booking) => String(booking.id)),
          })
        : `BTC-${String(first?.id ?? "UNKNOWN").slice(0, 8).toUpperCase()}`);

    return {
      receiptId,
      venueName,
      venueLocation,
      status: formatStatusLabel(first?.status),
      bookings: group.map((booking) => ({
        id: booking.id,
        reservationName: booking.reservation_name ?? "Reservation",
        reservationEmail: booking.reservation_contact_email ?? "",
        courtName: courtNameById.get(String(booking.court_id)) ?? "Court",
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        createdAt: booking.created_at,
        status: booking.status,
      })),
    };
  });
}

function formatStatusLabel(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();

  if (
    normalized === "pending" ||
    normalized === "pending_verification" ||
    normalized === "awaiting_payment"
  ) {
    return "Pending approval";
  }

  if (
    normalized === "booked" ||
    normalized === "confirmed" ||
    normalized === "reserved" ||
    normalized === "rebooked"
  ) {
    return "Confirmed";
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return "Cancelled";
  }

  return status ? status.replaceAll("_", " ") : "Unknown";
}

function startOfDayIso(selectedDate: string) {
  return new Date(`${selectedDate}T00:00:00+08:00`).toISOString();
}

function endOfDayIso(selectedDate: string) {
  return new Date(`${selectedDate}T24:00:00+08:00`).toISOString();
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
