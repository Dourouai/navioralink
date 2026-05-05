import { analyticsOverview, rankingData, trendData } from "@/mock/analytics";
import { dashboardStats } from "@/mock/dashboard";
import { mockQrList } from "@/mock/qrs";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  ensureProfileForCurrentUserBrowser,
  updateCurrentProfileBrowser,
} from "@/lib/supabase/profiles-browser";
import { mergeAuthUserWithProfile } from "@/lib/supabase/profiles-shared";
import { toAppUser } from "@/lib/supabase/user";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import type { QRDraftFromAI } from "@/types/ai";
import type { PlanCode } from "@/types/billing";
import type { TencentCaptchaChallengePayload } from "@/types/tencent-captcha";

const wait = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getGoogleLinkedNotice(locale: Locale) {
  if (locale === "zh-Hant") {
    return "Google 帳號已綁定，之後可以直接使用 Google 登入。";
  }

  if (locale === "zh-Hans") {
    return "Google 账号已绑定，之后可以直接使用 Google 登录。";
  }

  return "Google is now linked. You can use it for sign-in next time.";
}

function requireSupabaseAuth() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase auth is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY first.");
  }
}

async function syncAuthLocaleMetadata(locale?: Locale | null) {
  if (!locale) {
    return;
  }

  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return;
  }

  const currentLocale = typeof user.user_metadata?.locale === "string" ? user.user_metadata.locale : null;
  if (currentLocale === locale) {
    return;
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      ...(user.user_metadata ?? {}),
      locale,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function login(payload: { email: string; password: string; locale?: Locale; captcha?: TencentCaptchaChallengePayload | null }) {
  requireSupabaseAuth();

  const normalizedEmail = normalizeEmail(payload.email);
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalizedEmail,
      password: payload.password,
      locale: payload.locale,
      captcha: payload.captcha ?? null,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | { token?: string | null; user?: ReturnType<typeof mergeAuthUserWithProfile>; message?: string }
    | null;

  if (!response.ok) {
    throw new Error(body?.message || "Unable to sign in right now.");
  }

  if (!body?.user) {
    throw new Error("Unable to load your account.");
  }

  return {
    token: body.token ?? null,
    user: body.user,
  };
}

export async function sendRegistrationOtp(payload: { email: string; locale: Locale; captcha?: TencentCaptchaChallengePayload | null }) {
  requireSupabaseAuth();

  const normalizedEmail = normalizeEmail(payload.email);
  const response = await fetch("/api/auth/register/send-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalizedEmail,
      locale: payload.locale,
      captcha: payload.captcha ?? null,
    }),
  });

  const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

  if (!response.ok) {
    throw new Error(body?.message || "Unable to send the verification code right now.");
  }

  return { ok: true };
}

export async function checkRegistrationEmailExists(payload: { email: string }) {
  requireSupabaseAuth();

  const normalizedEmail = normalizeEmail(payload.email);

  const response = await fetch("/api/auth/email-exists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalizedEmail,
    }),
  });

  const body = (await response.json().catch(() => null)) as { exists?: boolean; message?: string } | null;

  if (!response.ok) {
    throw new Error(body?.message || "Unable to verify this email right now.");
  }

  return {
    exists: Boolean(body?.exists),
  };
}

export async function verifyRegistrationOtp(payload: { email: string; verificationCode: string }) {
  requireSupabaseAuth();

  const normalizedEmail = normalizeEmail(payload.email);
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: payload.verificationCode,
    type: "email",
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user || !data.session?.access_token) {
    throw new Error("Unable to verify this code.");
  }

  await ensureProfileForCurrentUserBrowser();

  return {
    token: data.session?.access_token ?? null,
    user: toAppUser(data.user),
  };
}

export async function completeRegistration(payload: { password: string; locale: Locale }) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: payload.password,
    data: {
      locale: payload.locale,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const ensured = await ensureProfileForCurrentUserBrowser();
  const appUser = await updateCurrentProfileBrowser({
    defaultLocale: payload.locale,
  });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    token: session?.access_token ?? null,
    user: mergeAuthUserWithProfile(ensured.authUser, {
      ...ensured.profile,
      default_locale: appUser.defaultLocale ?? payload.locale,
      display_name: appUser.name ?? ensured.profile.display_name,
      timezone: appUser.timezone ?? ensured.profile.timezone,
    }),
  };
}

