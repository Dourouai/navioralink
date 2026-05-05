import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildManagedAssetObjectPrefix, getManagedAssetScopeConfig } from "@/lib/managed-assets";
import { getAssetsTag } from "@/lib/cache-tags";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildCosPublicUrl, createTencentCosNodeClient, getTencentCosEnv, hasTencentCosEnv } from "@/lib/tencent-cos";

export const runtime = "nodejs";

const bodySchema = z.object({
  assetId: z.string().uuid(),
  objectPath: z.string().trim().min(1).max(512),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  scope: z.enum(["vcardAvatar", "vcardImage", "qrLogo", "media"]),
});

type AssetRow = {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  visibility: "public" | "private";
  object_path: string;
  created_at: string;
};

export async function POST(request: NextRequest) {
  if (!hasTencentCosEnv()) {
    return NextResponse.json(
      {
        message: "Tencent COS is not configured yet.",
      },
      { status: 503 },
    );
  }

  try {
    const payload = bodySchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json(
        {
          message: userError.message,
        },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          message: "You need to sign in before finalizing uploads.",
        },
        { status: 401 },
      );
    }

    const scopeConfig = getManagedAssetScopeConfig(payload.scope);
    const expectedPrefix = buildManagedAssetObjectPrefix(payload.scope, user.id);

    if (!payload.objectPath.startsWith(expectedPrefix) || !payload.objectPath.includes(`${payload.assetId}-`)) {
      return NextResponse.json(
        {
          message: "The uploaded object path is invalid for this user.",
        },
        { status: 400 },
      );
    }

    const cos = createTencentCosNodeClient();
    const env = getTencentCosEnv();

    const headResult = await cos.headObject({
      Bucket: env.bucket,
      Region: env.region,
      Key: payload.objectPath,
    });
    const sizeBytes = Number(headResult.headers?.["content-length"] ?? 0);
    const objectMimeType =
      typeof headResult.headers?.["content-type"] === "string"
        ? headResult.headers["content-type"].split(";")[0]?.trim() || payload.mimeType
        : payload.mimeType;

    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return NextResponse.json(
        {
          message: "The uploaded object could not be verified.",
        },
        { status: 400 },
      );
    }

    if (!scopeConfig.allowedMimeTypes.has(objectMimeType) || sizeBytes > scopeConfig.maxSizeBytes) {
      return NextResponse.json(
        {
          message: "The uploaded file does not match the allowed constraints for this asset type.",
        },
        { status: 400 },
      );
    }

    if (scopeConfig.visibility === "public") {
      await cos.putObjectAcl({
        Bucket: env.bucket,
        Region: env.region,
        Key: payload.objectPath,
        ACL: "public-read",
      });
    }

    const { data, error } = await supabase
      .from("assets")
      .upsert({
        id: payload.assetId,
        user_id: user.id,
        provider: "cos",
        bucket: env.bucket,
        object_path: payload.objectPath,
        original_name: payload.fileName,
        mime_type: objectMimeType,
        size_bytes: sizeBytes,
        visibility: scopeConfig.visibility,
      })
      .select("id, original_name, mime_type, size_bytes, visibility, object_path, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        {
          message: error.message,
        },
        { status: 500 },
      );
    }

    const asset = data as AssetRow;

    revalidateTag(getAssetsTag(user.id), "max");

    return NextResponse.json({
      asset: {
        id: asset.id,
        name: asset.original_name,
        mimeType: asset.mime_type,
        size: asset.size_bytes,
        createdAt: asset.created_at,
        visibility: asset.visibility,
        provider: "cos",
        url: asset.visibility === "public" ? buildCosPublicUrl(asset.object_path) : undefined,
        objectPath: asset.object_path,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Please provide a valid uploaded asset payload.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Failed to finalize the uploaded file.",
      },
      { status: 500 },
    );
  }
}
