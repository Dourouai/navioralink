import { unstable_cache } from "next/cache";
import { cache } from "react";

import type { ManagedAssetRecord } from "@/lib/managed-assets";
import { APP_CACHE_REVALIDATE_SECONDS, getAssetsTag } from "@/lib/cache-tags";
import { buildCosPublicUrl } from "@/lib/tencent-cos";

import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "./admin";
import { hasSupabaseEnv } from "./env";
import { createServerSupabaseClient } from "./server";
import { getCurrentAppUser } from "./server-auth";

type AssetRow = {
  id: string;
  provider: string | null;
  object_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  visibility: "public" | "private";
  created_at: string;
};

export function mapAssetRowToManagedAssetRecord(asset: AssetRow): ManagedAssetRecord {
  return {
    id: asset.id,
    name: asset.original_name,
    mimeType: asset.mime_type,
    size: Number(asset.size_bytes ?? 0),
    createdAt: asset.created_at,
    visibility: asset.visibility,
    provider: asset.provider === "inline" ? "inline" : "cos",
    url: asset.visibility === "public" ? buildCosPublicUrl(asset.object_path) : undefined,
    objectPath: asset.object_path,
  };
}

async function loadManagedAssetsForUser(userId: string, limit: number, useAdminClient = false) {
  const supabase = useAdminClient ? createAdminSupabaseClient() : await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("assets")
    .select("id, provider, object_path, original_name, mime_type, size_bytes, visibility, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AssetRow[]).map(mapAssetRowToManagedAssetRecord);
}

const getManagedAssetsServerCached = cache((userId: string, limit: number) =>
  unstable_cache(() => loadManagedAssetsForUser(userId, limit, true), ["managed-assets", userId, String(limit)], {
    revalidate: APP_CACHE_REVALIDATE_SECONDS.assets,
    tags: [getAssetsTag(userId)],
  })(),
);

export async function getManagedAssetsServer(limit = 120) {
  if (!hasSupabaseEnv()) {
    return [] as ManagedAssetRecord[];
  }

  const user = await getCurrentAppUser();
  if (!user) {
    return [] as ManagedAssetRecord[];
  }

  if (!hasSupabaseAdminEnv()) {
    return loadManagedAssetsForUser(user.id, limit);
  }

  return getManagedAssetsServerCached(user.id, limit);
}
