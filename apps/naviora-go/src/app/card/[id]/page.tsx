import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";

import { VCardPublicPageServer } from "@/features/vcard/vcard-public-page-server";
import { type Locale, resolveLocalePreference } from "@/i18n/config";
import {
  createEntryPasswordAccessCookieValue,
  getEntryPasswordAccessCookieName,
  hasEntryPasswordAccessCookie,
} from "@/lib/entry-password";
import {
  recordPublicVCardVisitByContentId,
  resolvePublicVCardPageDataByContentId,
} from "@/lib/supabase/public-vcard-server";
import { assertMonthlyVisitAllowanceForUser, PlanConstraintError } from "@/lib/supabase/subscription-controls";

export const revalidate = 300;
export const dynamic = "force-dynamic";

function getMissingMetadata(locale: Locale): Metadata {
  return {
    title: locale === "zh-Hant" ? "入口不存在 | Naviora" : locale === "zh-Hans" ? "入口不存在 | Naviora" : "Entry not found | Naviora",
    description:
      locale === "zh-Hant"
        ? "這個公開入口目前找不到，可能尚未發布、已被歸檔、已過期，或分享網址不正確。"
        : locale === "zh-Hans"
          ? "这个公开入口当前找不到，可能尚未发布、已被归档、已过期，或分享网址不正确。"
          : "This public entry could not be found. It may not be published yet, may have been archived, may have expired, or the shared URL may be incorrect.",
  };
}

function getPageMetadata(locale: Locale): Metadata {
  return {
    title: locale === "zh-Hant" ? "聯絡名片 | Naviora" : locale === "zh-Hans" ? "联系人名片 | Naviora" : "Contact card | Naviora",
    description:
      locale === "zh-Hant"
        ? "透過 Naviora 智能入口承接的聯絡名片頁。"
        : locale === "zh-Hans"
          ? "通过 Naviora 智能入口承接的联系人名片页。"
          : "A contact card page delivered through a Naviora smart entry.",
  };
}

async function resolvePublicLocale(searchParams: Promise<{ lang?: string; locale?: string; preview_token?: string }>) {
  const [resolvedSearchParams, headerStore, cookieStore] = await Promise.all([searchParams, headers(), cookies()]);
  return resolveLocalePreference({
    locale: resolvedSearchParams.lang ?? resolvedSearchParams.locale,
    cookieLocale: cookieStore.get("naviora_locale")?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });
}

function buildRedirectHref({
  slug,
  pathPrefix,
  previewToken,
  language,
}: {
  slug: string;
  pathPrefix: string;
  previewToken?: string | null;
  language?: string | null;
}) {
  const basePath = previewToken ? `/preview/${encodeURIComponent(previewToken)}` : `/${encodeURIComponent(pathPrefix)}/${encodeURIComponent(slug)}`;
  const params = new URLSearchParams();

  if (language && language !== "en") {
    params.set("lang", language);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; locale?: string; preview_token?: string }>;
}): Promise<Metadata> {
  const locale = await resolvePublicLocale(searchParams);
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const previewToken = resolvedSearchParams.preview_token?.trim();
  const pageData = await resolvePublicVCardPageDataByContentId(id, { previewToken });

  if (!pageData?.profile) {
    notFound();
    return getMissingMetadata(locale);
  }

  return getPageMetadata(locale);
}

export default async function VCardContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; locale?: string; preview_token?: string }>;
}) {
  const [{ id }, resolvedSearchParams, locale, cookieStore, headerStore] = await Promise.all([params, searchParams, resolvePublicLocale(searchParams), cookies(), headers()]);
  const previewToken = resolvedSearchParams.preview_token?.trim();
  const pageData = await resolvePublicVCardPageDataByContentId(id, { previewToken });
  const language = resolvedSearchParams.lang ?? resolvedSearchParams.locale ?? locale;

  if (!pageData?.profile) {
    notFound();
  }

  if (!previewToken) {
    try {
      await assertMonthlyVisitAllowanceForUser(pageData.entry.user_id);
    } catch (error) {
      if (error instanceof PlanConstraintError) {
        redirect(
          buildRedirectHref({
            slug: pageData.entry.slug,
            pathPrefix: pageData.entry.path_prefix,
            language,
          }),
        );
      }

      throw error;
    }
  }

  if (pageData.entry.password_hash) {
    const cookieName = getEntryPasswordAccessCookieName(pageData.entry.slug, pageData.entry.path_prefix);
    const cookieValue = cookieStore.get(cookieName)?.value;
    const expectedCookieValue = createEntryPasswordAccessCookieValue(pageData.entry.id, pageData.entry.password_hash);
    const hasAccess = hasEntryPasswordAccessCookie(cookieValue, pageData.entry.id, pageData.entry.password_hash);

    if (!hasAccess || cookieValue !== expectedCookieValue) {
      redirect(
        buildRedirectHref({
          slug: pageData.entry.slug,
          pathPrefix: pageData.entry.path_prefix,
          previewToken,
          language,
        }),
      );
    }
  }

  if (!previewToken) {
    const visitSearchParams = new URLSearchParams();

    Object.entries(resolvedSearchParams).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        visitSearchParams.set(key, value);
      }
    });

    after(async () => {
      try {
        await recordPublicVCardVisitByContentId({
          contentId: id,
          locale,
          headerStore,
          searchParams: visitSearchParams,
        });
      } catch (error) {
        console.error("Failed to record public vCard visit", error);
      }
    });
  }

  return <VCardPublicPageServer locale={locale} id={pageData.profile.contentId?.trim() || id} profile={pageData.profile} />;
}