export async function loginWithGoogle(locale: Locale, nextPath?: string) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const redirectTo = new URL("/auth/callback", window.location.origin);
  redirectTo.searchParams.set("locale", locale);
  redirectTo.searchParams.set("next", nextPath?.startsWith("/") ? nextPath : withLocale(locale, "/dashboard"));

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function linkGoogleIdentity(locale: Locale) {
  requireSupabaseAuth();

  if (typeof window === "undefined") {
    throw new Error("Google linking is only available in the browser.");
  }

  const supabase = createBrowserSupabaseClient();
  const nextPath = `${withLocale(locale, "/settings")}?authNotice=${encodeURIComponent(getGoogleLinkedNotice(locale))}`;
  const redirectTo = new URL("/auth/callback", window.location.origin);
  redirectTo.searchParams.set("locale", locale);
  redirectTo.searchParams.set("next", nextPath);
  redirectTo.searchParams.set("authMode", "link-google");

  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export class ActivationCodeRedeemError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ActivationCodeRedeemError";
    this.code = code;
  }
}

export interface ActivationCodePreviewOption {
  strategy: "activate_now" | "queue_after_current" | "upgrade_difference" | "start_now";
  nextPlanCode: PlanCode;
  nextPlanName: "Free" | "Starter" | "Plus";
  nextPeriodEnd: string;
  queuedPlanCode: PlanCode | null;
  queuedPlanName: "Free" | "Starter" | "Plus" | null;
  queuedPeriodEnd: string | null;
}

export interface ActivationCodeRedemptionPreview {
  requiresChoice: boolean;
  currentPlanCode: PlanCode | null;
  currentPlanName: "Free" | "Starter" | "Plus" | null;
  currentPeriodEnd: string | null;
  targetPlanCode: PlanCode;
  targetPlanName: "Free" | "Starter" | "Plus";
  targetDurationMonths: number;
  recommendedStrategy: ActivationCodePreviewOption["strategy"];
  options: ActivationCodePreviewOption[];
}

export async function previewActivationCodeRedemption(payload: { code: string }) {
  requireSupabaseAuth();

  const response = await fetch("/api/billing/redeem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      action: "preview",
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        code?: string;
        message?: string;
        preview?: ActivationCodeRedemptionPreview;
      }
    | null;

  if (!response.ok || !body?.ok || !body.preview) {
    throw new ActivationCodeRedeemError(body?.message || "Unable to redeem this activation code right now.", body?.code);
  }

  return body.preview;
}

export async function redeemActivationCode(payload: {
  code: string;
  strategy?: ActivationCodePreviewOption["strategy"];
}) {
  requireSupabaseAuth();

  const response = await fetch("/api/billing/redeem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      action: "redeem",
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        code?: string;
        message?: string;
        redemption?: Record<string, unknown> | null;
        preview?: ActivationCodeRedemptionPreview;
      }
    | null;

  if (!response.ok || !body?.ok) {
    throw new ActivationCodeRedeemError(body?.message || "Unable to redeem this activation code right now.", body?.code);
  }

  return body.redemption ?? null;
}

export async function requestPlanDowngrade() {
  requireSupabaseAuth();

  const response = await fetch("/api/billing/downgrade", {
    method: "POST",
  });

  const body = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        code?: string;
        message?: string;
        currentPeriodEnd?: string | null;
        durationMonths?: number;
        remainingValue?: number;
      }
    | null;

  if (!response.ok || !body?.ok) {
    throw new Error(body?.message || "Unable to update the subscription right now.");
  }

  return {
    currentPeriodEnd: body.currentPeriodEnd ?? null,
    durationMonths: body.durationMonths ?? 0,
    remainingValue: body.remainingValue ?? 0,
  };
}

function getGoogleUnlinkedNotice(locale: Locale) {
  if (locale === "zh-Hant") {
    return "Google 帳號已解除綁定。";
  }

  if (locale === "zh-Hans") {
    return "Google 账号已解除绑定。";
  }

  return "Google has been unlinked from this account.";
}

