"use client";

import { ChevronDown, Languages } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { getLocaleDisplayLabel, localePreferenceCookieName, locales, type Locale, withLocale } from "@/i18n/config";

interface LanguageSwitcherProps {
  locale: Locale;
  className?: string;
  direction?: "up" | "down";
  tone?: "default" | "minimal";
  buildHref?: (target: Locale, context: { pathname: string; searchParams: URLSearchParams }) => string;
}

export function LanguageSwitcher({ locale, className, direction = "up", tone = "default", buildHref: buildCustomHref }: LanguageSwitcherProps) {
  void direction;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const buildHref = (target: Locale) => {
    const currentPathname = pathname ?? "/";
    const nextSearchParams = new URLSearchParams(searchParams?.toString() ?? "");

    if (buildCustomHref) {
      return buildCustomHref(target, {
        pathname: currentPathname,
        searchParams: nextSearchParams,
      });
    }

    const segments = currentPathname.split("/").filter(Boolean);
    const hasLocalePrefix = segments.length > 0 && locales.includes(segments[0] as Locale);
    const normalizedPath = hasLocalePrefix ? `/${segments.slice(1).join("/")}` : currentPathname;
    const localizedPath = withLocale(target, normalizedPath === "/" ? "/" : normalizedPath);

    nextSearchParams.delete("lang");
    nextSearchParams.set("locale", target);
    const query = nextSearchParams.toString();

    return query ? `${localizedPath}?${query}` : localizedPath;
  };

  const containerClassName =
    tone === "minimal"
      ? "relative inline-flex items-center rounded-full border border-[rgba(190,206,226,0.55)] bg-white/72 pl-2.5 pr-8 shadow-[0_6px_14px_rgba(15,23,42,0.03)] backdrop-blur-md"
      : "relative inline-flex items-center rounded-full border border-[rgba(190,206,226,0.78)] bg-white/92 pl-3 pr-10 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl";
  const iconClassName = tone === "minimal" ? "shrink-0 text-slate-400" : "shrink-0 text-slate-500";
  const selectClassName =
    tone === "minimal"
      ? "h-9 appearance-none bg-transparent pl-2 pr-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 outline-none disabled:cursor-wait"
      : "h-11 appearance-none bg-transparent pl-2 pr-2 text-sm font-medium text-slate-700 outline-none disabled:cursor-wait";
  const chevronClassName = tone === "minimal" ? "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" : "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400";

  return (
    <div className={className ?? ""}>
      <div className={containerClassName}>
        <Languages size={tone === "minimal" ? 13 : 15} className={iconClassName} />
        <select
          value={locale}
          disabled={isPending}
          aria-label="Change language"
          onChange={(event) => {
            const target = event.target.value as Locale;

            if (target === locale) {
              return;
            }

            startTransition(() => {
              document.cookie = `${localePreferenceCookieName}=${encodeURIComponent(target)}; Path=/; Max-Age=31536000; SameSite=Lax`;
              router.push(buildHref(target));
            });
          }}
          className={selectClassName}
        >
          {locales.map((item) => (
            <option key={item} value={item}>
              {getLocaleDisplayLabel(item)}
            </option>
          ))}
        </select>
        <ChevronDown size={tone === "minimal" ? 13 : 14} className={chevronClassName} />
      </div>
    </div>
  );
}
