import {
  createPublicSupabaseClient,
  createSupabaseServiceClient,
  hasSupabaseEnv,
} from "@/lib/supabase";
import { DEFAULT_BOOKING_WINDOW_DAYS, normalizeBookingWindowDays } from "@/lib/booking-window";

export type Venue = {
  name: string;
  address: string;
  landmark: string;
  about: string;
  googleMapsUrl: string;
  hourlyRate: number;
  businessHours: string;
  socialLinks: Array<{ label: string; href: string }>;
  galleryImages: string[];
  paymentMethod: string;
  cancellationPolicy: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactFacebook?: string | null;
  amenities: string[];
  bookingWindowDays?: number | null;
  hasNightLighting: boolean;
  indoorCourtCount: number;
  outdoorCourtCount: number;
  operatingHours?: ScheduleGroup[];
};

export type Court = {
  id: string;
  name: string;
  hourlyRatePhp: number;
  pricingRules: CourtPricingRule[];
};

export type ScheduleGroup = {
  id?: string | number;
  days: number[];
  open: number;
  close: number;
  closed?: boolean;
  is24Hours?: boolean;
};

export type CourtPricingRule = {
  id: string;
  courtId: string;
  label: string;
  dayKeys: string[];
  startHour: number;
  endHour: number;
  hourlyRatePhp: number;
  sortOrder: number;
  isActive: boolean;
};

export type BookingStatus =
  | "available"
  | "unavailable"
  | "hold"
  | "pending"
  | "booked";

export type BookingSlot = {
  bookingReference: string;
  reservationName: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  startMinuteOffset?: number;
  endMinuteOffset?: number;
  status: Exclude<BookingStatus, "available">;
  holdExpiresAt?: string | null;
};

export type FaqEntry = {
  question: string;
  answer: string;
};

export type VenueSnapshot = {
  selectedDate: string;
  venue: Venue;
  courts: Court[];
  faqs: FaqEntry[];
  bookings: BookingSlot[];
  availabilityRows: Array<{
    timeLabel: string;
    startTime: string;
    endTime: string;
    startMinuteOffset: number;
    endMinuteOffset: number;
    courts: Array<{
      courtId: string;
      courtName: string;
      status: BookingStatus;
      label: string;
      hourlyRatePhp: number;
    }>;
  }>;
};

export type SlotSelection = {
  courtId: string;
  courtName: string;
  startTime: string;
  endTime: string;
  playDate: string;
  timeLabel: string;
};

type WarehouseRow = {
  id: string;
  name: string;
  location: string | null;
  about: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_facebook: string | null;
  amenities: string[] | null;
  gallery_urls: string[] | null;
  operating_hours: unknown;
  google_maps_url: string | null;
  booking_window_days?: number | null;
  time_slot_display_mode?: string | null;
};

type CourtRow = {
  id: string;
  name: string;
  hourly_rate_php: number | null;
  is_indoor?: boolean | null;
  has_night_lighting?: boolean | null;
};

type BookingRow = {
  id: string;
  court_id: string;
  reservation_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  hold_expires_at?: string | null;
  payment_receipt_url?: string | null;
};

type OwnerPaymentMethodRow = {
  label: string | null;
  method_key: string;
};

type CourtPricingRuleRow = {
  id: string;
  court_id: string;
  label: string | null;
  day_keys: string[] | null;
  start_hour: number;
  end_hour: number;
  hourly_rate_php: number;
  sort_order: number | null;
  is_active: boolean | null;
};

