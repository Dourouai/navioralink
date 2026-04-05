"use client";

import { createBrowserSupabaseClient } from "./browser";
import { type SupabaseProfileRow, fallbackDisplayName, mergeAuthUserWithProfile } from "./profiles-shared";

export async function ensureProfileForCurrentUserBrowser() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("You need to sign in first.");
  }

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

  return {
    authUser: user,
    profile: data as SupabaseProfileRow,
  };
}

export async function updateCurrentProfileBrowser(updates: {
  displayName?: string;
  timezone?: string;
  defaultLocale?: string;
}) {
  const supabase = createBrowserSupabaseClient();
  const ensured = await ensureProfileForCurrentUserBrowser();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: updates.displayName ?? ensured.profile.display_name,
      timezone: updates.timezone ?? ensured.profile.timezone,
      default_locale: updates.defaultLocale ?? ensured.profile.default_locale,
    })
    .eq("user_id", ensured.authUser.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mergeAuthUserWithProfile(ensured.authUser, data as SupabaseProfileRow);
}
