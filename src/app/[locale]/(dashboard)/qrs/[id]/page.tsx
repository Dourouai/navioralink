import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { QrDetailClient } from "@/features/qr-list/qr-detail-client";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { getEntryByIdServer } from "@/lib/supabase/entries-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const item = await getEntryByIdServer(id);

  if (!item) {
    return locale === "zh-Hant"
      ? { title: "入口詳情 | Naviora", description: "查看入口詳情與二維碼預覽。" }
      : { title: "Entry Details | Naviora", description: "View entry details and QR preview." };
  }

  return {
    title: locale === "zh-Hant" ? `${item.name} | 入口詳情` : `${item.name} | Entry Details`,
    description:
      locale === "zh-Hant"
        ? "查看預覽連結、二維碼預覽，並可進行編輯、下載與暫停。"
        : "View preview link and QR preview, with edit, download, and pause actions.",
  };
}

export default async function QrDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  const t = getMessages(locale);
  const item = await getEntryByIdServer(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge={locale === "zh-Hant" ? "入口詳情" : locale === "zh-Hans" ? "入口详情" : "Entry details"}
        title={item.name}
        description={
          locale === "zh-Hant"
            ? "查看預覽連結、二維碼預覽，並可編輯、下載與暫停。"
            : locale === "zh-Hans"
            ? "查看预览链接、二维码预览，并可编辑、下载与暂停。"
            : "View preview link and QR preview, with edit, download, and pause actions."
        }
        actions={
          <Link href={withLocale(locale, "/qrs")}>
            <Button variant="secondary">{t.analytics.backToList}</Button>
          </Link>
        }
      />

      <QrDetailClient locale={locale} item={item} />
    </div>
  );
}
