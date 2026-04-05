import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import type { User } from "@/types/user";

interface UserProfileLike {
  display_name?: string | null;
  timezone?: string | null;
  default_locale?: string | null;
  created_at?: string | null;
}

export function getDisplayName(user: SupabaseAuthUser) {
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

export function toAppUser(user: SupabaseAuthUser, profile?: UserProfileLike | null): User {
  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.display_name?.trim() || getDisplayName(user),
    createdAt: user.created_at ?? profile?.created_at ?? new Date().toISOString(),
    timezone: profile?.timezone ?? (typeof user.user_metadata?.timezone === "string" ? user.user_metadata.timezone : undefined),
    defaultLocale: profile?.default_locale ?? (typeof user.user_metadata?.locale === "string" ? user.user_metadata.locale : undefined),
  };
}
