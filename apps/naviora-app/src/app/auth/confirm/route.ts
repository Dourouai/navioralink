import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { defaultLocale, isLocale, withLocale, type Locale } from "@/i18n/config";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { ensureProfileForUserServer } from "@/lib/supabase/profiles-server";

const otpTypes = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email", "email_change"]);

function getLocaleFromSearch(value: string | null): Locale {
  if (value && isLocale(value)) {
    return value;
  }

  return defaultLocale;
}

function getLocaleFromPathname(pathname: string | null): Locale | null {
  if (!pathname) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0];

  return locale && isLocale(locale) ? locale : null;
}

function buildRedirectUrl(request: NextRequest, locale: Locale, path: string, authError?: string, authNotice?: string) {
  const redirectUrl = new URL(path, request.url);

  if (authError) {
    redirectUrl.searchParams.set("authError", authError);
  }

  if (authNotice) {
    redirectUrl.searchParams.set("authNotice", authNotice);
  }

  return redirectUrl;
}

function getVerifiedNotice(locale: Locale) {
  if (locale === "zh-Hant") {
    return "信箱已完成驗證，現在可以登入了。";
  }

  if (locale === "zh-Hans") {
    return "邮箱已完成验证，现在可以登录了。";
  }

  return "Email verified successfully. Please sign in.";
}

function resolveSafePath(request: NextRequest, locale: Locale, fallbackPath: string) {
  const requestUrl = new URL(request.url);
  const redirectTo = requestUrl.searchParams.get("redirect_to");

  if (redirectTo) {
    try {
      const nextUrl = new URL(redirectTo);
      const currentOrigin = new URL(request.url).origin;

      if (nextUrl.origin === currentOrigin) {
        return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      }
    } catch {
      // Ignore invalid absolute redirect urls.
    }
  }

  const nextPath = requestUrl.searchParams.get("next");
  if (nextPath?.startsWith("/")) {
    return nextPath;
  }

  return fallbackPath;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const redirectTo = requestUrl.searchParams.get("redirect_to");
  let locale = getLocaleFromSearch(requestUrl.searchParams.get("locale"));

  if (locale === defaultLocale) {
    try {
      const redirectUrl = redirectTo ? new URL(redirectTo) : null;
      const inferredFromRedirect = getLocaleFromPathname(redirectUrl?.pathname ?? null);
      if (inferredFromRedirect) {
        locale = inferredFromRedirect;
      }
    } catch {
      const inferredFromRedirect = getLocaleFromPathname(redirectTo);
      if (inferredFromRedirect) {
        locale = inferredFromRedirect;
      }
    }
  }

  const loginPath = withLocale(locale, "/login");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (!tokenHash || !type || !otpTypes.has(type as EmailOtpType)) {
    return NextResponse.redirect(buildRedirectUrl(request, locale, loginPath, "Unable to verify this link."));
  }

  const defaultNextPath = type === "recovery" ? withLocale(locale, "/reset-password") : withLocale(locale, "/dashboard");
  const safeNextPath = resolveSafePath(request, locale, defaultNextPath);
  const cookieStore = await cookies();
  const redirectResponse = NextResponse.redirect(buildRedirectUrl(request, locale, safeNextPath));
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(buildRedirectUrl(request, locale, loginPath, error.message));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      await ensureProfileForUserServer(user, {
        supabase,
        defaultLocale: locale,
      });
    } catch (profileError) {
      const message = profileError instanceof Error ? profileError.message : "Unable to verify this link.";
      return NextResponse.redirect(buildRedirectUrl(request, locale, loginPath, message));
    }
  }

  if (type === "email" || type === "signup") {
    const targetPath = safeNextPath === loginPath ? buildRedirectUrl(request, locale, loginPath, undefined, getVerifiedNotice(locale)) : buildRedirectUrl(request, locale, safeNextPath);
    return NextResponse.redirect(targetPath);
  }

  return redirectResponse;
}
