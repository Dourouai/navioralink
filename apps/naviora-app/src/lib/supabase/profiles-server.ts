import type { SupabaseClient, User as SupabaseAuthUser } from "@supabase/supabase-js";

import { hasSupabaseEnv } from "./env";
import { buildProfileUpsertPayload, type SupabaseProfileRow } from "./profiles-shared";
import { createServerSupabaseClient } from "./server";
import { ensureDefaultFreeSubscription } from "./subscriptions-shared";

export async function ensureProfileForUserServer(
  user: SupabaseAuthUser,
  options?: {
    supabase?: SupabaseClient;
    defaultLocale?: string;
  },
) {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = options?.supabase ?? (await createServerSupabaseClient());
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("display_name, email_snapshot, timezone, default_locale")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(existingProfileError.message);
  }

  const payload = buildProfileUpsertPayload(user, {
    existingProfile: existingProfile ?? null,
    defaultLocale: options?.defaultLocale,
  });

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await ensureDefaultFreeSubscription(supabase);

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
