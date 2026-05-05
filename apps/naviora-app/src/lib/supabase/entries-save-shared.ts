import type { QRDraftFromAI } from "@/types/ai";
import type { QRTargetType } from "@/types/qr";

import { buildEntryInsertPayload, type SupabaseEntryRuleRow } from "./entries-shared";

export type EntrySaveTargetPayload = {
  kind: QRTargetType;
  delivery?: "redirect" | "preview" | "download";
  label?: string | null;
  url?: string | null;
  whatsapp?: ReturnType<typeof buildEntryInsertPayload>["defaultTarget"]["whatsapp"];
  vcard?: ReturnType<typeof buildEntryInsertPayload>["defaultTarget"]["vcard"];
  open_app?: ReturnType<typeof buildEntryInsertPayload>["defaultTarget"]["open_app"];
  sortOrder?: number;
};

export type EntrySaveRulePayload = {
  mode: SupabaseEntryRuleRow["mode"];
  sortOrder: number;
  language?: string | null;
  region?: string | null;
  device_os?: string | null;
  param_key?: string | null;
  param_value?: string | null;
  ab_variant?: "A" | "B" | null;
  weight?: number | null;
};

function getRuleRows(draft: QRDraftFromAI, targetType: QRTargetType) {
  if (targetType !== "web") {
    return [];
  }

  if (draft.ruleMode === "language") {
    return (draft.languageRules ?? []).map((rule, index) => ({
      mode: "language" as const,
      sortOrder: index,
      targetUrl: rule.url,
      language: rule.language,
    }));
  }

  if (draft.ruleMode === "region") {
    return (draft.regionRules ?? []).map((rule, index) => ({
      mode: "region" as const,
      sortOrder: index,
      targetUrl: rule.url,
      region: rule.region,
    }));
  }

  if (draft.ruleMode === "device") {
    return (draft.deviceRules ?? []).map((rule, index) => ({
      mode: "device" as const,
      sortOrder: index,
      targetUrl: rule.url,
      device_os: rule.os,
    }));
  }

  if (draft.ruleMode === "param") {
    return (draft.paramRules ?? []).map((rule, index) => ({
      mode: "param" as const,
      sortOrder: index,
      targetUrl: rule.url,
      param_key: rule.key,
      param_value: rule.value,
    }));
  }

  if (draft.ruleMode === "ab") {
    return (draft.abRules ?? []).map((rule, index) => ({
      mode: "ab" as const,
      sortOrder: index,
      targetUrl: rule.url,
      ab_variant: rule.variant,
      weight: rule.weight,
    }));
  }

  return [];
}

export function buildRuleSavePayload(draft: QRDraftFromAI, targetType: QRTargetType) {
  const rules = getRuleRows(draft, targetType);

  return {
    ruleTargets: rules.map<EntrySaveTargetPayload>((rule) => ({
      kind: "web",
      delivery: "redirect",
      url: rule.targetUrl || null,
      sortOrder: rule.sortOrder + 1,
    })),
    rules: rules.map<EntrySaveRulePayload>((rule) => ({
      mode: rule.mode,
      sortOrder: rule.sortOrder,
      language: "language" in rule ? rule.language ?? null : null,
      region: "region" in rule ? rule.region ?? null : null,
      device_os: "device_os" in rule ? rule.device_os ?? null : null,
      param_key: "param_key" in rule ? rule.param_key ?? null : null,
      param_value: "param_value" in rule ? rule.param_value ?? null : null,
      ab_variant: "ab_variant" in rule ? rule.ab_variant ?? null : null,
      weight: "weight" in rule ? rule.weight ?? null : null,
    })),
  };
}
