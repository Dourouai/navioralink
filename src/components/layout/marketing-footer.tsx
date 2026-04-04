import Link from "next/link";

import { AppLogo } from "@/components/shared/app-logo";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

import { LanguageSwitcher } from "./language-switcher";

interface MarketingFooterProps {
  locale: Locale;
}

export function MarketingFooter({ locale }: MarketingFooterProps) {
  const t = getMessages(locale);
  const links = [
    { href: withLocale(locale, "/pricing"), label: t.home.footerLinks.pricing },
    { href: withLocale(locale, "/privacy"), label: t.home.footerLinks.privacy },
    { href: withLocale(locale, "/terms"), label: t.home.footerLinks.terms },
    { href: withLocale(locale, "/about"), label: t.home.footerLinks.about },
  ];

  return (
    <footer className="mx-auto mt-16 w-full max-w-7xl px-4 pb-10 md:px-8">
      <div className="rounded-[28px] bg-white/72 px-6 py-6 ring-1 ring-white/80 shadow-[0_12px_24px_rgba(31,55,92,0.04)]">
        <div className="space-y-2">
          <AppLogo href={withLocale(locale, "/")} subtitle="Smart entry workspace" />
          <p className="text-sm text-slate-500">{t.home.footerNote}</p>
        </div>
        <div className="mt-5 flex flex-col gap-4 border-t border-[rgba(190,206,226,0.4)] pt-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full bg-white/85 px-3 py-1.5 ring-1 ring-[rgba(190,206,226,0.45)] transition hover:text-slate-800"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <LanguageSwitcher locale={locale} />
        </div>
      </div>
    </footer>
  );
}
