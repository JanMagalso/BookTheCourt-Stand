export const DEFAULT_BOOKING_WINDOW_DAYS = 14;
export const BOOKING_WINDOW_DAY_VALUES = [7, 14, 21, 28, 35, 42, 49, 56] as const;

export function normalizeBookingWindowDays(
  value: unknown,
  fallback: number | null = DEFAULT_BOOKING_WINDOW_DAYS,
) {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return fallback;
  }

  const raw = String(value).trim().toLowerCase();
  if (!raw || raw === "none" || raw === "null" || raw === "no_limit") {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return BOOKING_WINDOW_DAY_VALUES.includes(
    parsed as (typeof BOOKING_WINDOW_DAY_VALUES)[number],
  )
    ? parsed
    : fallback;
}

export function formatBookingWindowLabel(days: number | null | undefined) {
  const normalized = normalizeBookingWindowDays(days, DEFAULT_BOOKING_WINDOW_DAYS);

  if (normalized === null) {
    return "No booking period limit";
  }

  if (normalized === 56) {
    return "2 months";
  }

  const weeks = normalized / 7;
  return `${weeks} week${weeks === 1 ? "" : "s"}`;
}

export function formatBookingWindowRestrictionMessage(
  days: number | null | undefined,
) {
  const normalized = normalizeBookingWindowDays(days, DEFAULT_BOOKING_WINDOW_DAYS);

  if (normalized === null) {
    return "Reservations are available without a future booking limit.";
  }

  return `Reservations are open only within the next ${formatBookingWindowLabel(normalized).toLowerCase()}.`;
}
