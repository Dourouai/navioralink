import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const isZh = locale === "zh-Hant";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 md:px-8">
      <Card className="space-y-5 p-7 md:p-9">
        <h1 className="text-3xl font-semibold text-slate-900">{isZh ? "服務條款" : "Terms of Service"}</h1>
        <p className="text-sm leading-7 text-slate-600">
          {isZh
            ? "此頁為 V1 前端占位內容，後續會補上完整的服務條款。"
            : "This is a V1 placeholder page. Full terms of service will be added in a later release."}
        </p>
        <Link href={withLocale(locale, "/")}>
          <Button variant="secondary">{isZh ? "返回首頁" : "Back to home"}</Button>
        </Link>
      </Card>
    </div>
  );
}
