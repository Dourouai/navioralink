import type { Locale } from "@/i18n/config";

export function getIntlLocale(locale: Locale) {
  if (locale === "zh-Hant") {
    return "zh-Hant-TW";
  }

  if (locale === "zh-Hans") {
    return "zh-Hans-CN";
  }

  return "en-US";
}
