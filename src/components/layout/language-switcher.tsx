"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { locales, type Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  locale: Locale;
}

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const pathname = usePathname();

  const buildHref = (target: Locale) => {
    if (!pathname) return `/${target}`;
    const segments = pathname.split("/").filter(Boolean);
    if (!segments.length) return `/${target}`;
    segments[0] = target;
    return `/${segments.join("/")}`;
  };

  return (
    <div className="flex items-center gap-2 rounded-[16px] bg-white/80 p-1 ring-1 ring-slate-200">
      <span className="flex h-9 w-9 items-center justify-center text-slate-500">
        <Languages size={16} />
      </span>
      {locales.map((item) => (
        <Link key={item} href={buildHref(item)}>
          <Button variant={locale === item ? "primary" : "ghost"} className="h-9 px-3 py-2 text-xs">
            {item === "zh-Hant" ? "繁中" : "EN"}
          </Button>
        </Link>
      ))}
    </div>
  );
}
