import { analyticsOverview, rankingData, trendData } from "@/mock/analytics";
import { dashboardStats } from "@/mock/dashboard";
import { mockQrList } from "@/mock/qrs";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { ensureProfileForCurrentUserBrowser, updateCurrentProfileBrowser } from "@/lib/supabase/profiles-browser";
import { mergeAuthUserWithProfile } from "@/lib/supabase/profiles-shared";
import { toAppUser } from "@/lib/supabase/user";
import type { QRDraftFromAI } from "@/types/ai";

const wait = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function requireSupabaseAuth() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase auth is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY first.");
  }
}

export async function login(payload: { email: string; password: string }) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Unable to load your account.");
  }

  const ensured = await ensureProfileForCurrentUserBrowser();

  return {
    token: data.session?.access_token ?? null,
    user: mergeAuthUserWithProfile(ensured.authUser, ensured.profile),
  };
}

export async function register(payload: { email: string; password: string }) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Unable to create your account.");
  }

  let appUser = toAppUser(data.user);

  if (data.session?.access_token) {
    const ensured = await ensureProfileForCurrentUserBrowser();
    appUser = mergeAuthUserWithProfile(ensured.authUser, ensured.profile);
  }

  return {
    token: data.session?.access_token ?? null,
    user: appUser,
  };
}

export async function logout() {
  if (!hasSupabaseEnv()) {
    return;
  }

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateAccountProfile(payload: { displayName?: string; timezone?: string; defaultLocale?: string }) {
  requireSupabaseAuth();
  return updateCurrentProfileBrowser(payload);
}

export async function requestEmailChangeCode(payload: {
  currentPassword: string;
  newEmail: string;
  currentEmail?: string;
}) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const currentEmail = payload.currentEmail?.trim() || (await supabase.auth.getUser()).data.user?.email || "";

  if (!currentEmail) {
    throw new Error("Unable to verify your current account email.");
  }

  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: currentEmail,
    password: payload.currentPassword,
  });

  if (passwordError) {
    throw new Error(passwordError.message);
  }

  const { error } = await supabase.auth.updateUser({
    email: payload.newEmail,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true, email: payload.newEmail };
}

export async function updateAccountEmail(payload: { newEmail: string; verificationCode: string }) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: payload.newEmail,
    token: payload.verificationCode,
    type: "email_change",
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Unable to update your email address.");
  }

  const ensured = await ensureProfileForCurrentUserBrowser();
  return mergeAuthUserWithProfile(data.user, ensured.profile);
}

export async function requestPasswordChangeCode() {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.reauthenticate();

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function updateAccountPassword(payload: { verificationCode: string; newPassword: string }) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: payload.newPassword,
    nonce: payload.verificationCode,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function getDashboardStats() {
  await wait(200);
  return dashboardStats;
}

export async function getQrList() {
  await wait(200);
  return mockQrList;
}

export async function getAnalyticsOverview() {
  await wait(200);
  return { overview: analyticsOverview, trendData, rankingData };
}

export async function chatWithQwen(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  locale: string
): Promise<{ reply: string; draft: Partial<QRDraftFromAI>; readyForReview: boolean }> {
  const res = await fetch("/api/qwen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, locale }),
  });
  const data = await res.json();
  return {
    reply: data.reply ?? "AI\u672a\u8fd4\u56de\u5185\u5bb9",
    draft: data.draft ?? {},
    readyForReview: Boolean(data.readyForReview),
  };
}
