import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

import { buildVCardPageUrl } from "@/lib/vcard";
import { mapPlanConstraintMessage } from "@/lib/billing/plan-entitlements";
import type { SubscriptionAccessRecord } from "@/lib/billing/plan-entitlements";

import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "./admin";
import { type SupabaseEntryRow, type SupabaseEntryRuleRow, type SupabaseEntryTargetRow, buildVCardUrl, buildWhatsAppUrl, resolveTargetUrl } from "./entries-shared";
import { assertMonthlyVisitAllowanceSnapshot, PlanConstraintError } from "./subscription-controls";

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
    visitorFingerprint: string;
  };
}

interface PublicEntryLookupRow extends SupabaseEntryRow {
  entry_targets: SupabaseEntryTargetRow[] | null;
  entry_rules: SupabaseEntryRuleRow[] | null;
}

interface PublicEntrySnapshotRow extends PublicEntryLookupRow {
  subscription_plan_code: string | null;
  subscription_status: string | null;
  subscription_current_period_start: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean | null;
  monthly_visit_count: number | null;
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

function normalizeVisitorFingerprintPart(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim().toLowerCase();
  return normalized || fallback;
}

function buildVisitorFingerprint(visit: {
  locale: string | null;
  countryCode: string | null;
  language: string | null;
  referrer: string | null;
  userAgent: string | null;
}) {
  return createHash("sha256")
    .update(
      [
        "v1",
        normalizeVisitorFingerprintPart(visit.userAgent, "ua"),
        normalizeVisitorFingerprintPart(visit.referrer, "ref"),
        normalizeVisitorFingerprintPart(visit.countryCode, "country"),
        normalizeVisitorFingerprintPart(visit.language ?? visit.locale, "lang"),
      ].join("::"),
    )
    .digest("hex");
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

function resolvePublicTargetUrl(target: SupabaseEntryTargetRow) {
  if (target.kind === "whatsapp") {
    return buildWhatsAppUrl(target.whatsapp) || target.url || "";
  }

  if (target.kind === "vcard") {
    const contentId = target.vcard?.contentId;
    if (!contentId) {
      return buildVCardUrl(target.vcard, target.url);
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
  const usageMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const { data: entry, error: entryError } = await supabase
    .rpc("resolve_public_entry_snapshot", {
      p_slug: slug,
      p_usage_month: usageMonth,
    })
    .maybeSingle();

  if (entryError) {
    throw new Error(entryError.message);
  }

  if (!entry) {
    return null;
  }

  const typedEntry = entry as PublicEntrySnapshotRow;

  if (typedEntry.status !== "active") {
    return null;
  }

  if (typedEntry.expires_at && new Date(typedEntry.expires_at) < new Date()) {
    return null;
  }

  const typedTargets = (typedEntry.entry_targets ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const typedRules = (typedEntry.entry_rules ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
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
  const resolvedUrl = resolvePublicTargetUrl(matchedTarget);

  if (!resolvedUrl) {
    return null;
  }

  const latestSubscription: SubscriptionAccessRecord | null =
    typedEntry.subscription_plan_code || typedEntry.subscription_status || typedEntry.subscription_current_period_end
      ? {
          plan_code: typedEntry.subscription_plan_code,
          status: typedEntry.subscription_status,
          current_period_start: typedEntry.subscription_current_period_start,
          current_period_end: typedEntry.subscription_current_period_end,
          cancel_at_period_end: typedEntry.subscription_cancel_at_period_end,
        }
      : null;

  assertMonthlyVisitAllowanceSnapshot(latestSubscription, Number(typedEntry.monthly_visit_count ?? 0));

  const regionCode = request.nextUrl.searchParams.get("region")?.trim() || request.headers.get("x-vercel-ip-country-region");
  const countryCode = request.nextUrl.searchParams.get("country")?.trim() || request.headers.get("x-vercel-ip-country");

  const visit = {
    locale: languages[0] ?? locale ?? null,
    countryCode: countryCode?.toUpperCase() || null,
    regionCode: regionCode?.toUpperCase() || null,
    deviceType: parsedDeviceType,
    deviceOs: parsedDeviceOs,
    language: languages[0] ?? null,
    referrer: referrer || null,
    userAgent: userAgent || null,
  };

  return {
    entry: {
      id: typedEntry.id,
      user_id: typedEntry.user_id,
      path_prefix: typedEntry.path_prefix,
      slug: typedEntry.slug,
      name: typedEntry.name,
      status: typedEntry.status,
      target_type: typedEntry.target_type,
      rule_mode: typedEntry.rule_mode,
      tracking_enabled: typedEntry.tracking_enabled,
      ga4_measurement_id: typedEntry.ga4_measurement_id,
      meta_pixel_id: typedEntry.meta_pixel_id,
      password_hash: typedEntry.password_hash,
      expires_at: typedEntry.expires_at,
      folder_id: typedEntry.folder_id,
      design: typedEntry.design,
      created_at: typedEntry.created_at,
      updated_at: typedEntry.updated_at,
    },
    target: matchedTarget,
    resolvedUrl,
    visit: {
      ...visit,
      visitorFingerprint: buildVisitorFingerprint(visit),
    },
  } satisfies ResolvedPublicEntry;
}

export function isPlanConstraintError(error: unknown): error is PlanConstraintError {
  return error instanceof PlanConstraintError;
}

export function getPlanConstraintResponseMessage(error: PlanConstraintError) {
  return mapPlanConstraintMessage(error.message);
}

export async function recordEntryVisit(resolved: ResolvedPublicEntry) {
  if (!hasSupabaseAdminEnv()) {
    return;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("entry_visits").insert({
    entry_id: resolved.entry.id,
    user_id: resolved.entry.user_id,
    target_id: resolved.target.id,
    locale: resolved.visit.locale,
    country_code: resolved.visit.countryCode,
    region_code: resolved.visit.regionCode,
    device_type: resolved.visit.deviceType,
    device_os: resolved.visit.deviceOs,
    language: resolved.visit.language,
    referrer: resolved.visit.referrer,
    user_agent: resolved.visit.userAgent,
    visitor_fingerprint: resolved.visit.visitorFingerprint,
    resolved_url: resolved.resolvedUrl,
  });

  if (error) {
    throw new Error(error.message);
  }
}
