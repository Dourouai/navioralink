import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getManagedAssetsServer } from "@/lib/supabase/assets-server";

export const runtime = "nodejs";

export async function GET() {
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
        message: "You need to sign in before viewing files.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    assets: await getManagedAssetsServer(120),
  });
}
