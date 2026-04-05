import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { locales } from "@/i18n/config";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const publicPathsWithoutLocale = ["/api", "/_next", "/static", "/assets"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (publicPathsWithoutLocale.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return updateSupabaseSession(request);
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const path = pathname.slice("/en".length) || "/";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = path;
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  const localeMatch = pathname.match(/^\/([a-z]{2}(?:-[A-Z][a-zA-Z]+)?)(?:\/|$)/);
  const firstSegment = localeMatch?.[1];
  const hasLocalePrefix = Boolean(firstSegment && locales.includes(firstSegment as (typeof locales)[number]));

  if (hasLocalePrefix) {
    return updateSupabaseSession(request);
  }

  if (!pathname.startsWith("/.")) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/en${pathname}`;
    return updateSupabaseSession(request, NextResponse.rewrite(rewriteUrl));
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next|static|assets|favicon\\.ico|\\.well-known).*)"],
};