const fallbackSnapshot: VenueSnapshot = {
  selectedDate: formatDateInput(new Date()),
  venue: {
    name: "Pickle Go Hub",
    address: "Mandaue City, Cebu",
    landmark: "Public venue profile",
    about:
      "Reserve court time with a fast, straightforward booking flow built for active players and casual drop-ins.",
    googleMapsUrl: "#",
    hourlyRate: 400,
    businessHours: "Open daily",
    socialLinks: [
      {
        label: "Facebook",
        href: "#",
      },
      {
        label: "Instagram",
        href: "#",
      },
    ],
    galleryImages: [],
    paymentMethod: "GCash",
    cancellationPolicy:
      "Reservations are final once payment has been confirmed. Rescheduling can be reviewed for severe weather or other exceptional circumstances.",
    contactEmail: null,
    contactPhone: null,
    contactFacebook: null,
    amenities: ["3 courts", "Night lighting", "Guest-friendly booking"],
    bookingWindowDays: 14,
    hasNightLighting: true,
    indoorCourtCount: 0,
    outdoorCourtCount: 3,
    operatingHours: [
      { days: [0, 1, 2, 3, 4, 5, 6], open: 17 * 60, close: 23 * 60, closed: false, is24Hours: false },
    ],
  },
  courts: [
    { id: "1cb6c4cf-7f03-4f42-8ec3-13ad5f11f001", name: "Court 1", hourlyRatePhp: 400, pricingRules: [] },
    { id: "1cb6c4cf-7f03-4f42-8ec3-13ad5f11f002", name: "Court 2", hourlyRatePhp: 400, pricingRules: [] },
    { id: "1cb6c4cf-7f03-4f42-8ec3-13ad5f11f003", name: "Court 3", hourlyRatePhp: 400, pricingRules: [] },
  ],
  faqs: [
    {
      question: "Do players need an account before booking?",
      answer: "No. This flow supports guest bookings so players can reserve quickly.",
    },
    {
      question: "When is a booking considered confirmed?",
      answer: "After payment proof is submitted and an admin verifies the transaction.",
    },
    {
      question: "Can this be extended into a full admin dashboard?",
      answer: "Yes. The schema and Supabase setup leave space for booking review, rebooking, and venue settings.",
    },
  ],
  bookings: [
    {
      bookingReference: "HEEST05D",
      reservationName: "Dawn Muana",
      courtId: "1cb6c4cf-7f03-4f42-8ec3-13ad5f11f002",
      startsAt: "18:00",
      endsAt: "20:00",
      status: "booked",
    },
    {
      bookingReference: "HEEST05D",
      reservationName: "Dawn Muana",
      courtId: "1cb6c4cf-7f03-4f42-8ec3-13ad5f11f003",
      startsAt: "18:00",
      endsAt: "20:00",
      status: "booked",
    },
    {
      bookingReference: "4C1T19U3",
      reservationName: "Tan",
      courtId: "1cb6c4cf-7f03-4f42-8ec3-13ad5f11f001",
      startsAt: "21:00",
      endsAt: "22:00",
      status: "booked",
    },
    {
      bookingReference: "I998WRVH",
      reservationName: "Ynot",
      courtId: "1cb6c4cf-7f03-4f42-8ec3-13ad5f11f001",
      startsAt: "18:00",
      endsAt: "20:00",
      status: "booked",
    },
    {
      bookingReference: "LEAT37DS",
      reservationName: "SY Family",
      courtId: "1cb6c4cf-7f03-4f42-8ec3-13ad5f11f002",
      startsAt: "20:00",
      endsAt: "21:00",
      status: "pending",
    },
  ],
  availabilityRows: [],
};

fallbackSnapshot.availabilityRows = getAvailabilityRows(fallbackSnapshot);

