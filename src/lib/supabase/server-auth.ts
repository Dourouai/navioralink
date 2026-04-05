import { hasSupabaseEnv } from "./env";
import { mergeAuthUserWithProfile } from "./profiles-shared";
import { ensureProfileForUserServer } from "./profiles-server";
import { createServerSupabaseClient } from "./server";

export async function getCurrentAppUser() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const profile = await ensureProfileForUserServer(user);
  return mergeAuthUserWithProfile(user, profile);
}
