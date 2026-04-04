import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { locales } from "@/i18n/config";

const publicPathsWithoutLocale = ["/api", "/_next", "/static", "/assets"];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (publicPathsWithoutLocale.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.next();
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
    return NextResponse.next();
  }

  if (!pathname.startsWith("/.")) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/en${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|assets|favicon\\.ico|\\.well-known).*)"],
};