export async function getVenueSnapshot(
  selectedDate: string | undefined = formatDateInput(new Date()),
): Promise<VenueSnapshot> {
  const resolvedDate = selectedDate ?? formatDateInput(new Date());
  const preferredWarehouseId = process.env.BOOKING_WAREHOUSE_ID?.trim();

  if (!hasSupabaseEnv()) {
    return cloneSnapshotForDate(fallbackSnapshot, resolvedDate);
  }

  try {
    // Server-side snapshot reads should use the service client when available
    // so the showcase reflects the same booking records used by hold/checkout APIs.
    const supabase =
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createSupabaseServiceClient()
        : createPublicSupabaseClient();

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await releaseExpiredHolds(createSupabaseServiceClient());
    }

    const warehouseQuery = supabase
      .from("warehouses")
      .select(
        "id, name, location, about, contact_email, contact_phone, contact_facebook, amenities, gallery_urls, operating_hours, google_maps_url, owner_id, booking_window_days, time_slot_display_mode",
      )
      .eq("booking_enabled", true);

    const { data: warehouse, error: warehouseError } = preferredWarehouseId
      ? await warehouseQuery.eq("id", preferredWarehouseId).maybeSingle()
      : await warehouseQuery
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

    if (warehouseError || !warehouse) {
      return cloneSnapshotForDate(fallbackSnapshot, resolvedDate);
    }

    const [{ data: courts }, { data: bookings }, { data: paymentMethods }] = await Promise.all([
      supabase
        .from("courts")
        .select("id, name, hourly_rate_php, is_indoor, has_night_lighting")
        .eq("warehouse_id", warehouse.id)
        .order("name", { ascending: true }),
      supabase
        .from("bookings")
        .select("id, court_id, reservation_name, starts_at, ends_at, status, hold_expires_at, payment_receipt_url")
        .gte("starts_at", startOfDayIso(resolvedDate))
        .lt("starts_at", endOfDayIso(resolvedDate)),
      warehouse.owner_id
        ? supabase
            .from("owner_payment_methods")
            .select("label, method_key")
            .eq("owner_id", warehouse.owner_id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] as OwnerPaymentMethodRow[] }),
    ]);

    const normalizedCourts = (courts ?? []) as CourtRow[];
    const { data: pricingRules } = normalizedCourts.length
      ? await supabase
          .from("court_pricing_rules")
          .select("id, court_id, label, day_keys, start_hour, end_hour, hourly_rate_php, sort_order, is_active")
          .in("court_id", normalizedCourts.map((court) => court.id))
          .order("sort_order", { ascending: true })
      : { data: [] as CourtPricingRuleRow[] };
    const pricingRulesByCourtId = new Map<string, CourtPricingRule[]>();
    ((pricingRules ?? []) as CourtPricingRuleRow[]).forEach((rule) => {
      const current = pricingRulesByCourtId.get(rule.court_id) ?? [];
      current.push({
        id: rule.id,
        courtId: rule.court_id,
        label: rule.label ?? "",
        dayKeys: [...(rule.day_keys ?? [])],
        startHour: Number(rule.start_hour),
        endHour: Number(rule.end_hour),
        hourlyRatePhp: Number(rule.hourly_rate_php),
        sortOrder: Number(rule.sort_order ?? 0),
        isActive: rule.is_active !== false,
      });
      pricingRulesByCourtId.set(rule.court_id, current);
    });
    const allowedCourtIds = new Set(normalizedCourts.map((court) => court.id));
    const normalizedBookings: BookingSlot[] = ((bookings ?? []) as BookingRow[])
      .filter(
        (booking) =>
          allowedCourtIds.has(booking.court_id) &&
          shouldRenderBookingStatus(booking.status),
      )
      .map((booking) => ({
        bookingReference: booking.id.slice(0, 8).toUpperCase(),
        reservationName: booking.reservation_name ?? "Reserved",
        courtId: booking.court_id,
        startsAt: formatTimeForSchedule(booking.starts_at),
        endsAt: formatTimeForSchedule(booking.ends_at),
        startMinuteOffset: getMinuteOffsetForSchedule(
          resolvedDate,
          booking.starts_at,
        ),
        endMinuteOffset: getMinuteOffsetForSchedule(resolvedDate, booking.ends_at),
        status: normalizeBookingStatus(booking),
        holdExpiresAt: booking.hold_expires_at ?? null,
      }))
      .filter((booking) => booking.status !== "hold" || !isExpiredHold(booking.holdExpiresAt ?? null));

    const liveSnapshot: VenueSnapshot = {
      selectedDate: resolvedDate,
      venue: mapVenueFromWarehouse(
        warehouse as WarehouseRow & { owner_id?: string | null },
        normalizedCourts,
        (paymentMethods ?? []) as OwnerPaymentMethodRow[],
      ),
      courts: normalizedCourts.map((court) => ({
        id: court.id,
        name: court.name,
        hourlyRatePhp: Number(court.hourly_rate_php ?? fallbackSnapshot.venue.hourlyRate),
        pricingRules: pricingRulesByCourtId.get(court.id) ?? [],
      })),
      faqs: fallbackSnapshot.faqs,
      bookings: normalizedBookings,
      availabilityRows: [],
    };

    liveSnapshot.availabilityRows = getAvailabilityRows(liveSnapshot);

    return liveSnapshot;
  } catch {
    return cloneSnapshotForDate(fallbackSnapshot, resolvedDate);
  }
}

