import { createEntrySlug } from "@/lib/entry-url";
import { buildVCardPageUrl } from "@/lib/vcard";
import type { QRDraftFromAI } from "@/types/ai";
import type { QRCodeItem, QRDesign, QRRuleMode, QRStatus, QRTargetType, VCardProfile, WhatsAppTarget } from "@/types/qr";

export interface SupabaseEntryRow {
  id: string;
  user_id: string;
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

export function buildVCardUrl(vcard?: VCardProfile | null, fallbackUrl?: string | null) {
  if (vcard?.contentId) {
    return buildVCardPageUrl(vcard.contentId);
  }

  return fallbackUrl ?? "";
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

  return target.url ?? "";
}

export function deriveEntryNameFromDraft(draft: QRDraftFromAI) {
  return (
    draft.name?.trim() ||
    draft.vcard?.fullName?.trim() ||
    draft.whatsapp?.phone?.trim() ||
    draft.defaultUrl?.trim() ||
    "Untitled Entry"
  );
}

export function buildEntryInsertPayload(input: {
  userId: string;
  draft: QRDraftFromAI;
  design: QRDesign;
  status: QRStatus;
  slug?: string;
}) {
  const targetType = input.draft.targetType ?? "web";
  const nextVCard =
    targetType === "vcard"
      ? {
          contentId: input.draft.vcard?.contentId ?? createEntrySlug().slice(0, 8),
          ...input.draft.vcard,
          fullName: input.draft.vcard?.fullName ?? input.draft.name ?? "",
        }
      : undefined;

  return {
    user_id: input.userId,
    slug: input.slug ?? createEntrySlug(),
    name: deriveEntryNameFromDraft(input.draft),
    status: input.status,
    target_type: targetType,
    rule_mode: targetType === "web" ? input.draft.ruleMode ?? "none" : "none",
    tracking_enabled: Boolean(input.draft.tracking?.enabled),
    ga4_measurement_id: input.draft.tracking?.ga4Id ?? null,
    meta_pixel_id: input.draft.tracking?.metaPixelId ?? null,
    password_hash: input.draft.password ? "configured" : null,
    expires_at: input.draft.expiresAt ?? null,
    folder_id: input.draft.folder ?? null,
    design: input.design,
    defaultTarget: {
      kind: targetType,
      url:
        targetType === "whatsapp"
          ? buildWhatsAppUrl(input.draft.whatsapp)
          : targetType === "vcard"
            ? buildVCardUrl(nextVCard)
            : input.draft.defaultUrl ?? "",
      whatsapp: targetType === "whatsapp" ? input.draft.whatsapp ?? null : null,
      vcard: targetType === "vcard" ? nextVCard ?? null : null,
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

    const item: QRCodeItem = {
      id: entry.id,
      slug: entry.slug,
      name: entry.name,
      type: "url",
      status: entry.status,
      targetType: entry.target_type,
      defaultUrl: resolveTargetUrl(defaultTarget),
      ruleMode: entry.rule_mode,
      tracking: {
        enabled: entry.tracking_enabled,
        ga4Id: entry.ga4_measurement_id ?? undefined,
        metaPixelId: entry.meta_pixel_id ?? undefined,
      },
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
    tracking: item.tracking ? { ...item.tracking } : undefined,
    expiresAt: item.expiresAt,
  };
}
