import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import type { User } from "@/types/user";

export interface SupabaseProfileRow {
  user_id: string;
  display_name: string | null;
  email_snapshot: string | null;
  timezone: string | null;
  default_locale: string;
  created_at: string;
  updated_at: string;
}

function normalizeEmailSnapshot(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

export function fallbackDisplayName(user: SupabaseAuthUser) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : null;

  if (metadataName?.trim()) {
    return metadataName.trim();
  }

  if (user.email?.includes("@")) {
    return user.email.split("@")[0];
  }

  return "Naviora User";
}

export function buildProfileUpsertPayload(
  user: SupabaseAuthUser,
  options?: {
    existingProfile?: Pick<SupabaseProfileRow, "display_name" | "email_snapshot" | "timezone" | "default_locale"> | null;
    defaultLocale?: string;
  },
) {
  const existingProfile = options?.existingProfile;
  const metadataTimezone = typeof user.user_metadata?.timezone === "string" ? user.user_metadata.timezone : null;
  const normalizedDisplayName = existingProfile?.display_name?.trim();
  const normalizedEmailSnapshot = normalizeEmailSnapshot(user.email);

  return {
    user_id: user.id,
    display_name: normalizedDisplayName || fallbackDisplayName(user),
    email_snapshot: normalizedEmailSnapshot ?? existingProfile?.email_snapshot ?? null,
    timezone: existingProfile?.timezone ?? metadataTimezone,
    default_locale: existingProfile?.default_locale ?? options?.defaultLocale ?? "en",
  };
}

export function mergeAuthUserWithProfile(user: SupabaseAuthUser, profile?: SupabaseProfileRow | null): User {
  return {
    id: user.id,
    email: user.email ?? profile?.email_snapshot ?? "",
    name: profile?.display_name?.trim() || fallbackDisplayName(user),
    createdAt: user.created_at ?? profile?.created_at ?? new Date().toISOString(),
    timezone:
      profile?.timezone ??
      (typeof user.user_metadata?.timezone === "string" ? user.user_metadata.timezone : undefined),
    defaultLocale: profile?.default_locale,
  };
}
