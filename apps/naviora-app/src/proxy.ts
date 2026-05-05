import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  defaultLocale,
  getLocaleDisplayLabel,
  isLocale,
  localePreferenceCookieName,
  locales,
  type Locale,
  resolveLocalePreference,
  withLocale,
} from "@/i18n/config";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const publicPathsWithoutLocale = ["/api", "/auth", "/_next", "/static", "/assets"];
const APP_HOSTS = new Set(["naviora.link", "www.naviora.link"]);
const GO_HOSTS = new Set(["go.naviora.link"]);

type PublicLocale = Locale;
type IsolatedSurface = "content" | "go";
type NotFoundCopy = {
  locale: PublicLocale;
  badge: string;
  title: string;
  description: string;
  supporting: string;
  primaryLabel: string;
  primaryHref: string;
};

function normalizeHost(value: string | null) {
  return value?.split(":")[0]?.trim().toLowerCase() ?? "";
}

function isPreviewPath(pathname: string) {
  return /^\/preview\/[^/]+$/.test(pathname);
}

function isGoEntryPath(pathname: string) {
  return /^\/(?:l|s|c)\/[^/]+$/.test(pathname);
}

function resolveContentPageId(pathname: string) {
  const match = pathname.match(/^\/(?:(en|zh-Hans|zh-Hant)\/)?(?:c|card)\/([^/]+)$/);

  if (!match) {
    return null;
  }

  return {
    locale: match[1] as PublicLocale | undefined,
    id: match[2],
  };
}

function isLocalizedGoEntryPath(pathname: string) {
  return /^\/(?:(en|zh-Hans|zh-Hant)\/)?(?:l|s|c)\/[^/]+$/.test(pathname);
}

function isLocalizedPreviewPath(pathname: string) {
  return /^\/(?:(en|zh-Hans|zh-Hant)\/)?preview\/[^/]+$/.test(pathname);
}

