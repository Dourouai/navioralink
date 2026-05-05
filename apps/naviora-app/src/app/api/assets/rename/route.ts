import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAssetsTag } from "@/lib/cache-tags";
import { mapAssetRowToManagedAssetRecord } from "@/lib/supabase/assets-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  assetId: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
});

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

export async function POST(request: NextRequest) {
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
          message: "You need to sign in before renaming files.",
        },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("assets")
      .update({
        original_name: payload.name,
      })
      .eq("id", payload.assetId)
      .eq("user_id", user.id)
      .select("id, provider, object_path, original_name, mime_type, size_bytes, visibility, created_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          message: error.message,
        },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          message: "The file could not be found.",
        },
        { status: 404 },
      );
    }

    revalidateTag(getAssetsTag(user.id), "max");

    return NextResponse.json({
      asset: mapAssetRowToManagedAssetRecord(data as AssetRow),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Please provide a valid file name.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Failed to rename the file.",
      },
      { status: 500 },
    );
  }
}
