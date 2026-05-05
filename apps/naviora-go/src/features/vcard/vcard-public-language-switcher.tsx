"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { getLocaleDisplayLabel, localePreferenceCookieName, locales, type Locale } from "@/i18n/config";

interface VCardPublicLanguageSwitcherProps {
  locale: Locale;
  className?: string;
  tone?: "default" | "minimal";
}

export function VCardPublicLanguageSwitcher({ locale, className, tone = "default" }: VCardPublicLanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const outerStyle =
    tone === "minimal"
      ? {
          position: "relative" as const,
          display: "inline-flex",
          alignItems: "center",
          borderRadius: "999px",
          border: "1px solid rgba(190,206,226,0.55)",
          background: "rgba(255,255,255,0.72)",
          padding: "0 32px 0 12px",
          minHeight: "36px",
          boxShadow: "0 6px 14px rgba(15,23,42,0.03)",
          backdropFilter: "blur(12px)",
        }
      : {
          position: "relative" as const,
          display: "inline-flex",
          alignItems: "center",
          borderRadius: "999px",
          border: "1px solid rgba(190,206,226,0.78)",
          background: "rgba(255,255,255,0.92)",
          padding: "0 40px 0 14px",
          minHeight: "44px",
          boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
          backdropFilter: "blur(18px)",
        };

  const selectStyle =
    tone === "minimal"
      ? {
          minHeight: "36px",
          border: 0,
          background: "transparent",
          color: "#64748b",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          outline: "none",
          appearance: "none" as const,
          WebkitAppearance: "none" as const,
          padding: 0,
          cursor: isPending ? "wait" : "pointer",
        }
      : {
          minHeight: "44px",
          border: 0,
          background: "transparent",
          color: "#334155",
          fontSize: "14px",
          fontWeight: 600,
          outline: "none",
          appearance: "none" as const,
          WebkitAppearance: "none" as const,
          padding: 0,
          cursor: isPending ? "wait" : "pointer",
        };

  return (
    <div className={className}>
      <label style={outerStyle} aria-label="Language">
        <span
          aria-hidden="true"
          style={{
            width: tone === "minimal" ? "13px" : "15px",
            height: tone === "minimal" ? "13px" : "15px",
            marginRight: "8px",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 8 6 6'/%3E%3Cpath d='m4 14 6-6 2-3'/%3E%3Cpath d='M2 5h12'/%3E%3Cpath d='M7 2h1'/%3E%3Cpath d='m22 22-5-10-5 10'/%3E%3Cpath d='M14 18h6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "contain",
            flexShrink: 0,
            opacity: 0.78,
          }}
        />
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
              const nextSearchParams = new URLSearchParams(searchParams?.toString() ?? "");
              nextSearchParams.delete("locale");
              if (target === "en") {
                nextSearchParams.delete("lang");
              } else {
                nextSearchParams.set("lang", target);
              }

              const query = nextSearchParams.toString();
              const nextHref = query ? `${pathname}?${query}` : pathname;

              document.cookie = `${localePreferenceCookieName}=${encodeURIComponent(target)}; Path=/; Max-Age=31536000; SameSite=Lax`;
              router.push(nextHref);
            });
          }}
          style={selectStyle}
        >
          {locales.map((item) => (
            <option key={item} value={item}>
              {getLocaleDisplayLabel(item)}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: tone === "minimal" ? "12px" : "14px",
            top: "50%",
            width: tone === "minimal" ? "13px" : "14px",
            height: tone === "minimal" ? "13px" : "14px",
            transform: "translateY(-50%)",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2393a4b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "contain",
            pointerEvents: "none",
          }}
        />
      </label>
    </div>
  );
}