function buildInternalLocalePath(locale: PublicLocale, pathname: string) {
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveRequestLocale(request: NextRequest): PublicLocale {
  return resolveLocalePreference({
    locale: request.nextUrl.searchParams.get("locale") ?? request.nextUrl.searchParams.get("lang"),
    cookieLocale: request.cookies.get(localePreferenceCookieName)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });
}

function applyLocalePreferenceCookie(response: NextResponse, locale: PublicLocale) {
  response.cookies.set(localePreferenceCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}

function getHomeHref(locale: PublicLocale) {
  const base = "https://www.naviora.link";

  if (locale === "en") {
    return `${base}/`;
  }

  return `${base}/${locale}`;
}

function getNotFoundCopy(host: string, locale: PublicLocale, surface?: IsolatedSurface): NotFoundCopy {
  const isGoHost = surface === "go" || GO_HOSTS.has(host);

  if (locale === "zh-Hant") {
    return isGoHost
      ? {
          locale,
          badge: "404 · 找不到這個短鏈入口",
          title: "這個網址不是有效的 go 入口",
          description: "go.naviora.link 只提供短鏈跳轉網址，必須使用完整的入口 slug 才能打開。",
          supporting: "請檢查分享連結是否完整，或回到 Naviora 首頁重新取得正確入口。",
          primaryLabel: "返回首頁",
          primaryHref: getHomeHref(locale),
        }
      : {
          locale,
          badge: "404 · 找不到這個公開內容",
          title: "這個內容連結目前無法開啟",
          description: "公開內容現在統一由 go.naviora.link 承載，必須使用完整的 /c、/s 或 /l 入口才能訪問。",
          supporting: "你可以重新確認分享連結，或先回到 Naviora 首頁繼續瀏覽。",
          primaryLabel: "返回首頁",
          primaryHref: getHomeHref(locale),
        };
  }

  if (locale === "zh-Hans") {
    return isGoHost
      ? {
          locale,
          badge: "404 · 找不到这个短链入口",
          title: "这个网址不是有效的 go 入口",
          description: "go.naviora.link 只提供短链跳转链接，必须使用完整的入口 slug 才能打开。",
          supporting: "请检查分享链接是否完整，或回到 Naviora 首页重新获取正确入口。",
          primaryLabel: "返回首页",
          primaryHref: getHomeHref(locale),
        }
      : {
          locale,
          badge: "404 · 找不到这个公开内容",
          title: "这个内容链接暂时无法打开",
          description: "公开内容现在统一由 go.naviora.link 承载，必须使用完整的 /c、/s 或 /l 入口才能访问。",
          supporting: "你可以重新确认分享链接，或先回到 Naviora 首页继续浏览。",
          primaryLabel: "返回首页",
          primaryHref: getHomeHref(locale),
        };
  }

  return isGoHost
    ? {
        locale,
        badge: "404 · Smart link not found",
        title: "This is not a valid go link",
        description: "go.naviora.link only serves published smart links, and it needs a full slug to open one.",
        supporting: "Please double-check the shared URL or head back to the Naviora homepage to continue.",
        primaryLabel: "Back to homepage",
        primaryHref: getHomeHref(locale),
      }
    : {
        locale,
        badge: "404 · Public content not found",
        title: "This public content link is not available",
        description: "Public content now lives under go.naviora.link, and it needs a full /c, /s, or /l path to open one.",
        supporting: "Please verify the shared URL or return to the Naviora homepage to keep browsing.",
        primaryLabel: "Back to homepage",
        primaryHref: getHomeHref(locale),
      };
}

function buildLanguageSwitcherHtml(request: NextRequest, activeLocale: PublicLocale) {
  const currentUrl = request.nextUrl.clone();
  const cookiePrefix = `${localePreferenceCookieName}=`;

  return `<label class="language-switcher" aria-label="Language">
    <span class="language-icon" aria-hidden="true"></span>
    <select class="language-select" onchange="if (this.value) { var option = this.options[this.selectedIndex]; document.cookie = '${cookiePrefix}' + encodeURIComponent((option && option.dataset && option.dataset.locale) || 'en') + '; Path=/; Max-Age=31536000; SameSite=Lax'; window.location.href = this.value; }">
      ${locales
    .map((value) => {
      const href = currentUrl.clone();
      href.searchParams.delete("locale");

      if (value === "en") {
        href.searchParams.delete("lang");
      } else {
        href.searchParams.set("lang", value);
      }

      const selected = activeLocale === value ? ' selected="selected"' : "";
      return `<option value="${escapeHtml(href.toString())}" data-locale="${escapeHtml(value)}"${selected}>${escapeHtml(getLocaleDisplayLabel(value))}</option>`;
    })
    .join("")}
    </select>
    <span class="language-chevron" aria-hidden="true"></span>
  </label>`;
}

function buildNotFoundHtml(copy: NotFoundCopy, request: NextRequest) {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(copy.locale)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${escapeHtml(copy.title)} · Naviora</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(73, 180, 255, 0.18), transparent 30%),
          radial-gradient(circle at top right, rgba(255, 171, 87, 0.18), transparent 24%),
          linear-gradient(180deg, #eef7ff 0%, #f8fbff 100%);
        color: #10233f;
      }
      main {
        flex: 1;
        display: grid;
        place-items: center;
        padding: 28px;
      }
      .shell {
        width: min(720px, 100%);
      }
      .card {
        position: relative;
        overflow: hidden;
        border-radius: 32px;
        padding: 36px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(175, 205, 232, 0.7);
        box-shadow: 0 32px 60px rgba(28, 62, 105, 0.12);
      }
      .card::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at top right, rgba(79, 154, 255, 0.12), transparent 28%),
          radial-gradient(circle at bottom left, rgba(255, 172, 92, 0.12), transparent 32%);
        pointer-events: none;
      }
      .content {
        position: relative;
        z-index: 1;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #1f5f95;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: linear-gradient(135deg, #1ea7ff, #ff9c43);
        box-shadow: 0 0 0 6px rgba(30, 167, 255, 0.14);
      }
      .badge {
        margin-top: 22px;
        display: inline-flex;
        border-radius: 999px;
        padding: 10px 14px;
        background: rgba(245, 249, 255, 0.95);
        border: 1px solid rgba(186, 211, 236, 0.8);
        color: #1b6aa8;
        font-size: 13px;
        font-weight: 700;
      }
      h1 {
        margin: 22px 0 14px;
        font-size: clamp(34px, 5vw, 52px);
        line-height: 1.02;
        letter-spacing: -0.04em;
      }
      p {
        margin: 0;
        color: #4e6480;
        font-size: 17px;
        line-height: 1.7;
      }
      .supporting {
        margin-top: 14px;
      }
      .actions {
        margin-top: 28px;
      }
      .page-footer {
        padding: 0 28px 28px;
        display: flex;
        justify-content: center;
      }
      .tail {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .language-switcher {
        position: relative;
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid rgba(190, 206, 226, 0.78);
        background: rgba(255, 255, 255, 0.92);
        padding: 0 40px 0 14px;
        min-height: 44px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
      }
      .language-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        margin-right: 8px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 8 6 6'/%3E%3Cpath d='m4 14 6-6 2-3'/%3E%3Cpath d='M2 5h12'/%3E%3Cpath d='M7 2h1'/%3E%3Cpath d='m22 22-5-10-5 10'/%3E%3Cpath d='M14 18h6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: 16px;
      }
      .language-select {
        min-height: 44px;
        border: 0;
        background: transparent;
        color: #1f2f46;
        font-size: 14px;
        font-weight: 600;
        padding: 0;
        outline: none;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
      }
      .language-chevron {
        position: absolute;
        right: 14px;
        top: 50%;
        width: 14px;
        height: 14px;
        transform: translateY(-50%);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2393a4b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: 14px;
        pointer-events: none;
      }
      .primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 0 22px;
        border-radius: 999px;
        background: linear-gradient(135deg, #0f7adf, #27a7f7);
        color: #fff;
        font-weight: 700;
        text-decoration: none;
        box-shadow: 0 18px 36px rgba(15, 122, 223, 0.24);
      }
      .primary:hover {
        filter: brightness(1.03);
      }
      .footer {
        text-align: center;
        color: #8aa0bf;
        font-size: 12px;
        font-weight: 700;
      }
      @media (max-width: 640px) {
        .card {
          padding: 28px;
          border-radius: 28px;
        }
        p {
          font-size: 16px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="shell">
        <div class="card">
          <div class="content">
            <div class="brand">
              <span class="dot"></span>
              <span>Naviora</span>
            </div>
            <div class="badge">${escapeHtml(copy.badge)}</div>
            <h1>${escapeHtml(copy.title)}</h1>
            <p>${escapeHtml(copy.description)}</p>
            <p class="supporting">${escapeHtml(copy.supporting)}</p>
            <div class="actions">
              <a class="primary" href="${escapeHtml(copy.primaryHref)}">${escapeHtml(copy.primaryLabel)}</a>
            </div>
          </div>
        </div>
      </section>
    </main>
    <footer class="page-footer">
      <div class="tail">
        ${buildLanguageSwitcherHtml(request, copy.locale)}
        <div class="footer">Powered by Naviora</div>
      </div>
    </footer>
  </body>
</html>`;
}

function buildNotFoundResponse(request: NextRequest, surface?: IsolatedSurface) {
  const locale = resolveRequestLocale(request);
  const host = normalizeHost(request.headers.get("host"));
  const html = buildNotFoundHtml(getNotFoundCopy(host, locale, surface), request);

  return new NextResponse(html, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  const host = normalizeHost(request.headers.get("host"));
  const preferredLocale = resolveRequestLocale(request);
  const explicitLocale = searchParams.get("locale");
  const isPublicFile = /\/[^/]+\.[^/]+$/.test(pathname);
  const localizedAuthMatch = pathname.match(/^\/(en|zh-Hans|zh-Hant)\/auth\/(callback|confirm)$/);

  if (explicitLocale && isLocale(explicitLocale) && !pathname.includes("/auth/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.searchParams.delete("locale");
    return applyLocalePreferenceCookie(NextResponse.redirect(redirectUrl, { status: 307 }), explicitLocale);
  }

  if (localizedAuthMatch) {
    const locale = localizedAuthMatch[1] as (typeof locales)[number];
    const authPath = `/auth/${localizedAuthMatch[2]}`;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = authPath;

    if (!redirectUrl.searchParams.has("locale")) {
      redirectUrl.searchParams.set("locale", locale);
    }

    if (authPath === "/auth/callback" && !redirectUrl.searchParams.has("next")) {
      redirectUrl.searchParams.set("next", withLocale(locale, "/dashboard"));
    }

    return NextResponse.redirect(redirectUrl, { status: 307 });
  }

  if (isPublicFile || publicPathsWithoutLocale.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const contentPage = resolveContentPageId(pathname);
  const goEntryPath = isLocalizedGoEntryPath(pathname);

  if (APP_HOSTS.has(host) && contentPage) {
    return buildNotFoundResponse(request, "content");
  }

  if (APP_HOSTS.has(host) && goEntryPath) {
    return buildNotFoundResponse(request, "go");
  }

  if (APP_HOSTS.has(host) && isLocalizedPreviewPath(pathname)) {
    return buildNotFoundResponse(request, "content");
  }

  if (GO_HOSTS.has(host) && !isGoEntryPath(pathname) && !isPreviewPath(pathname)) {
    return buildNotFoundResponse(request);
  }

  const localeMatch = pathname.match(/^\/([a-z]{2}(?:-[A-Z][a-zA-Z]+)?)(?:\/|$)/);
  const firstSegment = localeMatch?.[1];
  const resolvedLocale = firstSegment && isLocale(firstSegment) ? firstSegment : preferredLocale ?? defaultLocale;
  const hasOAuthParams =
    searchParams.has("code") ||
    searchParams.has("error") ||
    searchParams.has("error_description");
  const isOAuthLandingPath =
    pathname === "/" ||
    pathname === "/en" ||
    pathname === "/zh-Hans" ||
    pathname === "/zh-Hant";

  if (hasOAuthParams && isOAuthLandingPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/callback";

    if (!redirectUrl.searchParams.has("locale")) {
      redirectUrl.searchParams.set("locale", resolvedLocale);
    }

    if (!redirectUrl.searchParams.has("next")) {
      redirectUrl.searchParams.set("next", withLocale(resolvedLocale, "/dashboard"));
    }

    return NextResponse.redirect(redirectUrl, { status: 307 });
  }

  if (pathname === "/") {
    return updateSupabaseSession(request);
  }

  const hasLocalePrefix = Boolean(firstSegment && locales.includes(firstSegment as (typeof locales)[number]));

  if (hasLocalePrefix) {
    return updateSupabaseSession(request, applyLocalePreferenceCookie(NextResponse.next({ request }), resolvedLocale));
  }

  if (!pathname.startsWith("/.")) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = buildInternalLocalePath(resolvedLocale, pathname);
    return updateSupabaseSession(request, NextResponse.rewrite(rewriteUrl));
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next|static|assets|favicon\\.ico|\\.well-known|.*\\.[^/]+$).*)"],
};
