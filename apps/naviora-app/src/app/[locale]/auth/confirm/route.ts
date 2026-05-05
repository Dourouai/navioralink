import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const redirectUrl = new URL("/auth/confirm", request.url);

  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value);
  });

  if (!redirectUrl.searchParams.has("locale")) {
    redirectUrl.searchParams.set("locale", locale);
  }

  return NextResponse.redirect(redirectUrl, { status: 307 });
}
