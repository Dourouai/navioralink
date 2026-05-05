export const locales = ["zh-Hant", "zh-Hans", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localePreferenceCookieName = "naviora_locale";
export const localeDisplayLabels: Record<Locale, string> = {
  "zh-Hant": "繁體",
  "zh-Hans": "简体",
  en: "EN",
};

// Locale without prefix in URL (e.g., "/" instead of "/en")
export const localePrefixless: Locale = "en";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function withLocale(locale: Locale, path: string) {
  // For the prefixless locale (English), don't add a prefix
  if (locale === localePrefixless) {
    return path.startsWith("/") ? path : `/${path}`;
  }
  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getLocaleDisplayLabel(locale: Locale) {
  return localeDisplayLabels[locale];
}

export function resolvePreferredLocale(source?: string | null): Locale {
  const normalized = source?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return defaultLocale;
  }

  if (
    normalized.includes("zh-hk") ||
    normalized.includes("zh-tw") ||
    normalized.includes("zh-mo") ||
    normalized.includes("zh-hant")
  ) {
    return "zh-Hant";
  }

  if (
    normalized.includes("zh-cn") ||
    normalized.includes("zh-sg") ||
    normalized.includes("zh-hans") ||
    normalized.startsWith("zh")
  ) {
    return "zh-Hans";
  }

  return "en";
}

export function resolveLocalePreference({
  locale,
  cookieLocale,
  acceptLanguage,
}: {
  locale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (locale && isLocale(locale)) {
    return locale;
  }

  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return resolvePreferredLocale(acceptLanguage);
}
