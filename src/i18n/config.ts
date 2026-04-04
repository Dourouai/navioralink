export const locales = ["zh-Hant", "zh-Hans", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

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
