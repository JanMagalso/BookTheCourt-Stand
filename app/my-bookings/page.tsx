import type { Metadata } from "next";

import { BookTheCourtMyBookingsPage } from "@/components/bookthecourt-my-bookings-page";
import { getVenueSnapshot } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "My Bookings | BookTheCourt",
  description: "Sign in with your BookTheCourt account to review your venue reservations.",
};

export default async function MyBookingsPage() {
  const snapshot = await getVenueSnapshot();

  return (
    <BookTheCourtMyBookingsPage
      venueName={snapshot.venue.name}
      contactPhone={snapshot.venue.contactPhone}
    />
  );
}
