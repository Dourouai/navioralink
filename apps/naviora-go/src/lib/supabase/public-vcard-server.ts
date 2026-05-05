import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import type { QRTargetType, VCardProfile } from "@/types/qr";
import { buildVCardPageUrl } from "@/lib/vcard";

import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "./admin";
import { recordEntryVisit } from "./entry-routing";
import type { SupabaseEntryRow, SupabaseEntryTargetRow } from "./entries-shared";
import { assertMonthlyVisitAllowanceForUser } from "./subscription-controls";

type PreviewTokenRow = {
  entry_id: string;
  surface: "go";
  expires_at: string;
  invalidated_at: string | null;
};

export interface PublicVCardPageData {
  entry: SupabaseEntryRow;
  target: SupabaseEntryTargetRow;
  profile: VCardProfile;
}

type VCardTargetRow = {
  id: string;
  entry_id: string;
  kind: QRTargetType;
  label: string | null;
  is_default: boolean;
  delivery: "redirect" | "preview" | "download";
  url: string | null;
  whatsapp: null;
  vcard?: unknown;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function extractVCardProfile(targetData: VCardTargetRow | null) {
  const vcard = targetData?.vcard;
  if (!vcard || typeof vcard !== "object") {
    return null;
  }

  return vcard as VCardProfile;
}

async function loadDefaultVCardTarget(entryId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: targetData, error: targetError } = await supabase
    .from("entry_targets")
    .select("id, entry_id, kind, label, is_default, delivery, url, whatsapp, vcard, sort_order, created_at, updated_at")
    .eq("entry_id", entryId)
    .eq("is_default", true)
    .eq("kind", "vcard")
    .maybeSingle();

  if (targetError) {
    throw new Error(targetError.message);
  }

  const target = targetData as VCardTargetRow | null;
  const profile = extractVCardProfile(target);

  if (!target || !profile) {
    return null;
  }

  return {
    target: target as SupabaseEntryTargetRow,
    profile,
  };
}

async function loadEntryById(entryId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SupabaseEntryRow | null) ?? null;
}

async function loadPublicVCardPageDataByContentId(contentId: string): Promise<PublicVCardPageData | null> {
  const normalizedContentId = contentId.trim();

  if (!hasSupabaseAdminEnv() || !normalizedContentId) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data: targetData, error: targetError } = await supabase
    .from("entry_targets")
    .select("id, entry_id, kind, label, is_default, delivery, url, whatsapp, vcard, sort_order, created_at, updated_at")
    .eq("kind", "vcard")
    .eq("is_default", true)
    .filter("vcard->>contentId", "eq", normalizedContentId)
    .limit(1)
    .maybeSingle();

  if (targetError) {
    throw new Error(targetError.message);
  }

  const target = targetData as VCardTargetRow | null;
  const profile = extractVCardProfile(target);

  if (!target || !profile) {
    return null;
  }

  const entry = await loadEntryById(target.entry_id);

  if (!entry || entry.status !== "active" || entry.target_type !== "vcard") {
    return null;
  }

  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return null;
  }

  return {
    entry,
    target: target as SupabaseEntryTargetRow,
    profile,
  };
}

async function loadPreviewVCardPageDataByToken(contentId: string, previewToken: string): Promise<PublicVCardPageData | null> {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const normalizedToken = previewToken.trim();
  const normalizedContentId = contentId.trim();

  if (!normalizedToken || !normalizedContentId) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: previewData, error: previewError } = await supabase
    .from("entry_preview_tokens")
    .select("entry_id, surface, expires_at, invalidated_at")
    .eq("token", normalizedToken)
    .eq("surface", "go")
    .is("invalidated_at", null)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (previewError) {
    throw new Error(previewError.message);
  }

  const preview = previewData as PreviewTokenRow | null;
  if (!preview) {
    return null;
  }

  const entry = await loadEntryById(preview.entry_id);

  if (!entry || entry.status !== "draft" || entry.target_type !== "vcard") {
    return null;
  }

  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return null;
  }

  const targetData = await loadDefaultVCardTarget(entry.id);
  if (!targetData) {
    return null;
  }

  if (targetData.profile.contentId?.trim() !== normalizedContentId) {
    return null;
  }

  return {
    entry,
    target: targetData.target,
    profile: targetData.profile,
  };
}

async function loadLegacyPublicVCardPageDataBySlug(slug: string): Promise<PublicVCardPageData | null> {
  const normalizedSlug = slug.trim();

  if (!hasSupabaseAdminEnv() || !normalizedSlug) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("slug", normalizedSlug)
    .eq("target_type", "vcard")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const entry = data as SupabaseEntryRow | null;

  if (!entry || entry.status !== "active") {
    return null;
  }

  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return null;
  }

  const targetData = await loadDefaultVCardTarget(entry.id);
  if (!targetData) {
    return null;
  }

  return {
    entry,
    target: targetData.target,
    profile: targetData.profile,
  };
}

