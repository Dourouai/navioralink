import { unstable_cache } from "next/cache";
import { cache } from "react";

import type { VCardProfile } from "@/types/qr";

import { resolveDraftPagePreviewByToken } from "./entry-preview-server";
import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "./admin";

type PublicVCardLookupRow = {
  vcard: VCardProfile | null;
  entries:
    | {
        status: string | null;
        expires_at: string | null;
      }
    | Array<{
        status: string | null;
        expires_at: string | null;
      }>
    | null;
};

function normalizeEntryRelation(row: PublicVCardLookupRow["entries"]) {
  if (Array.isArray(row)) {
    return row[0] ?? null;
  }

  return row;
}

async function loadPublicVCardProfileByContentId(contentId: string) {
  const normalizedContentId = contentId.trim();

  if (!hasSupabaseAdminEnv() || !normalizedContentId) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("entry_targets")
    .select("vcard, entries!inner(status, expires_at)")
    .eq("kind", "vcard")
    .filter("vcard->>contentId", "eq", normalizedContentId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as PublicVCardLookupRow | null;

  if (!row?.vcard) {
    return null;
  }

  const entry = normalizeEntryRelation(row.entries);

  if (!entry || entry.status !== "active") {
    return null;
  }

  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return null;
  }

  return row.vcard;
}

async function loadPreviewVCardProfileByToken(contentId: string, previewToken: string) {
  const previewProfile = await resolveDraftPagePreviewByToken(previewToken);

  if (!previewProfile?.contentId || previewProfile.contentId !== contentId) {
    return null;
  }

  return previewProfile as VCardProfile;
}

const resolvePublicVCardProfileByContentIdCached = cache((contentId: string) =>
  unstable_cache(async () => loadPublicVCardProfileByContentId(contentId), ["public-vcard-profile", contentId], {
    revalidate: 300,
    tags: [`public-vcard:${contentId}`],
  })(),
);

export async function resolvePublicVCardProfileByContentId(
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
    return loadPreviewVCardProfileByToken(normalizedContentId, previewToken);
  }

  return resolvePublicVCardProfileByContentIdCached(normalizedContentId);
}
