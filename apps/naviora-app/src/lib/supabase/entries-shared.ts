import { createEntrySlug, getEntryPathPrefix } from "@/lib/entry-url";
import { buildVCardPageUrl } from "@/lib/vcard";
import type { QRDraftFromAI } from "@/types/ai";
import type { OpenAppTarget, QRCodeItem, QRDesign, QRRuleMode, QRStatus, QRTargetType, VCardProfile, WhatsAppTarget } from "@/types/qr";

export interface SupabaseEntryRow {
  id: string;
  user_id: string;
  path_prefix: string;
  slug: string;
  name: string;
  status: QRStatus;
  target_type: QRTargetType;
  rule_mode: QRRuleMode;
  tracking_enabled: boolean;
  ga4_measurement_id: string | null;
  meta_pixel_id: string | null;
  password_hash: string | null;
  expires_at: string | null;
  folder_id: string | null;
  design: QRDesign | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseEntryTargetRow {
  id: string;
  entry_id: string;
  kind: QRTargetType;
  label: string | null;
  is_default: boolean;
  delivery: "redirect" | "preview" | "download";
  url: string | null;
  whatsapp: WhatsAppTarget | null;
  vcard: VCardProfile | null;
  open_app: OpenAppTarget | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseEntryRuleRow {
  id: string;
  entry_id: string;
  target_id: string | null;
  mode: Exclude<QRRuleMode, "none">;
  language: string | null;
  region: string | null;
  device_os: string | null;
  param_key: string | null;
  param_value: string | null;
  ab_variant: "A" | "B" | null;
  weight: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function buildWhatsAppUrl(whatsapp?: WhatsAppTarget | null) {
  const countryCode = (whatsapp?.countryCode ?? "").replace(/\D/g, "");
  const phone = (whatsapp?.phone ?? "").replace(/\D/g, "");
  const digits = `${countryCode}${phone}`;

  if (!digits) {
    return "";
  }

  const params = new URLSearchParams();
  if (whatsapp?.message?.trim()) {
    params.set("text", whatsapp.message.trim());
  }

  const query = params.toString();
  return `https://wa.me/${digits}${query ? `?${query}` : ""}`;
}

export function buildVCardUrl(_vcard?: VCardProfile | null, fallbackUrl?: string | null) {
  const contentId = _vcard?.contentId?.trim();

  if (contentId) {
    return buildVCardPageUrl(contentId);
  }

  return fallbackUrl ?? "";
}

export function buildOpenAppUrl(openApp?: OpenAppTarget | null, fallbackUrl?: string | null) {
  return openApp?.appUrl?.trim() || fallbackUrl || "";
}

export function resolveTargetUrl(target: SupabaseEntryTargetRow | undefined) {
  if (!target) {
    return "";
  }

  if (target.kind === "whatsapp") {
    return buildWhatsAppUrl(target.whatsapp) || target.url || "";
  }

  if (target.kind === "vcard") {
    return buildVCardUrl(target.vcard, target.url);
  }

  if (target.kind === "openapp") {
    return buildOpenAppUrl(target.open_app, target.url);
  }

  return target.url ?? "";
}

export function deriveEntryNameFromDraft(draft: QRDraftFromAI) {
  return (
    draft.name?.trim() ||
    (draft.openApp?.preset === "custom" ? draft.openApp?.appName?.trim() : "") ||
    draft.vcard?.fullName?.trim() ||
    draft.whatsapp?.phone?.trim() ||
    draft.openApp?.copyText?.trim() ||
    draft.defaultUrl?.trim() ||
    "Untitled Entry"
  );
}

function normalizeTrackingValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function hasExternalTrackingConfig(tracking?: { ga4Id?: string | null; metaPixelId?: string | null } | null) {
  return Boolean(normalizeTrackingValue(tracking?.ga4Id) || normalizeTrackingValue(tracking?.metaPixelId));
}

export function buildEntryInsertPayload(input: {
  userId: string;
  draft: QRDraftFromAI;
  design: QRDesign;
  status: QRStatus;
  pathPrefix?: string | null;
  slug?: string;
  passwordHash?: string | null;
}) {
  const targetType = input.draft.targetType ?? "web";
  const nextPathPrefix = getEntryPathPrefix(targetType, input.pathPrefix);
  const nextSlug = input.slug ?? createEntrySlug();
  const nextVCard =
    targetType === "vcard"
      ? {
          contentId: input.draft.vcard?.contentId ?? createEntrySlug().slice(0, 8),
          ...input.draft.vcard,
          fullName: input.draft.vcard?.fullName ?? input.draft.name ?? "",
        }
      : undefined;
  const nextOpenApp =
    targetType === "openapp"
      ? {
          preset: input.draft.openApp?.preset ?? "wechat",
          appName: input.draft.openApp?.preset === "custom" ? input.draft.openApp?.appName ?? "" : "",
          copyText: input.draft.openApp?.copyText ?? "",
          silentCopy: Boolean(input.draft.openApp?.copyText?.trim() && input.draft.openApp?.silentCopy),
          appUrl: input.draft.openApp?.appUrl ?? input.draft.defaultUrl ?? "",
        }
      : undefined;

  return {
    user_id: input.userId,
    path_prefix: nextPathPrefix,
    slug: nextSlug,
    name: deriveEntryNameFromDraft(input.draft),
    status: input.status,
    target_type: targetType,
    rule_mode: targetType === "web" ? input.draft.ruleMode ?? "none" : "none",
    tracking_enabled: hasExternalTrackingConfig(input.draft.tracking),
    ga4_measurement_id: normalizeTrackingValue(input.draft.tracking?.ga4Id),
    meta_pixel_id: normalizeTrackingValue(input.draft.tracking?.metaPixelId),
    password_hash: input.passwordHash ?? null,
    expires_at: input.draft.expiresAt ?? null,
    folder_id: input.draft.folder ?? null,
    design: input.design,
    defaultTarget: {
      kind: targetType,
      url:
        targetType === "whatsapp"
          ? buildWhatsAppUrl(input.draft.whatsapp)
          : targetType === "vcard"
            ? buildVCardPageUrl(nextVCard?.contentId ?? nextSlug)
            : targetType === "openapp"
              ? buildOpenAppUrl(nextOpenApp, input.draft.defaultUrl)
            : input.draft.defaultUrl ?? "",
      whatsapp: targetType === "whatsapp" ? input.draft.whatsapp ?? null : null,
      vcard: targetType === "vcard" ? nextVCard ?? null : null,
      open_app: targetType === "openapp" ? nextOpenApp ?? null : null,
    },
  };
}

export function mapEntryRowsToItems(params: {
  entries: SupabaseEntryRow[];
  targets: SupabaseEntryTargetRow[];
  rules: SupabaseEntryRuleRow[];
  scansByEntryId?: Record<string, number>;
}) {
  const targetsByEntry = new Map<string, SupabaseEntryTargetRow[]>();
  const rulesByEntry = new Map<string, SupabaseEntryRuleRow[]>();

  params.targets.forEach((target) => {
    const current = targetsByEntry.get(target.entry_id) ?? [];
    current.push(target);
    targetsByEntry.set(target.entry_id, current);
  });

  params.rules.forEach((rule) => {
    const current = rulesByEntry.get(rule.entry_id) ?? [];
    current.push(rule);
    rulesByEntry.set(rule.entry_id, current);
  });

  return params.entries.map((entry) => {
    const entryTargets = (targetsByEntry.get(entry.id) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const entryRules = (rulesByEntry.get(entry.id) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const targetById = new Map(entryTargets.map((target) => [target.id, target]));
    const defaultTarget = entryTargets.find((target) => target.is_default) ?? entryTargets[0];
    const hasExternalTracking = hasExternalTrackingConfig({
      ga4Id: entry.ga4_measurement_id,
      metaPixelId: entry.meta_pixel_id,
    });

    const item: QRCodeItem = {
      id: entry.id,
      slug: entry.slug,
      pathPrefix: entry.path_prefix,
      name: entry.name,
      type: "url",
      status: entry.status,
      targetType: entry.target_type,
      defaultUrl: resolveTargetUrl(defaultTarget),
      ruleMode: entry.rule_mode,
      tracking: {
        enabled: hasExternalTracking,
        ga4Id: normalizeTrackingValue(entry.ga4_measurement_id) ?? undefined,
        metaPixelId: normalizeTrackingValue(entry.meta_pixel_id) ?? undefined,
      },
      passwordConfigured: Boolean(entry.password_hash),
      expiresAt: entry.expires_at ?? undefined,
      folderId: entry.folder_id ?? undefined,
      design: entry.design ?? undefined,
      scans: params.scansByEntryId?.[entry.id] ?? 0,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    };

    if (entry.target_type === "whatsapp") {
      item.whatsapp = defaultTarget?.whatsapp ?? undefined;
    }

    if (entry.target_type === "vcard") {
      item.vcard = defaultTarget?.vcard ?? undefined;
    }

    if (entry.target_type === "openapp") {
      item.openApp = defaultTarget?.open_app ?? undefined;
    }

    if (entry.rule_mode === "language") {
      item.languageRules = entryRules.map((rule) => ({
        language: rule.language ?? "",
        url: resolveTargetUrl(targetById.get(rule.target_id ?? "")),
      }));
    }

    if (entry.rule_mode === "region") {
      item.regionRules = entryRules.map((rule) => ({
        region: rule.region ?? "",
        url: resolveTargetUrl(targetById.get(rule.target_id ?? "")),
      }));
    }

    if (entry.rule_mode === "device") {
      item.deviceRules = entryRules.map((rule) => ({
        os: rule.device_os ?? "",
        url: resolveTargetUrl(targetById.get(rule.target_id ?? "")),
      }));
    }

    if (entry.rule_mode === "param") {
      item.paramRules = entryRules.map((rule) => ({
        key: rule.param_key ?? "",
        value: rule.param_value ?? "",
        url: resolveTargetUrl(targetById.get(rule.target_id ?? "")),
      }));
    }

    if (entry.rule_mode === "ab") {
      item.abRules = entryRules.map((rule) => ({
        variant: rule.ab_variant ?? "A",
        weight: rule.weight ?? 50,
        url: resolveTargetUrl(targetById.get(rule.target_id ?? "")),
      }));
    }

    return item;
  });
}

export function buildDashboardStatsFromItems(items: QRCodeItem[]) {
  const visibleItems = items.filter((item) => item.status !== "archived");
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return {
    totalQrs: visibleItems.length,
    monthlyScans: visibleItems.reduce((sum, item) => sum + item.scans, 0),
    activeQrs: visibleItems.filter((item) => item.status === "active").length,
    recentAdded: visibleItems.filter((item) => new Date(item.createdAt) >= thirtyDaysAgo).length,
  };
}

export function buildDraftFromItem(item: QRCodeItem): QRDraftFromAI {
  return {
    name: item.name,
    defaultUrl: item.defaultUrl,
    targetType: item.targetType ?? "web",
    ruleMode: item.ruleMode,
    languageRules: item.languageRules?.map((rule) => ({ ...rule })),
    regionRules: item.regionRules?.map((rule) => ({ ...rule })),
    deviceRules: item.deviceRules?.map((rule) => ({ ...rule })),
    paramRules: item.paramRules?.map((rule) => ({ ...rule })),
    abRules: item.abRules?.map((rule) => ({ ...rule })),
    whatsapp: item.whatsapp ? { ...item.whatsapp } : undefined,
    vcard: item.vcard
      ? {
          ...item.vcard,
          imageAssets: item.vcard.imageAssets?.map((asset) => ({ ...asset })),
          socialLinks: item.vcard.socialLinks?.map((social) => ({ ...social })),
        }
      : undefined,
    openApp: item.openApp ? { ...item.openApp } : undefined,
    tracking: item.tracking ? { ...item.tracking } : undefined,
    passwordConfigured: item.passwordConfigured,
    expiresAt: item.expiresAt,
  };
}
