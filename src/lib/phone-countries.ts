import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

import type { Locale } from "@/i18n/config";
import { COUNTRIES } from "@/lib/countries";

export interface CountrySelectOption {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
}

const FALLBACK_COUNTRY_NAMES = new Map(COUNTRIES.map((country) => [country.code, country]));
const COMMON_COUNTRY_CODES = ["CN", "HK", "TW", "SG", "JP", "US", "GB", "CA", "AU", "MY"] as const;
const PHONE_COUNTRY_CODES = getCountries();

function getDisplayName(code: string, locale: Locale) {
  try {
    const displayNames = new Intl.DisplayNames([locale === "en" ? "en" : locale, "en"], { type: "region" });
    const label = displayNames.of(code.toUpperCase());
    if (label) {
      return label;
    }
  } catch {
    // Ignore and fall back to our local labels.
  }

  const fallback = FALLBACK_COUNTRY_NAMES.get(code.toUpperCase());
  if (!fallback) {
    return code;
  }

  if (locale === "zh-Hant") {
    return fallback["zh-Hant"];
  }

  if (locale === "zh-Hans") {
    try {
      return fallback["zh-Hant"].normalize("NFKC").replaceAll("臺", "台");
    } catch {
      return fallback.en;
    }
  }

  return fallback.en;
}

function getEnglishName(code: string) {
  const fallback = FALLBACK_COUNTRY_NAMES.get(code.toUpperCase());
  return fallback?.en ?? code;
}

function sortCountryCodes(locale: Locale, countryCodes: string[]) {
  const commonSet = new Set(COMMON_COUNTRY_CODES);
  const primary = COMMON_COUNTRY_CODES.filter((code) => countryCodes.includes(code));
  const secondary = countryCodes
    .filter((code) => !commonSet.has(code as (typeof COMMON_COUNTRY_CODES)[number]))
    .sort((left, right) => getDisplayName(left, locale).localeCompare(getDisplayName(right, locale), locale));

  return [...primary, ...secondary];
}

const DIAL_CODES_BY_COUNTRY = new Map<string, string>(
  PHONE_COUNTRY_CODES.map((countryCode) => [countryCode, getCountryCallingCode(countryCode)]),
);

const COUNTRIES_BY_DIAL_CODE = new Map<string, string[]>();

PHONE_COUNTRY_CODES.forEach((countryCode) => {
  const dialCode = DIAL_CODES_BY_COUNTRY.get(countryCode);
  if (!dialCode) return;

  const current = COUNTRIES_BY_DIAL_CODE.get(dialCode) ?? [];
  current.push(countryCode);
  COUNTRIES_BY_DIAL_CODE.set(dialCode, current);
});

function getKeywords(code: string, dialCode?: string) {
  const fallback = FALLBACK_COUNTRY_NAMES.get(code.toUpperCase());
  return [
    code,
    dialCode ? `+${dialCode}` : "",
    dialCode ?? "",
    fallback?.en ?? "",
    fallback?.["zh-Hant"] ?? "",
    getDisplayName(code, "zh-Hans"),
  ]
    .filter(Boolean)
    .join(" ");
}

export function getRegionCountryOptions(locale: Locale): CountrySelectOption[] {
  const countryCodes = COUNTRIES.map((country) => country.code);

  return sortCountryCodes(locale, countryCodes).map((countryCode) => {
    const localizedLabel = getDisplayName(countryCode, locale);
    const englishLabel = getEnglishName(countryCode);

    return {
      value: countryCode,
      label: localizedLabel,
      description: locale === "en" || localizedLabel === englishLabel ? countryCode : `${englishLabel} · ${countryCode}`,
      keywords: getKeywords(countryCode),
    };
  });
}

export function getCallingCountryOptions(locale: Locale): CountrySelectOption[] {
  return sortCountryCodes(locale, PHONE_COUNTRY_CODES).map((countryCode) => {
    const localizedLabel = getDisplayName(countryCode, locale);
    const englishLabel = getEnglishName(countryCode);
    const dialCode = DIAL_CODES_BY_COUNTRY.get(countryCode) ?? "";

    return {
      value: countryCode,
      label: `${localizedLabel} · +${dialCode}`,
      description: locale === "en" || localizedLabel === englishLabel ? countryCode : `${englishLabel} · ${countryCode}`,
      keywords: getKeywords(countryCode, dialCode),
    };
  });
}

export function getCountryDialCode(countryCode?: string) {
  if (!countryCode) return undefined;
  return DIAL_CODES_BY_COUNTRY.get(countryCode.toUpperCase());
}

export function inferCountryCodeFromDialCode(dialCode?: string, preferredCountryCode?: string) {
  const normalizedDialCode = (dialCode ?? "").replace(/\D/g, "");
  if (!normalizedDialCode) return preferredCountryCode?.toUpperCase();

  const candidates = COUNTRIES_BY_DIAL_CODE.get(normalizedDialCode) ?? [];
  if (preferredCountryCode && candidates.includes(preferredCountryCode.toUpperCase())) {
    return preferredCountryCode.toUpperCase();
  }

  const commonCandidate = COMMON_COUNTRY_CODES.find((code) => candidates.includes(code));
  return commonCandidate ?? candidates[0];
}

export function isPhoneCountryCode(value: string): value is CountryCode {
  return PHONE_COUNTRY_CODES.includes(value as CountryCode);
}
