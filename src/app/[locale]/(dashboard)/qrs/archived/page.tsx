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
  return buildPageMetadata(locale, "qrsArchived");
}

export default async function QrArchivedPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getMessages(locale);
  const items = await getEntriesServer({ archivedOnly: true });

  return (
    <div className="space-y-6">
      <PageHeader
        badge={locale === "zh-Hant" ? "歸檔入口" : locale === "zh-Hans" ? "归档入口" : "Archived Entries"}
        title={locale === "zh-Hant" ? "歸檔入口" : locale === "zh-Hans" ? "归档入口" : "Archived Entries"}
        description={locale === "zh-Hant" ? "集中查看所有已歸檔入口，需要時可直接恢復回主列表。" : locale === "zh-Hans" ? "集中查看所有已归档入口，需要时可直接恢复回主列表。" : "Review all archived entries here and restore them back to the main list whenever you need."}
        actions={
          <Link href={withLocale(locale, "/qrs")}>
            <Button variant="secondary">{t.qrs.backToEntries}</Button>
          </Link>
        }
      />
      <QrListClient locale={locale} initialItems={items} archiveOnly />
    </div>
  );
}
