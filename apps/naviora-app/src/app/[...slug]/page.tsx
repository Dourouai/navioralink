import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import {
  isLocale,
  localePreferenceCookieName,
  resolveLocalePreference,
  withLocale,
} from "@/i18n/config";

/**
 * Catch-all route for paths without locale prefix
 * This serves as a fallback when middleware rewrite doesn't work
 * 
 * Redirects to the user's preferred locale path
 * Examples:
 * /pricing → /zh-Hans/pricing
 * /about/team → /about/team (when English is preferred)
 */
export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const { slug } = await params;

  if (slug.length > 0 && isLocale(slug[0])) {
    notFound();
  }

  const path = "/" + slug.join("/");
  const locale = resolveLocalePreference({
    cookieLocale: cookieStore.get(localePreferenceCookieName)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });

  redirect(withLocale(locale, path));
}
