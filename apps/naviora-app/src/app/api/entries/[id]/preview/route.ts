import { NextRequest, NextResponse } from "next/server";

import { getEntryPreviewLink, refreshEntryPreviewLink } from "@/lib/supabase/entry-preview-server";

export const runtime = "nodejs";

function mapErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to prepare a preview link.";
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const result = await getEntryPreviewLink(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: mapErrorMessage(error),
      },
      { status: 400 },
    );
  }
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const result = await refreshEntryPreviewLink(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message: mapErrorMessage(error),
      },
      { status: 400 },
    );
  }
}
