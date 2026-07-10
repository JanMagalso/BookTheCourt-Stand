import { createClient } from "@supabase/supabase-js";

let browserSupabaseClient: ReturnType<typeof createClient> | null = null;

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getPublicSupabaseKey());
}

export function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = getPublicSupabaseKey();

  if (!url || !publicKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  if (typeof window === "undefined") {
    return createClient(url, publicKey);
  }

  if (!browserSupabaseClient) {
    browserSupabaseClient = createClient(url, publicKey);
  }

  return browserSupabaseClient;
}

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase service role environment variables.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getPublicSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
