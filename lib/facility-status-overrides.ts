import {
  DEFAULT_BOOKING_WINDOW_DAYS,
  normalizeBookingWindowDays,
} from "@/lib/booking-window";

const PH_TIME_ZONE = "Asia/Manila";

export function dateFromScheduleDateKey(dateKey: string, hour = 0) {
  return new Date(`${dateKey}T${String(hour).padStart(2, "0")}:00:00+08:00`);
}

export function getScheduleDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function shiftScheduleDateKey(dateKey: string, dayOffset: number) {
  const date = dateFromScheduleDateKey(dateKey, 12);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return getScheduleDateKey(date);
}

export function getOnlineBookingWindowEndDateKey(
  todayDateKey: string,
  bookingWindowDays: number | null = DEFAULT_BOOKING_WINDOW_DAYS,
) {
  const normalized = normalizeBookingWindowDays(
    bookingWindowDays,
    DEFAULT_BOOKING_WINDOW_DAYS,
  );

  if (normalized === null) {
    return null;
  }

  return shiftScheduleDateKey(todayDateKey, normalized);
}

export function isWithinOnlineBookingWindow(
  date: Date,
  now = new Date(),
  bookingWindowDays: number | null = DEFAULT_BOOKING_WINDOW_DAYS,
) {
  const dateKey = getScheduleDateKey(date);
  const todayDateKey = getScheduleDateKey(now);
  const endDateKey = getOnlineBookingWindowEndDateKey(
    todayDateKey,
    bookingWindowDays,
  );

  if (!endDateKey) {
    return true;
  }

  return dateKey <= endDateKey;
}