function cloneSnapshotForDate(snapshot: VenueSnapshot, selectedDate: string): VenueSnapshot {
  const nextSnapshot: VenueSnapshot = {
    ...snapshot,
    selectedDate,
    venue: {
      ...snapshot.venue,
      socialLinks: [...snapshot.venue.socialLinks],
      galleryImages: [...snapshot.venue.galleryImages],
      amenities: [...snapshot.venue.amenities],
      operatingHours: snapshot.venue.operatingHours
        ? snapshot.venue.operatingHours.map((group) => ({ ...group, days: [...group.days] }))
        : undefined,
    },
    courts: snapshot.courts.map((court) => ({
      ...court,
      pricingRules: court.pricingRules.map((rule) => ({
        ...rule,
        dayKeys: [...rule.dayKeys],
      })),
    })),
    faqs: snapshot.faqs.map((faq) => ({ ...faq })),
    bookings: snapshot.bookings.map((booking) => ({ ...booking })),
    availabilityRows: [],
  };

  nextSnapshot.availabilityRows = getAvailabilityRows(nextSnapshot);
  return nextSnapshot;
}

function mapVenueFromWarehouse(
  warehouse: WarehouseRow,
  courts: CourtRow[],
  paymentMethods: OwnerPaymentMethodRow[],
): Venue {
  const activeRate =
    courts.find((court) => typeof court.hourly_rate_php === "number")?.hourly_rate_php ??
    fallbackSnapshot.venue.hourlyRate;
  const paymentMethod =
    paymentMethods[0]?.label ?? paymentMethods[0]?.method_key ?? fallbackSnapshot.venue.paymentMethod;
  const indoorCourtCount = courts.filter((court) => court.is_indoor === true).length;
  const outdoorCourtCount = Math.max(0, courts.length - indoorCourtCount);
  const hasNightLighting = courts.some((court) => court.has_night_lighting === true);

  return {
    name: warehouse.name || fallbackSnapshot.venue.name,
    address: warehouse.location || fallbackSnapshot.venue.address,
    landmark: fallbackSnapshot.venue.landmark,
    about: warehouse.about || fallbackSnapshot.venue.about,
    googleMapsUrl: warehouse.google_maps_url || fallbackSnapshot.venue.googleMapsUrl,
    hourlyRate: activeRate,
    businessHours: formatOperatingHours(warehouse.operating_hours),
    socialLinks: warehouse.contact_facebook
      ? [{ label: "Facebook", href: warehouse.contact_facebook }]
      : fallbackSnapshot.venue.socialLinks,
    galleryImages:
      warehouse.gallery_urls && warehouse.gallery_urls.length > 0
        ? warehouse.gallery_urls
        : fallbackSnapshot.venue.galleryImages,
    paymentMethod,
    cancellationPolicy: fallbackSnapshot.venue.cancellationPolicy,
    contactEmail: warehouse.contact_email,
    contactPhone: warehouse.contact_phone,
    contactFacebook: warehouse.contact_facebook,
    amenities:
      warehouse.amenities && warehouse.amenities.length > 0
        ? warehouse.amenities
        : fallbackSnapshot.venue.amenities,
    bookingWindowDays: normalizeBookingWindowDays(
      warehouse.booking_window_days,
      DEFAULT_BOOKING_WINDOW_DAYS,
    ),
    hasNightLighting,
    indoorCourtCount,
    outdoorCourtCount,
    operatingHours: normalizeOperatingHours(warehouse.operating_hours),
  };
}

