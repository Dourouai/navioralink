import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { mapPlanConstraintMessage } from "@/lib/billing/plan-entitlements";
import type { SubscriptionAccessRecord } from "@/lib/billing/plan-entitlements";
import { normalizeEntryPathPrefix } from "@/lib/entry-url";
import { localePreferenceCookieName, resolveLocalePreference } from "@/i18n/config";
import { buildVCardPageUrl } from "@/lib/vcard";

import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "./admin";
import { assertMonthlyVisitAllowanceSnapshot, PlanConstraintError } from "./subscription-controls";
import { type SupabaseEntryRow, type SupabaseEntryRuleRow, type SupabaseEntryTargetRow, buildWhatsAppUrl, resolveTargetUrl } from "./entries-shared";

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

interface PublicEntryAvailabilityRow {
  id: string;
  path_prefix: string;
  slug: string;
  status: string;
  target_type: string;
  expires_at: string | null;
}

interface EntryPreviewTokenRow {
  entry_id: string;
  surface: "go" | "page";
  expires_at: string;
  invalidated_at: string | null;
}

export interface PublicRequestContext {
  resolvedLocale: string;
  languageCandidates: string[];
  regionCandidates: string[];
  osCandidates: string[];
  primaryLanguage: string | null;
  forwardedIp: string | null;
  host: string | null;
  countryCode: string | null;
  regionCode: string | null;
  referrer: string | null;
  userAgent: string | null;
  parsedDeviceType: string | null;
  parsedDeviceOs: string | null;
}

export interface GoPreviewEntryLocation {
  slug: string;
  pathPrefix: string;
}

function getRequestedPathPrefix(pathPrefix?: string | null) {
  return normalizeEntryPathPrefix(pathPrefix) ?? "l";
}

const resolvePublicEntrySnapshotCached = cache((pathPrefix: string, slug: string, usageMonth: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .rpc("resolve_public_entry_snapshot", {
          p_path_prefix: pathPrefix,
          p_slug: slug,
          p_usage_month: usageMonth,
        })
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return (data as PublicEntrySnapshotRow | null) ?? null;
    },
    ["public-entry-snapshot", pathPrefix, slug, usageMonth],
    {
      revalidate: 60,
    },
  )(),
);

const lookupPublicEntryAvailabilityCached = cache((pathPrefix: string, slug: string) =>
  unstable_cache(
    async () => {
      const normalizedSlug = slug.trim();
      const normalizedPathPrefix = getRequestedPathPrefix(pathPrefix);

      if (!hasSupabaseAdminEnv() || !normalizedSlug) {
        return null;
      }

      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("entries")
        .select("id, path_prefix, slug, status, target_type, expires_at")
        .eq("path_prefix", normalizedPathPrefix)
        .eq("slug", normalizedSlug)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return (data as PublicEntryAvailabilityRow | null) ?? null;
    },
    ["public-entry-availability", pathPrefix, slug],
    {
      revalidate: 60,
    },
  )(),
);

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

