"use client";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type { Locale } from "@/i18n/config";
import { buildVCardPagePath } from "@/lib/vcard";

interface VCardPublicLanguageSwitcherProps {
  locale: Locale;
  id: string;
  className?: string;
  tone?: "default" | "minimal";
}

export function VCardPublicLanguageSwitcher({ locale, id, className, tone = "default" }: VCardPublicLanguageSwitcherProps) {
  return (
    <LanguageSwitcher
      locale={locale}
      className={className ?? "shrink-0"}
      tone={tone}
      buildHref={(target, context) => {
        const nextSearchParams = new URLSearchParams(context.searchParams.toString());
        nextSearchParams.delete("locale");

        if (target === "en") {
          nextSearchParams.delete("lang");
        } else {
          nextSearchParams.set("lang", target);
        }

        const query = nextSearchParams.toString();
        const basePath = buildVCardPagePath(id);

        return query ? `${basePath}?${query}` : basePath;
      }}
    />
  );
}
