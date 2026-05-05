"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, Settings, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { logout } from "@/lib/services";
import type { User } from "@/types/user";

interface MarketingHeaderProps {
  locale: Locale;
  initialUser?: User | null;
}

function getWorkspaceActionLabel(locale: Locale) {
  if (locale === "zh-Hant") {
    return "前往工作台";
  }

  if (locale === "zh-Hans") {
    return "前往工作台";
  }

  return "Go to workspace";
}

export function MarketingHeader({ locale, initialUser }: MarketingHeaderProps) {
  const router = useRouter();
  const t = getMessages(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const workspaceActionLabel = getWorkspaceActionLabel(locale);
  const displayName = initialUser?.name?.trim() || initialUser?.email?.split("@")[0] || "N";
  const avatarLabel = displayName.slice(0, 1).toUpperCase();
  const links = [
    { href: withLocale(locale, "/pricing"), label: t.home.navLinks[2] },
    { href: withLocale(locale, "/support"), label: t.home.navLinks[3] },
  ];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    }

    function handleScroll() {
      setIsPinned(window.scrollY > 12);
    }

    handleScroll();
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setAccountMenuOpen(false);
      router.push(withLocale(locale, "/login"));
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-40 px-4 pt-3 md:px-6">
      <div
        className={`mx-auto w-full max-w-7xl rounded-[28px] transition-all duration-200 ${
          isPinned || menuOpen
            ? "border border-white/90 bg-white/94 shadow-[0_18px_42px_rgba(31,55,92,0.12)] ring-1 ring-[rgba(190,206,226,0.55)] backdrop-blur-xl"
            : "border border-transparent bg-transparent shadow-none ring-0 backdrop-blur-0"
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">
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
            {initialUser ? (
              <>
                <Link href={withLocale(locale, "/dashboard")} className="hidden md:inline-flex">
                  <Button className="px-4 md:px-5">{workspaceActionLabel}</Button>
                </Link>
                <div ref={accountMenuRef} className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((value) => !value)}
                    className="flex h-11 items-center gap-2 rounded-[16px] border border-white/80 bg-white/90 px-3 py-2 text-left shadow-[0_12px_24px_rgba(31,55,92,0.05)] ring-1 ring-[rgba(190,206,226,0.45)] transition hover:bg-white"
                    aria-label="Open account menu"
                    aria-expanded={accountMenuOpen}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#e9f6ff_0%,#f2efff_100%)] text-sm font-semibold text-sky-700">
                      {avatarLabel}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-500 transition ${accountMenuOpen ? "rotate-180" : "rotate-0"}`}
                    />
                  </button>
                  {accountMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+12px)] z-30 min-w-[200px] rounded-[24px] bg-white/96 p-2 shadow-[0_20px_40px_rgba(31,55,92,0.08)] ring-1 ring-[rgba(190,206,226,0.45)] backdrop-blur-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          router.push(withLocale(locale, "/upgrade"));
                        }}
                        className="flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <span>{t.common.upgrade}</span>
                        <Zap size={15} className="text-sky-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          router.push(withLocale(locale, "/settings"));
                        }}
                        className="flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <span>{t.common.settings}</span>
                        <Settings size={15} className="text-slate-500" />
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                      >
                        <span>{t.common.logout}</span>
                        <LogOut size={15} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Link href={withLocale(locale, "/login")} className="hidden md:inline-flex">
                  <Button variant="ghost">{t.nav.login}</Button>
                </Link>
                <Link href={withLocale(locale, "/register")} className="hidden md:inline-flex">
                  <Button className="px-4 md:px-5">{t.nav.register}</Button>
                </Link>
              </>
            )}
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
          <div className="border-t border-[rgba(190,206,226,0.4)] px-4 pb-4 pt-4 md:hidden">
            <div className="rounded-[24px] border border-white/80 bg-white/94 p-3 shadow-[0_20px_40px_rgba(31,55,92,0.08)] ring-1 ring-[rgba(190,206,226,0.45)] backdrop-blur-xl">
              {initialUser ? (
                <div className="mb-3 flex items-center gap-3 rounded-[18px] border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#e9f6ff_0%,#f2efff_100%)] text-sm font-semibold text-sky-700">
                    {avatarLabel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
                    <div className="truncate text-xs text-slate-500">{initialUser.email}</div>
                  </div>
                  <Link href={withLocale(locale, "/dashboard")} onClick={() => setMenuOpen(false)}>
                    <Button className="px-3 py-2 text-xs">{workspaceActionLabel}</Button>
                  </Link>
                </div>
              ) : null}
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
              {!initialUser ? (
                <div className="mt-3 grid gap-2">
                  <Link href={withLocale(locale, "/login")} onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full">
                      {t.nav.login}
                    </Button>
                  </Link>
                  <Link href={withLocale(locale, "/register")} onClick={() => setMenuOpen(false)}>
                    <Button className="w-full">{t.nav.register}</Button>
                  </Link>
                </div>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-slate-100 bg-slate-50/70 px-3 py-3">
                <span className="text-sm font-medium text-slate-500">Language</span>
                <LanguageSwitcher locale={locale} direction="up" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
