import type { Metadata } from "next";

import { BookTheCourtLoginPage } from "@/components/bookthecourt-login-page";
import { getVenueSnapshot } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Login | BookTheCourt",
  description: "Sign in with your BookTheCourt account to continue your reservation.",
};

export default async function LoginPage() {
  const snapshot = await getVenueSnapshot();

  return <BookTheCourtLoginPage venueName={snapshot.venue.name} />;
}
