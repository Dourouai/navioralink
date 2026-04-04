import type { Metadata } from "next";

import type { Locale } from "@/i18n/config";
import { SettingsCenter } from "@/features/settings/settings-center";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "settings");
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  return <SettingsCenter locale={locale} />;
}
