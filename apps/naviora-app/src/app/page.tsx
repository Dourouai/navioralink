import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { HomePageContent } from "@/features/marketing/home-page-content";
import { localePreferenceCookieName, resolveLocalePreference } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import { getCurrentAppUser } from "@/lib/supabase/server-auth";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveLocalePreference({
    cookieLocale: cookieStore.get(localePreferenceCookieName)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
  return buildPageMetadata(locale, "home");
}

export default async function RootPage() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveLocalePreference({
    cookieLocale: cookieStore.get(localePreferenceCookieName)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
  const currentUser = await getCurrentAppUser();

  return (
    <div className="min-h-screen">
      <MarketingHeader locale={locale} initialUser={currentUser} />
      <main>
        <HomePageContent locale={locale} />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
