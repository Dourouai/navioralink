"use client";

import type { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";

import type { QRDraftFromAI } from "@/types/ai";
import type { QRCodeItem, QRDesign, QRStatus, QRTargetType } from "@/types/qr";

import { createBrowserSupabaseClient } from "./browser";
import { buildDraftFromItem, buildEntryInsertPayload, mapEntryRowsToItems, type SupabaseEntryRow, type SupabaseEntryRuleRow, type SupabaseEntryTargetRow } from "./entries-shared";

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

async function requireCurrentUserId(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("You need to sign in first.");
  }

  return user.id;
}

function mapSingleEntry(params: {
  entry: SupabaseEntryRow;
  targets: SupabaseEntryTargetRow[];
  rules: SupabaseEntryRuleRow[];
}) {
  return (
    mapEntryRowsToItems({
      entries: [params.entry],
      targets: params.targets,
      rules: params.rules,
      scansByEntryId: { [params.entry.id]: 0 },
    })[0] ?? null
  );
}

async function insertDefaultTarget(
  supabase: SupabaseClient,
  entryId: string,
  target: ReturnType<typeof buildEntryInsertPayload>["defaultTarget"],
) {
  const { data, error } = (await supabase
    .from("entry_targets")
    .insert({
      entry_id: entryId,
      kind: target.kind,
      is_default: true,
      delivery: target.kind === "vcard" ? "preview" : "redirect",
      url: target.url || null,
      whatsapp: target.whatsapp,
      vcard: target.vcard,
      sort_order: 0,
    })
    .select("*")
    .single()) as PostgrestSingleResponse<SupabaseEntryTargetRow>;

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function insertRuleTargetsAndRules(
  supabase: SupabaseClient,
  entryId: string,
  draft: QRDraftFromAI,
  targetType: QRTargetType,
) {
  const rules = getRuleRows(draft, targetType);
  if (!rules.length) {
    return {
      insertedTargets: [] as SupabaseEntryTargetRow[],
      insertedRules: [] as SupabaseEntryRuleRow[],
    };
  }

  const { data: insertedTargets, error: targetsError } = await supabase
    .from("entry_targets")
    .insert(
      rules.map((rule) => ({
        entry_id: entryId,
        kind: "web",
        label: null,
        is_default: false,
        delivery: "redirect",
        url: rule.targetUrl || null,
        sort_order: rule.sortOrder + 1,
      })),
    )
    .select("*")
    .order("sort_order", { ascending: true });

  if (targetsError) {
    throw new Error(targetsError.message);
  }

  const typedTargets = (insertedTargets ?? []) as SupabaseEntryTargetRow[];

  const { data: insertedRules, error: rulesError } = await supabase
    .from("entry_rules")
    .insert(
      rules.map((rule, index) => ({
        entry_id: entryId,
        target_id: typedTargets[index]?.id ?? null,
        mode: rule.mode,
        language: "language" in rule ? rule.language ?? null : null,
        region: "region" in rule ? rule.region ?? null : null,
        device_os: "device_os" in rule ? rule.device_os ?? null : null,
        param_key: "param_key" in rule ? rule.param_key ?? null : null,
        param_value: "param_value" in rule ? rule.param_value ?? null : null,
        ab_variant: "ab_variant" in rule ? rule.ab_variant ?? null : null,
        weight: "weight" in rule ? rule.weight ?? null : null,
        sort_order: rule.sortOrder,
      })),
    )
    .select("*")
    .order("sort_order", { ascending: true });

  if (rulesError) {
    throw new Error(rulesError.message);
  }

  return {
    insertedTargets: typedTargets,
    insertedRules: (insertedRules ?? []) as SupabaseEntryRuleRow[],
  };
}

export async function saveEntryFromDraft(input: {
  draft: QRDraftFromAI;
  design: QRDesign;
  status: QRStatus;
  existingId?: string;
}) {
  const supabase = createBrowserSupabaseClient();
  const userId = await requireCurrentUserId(supabase);
  const payload = buildEntryInsertPayload({
    userId,
    draft: input.draft,
    design: input.design,
    status: input.status,
  });

  let entry: SupabaseEntryRow | null = null;

  if (input.existingId) {
    const { data, error } = (await supabase
      .from("entries")
      .update({
        slug: payload.slug,
        name: payload.name,
        status: payload.status,
        target_type: payload.target_type,
        rule_mode: payload.rule_mode,
        tracking_enabled: payload.tracking_enabled,
        ga4_measurement_id: payload.ga4_measurement_id,
        meta_pixel_id: payload.meta_pixel_id,
        password_hash: payload.password_hash,
        expires_at: payload.expires_at,
        folder_id: payload.folder_id,
        design: payload.design,
      })
      .eq("id", input.existingId)
      .eq("user_id", userId)
      .select("*")
      .single()) as PostgrestSingleResponse<SupabaseEntryRow>;

    if (error) {
      throw new Error(error.message);
    }

    entry = data;

    const [deleteRulesResult, deleteTargetsResult] = await Promise.all([
      supabase.from("entry_rules").delete().eq("entry_id", input.existingId),
      supabase.from("entry_targets").delete().eq("entry_id", input.existingId),
    ]);

    if (deleteRulesResult.error) {
      throw new Error(deleteRulesResult.error.message);
    }

    if (deleteTargetsResult.error) {
      throw new Error(deleteTargetsResult.error.message);
    }
  } else {
    const { data, error } = (await supabase
      .from("entries")
      .insert({
        user_id: payload.user_id,
        slug: payload.slug,
        name: payload.name,
        status: payload.status,
        target_type: payload.target_type,
        rule_mode: payload.rule_mode,
        tracking_enabled: payload.tracking_enabled,
        ga4_measurement_id: payload.ga4_measurement_id,
        meta_pixel_id: payload.meta_pixel_id,
        password_hash: payload.password_hash,
        expires_at: payload.expires_at,
        folder_id: payload.folder_id,
        design: payload.design,
      })
      .select("*")
      .single()) as PostgrestSingleResponse<SupabaseEntryRow>;

    if (error) {
      throw new Error(error.message);
    }

    entry = data;
  }

  if (!entry) {
    throw new Error("Unable to save this entry.");
  }

  const defaultTarget = await insertDefaultTarget(supabase, entry.id, payload.defaultTarget);
  const ruleInsertions = await insertRuleTargetsAndRules(supabase, entry.id, input.draft, payload.target_type);

  return mapSingleEntry({
    entry,
    targets: [defaultTarget, ...ruleInsertions.insertedTargets],
    rules: ruleInsertions.insertedRules,
  });
}

export async function archiveEntry(id: string) {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from("entries").update({ status: "archived" }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function restoreEntry(id: string) {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from("entries").update({ status: "draft" }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteEntry(id: string) {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from("entries").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function duplicateEntry(item: QRCodeItem) {
  const duplicateName = `${item.name} (Copy)`;
  const draft = buildDraftFromItem(item);
  const duplicatedDraft: QRDraftFromAI = {
    ...draft,
    name: duplicateName,
    vcard: draft.vcard
      ? {
          ...draft.vcard,
          contentId: undefined,
          imageAssets: draft.vcard.imageAssets?.map((asset) => ({ ...asset })),
          socialLinks: draft.vcard.socialLinks?.map((social) => ({ ...social })),
        }
      : undefined,
  };

  return saveEntryFromDraft({
    draft: duplicatedDraft,
    design: item.design ?? {},
    status: "draft",
  });
}
