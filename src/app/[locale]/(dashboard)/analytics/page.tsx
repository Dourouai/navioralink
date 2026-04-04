import type { Locale } from "@/i18n/config";
import { AnalyticsOverviewClient } from "@/features/analytics/analytics-overview-client";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "analytics");
}

export default async function AnalyticsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  return <AnalyticsOverviewClient locale={locale} />;
}