function formatOperatingHours(value: unknown) {
  if (!value || typeof value !== "object") {
    return fallbackSnapshot.venue.businessHours;
  }

  const text = JSON.stringify(value);

  if (!text || text === "{}") {
    return fallbackSnapshot.venue.businessHours;
  }

  return "Hours available for booking";
}

function normalizeOperatingHours(value: unknown): ScheduleGroup[] {
  if (!Array.isArray(value)) {
    return fallbackSnapshot.venue.operatingHours ?? [];
  }

  return value as ScheduleGroup[];
}

function startOfDayIso(selectedDate: string) {
  return new Date(`${selectedDate}T00:00:00+08:00`).toISOString();
}

function endOfDayIso(selectedDate: string) {
  return new Date(`${selectedDate}T24:00:00+08:00`).toISOString();
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

function normalizeBookingStatus(booking: BookingRow): Exclude<BookingStatus, "available"> {
  const normalizedStatus = booking.status.trim().toLowerCase();

  if (normalizedStatus === "on_hold" || normalizedStatus === "hold") {
    return "hold";
  }

  if (
    normalizedStatus === "pending" &&
    booking.hold_expires_at &&
    new Date(booking.hold_expires_at).getTime() > Date.now() &&
    !booking.payment_receipt_url
  ) {
    return "hold";
  }

  if (
    normalizedStatus === "pending" ||
    normalizedStatus === "reserved" ||
    normalizedStatus === "awaiting_payment" ||
    normalizedStatus === "pending_verification"
  ) {
    return "pending";
  }

  if (
    normalizedStatus === "confirmed" ||
    normalizedStatus === "booked" ||
    normalizedStatus === "rebooked"
  ) {
    return "booked";
  }

  return "booked";
}

function shouldRenderBookingStatus(status: string) {
  const normalizedStatus = status.trim().toLowerCase();
  return normalizedStatus !== "cancelled";
}

function isExpiredHold(value: string | null) {
  return Boolean(value && new Date(value).getTime() <= Date.now());
}

async function releaseExpiredHolds(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
) {
  const nowIso = new Date().toISOString();

  await supabase
    .from("bookings")
    .delete()
    .in("status", ["on_hold", "hold", "pending"])
    .lte("hold_expires_at", nowIso)
    .is("payment_receipt_url", null);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToLabel(value: number) {
  const normalized = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const standardHour = hours % 12 === 0 ? 12 : hours % 12;

  return `${standardHour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

function getScheduleWeekday(dateKey: string) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
  }).format(new Date(`${dateKey}T12:00:00+08:00`));

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}

function getPricingDayKeyForDateKey(dateKey: string) {
  const weekday = getScheduleWeekday(dateKey);
  const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  return map[weekday] ?? "sun";
}

function shiftDateKey(value: string, offsetDays: number) {
  const date = new Date(`${value}T12:00:00+08:00`);
  date.setDate(date.getDate() + offsetDays);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function parseOperatingWindowForDay(groups: ScheduleGroup[] | undefined, selectedDate: string) {
  const dayIndex = getScheduleWeekday(selectedDate);
  const group = groups?.find((entry) => !entry.closed && entry.days.includes(dayIndex));

  if (!group) {
    return { startHour: 0, endHourExclusive: 0, closeMinuteOffset: 0 };
  }

  if (group.is24Hours === true || (group.open === 0 && group.close === 0)) {
    return { startHour: 0, endHourExclusive: 26, closeMinuteOffset: 26 * 60 };
  }

  const startHour = Math.floor(group.open / 60);
  const normalizedCloseMinutes = group.close <= group.open ? group.close + 24 * 60 : group.close;
  const endHourExclusive = Math.ceil(normalizedCloseMinutes / 60);

  return {
    startHour: Math.max(0, Math.min(23, startHour)),
    endHourExclusive: Math.max(startHour + 1, Math.min(29, endHourExclusive)),
    closeMinuteOffset: normalizedCloseMinutes,
  };
}

function getMinuteOffsetForSchedule(selectedDate: string, value: string) {
  const dayStart = new Date(`${selectedDate}T00:00:00+08:00`).getTime();
  const target = new Date(value).getTime();
  return Math.round((target - dayStart) / (60 * 1000));
}

function resolveHourlyRate(court: Court, selectedDate: string, hourIndex: number) {
  const dayOffset = Math.floor(hourIndex / 24);
  const shiftedDateKey =
    dayOffset === 0 ? selectedDate : shiftDateKey(selectedDate, dayOffset);
  const hour = ((hourIndex % 24) + 24) % 24;
  const dayKey = getPricingDayKeyForDateKey(shiftedDateKey);
  const matchingRule = [...court.pricingRules]
    .filter((rule) => rule.isActive)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.startHour - right.startHour)
    .find(
      (rule) =>
        rule.dayKeys.includes(dayKey) &&
        hour >= rule.startHour &&
        hour < rule.endHour,
    );

  return matchingRule?.hourlyRatePhp ?? court.hourlyRatePhp ?? fallbackSnapshot.venue.hourlyRate;
}

export function getAvailabilityRows(snapshot: VenueSnapshot) {
  const operatingWindow = parseOperatingWindowForDay(
    snapshot.venue.operatingHours,
    snapshot.selectedDate,
  );
  const currentDayContext = getCurrentScheduleContext();
  const hourRows = Array.from(
    {
      length: Math.max(0, operatingWindow.endHourExclusive - operatingWindow.startHour),
    },
    (_, index) => operatingWindow.startHour + index,
  );

  return hourRows.map((hourIndex) => {
    const startMinutes = hourIndex * 60;
    const endMinutes = startMinutes + 60;
    const time = minutesTo24HourString(startMinutes);
    const endTime = minutesTo24HourString(endMinutes);

    return {
      timeLabel: `${minutesToLabel(startMinutes)} - ${minutesToLabel(endMinutes)}`,
      startTime: time,
      endTime,
      startMinuteOffset: startMinutes,
      endMinuteOffset: endMinutes,
      courts: snapshot.courts.map((court) => {
        const booking = snapshot.bookings.find((entry) => {
          if (entry.courtId !== court.id) {
            return false;
          }

          const bookingStart = entry.startMinuteOffset ?? timeToMinutes(entry.startsAt);
          const bookingEnd = entry.endMinuteOffset ?? timeToMinutes(entry.endsAt);

          return startMinutes >= bookingStart && startMinutes < bookingEnd;
        });

        if (!booking) {
          if (isSlotUnavailableByTime(snapshot.selectedDate, startMinutes, currentDayContext)) {
            return {
              courtId: court.id,
              courtName: court.name,
              status: "unavailable" as const,
              label: "Unavailable",
              hourlyRatePhp: resolveHourlyRate(court, snapshot.selectedDate, hourIndex),
            };
          }

          return {
            courtId: court.id,
            courtName: court.name,
            status: "available" as const,
            label: "Open slot",
            hourlyRatePhp: resolveHourlyRate(court, snapshot.selectedDate, hourIndex),
          };
        }

        return {
          courtId: court.id,
          courtName: court.name,
          status: normalizeRenderableBookingStatus(booking.status),
          label: booking.reservationName,
          hourlyRatePhp: resolveHourlyRate(court, snapshot.selectedDate, hourIndex),
        };
      }),
    };
  });
}

function normalizeRenderableBookingStatus(
  status: string,
): Exclude<BookingStatus, "available"> {
  if (status === "hold" || status === "pending" || status === "booked") {
    return status;
  }

  if (status === "confirmed") {
    return "booked";
  }

  return "unavailable";
}

function isSlotUnavailableByTime(
  selectedDate: string,
  startMinutes: number,
  current: { dateKey: string; minutes: number },
) {
  if (selectedDate < current.dateKey) {
    return true;
  }

  if (selectedDate > current.dateKey) {
    return false;
  }

  return startMinutes < current.minutes;
}

function getCurrentScheduleContext() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const dateKey = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));

  return { dateKey, minutes };
}

function formatDateInput(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function minutesTo24HourString(value: number) {
  const normalized = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}
