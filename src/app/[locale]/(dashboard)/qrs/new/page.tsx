import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { buildPageMetadata } from "@/lib/metadata";
import { QrCreateFlow } from "@/features/qr-create/qr-create-flow";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "qrsNew");
}

export default async function NewQrPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getMessages(locale);

  return (
    <div className="space-y-6">
      <PageHeader
        badge={locale === "zh-Hant" ? "创建智能入口" : "Create Entry"}
        title={t.create.title}
        description={t.create.subtitle}
      />
      <QrCreateFlow locale={locale} />
    </div>
  );
}
