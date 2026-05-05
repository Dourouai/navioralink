import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAssetsTag } from "@/lib/cache-tags";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTencentCosNodeClient, getTencentCosEnv, hasTencentCosEnv } from "@/lib/tencent-cos";

export const runtime = "nodejs";

const bodySchema = z.object({
  assetId: z.string().uuid(),
});

type AssetRow = {
  id: string;
  bucket: string;
  object_path: string;
};

function isIgnorableCosDeleteError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("nosuchkey") || message.includes("404") || message.includes("not found");
}

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
          message: "You need to sign in before deleting files.",
        },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("assets")
      .select("id, bucket, object_path")
      .eq("id", payload.assetId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          message: error.message,
        },
        { status: 500 },
      );
    }

    const asset = data as AssetRow | null;

    if (!asset) {
      return NextResponse.json({
        success: true,
      });
    }

    const cos = createTencentCosNodeClient();
    const env = getTencentCosEnv();

    try {
      await cos.deleteObject({
        Bucket: asset.bucket || env.bucket,
        Region: env.region,
        Key: asset.object_path,
      });
    } catch (error) {
      if (!isIgnorableCosDeleteError(error)) {
        throw error;
      }
    }

    const { error: deleteRowError } = await supabase.from("assets").delete().eq("id", payload.assetId).eq("user_id", user.id);

    if (deleteRowError) {
      return NextResponse.json(
        {
          message: deleteRowError.message,
        },
        { status: 500 },
      );
    }

    revalidateTag(getAssetsTag(user.id), "max");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Please provide a valid asset id.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Failed to delete the file.",
      },
      { status: 500 },
    );
  }
}
