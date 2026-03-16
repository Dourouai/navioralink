import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { QrCreateFlow } from "@/features/qr-create/qr-create-flow";

export default async function NewQrPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getMessages(locale);

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Create Flow"
        title={t.create.title}
        description={t.create.subtitle}
        actions={
          <>
            <Button variant="secondary">{t.common.saveDraft}</Button>
            <Button>{t.common.generate}</Button>
          </>
        }
      />
      <QrCreateFlow locale={locale} />
    </div>
  );
}
