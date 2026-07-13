const MANILA_UTC_OFFSET = "+08:00";

export function toManilaBookingTimestamp(playDate: string, time: string) {
  return new Date(`${playDate}T${time}:00${MANILA_UTC_OFFSET}`).toISOString();
}
