"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { locales, type Locale, withLocale } from "@/i18n/config";

interface LanguageSwitcherProps {
  locale: Locale;
  className?: string;
  direction?: "up" | "down";
}

const localeLabelMap: Record<Locale, string> = {
  en: "EN",
  "zh-Hant": "繁體",
  "zh-Hans": "简体",
};

export function LanguageSwitcher({ locale, className, direction = "up" }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const buildHref = (target: Locale) => {
    if (!pathname) return withLocale(target, "/");

    const segments = pathname.split("/").filter(Boolean);
    const hasLocalePrefix = segments.length > 0 && locales.includes(segments[0] as Locale);
    const normalizedPath = hasLocalePrefix ? `/${segments.slice(1).join("/")}` : pathname;

    return withLocale(target, normalizedPath === "/" ? "/" : normalizedPath);
  };

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={className ?? ""}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition hover:text-slate-900"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <Languages size={14} />
          <span>{localeLabelMap[locale]}</span>
          <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open ? (
          <div
            className={`absolute right-0 z-50 min-w-[190px] overflow-hidden rounded-[14px] border border-slate-200 bg-white/98 p-1.5 shadow-[0_24px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl ${
              direction === "up" ? "bottom-[calc(100%+10px)]" : "top-[calc(100%+10px)]"
            }`}
          >
            {locales.map((item) => {
              const active = item === locale;
              return (
                <Link
                  key={item}
                  href={buildHref(item)}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-[10px] px-3 py-2 text-sm transition ${
                    active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>{localeLabelMap[item]}</span>
                  {active ? <Check size={14} className="text-blue-600" /> : <span className="h-4 w-4" />}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
