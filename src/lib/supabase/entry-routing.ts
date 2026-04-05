import type { NextRequest } from "next/server";

import { buildVCardPagePath, buildVCardPageUrl } from "@/lib/vcard";

import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "./admin";
import { type SupabaseEntryRow, type SupabaseEntryRuleRow, type SupabaseEntryTargetRow, buildVCardUrl, buildWhatsAppUrl, resolveTargetUrl } from "./entries-shared";

interface ResolvedPublicEntry {
  entry: SupabaseEntryRow;
  target: SupabaseEntryTargetRow;
  resolvedUrl: string;
  visit: {
    locale: string | null;
    countryCode: string | null;
    regionCode: string | null;
    deviceType: string | null;
    deviceOs: string | null;
    language: string | null;
    referrer: string | null;
    userAgent: string | null;
  };
}

const LANGUAGE_ALIASES: Record<string, string> = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  english: "en",
  zh: "zh-hans",
  "zh-cn": "zh-hans",
  "zh-hans": "zh-hans",
  "zh-sg": "zh-hans",
  简体中文: "zh-hans",
  simplified: "zh-hans",
  "simplified chinese": "zh-hans",
  "zh-hk": "zh-hant",
  "zh-tw": "zh-hant",
  "zh-hant": "zh-hant",
  "zh-mo": "zh-hant",
  繁體中文: "zh-hant",
  繁体中文: "zh-hant",
  traditional: "zh-hant",
  "traditional chinese": "zh-hant",
  ja: "ja",
  "ja-jp": "ja",
  japanese: "ja",
  日本語: "ja",
};

const REGION_ALIASES: Record<string, string> = {
  hk: "hk",
  "hong kong": "hk",
  hongkong: "hk",
  tw: "tw",
  taiwan: "tw",
  jp: "jp",
  japan: "jp",
  us: "us",
  usa: "us",
  "united states": "us",
  sg: "sg",
  singapore: "sg",
  cn: "cn",
  china: "cn",
  uk: "uk",
  "united kingdom": "uk",
  gb: "uk",
};

const OS_ALIASES: Record<string, string> = {
  ios: "ios",
  iphone: "ios",
  android: "android",
  ipados: "ipados",
  ipad: "ipados",
  windows: "windows",
  macos: "macos",
  mac: "macos",
};

function createStableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function normalizeLanguageValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

function normalizeRegionValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return REGION_ALIASES[normalized] ?? normalized;
}

function normalizeOsValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return OS_ALIASES[normalized] ?? normalized;
}

function getLanguageCandidates(request: NextRequest) {
  const candidates = new Set<string>();
  const explicit = request.nextUrl.searchParams.get("lang") ?? request.nextUrl.searchParams.get("locale");
  const acceptLanguage = request.headers.get("accept-language");

  if (explicit?.trim()) {
    candidates.add(normalizeLanguageValue(explicit));
  }

  acceptLanguage
    ?.split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean)
    .forEach((part) => {
      candidates.add(normalizeLanguageValue(part));

      const base = part.toLowerCase().split("-")[0];
      if (base) {
        candidates.add(normalizeLanguageValue(base));
      }
    });

  return Array.from(candidates);
}

function getRegionCandidates(request: NextRequest) {
  const candidates = new Set<string>();
  const explicitCountry = request.nextUrl.searchParams.get("country");
  const explicitRegion = request.nextUrl.searchParams.get("region");
  const headerCountry = request.headers.get("x-vercel-ip-country");
  const headerRegion = request.headers.get("x-vercel-ip-country-region");

  [explicitCountry, explicitRegion, headerCountry, headerRegion]
    .filter((value): value is string => Boolean(value?.trim()))
    .forEach((value) => {
      candidates.add(normalizeRegionValue(value));
    });

  return Array.from(candidates);
}

function parseDeviceFromUserAgent(userAgent: string | null) {
  const source = userAgent?.toLowerCase() ?? "";

  if (!source) {
    return { deviceType: null, deviceOs: null };
  }

  if (source.includes("ipad")) {
    return { deviceType: "Tablet", deviceOs: "iPadOS" };
  }

  if (source.includes("iphone") || source.includes("ipod")) {
    return { deviceType: "Mobile", deviceOs: "iOS" };
  }

  if (source.includes("android")) {
    return {
      deviceType: source.includes("tablet") ? "Tablet" : "Mobile",
      deviceOs: "Android",
    };
  }

  if (source.includes("windows")) {
    return { deviceType: "Desktop", deviceOs: "Windows" };
  }

  if (source.includes("mac os x") || source.includes("macintosh")) {
    return { deviceType: "Desktop", deviceOs: "macOS" };
  }

  return { deviceType: "Desktop", deviceOs: "Other" };
}

function getOsCandidates(request: NextRequest) {
  const candidates = new Set<string>();
  const explicit = request.nextUrl.searchParams.get("os");
  const parsed = parseDeviceFromUserAgent(request.headers.get("user-agent"));

  if (explicit?.trim()) {
    candidates.add(normalizeOsValue(explicit));
  }

  if (parsed.deviceOs) {
    candidates.add(normalizeOsValue(parsed.deviceOs));
  }

  return {
    candidates: Array.from(candidates),
    parsedDeviceType: parsed.deviceType,
    parsedDeviceOs: parsed.deviceOs,
  };
}

