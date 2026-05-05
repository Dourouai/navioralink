import { NextRequest, NextResponse } from "next/server";

import { resolveGoPreviewSlugByToken } from "@/lib/supabase/entry-routing";

export const runtime = "nodejs";

const FALLBACK_SLUG = "preview-unavailable";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const previewEntry = await resolveGoPreviewSlugByToken(token).catch(() => null);
  const redirectUrl = request.nextUrl.clone();

  redirectUrl.pathname = `/${encodeURIComponent(previewEntry?.pathPrefix ?? "l")}/${encodeURIComponent(previewEntry?.slug ?? FALLBACK_SLUG)}`;
  redirectUrl.searchParams.set("preview_token", token);

  return NextResponse.redirect(redirectUrl);
}
