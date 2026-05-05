"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronUp, LogOut, Menu, Settings, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { AppLogo } from "@/components/shared/app-logo";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { logout } from "@/lib/services";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types/user";

import { LanguageSwitcher } from "./language-switcher";

interface AppShellProps {
  locale: Locale;
  authEnabled?: boolean;
  initialUser?: User | null;
  children: React.ReactNode;
}

export function AppShell({ locale, authEnabled = false, initialUser, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = getMessages(locale);
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const syncUser = useAuthStore((state) => state.syncUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const items = [
    { key: "dashboard", href: withLocale(locale, "/dashboard"), label: t.nav.dashboard },
    { key: "create", href: withLocale(locale, "/qrs/new"), label: t.nav.create },
    { key: "qrs", href: withLocale(locale, "/qrs"), label: t.nav.qrs },
    { key: "analytics", href: withLocale(locale, "/analytics"), label: t.nav.analytics },
    { key: "files", href: withLocale(locale, "/files"), label: t.nav.files },
  ] as const;

  useEffect(() => {
    if (!authEnabled) {
      return;
    }

    if (initialUser) {
      setSession({ token: null, user: initialUser });
      return;
    }

    syncUser(null);
  }, [authEnabled, initialUser, setSession, syncUser]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearSession();
      router.push(withLocale(locale, "/login"));
      router.refresh();
    }
  }

  const displayUser = user ?? initialUser ?? null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-4 overflow-x-clip px-2 py-3 sm:px-3 sm:py-4 md:gap-6 md:px-5">
      {mobileNavOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close mobile navigation"
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed inset-x-3 top-20 z-50 rounded-[30px] bg-white/96 p-4 shadow-[0_24px_54px_rgba(15,23,42,0.16)] ring-1 ring-[rgba(190,206,226,0.5)] backdrop-blur-xl">
            <div className="flex items-center gap-3 rounded-[22px] bg-slate-50/80 px-4 py-4 ring-1 ring-slate-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#e9f6ff_0%,#f2efff_100%)] text-sm font-semibold text-sky-700">
                {displayUser?.name?.slice(0, 1) ?? "N"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{displayUser?.name ?? "Naviora User"}</div>
                <div className="truncate text-xs text-slate-500">{displayUser?.email ?? "hello@naviora.com"}</div>
              </div>
            </div>

            <nav className="mt-4 space-y-2">
              {items.map((item, index) => {
                const active = pathname ? pathname === item.href : false;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-[linear-gradient(135deg,rgba(99,188,248,0.16),rgba(141,121,255,0.11))] text-sky-700 shadow-[0_10px_22px_rgba(95,150,255,0.06)]"
                        : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full transition",
                        active ? "bg-[linear-gradient(135deg,#3eb9f3_0%,#8b7cfb_100%)]" : index % 2 === 0 ? "bg-slate-300" : "bg-slate-200",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => router.push(withLocale(locale, "/upgrade"))}
                className="flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span>{t.common.upgrade}</span>
                <Zap size={15} className="text-sky-600" />
              </button>
              <button
                type="button"
                onClick={() => router.push(withLocale(locale, "/settings"))}
                className="flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span>{t.common.settings}</span>
                <Settings size={15} className="text-slate-500" />
              </button>
              <div className="rounded-[18px] px-4 py-3">
                <LanguageSwitcher locale={locale} />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                <span>{t.common.logout}</span>
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <aside className="hidden w-[280px] shrink-0 rounded-[34px] bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(247,251,255,0.9))] p-5 shadow-[0_24px_50px_rgba(31,55,92,0.06)] ring-1 ring-white/85 lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col">
        <AppLogo href={withLocale(locale, "/dashboard")} subtitle="Workspace" />
        <nav className="mt-8 space-y-2">
          {items.map((item, index) => {
            const active = pathname ? pathname === item.href : false;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-[linear-gradient(135deg,rgba(99,188,248,0.16),rgba(141,121,255,0.11))] text-sky-700 shadow-[0_10px_22px_rgba(95,150,255,0.06)]"
                    : "text-slate-600 hover:bg-white/78",
                )}
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition",
                    active ? "bg-[linear-gradient(135deg,#3eb9f3_0%,#8b7cfb_100%)]" : index % 2 === 0 ? "bg-slate-300" : "bg-slate-200",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="relative mt-auto">
          {menuOpen ? (
            <div className="absolute bottom-[calc(100%+12px)] left-0 right-0 rounded-[24px] bg-white/96 p-2 shadow-[0_20px_40px_rgba(31,55,92,0.08)] ring-1 ring-[rgba(190,206,226,0.45)] backdrop-blur-xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  router.push(withLocale(locale, "/upgrade"));
                }}
                className="flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span>{t.common.upgrade}</span>
                <Zap size={15} className="text-sky-600" />
              </button>
              <button
                type="button"
                onClick={() => router.push(withLocale(locale, "/settings"))}
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
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex w-full items-center gap-3 rounded-[24px] bg-white/90 px-4 py-4 text-left shadow-[0_12px_24px_rgba(31,55,92,0.05)] ring-1 ring-[rgba(190,206,226,0.45)] transition hover:bg-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#e9f6ff_0%,#f2efff_100%)] text-sm font-semibold text-sky-700">
              {displayUser?.name?.slice(0, 1) ?? "Z"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{displayUser?.name ?? "Naviora User"}</div>
              <div className="truncate text-xs text-slate-500">{displayUser?.email ?? "hello@naviora.com"}</div>
            </div>
            <div className="ml-auto flex h-9 w-9 items-center justify-center rounded-[14px] bg-slate-50 text-slate-500 ring-1 ring-slate-200">
              <ChevronUp size={16} className={cn("transition", menuOpen ? "rotate-0" : "rotate-180")} />
            </div>
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex flex-1 flex-col overflow-x-clip">
        <div className="sticky top-2 z-30 mb-3 lg:hidden sm:top-3 sm:mb-4">
          <div className="flex items-center justify-between rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,251,255,0.94))] px-4 py-3 shadow-[0_14px_30px_rgba(31,55,92,0.08)] ring-1 ring-white/85 backdrop-blur-xl">
            <AppLogo href={withLocale(locale, "/dashboard")} className="min-w-0" />
            <button
              type="button"
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.06)] ring-1 ring-[rgba(190,206,226,0.5)]"
            >
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        <div className="flex-1">{children}</div>
        <footer className="mt-6 overflow-hidden rounded-[26px] bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(245,249,255,0.84))] px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ring-1 ring-white/80 md:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-600">Naviora</div>
              <div className="text-xs text-slate-400">
                {locale === "zh-Hant" ? "智能入口工作臺" : locale === "zh-Hans" ? "智能入口工作台" : "Smart entry workspace"}
              </div>
            </div>
            <div className="flex justify-start sm:justify-end">
              <LanguageSwitcher locale={locale} />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
