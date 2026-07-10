import type { Metadata } from "next";

import { BookTheCourtRegisterPage } from "@/components/bookthecourt-register-page";
import { getVenueSnapshot } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Create Account | BookTheCourt",
  description: "Create your BookTheCourt player account to book faster and manage reservations.",
};

export default async function RegisterPage() {
  const snapshot = await getVenueSnapshot();

  return <BookTheCourtRegisterPage venueName={snapshot.venue.name} />;
}
