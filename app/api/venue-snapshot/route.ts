import { NextResponse } from "next/server";

import { getVenueSnapshot } from "@/lib/site-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = String(searchParams.get("date") ?? "").trim();

  const snapshot = await getVenueSnapshot(
    /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
  );

  return NextResponse.json(snapshot);
}
