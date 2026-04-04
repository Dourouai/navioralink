"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

interface MarketingHeaderProps {
  locale: Locale;
}

export function MarketingHeader({ locale }: MarketingHeaderProps) {
  const t = getMessages(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { href: `${withLocale(locale, "/")}#why-naviora`, label: t.home.navLinks[0] },
    { href: `${withLocale(locale, "/")}#capabilities`, label: t.home.navLinks[1] },
    { href: withLocale(locale, "/pricing"), label: t.home.navLinks[2] },
  ];

  return (
    <header className="relative">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-6 md:px-8">
        <div className="min-w-0 flex-1">
          <AppLogo href={withLocale(locale, "/")} subtitle="Smart entry workspace" />
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
          {links.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button variant="ghost">{item.label}</Button>
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          <Link href={withLocale(locale, "/login")} className="hidden md:inline-flex">
            <Button variant="ghost">{t.nav.login}</Button>
          </Link>
          <Link href={withLocale(locale, "/register")}>
            <Button className="px-4 md:px-5">{t.nav.register}</Button>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/80 bg-white/88 text-slate-700 shadow-[0_12px_24px_rgba(31,55,92,0.06)] ring-1 ring-[rgba(190,206,226,0.45)] transition hover:bg-white md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="mx-auto w-full max-w-7xl px-4 pb-4 md:hidden">
          <div className="rounded-[24px] border border-white/80 bg-white/94 p-3 shadow-[0_20px_40px_rgba(31,55,92,0.08)] ring-1 ring-[rgba(190,206,226,0.45)] backdrop-blur-xl">
            <nav className="grid gap-2">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-[18px] px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-slate-100 bg-slate-50/70 px-3 py-3">
              <span className="text-sm font-medium text-slate-500">Language</span>
              <LanguageSwitcher locale={locale} direction="up" />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
