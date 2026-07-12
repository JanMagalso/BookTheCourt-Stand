import { NextResponse } from "next/server";

import { createSupabaseServiceClient, hasSupabaseEnv } from "@/lib/supabase";

type RegisterProfilePayload = {
  userId?: string;
  displayName?: string;
};

export async function POST(request: Request) {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 503 },
    );
  }

  const payload = (await request.json()) as RegisterProfilePayload;
  const userId = String(payload.userId ?? "").trim();
  const displayName = String(payload.displayName ?? "").trim();

  if (!userId || !displayName) {
    return NextResponse.json(
      { error: "Missing required profile details." },
      { status: 400 },
    );
  }

  const supabaseAdmin = createSupabaseServiceClient();

  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      role: "player",
      display_name: displayName,
    },
    { onConflict: "id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "We created the account, but could not finish the player profile yet." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
