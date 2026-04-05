import type { Locale } from "@/i18n/config";
import { AnalyticsOverviewClient } from "@/features/analytics/analytics-overview-client";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { getEntryAnalyticsDetailsServer } from "@/lib/supabase/analytics-server";
import { getEntriesServer } from "@/lib/supabase/entries-server";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "analytics");
}

export default async function AnalyticsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [initialItems, initialAnalyticsById] = await Promise.all([getEntriesServer(), getEntryAnalyticsDetailsServer()]);

  return <AnalyticsOverviewClient locale={locale} initialItems={initialItems} initialAnalyticsById={initialAnalyticsById} />;
}
