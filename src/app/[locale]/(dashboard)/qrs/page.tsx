import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { QrListClient } from "@/features/qr-list/qr-list-client";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { mockQrList } from "@/mock/qrs";
import Link from "next/link";

export default async function QrListPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getMessages(locale);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="QR Management"
        title={t.qrs.title}
        description={t.qrs.subtitle}
        actions={
          <Link href={withLocale(locale, "/qrs/new")}>
            <Button>{t.nav.create}</Button>
          </Link>
        }
      />
      <QrListClient locale={locale} initialItems={mockQrList} />
    </div>
  );
}
