export const openConfirmBookingEvent = "bookthecourt:open-confirm-booking";

export function openConfirmBookingPanel() {
  window.dispatchEvent(new Event(openConfirmBookingEvent));
}
