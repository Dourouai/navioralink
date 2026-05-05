import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureDefaultFreeSubscription(supabase: SupabaseClient) {
  const { error } = await supabase.rpc("ensure_default_free_subscription");

  if (error) {
    throw new Error(error.message);
  }
}
