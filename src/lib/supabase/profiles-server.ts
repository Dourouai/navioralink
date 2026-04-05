import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { hasSupabaseEnv } from "./env";
import { type SupabaseProfileRow, fallbackDisplayName } from "./profiles-shared";
import { createServerSupabaseClient } from "./server";

export async function ensureProfileForUserServer(user: SupabaseAuthUser) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const payload = {
    user_id: user.id,
    display_name: fallbackDisplayName(user),
    timezone: typeof user.user_metadata?.timezone === "string" ? user.user_metadata.timezone : null,
    default_locale: "en",
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SupabaseProfileRow;
}

export async function getProfileForCurrentUserServer(userId: string) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SupabaseProfileRow | null) ?? null;
}
