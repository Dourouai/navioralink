import { NextRequest, NextResponse } from "next/server";

import { purgeOldEntryPreviewTokens } from "@/lib/supabase/entry-preview-server";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await purgeOldEntryPreviewTokens();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to purge preview tokens.",
      },
      { status: 500 },
    );
  }
}
