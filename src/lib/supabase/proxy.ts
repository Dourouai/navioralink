import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseEnv, hasSupabaseEnv } from "./env";

export async function updateSupabaseSession(request: NextRequest, response?: NextResponse) {
  if (!hasSupabaseEnv()) {
    return response ?? NextResponse.next();
  }

  const supabaseResponse = response ?? NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