function resolvePublicTargetUrl(target: SupabaseEntryTargetRow, request: NextRequest, locale: string) {
  if (target.kind === "whatsapp") {
    return buildWhatsAppUrl(target.whatsapp) || target.url || "";
  }

  if (target.kind === "vcard") {
    const contentId = target.vcard?.contentId;
    if (!contentId) {
      return buildVCardUrl(target.vcard, target.url);
    }

    const host = request.headers.get("host") ?? "";
    const isLocalLikeHost = host.includes("localhost") || host.includes("127.0.0.1") || host.includes("vercel.app");

    if (isLocalLikeHost) {
      return new URL(`/${locale}${buildVCardPagePath(contentId)}`, request.url).toString();
    }

    return buildVCardPageUrl(contentId);
  }

  return resolveTargetUrl(target);
}

function chooseAbTarget(
  request: NextRequest,
  entry: SupabaseEntryRow,
  rules: SupabaseEntryRuleRow[],
  targetsById: Map<string, SupabaseEntryTargetRow>,
) {
  const fingerprint =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("user-agent") ||
    request.headers.get("accept-language") ||
    "anonymous";
  const bucket = createStableHash(`${entry.slug}:${fingerprint}`) % 100;
  let current = 0;

  for (const rule of rules) {
    const weight = Math.max(0, Math.min(100, rule.weight ?? 0));
    current += weight;
    if (bucket < current) {
      return targetsById.get(rule.target_id ?? "") ?? null;
    }
  }

  return targetsById.get(rules[0]?.target_id ?? "") ?? null;
}

export async function resolvePublicEntryBySlug(request: NextRequest, slug: string, locale: string) {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data: entry, error: entryError } = await supabase.from("entries").select("*").eq("slug", slug).maybeSingle();

  if (entryError) {
    throw new Error(entryError.message);
  }

  if (!entry) {
    return null;
  }

  const typedEntry = entry as SupabaseEntryRow;
  if (typedEntry.status !== "active") {
    return null;
  }

  if (typedEntry.expires_at && new Date(typedEntry.expires_at) < new Date()) {
    return null;
  }

  const [{ data: targets, error: targetsError }, { data: rules, error: rulesError }] = await Promise.all([
    supabase.from("entry_targets").select("*").eq("entry_id", typedEntry.id).order("sort_order", { ascending: true }),
    supabase.from("entry_rules").select("*").eq("entry_id", typedEntry.id).order("sort_order", { ascending: true }),
  ]);

  if (targetsError) {
    throw new Error(targetsError.message);
  }

  if (rulesError) {
    throw new Error(rulesError.message);
  }

  const typedTargets = (targets ?? []) as SupabaseEntryTargetRow[];
  const typedRules = (rules ?? []) as SupabaseEntryRuleRow[];
  const targetsById = new Map(typedTargets.map((target) => [target.id, target]));
  const defaultTarget = typedTargets.find((target) => target.is_default) ?? typedTargets[0] ?? null;

  if (!defaultTarget) {
    return null;
  }

  let matchedTarget = defaultTarget;

  if (typedEntry.rule_mode === "language") {
    const candidates = getLanguageCandidates(request);
    const matchedRule = typedRules.find((rule) => candidates.includes(normalizeLanguageValue(rule.language ?? "")));
    matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
  } else if (typedEntry.rule_mode === "region") {
    const candidates = getRegionCandidates(request);
    const matchedRule = typedRules.find((rule) => candidates.includes(normalizeRegionValue(rule.region ?? "")));
    matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
  } else if (typedEntry.rule_mode === "device") {
    const { candidates } = getOsCandidates(request);
    const matchedRule = typedRules.find((rule) => candidates.includes(normalizeOsValue(rule.device_os ?? "")));
    matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
  } else if (typedEntry.rule_mode === "param") {
    const matchedRule = typedRules.find((rule) => {
      const key = rule.param_key?.trim();
      const value = rule.param_value?.trim();
      if (!key || !value) {
        return false;
      }

      return request.nextUrl.searchParams.get(key) === value;
    });
    matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
  } else if (typedEntry.rule_mode === "ab") {
    matchedTarget = chooseAbTarget(request, typedEntry, typedRules, targetsById) || defaultTarget;
  }

  const referrer = request.headers.get("referer");
  const userAgent = request.headers.get("user-agent");
  const { parsedDeviceType, parsedDeviceOs } = getOsCandidates(request);
  const languages = getLanguageCandidates(request);
  const resolvedUrl = resolvePublicTargetUrl(matchedTarget, request, locale);

  if (!resolvedUrl) {
    return null;
  }

  const regionCode = request.nextUrl.searchParams.get("region")?.trim() || request.headers.get("x-vercel-ip-country-region");
  const countryCode = request.nextUrl.searchParams.get("country")?.trim() || request.headers.get("x-vercel-ip-country");

  return {
    entry: typedEntry,
    target: matchedTarget,
    resolvedUrl,
    visit: {
      locale: languages[0] ?? locale ?? null,
      countryCode: countryCode?.toUpperCase() || null,
      regionCode: regionCode?.toUpperCase() || null,
      deviceType: parsedDeviceType,
      deviceOs: parsedDeviceOs,
      language: languages[0] ?? null,
      referrer: referrer || null,
      userAgent: userAgent || null,
    },
  } satisfies ResolvedPublicEntry;
}

export async function recordEntryVisit(resolved: ResolvedPublicEntry) {
  if (!hasSupabaseAdminEnv()) {
    return;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("entry_visits").insert({
    entry_id: resolved.entry.id,
    target_id: resolved.target.id,
    locale: resolved.visit.locale,
    country_code: resolved.visit.countryCode,
    region_code: resolved.visit.regionCode,
    device_type: resolved.visit.deviceType,
    device_os: resolved.visit.deviceOs,
    language: resolved.visit.language,
    referrer: resolved.visit.referrer,
    user_agent: resolved.visit.userAgent,
    resolved_url: resolved.resolvedUrl,
  });

  if (error) {
    throw new Error(error.message);
  }
}
