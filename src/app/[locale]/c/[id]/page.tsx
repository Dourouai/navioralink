import type { Metadata } from "next";

import { VCardPublicPage } from "@/features/vcard/vcard-public-page";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

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

export default async function VCardContentPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;

  return <VCardPublicPage locale={locale} id={id} />;
}
