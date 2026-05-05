import { NextRequest, NextResponse } from "next/server";

import { resolveDraftPagePreviewByToken } from "@/lib/supabase/entry-preview-server";

export const runtime = "nodejs";

const FALLBACK_CONTENT_ID = "preview-unavailable";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string; token: string }> },
) {
  const { locale, token } = await context.params;
  const previewProfile = await resolveDraftPagePreviewByToken(token).catch(() => null);
  const contentId =
    typeof previewProfile?.contentId === "string" && previewProfile.contentId.trim()
      ? previewProfile.contentId.trim()
      : FALLBACK_CONTENT_ID;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/${locale}/card/${encodeURIComponent(contentId)}`;
  redirectUrl.searchParams.set("preview_token", token);
  return NextResponse.redirect(redirectUrl);
}
