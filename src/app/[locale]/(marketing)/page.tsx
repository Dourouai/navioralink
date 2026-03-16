import Link from "next/link";
import { ArrowRight, Globe2, Layers3, QrCode, Sparkles, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getMessages(locale);

  const stepDescriptions =
    locale === "zh-Hant"
      ? [
          "先說清楚預設連結、語言或地區跳轉需求。",
          "AI 自動整理草稿，再由你手動確認與調整。",
          "完成樣式設計並生成可持續管理的動態二維碼。",
        ]
      : [
          "Describe the default URL and routing intent first.",
          "Let AI generate a draft, then review and edit manually.",
          "Finish the QR design and publish a manageable dynamic QR.",
        ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 md:px-8 md:pb-28">
      <section className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
        <div className="fade-up">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge tone="info">{t.home.badge}</Badge>
            <span className="rounded-full bg-white/78 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-white/75">
              {t.home.trustTitle}
            </span>
          </div>
          <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.04] tracking-tight text-slate-900 md:text-7xl">
            {t.home.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">{t.home.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href={withLocale(locale, "/register")}>
              <Button icon={<ArrowRight size={16} />}>{t.home.ctaPrimary}</Button>
            </Link>
            <Link href={withLocale(locale, "/login")}>
              <Button variant="secondary">{t.home.ctaSecondary}</Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
            {t.home.showcasePoints.map((item) => (
              <span key={item} className="rounded-full bg-white/82 px-3 py-1.5 ring-1 ring-[rgba(190,206,226,0.45)]">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {t.home.trustStats.map((item) => (
              <div key={item.label} className="rounded-[22px] bg-white/74 px-5 py-4 shadow-[0_12px_24px_rgba(31,55,92,0.04)] ring-1 ring-white/72">
                <div className="text-2xl font-semibold text-slate-900">{item.value}</div>
                <div className="mt-1 text-sm text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <Card className="relative overflow-hidden p-0">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(141,121,255,0.16)_0%,transparent_70%)]" />
          <div className="grid gap-4 p-6">
            <div className="rounded-[26px] bg-[linear-gradient(135deg,#162339_0%,#213a5f_100%)] px-5 py-5 text-white">
              <div className="flex items-center gap-2 text-sm text-sky-200">
                <Sparkles size={16} />
                Qwen 3.5 Plus
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                {locale === "zh-Hant"
                  ? "幫我做一個展會二維碼：英文用戶去英文頁，繁中用戶去繁中頁。"
                  : "Build an expo QR. Send English users to the EN page and Traditional Chinese users to the local page."}
              </p>
            </div>
            <div className="space-y-3 rounded-[24px] bg-[linear-gradient(135deg,#eff7ff_0%,#f5f1ff_100%)] p-5 ring-1 ring-[rgba(145,180,247,0.25)]">
              <div className="max-w-[78%] rounded-[18px] bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-[rgba(190,206,226,0.45)]">
                {locale === "zh-Hant" ? "預設連結是英文站，台灣要走繁中頁。" : "Default should be EN, and Taiwan should route to zh-Hant."}
              </div>
              <div className="ml-auto max-w-[84%] rounded-[18px] bg-white/88 px-4 py-3 text-sm text-slate-700 ring-1 ring-sky-100">
                {locale === "zh-Hant" ? "已整理為可編輯草稿，可直接進入確認。" : "Draft is ready to review with editable rules."}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[16px] bg-white px-3 py-3 ring-1 ring-[rgba(190,206,226,0.45)]">
                  <div className="text-xs text-slate-400">Rule mode</div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {locale === "zh-Hant" ? "語言模式" : "Language"}
                  </div>
                </div>
                <div className="rounded-[16px] bg-white px-3 py-3 ring-1 ring-[rgba(190,206,226,0.45)]">
                  <div className="text-xs text-slate-400">{t.common.defaultUrl}</div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-800">example.com/en</div>
                </div>
                <div className="rounded-[16px] bg-white px-3 py-3 ring-1 ring-[rgba(190,206,226,0.45)]">
                  <div className="text-xs text-slate-400">Status</div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {locale === "zh-Hant" ? "Ready to design" : "Ready to design"}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="surface-panel rounded-[18px] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">01</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{t.home.steps[0]}</div>
              </div>
              <div className="surface-panel rounded-[18px] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">02</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{t.home.steps[1]}</div>
              </div>
              <div className="surface-panel rounded-[18px] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">03</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{t.home.steps[2]}</div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section id="why-zaps" className="mt-16 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-7">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Layers3 size={16} className="text-sky-600" />
            {t.home.platformTitle}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">{t.home.platformBody}</p>
          <div className="mt-6 space-y-3">
            {t.home.platformCards.map((card) => (
              <div key={card.title} className="rounded-[20px] bg-white/84 px-4 py-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                <div className="text-sm font-semibold text-slate-900">{card.title}</div>
                <div className="mt-2 text-sm leading-7 text-slate-500">{card.body}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-7">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Wand2 size={16} className="text-violet-600" />
            {t.home.stepsTitle}
          </div>
          <div className="mt-6 space-y-3">
            {t.home.steps.map((step, index) => (
              <div key={step} className="rounded-[20px] bg-white/84 px-4 py-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1abef3_0%,#8b7cfb_100%)] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{step}</div>
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-500">{stepDescriptions[index]}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="capabilities" className="mt-16">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-1 rounded-full bg-[linear-gradient(180deg,#22bdf1_0%,#8c7cff_100%)]" />
          <h2 className="text-2xl font-semibold text-slate-900">{t.home.featuresTitle}</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {t.home.features.map((feature) => (
            <Card key={feature.title} className="fade-up">
              <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className="p-7">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Globe2 size={16} className="text-sky-600" />
            {t.home.scenariosTitle}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">{t.home.showcaseBody}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {t.home.scenarios.map((scenario) => (
              <div key={scenario} className="surface-panel rounded-[18px] p-4 text-sm font-medium text-slate-700">
                {scenario}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-7">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <QrCode size={16} className="text-teal-600" />
            {t.home.showcaseTitle}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">{t.home.platformBody}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {t.home.showcasePoints.map((item) => (
              <div key={item} className="rounded-[18px] bg-white/84 p-4 text-sm text-slate-700 ring-1 ring-[rgba(190,206,226,0.45)]">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="mt-16 p-8 text-center">
        <h2 className="text-3xl font-semibold text-slate-900">{t.home.footerCta}</h2>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={withLocale(locale, "/login")}>
            <Button variant="secondary">{t.nav.login}</Button>
          </Link>
          <Link href={withLocale(locale, "/register")}>
            <Button>{t.home.ctaPrimary}</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
