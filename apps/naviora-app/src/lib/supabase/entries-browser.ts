"use client";

import type { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";

import type { QRDraftFromAI } from "@/types/ai";
import type { QRCodeItem, QRDesign, QRStatus } from "@/types/qr";
import { mapPlanConstraintMessage } from "@/lib/billing/plan-entitlements";

import { createBrowserSupabaseClient } from "./browser";
import { buildDraftFromItem, mapEntryRowsToItems, type SupabaseEntryRow, type SupabaseEntryRuleRow, type SupabaseEntryTargetRow } from "./entries-shared";

function throwMappedError(message: string) {
  throw new Error(mapPlanConstraintMessage(message));
}

async function requireCurrentUserId(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throwMappedError(error.message);
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

export async function getEntryForEditing(id: string) {
  const supabase = createBrowserSupabaseClient();
  const userId = await requireCurrentUserId(supabase);

  const { data: entry, error: entryError } = (await supabase
    .from("entries")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single()) as PostgrestSingleResponse<SupabaseEntryRow>;

  if (entryError) {
    throwMappedError(entryError.message);
  }

  if (!entry) {
    throw new Error("Unable to load this entry.");
  }

  const [targetsResult, rulesResult] = await Promise.all([
    supabase.from("entry_targets").select("*").eq("entry_id", id).order("sort_order", { ascending: true }),
    supabase.from("entry_rules").select("*").eq("entry_id", id).order("sort_order", { ascending: true }),
  ]);

  if (targetsResult.error) {
    throwMappedError(targetsResult.error.message);
  }

  if (rulesResult.error) {
    throwMappedError(rulesResult.error.message);
  }

  return mapSingleEntry({
    entry,
    targets: (targetsResult.data ?? []) as SupabaseEntryTargetRow[],
    rules: (rulesResult.data ?? []) as SupabaseEntryRuleRow[],
  });
}

type SaveEntryBundleResult = {
  entry: SupabaseEntryRow;
  targets: SupabaseEntryTargetRow[] | null;
  rules: SupabaseEntryRuleRow[] | null;
};

export type EntryPreviewLinkResult = {
  previewUrl: string | null;
  previewExpiresAt: string | null;
  surface: "go" | "page";
};

export async function saveEntryFromDraft(input: {
  draft: QRDraftFromAI;
  design: QRDesign;
  status: QRStatus;
  existingId?: string;
}) {
  const response = await fetch("/api/entries/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const result = (await response.json().catch(() => null)) as
    | { message?: string; savedBundle?: SaveEntryBundleResult | null }
    | null;

  if (!response.ok) {
    throwMappedError(result?.message || "Unable to save this entry.");
  }

  const savedBundle = result?.savedBundle ?? null;

  if (!savedBundle?.entry) {
    throw new Error("Unable to save this entry.");
  }

  return mapSingleEntry({
    entry: savedBundle.entry,
    targets: (savedBundle.targets ?? []) as SupabaseEntryTargetRow[],
    rules: (savedBundle.rules ?? []) as SupabaseEntryRuleRow[],
  });
}

async function readEntryPreviewResponse(response: Response) {
  const result = (await response.json().catch(() => null)) as
    | { message?: string; previewUrl?: string | null; previewExpiresAt?: string | null; surface?: "go" | "page" }
    | null;

  if (!response.ok) {
    throwMappedError(result?.message || "Unable to prepare a preview link.");
  }

  return {
    previewUrl: result?.previewUrl ?? null,
    previewExpiresAt: result?.previewExpiresAt ?? null,
    surface: result?.surface ?? "go",
  } satisfies EntryPreviewLinkResult;
}

export async function getEntryPreviewLink(id: string) {
  const response = await fetch(`/api/entries/${encodeURIComponent(id)}/preview`, {
    method: "GET",
  });

  return readEntryPreviewResponse(response);
}

export async function refreshEntryPreviewLink(id: string) {
  const response = await fetch(`/api/entries/${encodeURIComponent(id)}/preview`, {
    method: "POST",
  });

  return readEntryPreviewResponse(response);
}

export async function archiveEntry(id: string) {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from("entries").update({ status: "archived" }).eq("id", id);

  if (error) {
    throwMappedError(error.message);
  }
}

export async function restoreEntry(id: string) {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from("entries").update({ status: "draft" }).eq("id", id);

  if (error) {
    throwMappedError(error.message);
  }
}

export async function deleteEntry(id: string) {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from("entries").delete().eq("id", id);

  if (error) {
    throwMappedError(error.message);
  }
}

export async function duplicateEntry(source: QRCodeItem | string) {
  const item = typeof source === "string" ? await getEntryForEditing(source) : source;

  if (!item) {
    throw new Error("Unable to duplicate this entry.");
  }

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