function collectLanguageCandidates(explicit: string | null, acceptLanguage: string | null) {
  const candidates = new Set<string>();

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

function collectRegionCandidates(values: Array<string | null>) {
  const candidates = new Set<string>();

  values
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

function collectOsCandidates(explicit: string | null, parsedDeviceOs: string | null) {
  const candidates = new Set<string>();

  if (explicit?.trim()) {
    candidates.add(normalizeOsValue(explicit));
  }

  if (parsedDeviceOs) {
    candidates.add(normalizeOsValue(parsedDeviceOs));
  }

  return Array.from(candidates);
}

export function buildPublicRequestContext(request: NextRequest): PublicRequestContext {
  const searchParams = request.nextUrl.searchParams;
  const headers = request.headers;
  const explicitLocale = searchParams.get("locale") ?? searchParams.get("lang");
  const cookieLocale = request.cookies.get(localePreferenceCookieName)?.value ?? null;
  const acceptLanguage = headers.get("accept-language");
  const userAgent = headers.get("user-agent");
  const parsedDevice = parseDeviceFromUserAgent(userAgent);
  const preferredLocale = explicitLocale ?? cookieLocale;
  const languageCandidates = collectLanguageCandidates(preferredLocale, acceptLanguage);
  const countryParam = searchParams.get("country");
  const regionParam = searchParams.get("region");
  const countryCode = countryParam?.trim() || headers.get("x-vercel-ip-country");
  const regionCode = regionParam?.trim() || headers.get("x-vercel-ip-country-region");

  return {
    resolvedLocale: resolveLocalePreference({
      locale: explicitLocale,
      cookieLocale,
      acceptLanguage,
    }),
    languageCandidates,
    regionCandidates: collectRegionCandidates([
      countryParam,
      regionParam,
      headers.get("x-vercel-ip-country"),
      headers.get("x-vercel-ip-country-region"),
    ]),
    osCandidates: collectOsCandidates(searchParams.get("os"), parsedDevice.deviceOs),
    primaryLanguage: languageCandidates[0] ?? null,
    forwardedIp: headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    host: headers.get("host"),
    countryCode: countryCode?.toUpperCase() || null,
    regionCode: regionCode?.toUpperCase() || null,
    referrer: headers.get("referer") || null,
    userAgent,
    parsedDeviceType: parsedDevice.deviceType,
    parsedDeviceOs: parsedDevice.deviceOs,
  };
}

async function loadValidGoPreviewToken(token: string) {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("entry_preview_tokens")
    .select("entry_id, surface, expires_at, invalidated_at")
    .eq("token", normalizedToken)
    .eq("surface", "go")
    .is("invalidated_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as EntryPreviewTokenRow | null) ?? null;
}

export async function resolveGoPreviewSlugByToken(token: string) {
  const preview = await loadValidGoPreviewToken(token);

  if (!preview) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select("slug, path_prefix, status, target_type, expires_at")
    .eq("id", preview.entry_id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const entry = data as Pick<SupabaseEntryRow, "slug" | "path_prefix" | "status" | "target_type" | "expires_at"> | null;

  if (!entry || entry.status !== "draft") {
    return null;
  }

  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return null;
  }

  return {
    slug: entry.slug,
    pathPrefix: getRequestedPathPrefix(entry.path_prefix),
  } satisfies GoPreviewEntryLocation;
}

function resolvePublicTargetUrl(target: SupabaseEntryTargetRow) {
  if (target.kind === "whatsapp") {
    return buildWhatsAppUrl(target.whatsapp) || target.url || "";
  }

  if (target.kind === "vcard") {
    const contentId = target.vcard?.contentId?.trim();
    return contentId ? buildVCardPageUrl(contentId) : target.url || "";
  }

  return resolveTargetUrl(target);
}

function chooseAbTarget(
  entry: SupabaseEntryRow,
  rules: SupabaseEntryRuleRow[],
  targetsById: Map<string, SupabaseEntryTargetRow>,
  requestContext: PublicRequestContext,
) {
  const fingerprint =
    requestContext.forwardedIp ||
    requestContext.userAgent ||
    requestContext.primaryLanguage ||
    "anonymous";
  const bucket = createStableHash(`${entry.path_prefix}:${entry.slug}:${fingerprint}`) % 100;
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

async function resolvePreviewEntryByToken(
  request: NextRequest,
  token: string,
  locale: string,
  requestContext: PublicRequestContext,
  expectedSlug?: string,
  expectedPathPrefix?: string,
) {
  const preview = await loadValidGoPreviewToken(token);

  if (!preview) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data: entryData, error: entryError } = await supabase
    .from("entries")
    .select("*")
    .eq("id", preview.entry_id)
    .maybeSingle();

  if (entryError) {
    throw new Error(entryError.message);
  }

  const entry = entryData as SupabaseEntryRow | null;

  if (!entry || entry.status !== "draft") {
    return null;
  }

  if (expectedSlug && entry.slug !== expectedSlug) {
    return null;
  }

  if (expectedPathPrefix && getRequestedPathPrefix(entry.path_prefix) !== expectedPathPrefix) {
    return null;
  }

  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return null;
  }

  const [{ data: targetsData, error: targetsError }, { data: rulesData, error: rulesError }] = await Promise.all([
    supabase.from("entry_targets").select("*").eq("entry_id", entry.id).order("sort_order", { ascending: true }),
    supabase.from("entry_rules").select("*").eq("entry_id", entry.id).order("sort_order", { ascending: true }),
  ]);

  if (targetsError) {
    throw new Error(targetsError.message);
  }

  if (rulesError) {
    throw new Error(rulesError.message);
  }

  const typedTargets = (targetsData ?? []) as SupabaseEntryTargetRow[];
  const typedRules = (rulesData ?? []) as SupabaseEntryRuleRow[];
  const defaultTarget = typedTargets.find((target) => target.is_default) ?? typedTargets[0] ?? null;

  if (!defaultTarget) {
    return null;
  }

  let matchedTarget = defaultTarget;

  if (entry.rule_mode !== "none") {
    const targetsById = new Map(typedTargets.map((target) => [target.id, target]));

    if (entry.rule_mode === "language") {
      const matchedRule = typedRules.find((rule) => requestContext.languageCandidates.includes(normalizeLanguageValue(rule.language ?? "")));
      matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
    } else if (entry.rule_mode === "region") {
      const matchedRule = typedRules.find((rule) => requestContext.regionCandidates.includes(normalizeRegionValue(rule.region ?? "")));
      matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
    } else if (entry.rule_mode === "device") {
      const matchedRule = typedRules.find((rule) => requestContext.osCandidates.includes(normalizeOsValue(rule.device_os ?? "")));
      matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
    } else if (entry.rule_mode === "param") {
      const matchedRule = typedRules.find((rule) => {
        const key = rule.param_key?.trim();
        const value = rule.param_value?.trim();
        if (!key || !value) {
          return false;
        }

        return request.nextUrl.searchParams.get(key) === value;
      });
      matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
    } else if (entry.rule_mode === "ab") {
      matchedTarget = chooseAbTarget(entry, typedRules, targetsById, requestContext) || defaultTarget;
    }
  }

  const baseResolvedUrl = resolvePublicTargetUrl(matchedTarget);

  if (!baseResolvedUrl) {
    return null;
  }

  const resolvedUrl =
    matchedTarget.kind === "vcard"
      ? (() => {
          const redirectUrl = new URL(baseResolvedUrl);
          redirectUrl.searchParams.set("preview_token", token);
          return redirectUrl.toString();
        })()
      : baseResolvedUrl;

  const visit = {
    locale: requestContext.primaryLanguage ?? locale ?? null,
    countryCode: requestContext.countryCode,
    regionCode: requestContext.regionCode,
    deviceType: requestContext.parsedDeviceType,
    deviceOs: requestContext.parsedDeviceOs,
    language: requestContext.primaryLanguage,
    referrer: requestContext.referrer,
    userAgent: requestContext.userAgent,
  };

  return {
    entry,
    target: matchedTarget,
    resolvedUrl,
    visit: {
      ...visit,
      visitorFingerprint: buildVisitorFingerprint(visit),
    },
  } satisfies ResolvedPublicEntry;
}

export async function resolvePublicEntryBySlug(
  request: NextRequest,
  slug: string,
  locale: string,
  requestContext: PublicRequestContext = buildPublicRequestContext(request),
  pathPrefix?: string,
) {
  const normalizedPathPrefix = getRequestedPathPrefix(pathPrefix);
  const previewToken = request.nextUrl.searchParams.get("preview_token")?.trim();

  if (previewToken) {
    return resolvePreviewEntryByToken(request, previewToken, locale, requestContext, slug, normalizedPathPrefix);
  }

  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const searchParams = request.nextUrl.searchParams;
  const now = new Date();
  const usageMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const entry = await resolvePublicEntrySnapshotCached(normalizedPathPrefix, slug, usageMonth);

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

  const typedTargets = typedEntry.entry_targets ?? [];
  const defaultTarget = typedTargets.find((target) => target.is_default) ?? typedTargets[0] ?? null;

  if (!defaultTarget) {
    return null;
  }

  let matchedTarget = defaultTarget;

  if (typedEntry.rule_mode !== "none") {
    const typedRules = typedEntry.entry_rules ?? [];
    const targetsById = new Map(typedTargets.map((target) => [target.id, target]));

    if (typedEntry.rule_mode === "language") {
      const matchedRule = typedRules.find((rule) => requestContext.languageCandidates.includes(normalizeLanguageValue(rule.language ?? "")));
      matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
    } else if (typedEntry.rule_mode === "region") {
      const matchedRule = typedRules.find((rule) => requestContext.regionCandidates.includes(normalizeRegionValue(rule.region ?? "")));
      matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
    } else if (typedEntry.rule_mode === "device") {
      const matchedRule = typedRules.find((rule) => requestContext.osCandidates.includes(normalizeOsValue(rule.device_os ?? "")));
      matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
    } else if (typedEntry.rule_mode === "param") {
      const matchedRule = typedRules.find((rule) => {
        const key = rule.param_key?.trim();
        const value = rule.param_value?.trim();
        if (!key || !value) {
          return false;
        }

        return searchParams.get(key) === value;
      });
      matchedTarget = (matchedRule && targetsById.get(matchedRule.target_id ?? "")) || defaultTarget;
    } else if (typedEntry.rule_mode === "ab") {
      matchedTarget = chooseAbTarget(typedEntry, typedRules, targetsById, requestContext) || defaultTarget;
    }
  }

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

  const monthlyVisitsUsed = Number(typedEntry.monthly_visit_count ?? 0);
  assertMonthlyVisitAllowanceSnapshot(latestSubscription, monthlyVisitsUsed);

  const visit = {
    locale: requestContext.primaryLanguage ?? locale ?? null,
    countryCode: requestContext.countryCode,
    regionCode: requestContext.regionCode,
    deviceType: requestContext.parsedDeviceType,
    deviceOs: requestContext.parsedDeviceOs,
    language: requestContext.primaryLanguage,
    referrer: requestContext.referrer,
    userAgent: requestContext.userAgent,
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

export async function lookupPublicEntryAvailabilityBySlug(slug: string, pathPrefix?: string) {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  return lookupPublicEntryAvailabilityCached(getRequestedPathPrefix(pathPrefix), normalizedSlug);
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
