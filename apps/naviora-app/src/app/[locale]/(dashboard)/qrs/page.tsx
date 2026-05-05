import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { QrListClient } from "@/features/qr-list/qr-list-client";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { buildPageMetadata } from "@/lib/metadata";
import { getEntriesServer } from "@/lib/supabase/entries-server";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "qrs");
}

export default async function QrListPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getMessages(locale);
  const items = await getEntriesServer({ summaryOnly: true });

  return (
    <div className="space-y-6">
      <PageHeader
        badge={locale === "zh-Hant" ? "入口管理" : "Entry Management"}
        title={t.qrs.title}
        description={t.qrs.subtitle}
        actions={
          <Link href={withLocale(locale, "/qrs/archived")}>
            <Button variant="secondary">{t.qrs.viewArchived}</Button>
          </Link>
        }
      />
      <QrListClient locale={locale} initialItems={items} />
    </div>
  );
}
