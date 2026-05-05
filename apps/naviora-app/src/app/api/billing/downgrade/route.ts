import { NextResponse } from "next/server";

import { applyInternalDowngrade } from "@/lib/billing/membership-server";
import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { syncCurrentUserPlanConstraints } from "@/lib/supabase/subscription-controls";
import { getCurrentAppUser } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

function getErrorMessage(code: string) {
  switch (code) {
    case "DOWNGRADE_NOT_AVAILABLE":
      return "This workspace cannot be downgraded to Starter right now.";
    case "AUTH_REQUIRED":
      return "Sign in first before changing the subscription.";
    default:
      return "Unable to update the subscription right now.";
  }
}

export async function POST() {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      {
        code: "DOWNGRADE_UNAVAILABLE",
        message: "Supabase admin environment is missing.",
      },
      { status: 500 },
    );
  }

  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return NextResponse.json(
      {
        code: "AUTH_REQUIRED",
        message: getErrorMessage("AUTH_REQUIRED"),
      },
      { status: 401 },
    );
  }

  try {
    const supabase = createAdminSupabaseClient();
    const result = await applyInternalDowngrade(supabase, appUser.id);
    await syncCurrentUserPlanConstraints(appUser.id);

    return NextResponse.json({
      ok: true,
      planCode: "starter",
      currentPeriodEnd: result.downgradedSubscription.current_period_end,
      durationMonths: result.durationMonths,
      remainingValue: result.remainingValue,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "DOWNGRADE_UNAVAILABLE";
    return NextResponse.json(
      {
        code,
        message: getErrorMessage(code),
      },
      {
        status: code === "AUTH_REQUIRED" ? 401 : code === "DOWNGRADE_NOT_AVAILABLE" ? 400 : 500,
      },
    );
  }
}
