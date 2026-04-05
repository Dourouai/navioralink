import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv, hasSupabaseEnv } from "./env";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export function hasSupabaseAdminEnv() {
  return hasSupabaseEnv() && Boolean(serviceRoleKey);
}

export function createAdminSupabaseClient() {
  const { url } = getSupabaseEnv();

  if (!serviceRoleKey) {
    throw new Error("Supabase service role key is missing. Add SUPABASE_SERVICE_ROLE_KEY first.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
