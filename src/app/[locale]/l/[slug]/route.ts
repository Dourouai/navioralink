import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { recordEntryVisit, resolvePublicEntryBySlug } from "@/lib/supabase/entry-routing";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale, slug } = await context.params;
  const resolved = await resolvePublicEntryBySlug(request, slug, locale);

  if (!resolved) {
    return new NextResponse("Entry not found", { status: 404 });
  }

  try {
    await recordEntryVisit(resolved);
  } catch (error) {
    console.error("Failed to record entry visit", error);
  }

  return NextResponse.redirect(resolved.resolvedUrl, { status: 307 });
}