export async function getConnectedAuthProviders() {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.getUserIdentities();

  if (error) {
    throw new Error(error.message);
  }

  const providers = Array.from(
    new Set(
      (data.identities ?? [])
        .map((identity) => identity.provider?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return providers;
}

export interface ConnectedAuthIdentity {
  identityId: string;
  provider: string;
}

export async function getConnectedAuthIdentities(): Promise<ConnectedAuthIdentity[]> {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.getUserIdentities();

  if (error) {
    throw new Error(error.message);
  }

  return (data.identities ?? [])
    .map((identity) => ({
      identityId: identity.identity_id,
      provider: identity.provider?.trim().toLowerCase() ?? "",
    }))
    .filter((identity) => identity.provider);
}

export async function unlinkGoogleIdentity(locale: Locale) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const { data, error: identitiesError } = await supabase.auth.getUserIdentities();

  if (identitiesError) {
    throw new Error(identitiesError.message);
  }

  const identities = data.identities ?? [];
  const googleIdentity = identities.find((identity) => identity.provider?.trim().toLowerCase() === "google");

  if (!googleIdentity) {
    throw new Error(locale === "zh-Hant" ? "目前沒有可解除的 Google 綁定。" : locale === "zh-Hans" ? "当前没有可解除的 Google 绑定。" : "There is no linked Google account to remove.");
  }

  if (identities.length < 2) {
    throw new Error(
      locale === "zh-Hant"
        ? "至少保留兩種登入方式後，才可解除 Google 綁定。"
        : locale === "zh-Hans"
          ? "至少保留两种登录方式后，才可解除 Google 绑定。"
          : "Keep at least one other sign-in method before unlinking Google.",
    );
  }

  const { error } = await supabase.auth.unlinkIdentity(googleIdentity);

  if (error) {
    throw new Error(error.message);
  }

  return {
    ok: true,
    notice: getGoogleUnlinkedNotice(locale),
  };
}

export async function resendVerificationEmail(payload: { email: string; locale: Locale }) {
  requireSupabaseAuth();

  const normalizedEmail = normalizeEmail(payload.email);
  const supabase = createBrowserSupabaseClient();
  const emailRedirectTo =
    typeof window === "undefined" ? undefined : new URL(withLocale(payload.locale, "/dashboard"), window.location.origin).toString();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalizedEmail,
    options: emailRedirectTo
      ? {
          emailRedirectTo,
        }
      : undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function requestPasswordReset(payload: { email: string; locale: Locale }) {
  requireSupabaseAuth();

  const normalizedEmail = normalizeEmail(payload.email);
  const supabase = createBrowserSupabaseClient();
  const redirectTo =
    typeof window === "undefined" ? undefined : new URL(withLocale(payload.locale, "/reset-password"), window.location.origin).toString();

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, redirectTo ? { redirectTo } : undefined);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function updateRecoveryPassword(payload: { newPassword: string }) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: payload.newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
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
  const updated = await updateCurrentProfileBrowser(payload);

  if (payload.defaultLocale) {
    await syncAuthLocaleMetadata(payload.defaultLocale as Locale).catch(() => undefined);
  }

  return updated;
}

export async function requestEmailChangeCode(payload: {
  newEmail: string;
  currentEmail?: string;
  locale: Locale;
}) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentEmail = normalizeEmail(payload.currentEmail?.trim() || user?.email || "");
  const normalizedNewEmail = normalizeEmail(payload.newEmail);

  if (!currentEmail) {
    throw new Error("Unable to verify your current account email.");
  }

  const { error } = await supabase.auth.updateUser({
    email: normalizedNewEmail,
    data: {
      ...(user?.user_metadata ?? {}),
      locale: payload.locale,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true, email: normalizedNewEmail };
}

export async function verifyCurrentPasswordForEmailChange(payload: {
  currentPassword: string;
  currentEmail?: string;
}) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  const currentEmail = normalizeEmail(payload.currentEmail?.trim() || (await supabase.auth.getUser()).data.user?.email || "");

  if (!currentEmail) {
    throw new Error("Unable to verify your current account email.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: currentEmail,
    password: payload.currentPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function updateAccountEmail(payload: { newEmail: string; verificationCode: string }) {
  requireSupabaseAuth();

  const normalizedEmail = normalizeEmail(payload.newEmail);
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
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

export async function requestPasswordChangeCode(locale: Locale) {
  requireSupabaseAuth();

  const supabase = createBrowserSupabaseClient();
  await syncAuthLocaleMetadata(locale).catch(() => undefined);
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
