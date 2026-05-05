import { NextRequest, NextResponse } from "next/server";

import type { ActivationCodeRedemptionStrategy } from "@/lib/billing/membership-server";
import {
  previewActivationCodeRedemption,
  redeemActivationCodeWithStrategy,
} from "@/lib/billing/membership-server";
import { isActivationCodeErrorCode } from "@/lib/billing/activation-codes";
import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { syncCurrentUserPlanConstraints } from "@/lib/supabase/subscription-controls";
import { getCurrentAppUser } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

function getErrorMessage(code: string) {
  switch (code) {
    case "ACTIVATION_CODE_REQUIRED":
      return "Enter an activation code first.";
    case "ACTIVATION_CODE_INVALID":
      return "This activation code is invalid.";
    case "ACTIVATION_CODE_EXPIRED":
      return "This activation code has expired.";
    case "ACTIVATION_CODE_UNAVAILABLE":
      return "This activation code is no longer available.";
    case "ACTIVATION_CODE_LIMIT_REACHED":
      return "This activation code has already been used up.";
    case "ACTIVATION_CODE_ALREADY_REDEEMED":
      return "This activation code has already been redeemed on this account.";
    case "ACTIVATION_CODE_AUTH_REQUIRED":
      return "Sign in first before redeeming an activation code.";
    case "ACTIVATION_CODE_STRATEGY_REQUIRED":
      return "Choose how this activation code should be applied first.";
    default:
      return "Unable to redeem this activation code right now.";
  }
}

function isActivationCodeStrategy(value: string | null | undefined): value is ActivationCodeRedemptionStrategy {
  return value === "activate_now" || value === "queue_after_current" || value === "upgrade_difference" || value === "start_now";
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      {
        code: "ACTIVATION_CODE_UNAVAILABLE",
        message: "Supabase admin environment is missing.",
      },
      { status: 500 },
    );
  }

  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return NextResponse.json(
      {
        code: "ACTIVATION_CODE_AUTH_REQUIRED",
        message: getErrorMessage("ACTIVATION_CODE_AUTH_REQUIRED"),
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        code?: string;
        action?: "preview" | "redeem";
        strategy?: string;
      }
    | null;

  const code = typeof body?.code === "string" ? body.code : "";
  const action = body?.action === "redeem" ? "redeem" : "preview";
  const strategy = isActivationCodeStrategy(body?.strategy) ? body.strategy : undefined;

  try {
    const supabase = createAdminSupabaseClient();

    if (action === "preview") {
      const preview = await previewActivationCodeRedemption(supabase, appUser.id, code);

      return NextResponse.json({
        ok: true,
        preview,
      });
    }

    const redemption = await redeemActivationCodeWithStrategy(supabase, appUser.id, code, strategy);
    await syncCurrentUserPlanConstraints(appUser.id);

    return NextResponse.json({
      ok: true,
      preview: redemption.preview,
      redemption: {
        strategy: redemption.strategy,
        subscriptionId: redemption.primarySubscription.id,
        planCode: redemption.currentPlanCode,
        currentPeriodEnd: redemption.currentPeriodEnd,
        queuedSubscriptionId: redemption.queuedSubscription?.id ?? null,
      },
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "ACTIVATION_CODE_UNAVAILABLE";
    const code = isActivationCodeErrorCode(rawMessage) ? rawMessage : "ACTIVATION_CODE_UNAVAILABLE";
    return NextResponse.json(
      {
        code,
        message: getErrorMessage(code),
      },
      {
        status:
          code === "ACTIVATION_CODE_AUTH_REQUIRED"
            ? 401
            : code === "ACTIVATION_CODE_UNAVAILABLE"
              ? 500
              : 400,
      },
    );
  }
}