async function loadLegacyPreviewVCardPageDataBySlug(slug: string, previewToken: string) {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const normalizedToken = previewToken.trim();
  const normalizedSlug = slug.trim();

  if (!normalizedToken || !normalizedSlug) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: previewData, error: previewError } = await supabase
    .from("entry_preview_tokens")
    .select("entry_id, surface, expires_at, invalidated_at")
    .eq("token", normalizedToken)
    .eq("surface", "go")
    .is("invalidated_at", null)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (previewError) {
    throw new Error(previewError.message);
  }

  const preview = previewData as PreviewTokenRow | null;
  if (!preview) {
    return null;
  }

  const entry = await loadEntryById(preview.entry_id);

  if (!entry || entry.status !== "draft" || entry.target_type !== "vcard" || entry.slug !== normalizedSlug) {
    return null;
  }

  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return null;
  }

  const targetData = await loadDefaultVCardTarget(entry.id);
  if (!targetData) {
    return null;
  }

  return {
    entry,
    target: targetData.target,
    profile: targetData.profile,
  };
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

function buildVisitLanguageCandidates(searchParams: URLSearchParams, headerStore: Headers) {
  const explicit = searchParams.get("lang") ?? searchParams.get("locale");
  const acceptLanguage = headerStore.get("accept-language");
  const candidates = new Set<string>();

  if (explicit?.trim()) {
    candidates.add(explicit.trim().toLowerCase());
  }

  acceptLanguage
    ?.split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean)
    .forEach((part) => {
      candidates.add(part.toLowerCase());
      const base = part.toLowerCase().split("-")[0];
      if (base) {
        candidates.add(base);
      }
    });

  return Array.from(candidates);
}

export async function recordPublicVCardVisitByContentId(params: {
  contentId: string;
  locale: string;
  headerStore: Headers;
  searchParams?: URLSearchParams;
}) {
  const pageData = await resolvePublicVCardPageDataByContentId(params.contentId);

  if (!pageData) {
    return;
  }

  await assertMonthlyVisitAllowanceForUser(pageData.entry.user_id);

  const searchParams = params.searchParams ?? new URLSearchParams();
  const languageCandidates = buildVisitLanguageCandidates(searchParams, params.headerStore);
  const primaryLanguage = languageCandidates[0] ?? null;
  const userAgent = params.headerStore.get("user-agent");
  const referrer = params.headerStore.get("referer");
  const countryCode = searchParams.get("country")?.trim() || params.headerStore.get("x-vercel-ip-country");
  const regionCode = searchParams.get("region")?.trim() || params.headerStore.get("x-vercel-ip-country-region");
  const parsedDevice = parseDeviceFromUserAgent(userAgent);
  const resolvedContentId = pageData.profile.contentId?.trim() || params.contentId.trim();

  const visit = {
    locale: primaryLanguage ?? params.locale ?? null,
    countryCode: countryCode?.toUpperCase() || null,
    regionCode: regionCode?.toUpperCase() || null,
    deviceType: parsedDevice.deviceType,
    deviceOs: parsedDevice.deviceOs,
    language: primaryLanguage,
    referrer,
    userAgent,
  };

  await recordEntryVisit({
    entry: pageData.entry,
    target: pageData.target,
    resolvedUrl: buildVCardPageUrl(resolvedContentId),
    visit: {
      ...visit,
      visitorFingerprint: buildVisitorFingerprint(visit),
    },
  });
}

const resolvePublicVCardPageDataCached = cache((contentId: string) =>
  unstable_cache(async () => loadPublicVCardPageDataByContentId(contentId), ["public-vcard-page", contentId], {
    revalidate: 300,
    tags: [`public-vcard:${contentId}`],
  })(),
);

export async function resolvePublicVCardPageDataByContentId(
  contentId: string,
  options?: {
    previewToken?: string | null;
  },
) {
  const normalizedContentId = contentId.trim();

  if (!normalizedContentId) {
    return null;
  }

  const previewToken = options?.previewToken?.trim();
  if (previewToken) {
    return loadPreviewVCardPageDataByToken(normalizedContentId, previewToken);
  }

  return resolvePublicVCardPageDataCached(normalizedContentId);
}

export async function resolveLegacyGoVCardRedirectBySlug(
  slug: string,
  options?: {
    previewToken?: string | null;
  },
) {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const previewToken = options?.previewToken?.trim();
  const pageData = previewToken
    ? await loadLegacyPreviewVCardPageDataBySlug(normalizedSlug, previewToken)
    : await loadLegacyPublicVCardPageDataBySlug(normalizedSlug);

  const contentId = pageData?.profile.contentId?.trim();
  return contentId ? buildVCardPageUrl(contentId) : null;
}
