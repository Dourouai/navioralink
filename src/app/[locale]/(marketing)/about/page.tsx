import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const isZh = locale === "zh-Hant";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 md:px-8">
      <Card className="space-y-5 p-7 md:p-9">
        <h1 className="text-3xl font-semibold text-slate-900">{isZh ? "關於我們" : "About Us"}</h1>
        <p className="text-sm leading-7 text-slate-600">
          {isZh
            ? "Zaps Smart QR 是一個透過 AI 對話建立動態二維碼的 SaaS 工具。此頁為 V1 占位內容，後續會補上品牌介紹與團隊資訊。"
            : "Zaps Smart QR is a SaaS product for building dynamic QR codes through AI conversation. This page is a V1 placeholder and will later include full company details."}
        </p>
        <Link href={withLocale(locale, "/")}>
          <Button variant="secondary">{isZh ? "返回首頁" : "Back to home"}</Button>
        </Link>
      </Card>
    </div>
  );
}
