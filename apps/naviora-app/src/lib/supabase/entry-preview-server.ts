import { buildPreviewUrl, getPreviewSurface, type PreviewSurface } from "@/lib/entry-url";
import type { QRStatus, QRTargetType } from "@/types/qr";

import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "./admin";
import { createServerSupabaseClient } from "./server";

const PREVIEW_TTL_HOURS = 2;
const PREVIEW_RETENTION_DAYS = 2;

type EntryPreviewRow = {
  entry_id: string;
  user_id: string;
  surface: PreviewSurface;
  token: string;
  expires_at: string;
  invalidated_at: string | null;
  created_at: string;
};

type PreviewableEntryRow = {
  id: string;
  user_id: string;
  status: QRStatus;
  target_type: QRTargetType;
};

function createPreviewToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

function getPreviewExpiryIso() {
  return new Date(Date.now() + PREVIEW_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

function getPreviewRetentionCutoffIso() {
  return new Date(Date.now() - PREVIEW_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

async function requireOwnedEntry(entryId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("You need to sign in first.");
  }

  const { data, error } = await supabase
    .from("entries")
    .select("id, user_id, status, target_type")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Unable to find this entry.");
  }

  return {
    supabase,
    entry: data as PreviewableEntryRow,
  };
}

export async function getEntryPreviewLink(entryId: string) {
  const { supabase, entry } = await requireOwnedEntry(entryId);
  const surface = getPreviewSurface();

  if (entry.status !== "draft") {
    return {
      previewUrl: null,
      previewExpiresAt: null,
      surface,
    };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("entry_preview_tokens")
    .select("surface, token, expires_at, invalidated_at, created_at")
    .eq("entry_id", entry.id)
    .eq("user_id", entry.user_id)
    .eq("surface", surface)
    .is("invalidated_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const preview = data as Pick<EntryPreviewRow, "surface" | "token" | "expires_at"> | null;

  return {
    previewUrl: preview ? buildPreviewUrl(preview.token) : null,
    previewExpiresAt: preview?.expires_at ?? null,
    surface,
  };
}

export async function refreshEntryPreviewLink(entryId: string) {
  const { supabase, entry } = await requireOwnedEntry(entryId);

  if (entry.status !== "draft") {
    throw new Error("Preview links are only available for draft entries.");
  }

  const surface = getPreviewSurface();
  const nowIso = new Date().toISOString();
  const previewExpiresAt = getPreviewExpiryIso();
  const token = createPreviewToken();

  const { error: invalidateError } = await supabase
    .from("entry_preview_tokens")
    .update({ invalidated_at: nowIso })
    .eq("entry_id", entry.id)
    .eq("user_id", entry.user_id)
    .is("invalidated_at", null);

  if (invalidateError) {
    throw new Error(invalidateError.message);
  }

  const { error: insertError } = await supabase.from("entry_preview_tokens").insert({
    entry_id: entry.id,
    user_id: entry.user_id,
    surface,
    token,
    expires_at: previewExpiresAt,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    previewUrl: buildPreviewUrl(token),
    previewExpiresAt,
    surface,
  };
}

export async function invalidateEntryPreviewLinks(entryId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("entry_preview_tokens")
    .update({ invalidated_at: new Date().toISOString() })
    .eq("entry_id", entryId)
    .eq("user_id", user.id)
    .is("invalidated_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function purgeOldEntryPreviewTokens() {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("Supabase admin environment variables are missing.");
  }

  const supabase = createAdminSupabaseClient();
  const cutoffIso = getPreviewRetentionCutoffIso();

  const { data, error } = await supabase
    .from("entry_preview_tokens")
    .delete()
    .lt("created_at", cutoffIso)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return {
    deletedCount: data?.length ?? 0,
    cutoffIso,
  };
}

export async function resolveDraftPagePreviewByToken(token: string) {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data: previewData, error: previewError } = await supabase
    .from("entry_preview_tokens")
    .select("entry_id, surface, expires_at, invalidated_at")
    .eq("token", normalizedToken)
    .eq("surface", "page")
    .is("invalidated_at", null)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (previewError) {
    throw new Error(previewError.message);
  }

  const preview = previewData as Pick<EntryPreviewRow, "entry_id" | "surface" | "expires_at" | "invalidated_at"> | null;
  if (!preview) {
    return null;
  }

  const { data: entryData, error: entryError } = await supabase
    .from("entries")
    .select("id, status, target_type, expires_at")
    .eq("id", preview.entry_id)
    .maybeSingle();

  if (entryError) {
    throw new Error(entryError.message);
  }

  const entry = entryData as { id: string; status: QRStatus; target_type: QRTargetType; expires_at: string | null } | null;
  if (!entry || entry.status !== "draft" || entry.target_type !== "vcard") {
    return null;
  }

  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return null;
  }

  const { data: targetData, error: targetError } = await supabase
    .from("entry_targets")
    .select("vcard")
    .eq("entry_id", entry.id)
    .eq("is_default", true)
    .eq("kind", "vcard")
    .maybeSingle();

  if (targetError) {
    throw new Error(targetError.message);
  }

  const vcard = (targetData as { vcard?: unknown } | null)?.vcard;
  if (!vcard || typeof vcard !== "object") {
    return null;
  }

  return vcard as {
    contentId?: string;
    [key: string]: unknown;
  };
}
