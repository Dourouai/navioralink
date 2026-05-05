import Link from "next/link";

import { AppLogo } from "@/components/shared/app-logo";
import { getFreeToolsCopy } from "@/features/free-tools/free-tools-copy";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

import { LanguageSwitcher } from "./language-switcher";

interface MarketingFooterProps {
  locale: Locale;
}

function getFooterSectionTitles(locale: Locale) {
  if (locale === "zh-Hant") {
    return {
      product: "產品",
      support: "支持",
      legal: "法務",
      builtFor: "為品牌、活動與內容團隊打造",
      aiPowered: "Naviora AI Power 由 DeepSeek 與 Qwen 提供支援。",
    };
  }

  if (locale === "zh-Hans") {
    return {
      product: "产品",
      support: "支持",
      legal: "法务",
      builtFor: "为品牌、活动与内容团队打造",
      aiPowered: "Naviora AI Power 由 DeepSeek 与 Qwen 提供支持。",
    };
  }

  return {
    product: "Product",
    support: "Support",
    legal: "Legal",
    builtFor: "Built for brand, campaign, and content teams",
    aiPowered: "Naviora AI Power is supported by DeepSeek and Qwen.",
  };
}

export function MarketingFooter({ locale }: MarketingFooterProps) {
  const t = getMessages(locale);
  const sectionTitles = getFooterSectionTitles(locale);
  const freeToolsCopy = getFreeToolsCopy(locale);
  const linkGroups = [
    {
      title: sectionTitles.product,
      links: [
        { href: withLocale(locale, "/free-tools"), label: freeToolsCopy.footerLabel },
        { href: withLocale(locale, "/pricing"), label: t.home.footerLinks.pricing },
      ],
    },
    {
      title: sectionTitles.support,
      links: [
        { href: withLocale(locale, "/support"), label: t.home.footerLinks.support },
        { href: withLocale(locale, "/about"), label: t.home.footerLinks.about },
      ],
    },
    {
      title: sectionTitles.legal,
      links: [
        { href: withLocale(locale, "/privacy"), label: t.home.footerLinks.privacy },
        { href: withLocale(locale, "/refund-policy"), label: t.home.footerLinks.refundPolicy },
        { href: withLocale(locale, "/terms"), label: t.home.footerLinks.terms },
      ],
    },
  ];

  return (
    <footer className="mx-auto mt-16 w-full max-w-7xl px-4 pb-10 md:px-8">
      <div className="rounded-[28px] bg-white/72 px-6 py-6 shadow-[0_12px_24px_rgba(31,55,92,0.04)] ring-1 ring-white/80">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-3">
            <AppLogo href={withLocale(locale, "/")} subtitle="Smart entry workspace" />
            <p className="max-w-2xl text-sm leading-7 text-slate-500">{t.home.footerNote}</p>
            <div className="pt-1">
              <div className="inline-flex w-fit rounded-full bg-[linear-gradient(135deg,#eef7ff_0%,#f5f1ff_100%)] px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-[rgba(190,206,226,0.45)]">
                {sectionTitles.builtFor}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {linkGroups.map((group) => (
              <div key={group.title} className="rounded-[22px] bg-white/72 px-4 py-4 ring-1 ring-[rgba(190,206,226,0.35)]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{group.title}</div>
                <div className="mt-4 space-y-2.5">
                  {group.links.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block text-sm font-medium text-slate-600 transition hover:text-slate-900"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-[rgba(190,206,226,0.4)] pt-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs leading-6 text-slate-400">© 2026 Naviora. All rights reserved. · {sectionTitles.aiPowered}</p>
            <div className="flex justify-start md:justify-end">
              <LanguageSwitcher locale={locale} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
