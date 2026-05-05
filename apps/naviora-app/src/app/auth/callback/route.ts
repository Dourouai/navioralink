import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { defaultLocale, isLocale, withLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { ensureProfileForUserServer } from "@/lib/supabase/profiles-server";

function getLocaleFromSearch(value: string | null): Locale {
  if (value && isLocale(value)) {
    return value;
  }

  return defaultLocale;
}

function buildRedirectUrl(request: NextRequest, locale: Locale, path: string, authError?: string) {
  const redirectUrl = new URL(path, request.url);

  if (authError) {
    redirectUrl.searchParams.set("authError", authError);
  }

  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const locale = getLocaleFromSearch(requestUrl.searchParams.get("locale"));
  const t = getMessages(locale);
  const nextPath = requestUrl.searchParams.get("next");
  const authMode = requestUrl.searchParams.get("authMode");
  const safeNextPath = nextPath?.startsWith("/") ? nextPath : withLocale(locale, "/dashboard");
  const loginPath = withLocale(locale, "/login");
  const failurePath =
    authMode === "link-google"
      ? (() => {
          const nextUrl = new URL(safeNextPath, request.url);
          nextUrl.searchParams.delete("authNotice");
          return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
        })()
      : loginPath;

  const errorDescription = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");
  if (errorDescription) {
    return NextResponse.redirect(buildRedirectUrl(request, locale, failurePath, errorDescription));
  }

  const code = requestUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(buildRedirectUrl(request, locale, failurePath, "Unable to complete sign-in."));
  }

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

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(buildRedirectUrl(request, locale, failurePath, exchangeError.message));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(buildRedirectUrl(request, locale, failurePath, userError?.message ?? "Unable to load your account."));
  }

  if (!user.email?.trim()) {
    return NextResponse.redirect(buildRedirectUrl(request, locale, failurePath, t.auth.googleMissingEmail));
  }

  try {
    await ensureProfileForUserServer(user, {
      supabase,
      defaultLocale: locale,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load your account.";
    return NextResponse.redirect(buildRedirectUrl(request, locale, failurePath, message));
  }

  return redirectResponse;
}
