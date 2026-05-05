import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentPlanSnapshotServer } from "@/lib/supabase/billing-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCosUploadTicket, hasTencentCosEnv } from "@/lib/tencent-cos";
import { getManagedAssetScopeConfig } from "@/lib/managed-assets";

export const runtime = "nodejs";

const bodySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  scope: z.enum(["vcardAvatar", "vcardImage", "qrLogo", "media"]),
});

export async function POST(request: NextRequest) {
  if (!hasTencentCosEnv()) {
    return NextResponse.json(
      {
        message:
          "Tencent COS is not configured yet. Add TENCENT_COS_SECRET_ID, TENCENT_COS_SECRET_KEY, TENCENT_COS_REGION, and TENCENT_COS_BUCKET first.",
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
          message: "You need to sign in before uploading files.",
        },
        { status: 401 },
      );
    }

    const scopeConfig = getManagedAssetScopeConfig(payload.scope);

    if (!scopeConfig.allowedMimeTypes.has(payload.mimeType)) {
      return NextResponse.json(
        {
          message: "This file type is not supported for the selected upload flow.",
        },
        { status: 400 },
      );
    }

    if (payload.size > scopeConfig.maxSizeBytes) {
      return NextResponse.json(
        {
          message: "This file is larger than the current upload limit.",
        },
        { status: 400 },
      );
    }

    const [{ data: assets, error: assetsError }, currentPlan] = await Promise.all([
      supabase.from("assets").select("size_bytes").eq("user_id", user.id),
      getCurrentPlanSnapshotServer(),
    ]);

    if (assetsError) {
      return NextResponse.json(
        {
          message: assetsError.message,
        },
        { status: 500 },
      );
    }

    const usedBytes = (assets ?? []).reduce((total, asset) => total + Number(asset.size_bytes ?? 0), 0);
    const storageLimitBytes = currentPlan.usage.storageMb.limit * 1024 * 1024;

    if (usedBytes + payload.size > storageLimitBytes) {
      return NextResponse.json(
        {
          message: "Uploading this file would exceed your current storage limit.",
        },
        { status: 409 },
      );
    }

    const ticket = await createCosUploadTicket({
      scope: payload.scope,
      userId: user.id,
      assetId: randomUUID(),
      fileName: payload.fileName,
      visibility: scopeConfig.visibility,
    });

    return NextResponse.json({
      ticket,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Please provide a valid upload request.",
      },
      { status: 400 },
    );
  }
}
