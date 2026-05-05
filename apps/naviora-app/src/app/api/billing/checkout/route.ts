import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import {
  createCreemClient,
  getCreemProductId,
  isBillingCycle,
  isPaidPlanCode,
  resolveBillingLocale,
} from "@/lib/billing/creem";
import { getEffectivePlanCode, hasActiveSubscriptionAccess, inferBillingCycle } from "@/lib/billing/plan-entitlements";
import { getCurrentAppUser } from "@/lib/supabase/server-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getCurrentSubscriptionForUser,
  recordMembershipChange,
  upsertCreemSubscriptionRecord,
} from "@/lib/supabase/billing-shared";

export const runtime = "nodejs";

function buildLocalizedUrl(request: NextRequest, locale: Locale, path: string) {
  return new URL(withLocale(locale, path), request.url);
}

function redirectWithQuery(
  request: NextRequest,
  locale: Locale,
  path: string,
  query: Record<string, string>,
) {
  const url = buildLocalizedUrl(request, locale, path);
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const requestedPlan = request.nextUrl.searchParams.get("plan");
  const requestedBilling = request.nextUrl.searchParams.get("billing");
  const appUser = await getCurrentAppUser();
  const locale = resolveBillingLocale(requestedLocale, appUser?.defaultLocale ?? null);

  if (!appUser) {
    const loginUrl = buildLocalizedUrl(request, locale, "/login");
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!isBillingCycle(requestedBilling)) {
    return redirectWithQuery(request, locale, "/settings", {
      billingError: "invalid-billing-cycle",
    });
  }

  if (!(requestedPlan === "free" || isPaidPlanCode(requestedPlan))) {
    return redirectWithQuery(request, locale, "/settings", {
      billingError: "invalid-plan",
    });
  }

  const supabase = await createServerSupabaseClient();
  const currentSubscription = await getCurrentSubscriptionForUser(supabase, appUser.id);
  const currentPlanCode = getEffectivePlanCode(currentSubscription);
  const currentBillingCycle = inferBillingCycle(currentSubscription);
  const hasActiveSubscription = hasActiveSubscriptionAccess(currentSubscription);

  if (requestedPlan === "free") {
    if (hasActiveSubscription && currentPlanCode !== "free") {
      const portalUrl = new URL("/api/billing/portal", request.url);
      portalUrl.searchParams.set("locale", locale);
      return NextResponse.redirect(portalUrl);
    }

    return redirectWithQuery(request, locale, "/settings", {
      billingNotice: "current-plan",
    });
  }

  if (hasActiveSubscription && currentPlanCode === requestedPlan && currentBillingCycle === requestedBilling) {
    return redirectWithQuery(request, locale, "/settings", {
      billingNotice: "current-plan",
    });
  }

  try {
    const creem = createCreemClient();
    const productId = getCreemProductId(requestedPlan, requestedBilling);

    if (hasActiveSubscription && currentPlanCode !== "free" && currentSubscription?.provider_subscription_id) {
      const upgraded = await creem.subscriptions.upgrade({
        subscriptionId: currentSubscription.provider_subscription_id,
        productId,
        updateBehavior: "proration-charge",
      });

      const updatedSubscription = await upsertCreemSubscriptionRecord(supabase, {
        userId: appUser.id,
        providerCustomerId:
          typeof upgraded.customer === "string" ? upgraded.customer : upgraded.customer?.id ?? currentSubscription.provider_customer_id,
        providerSubscriptionId: upgraded.id,
        productId,
        status: upgraded.status,
        metadata: {
          ...(upgraded.metadata ?? {}),
          userId: appUser.id,
          planCode: requestedPlan,
          billingCycle: requestedBilling,
        },
        currentPeriodStart: upgraded.currentPeriodStartDate,
        currentPeriodEnd: upgraded.currentPeriodEndDate,
        cancelAtPeriodEnd: upgraded.status === "scheduled_cancel",
      });

      await recordMembershipChange(supabase, {
        userId: appUser.id,
        action: "upgrade",
        source: "settings",
        provider: "creem",
        referenceId: updatedSubscription?.provider_subscription_id ?? upgraded.id,
        previousPlanCode: currentPlanCode,
        previousPeriodEnd: currentSubscription.current_period_end,
        currentPlanCode: requestedPlan,
        currentPeriodEnd: updatedSubscription?.current_period_end ?? null,
        details: {
          billingCycle: requestedBilling,
          updateBehavior: "proration-charge",
        },
      });

      return redirectWithQuery(request, locale, "/settings", {
        billingNotice: "plan-updated",
      });
    }

    const checkout = await creem.checkouts.create({
      requestId: randomUUID(),
      productId,
      units: 1,
      successUrl: `${request.nextUrl.origin}${withLocale(locale, "/settings")}?billingNotice=checkout-complete`,
      customer: currentSubscription?.provider_customer_id
        ? { id: currentSubscription.provider_customer_id }
        : { email: appUser.email },
      metadata: {
        userId: appUser.id,
        planCode: requestedPlan,
        billingCycle: requestedBilling,
      },
    });

    if (!checkout.checkoutUrl) {
      throw new Error("Creem checkout did not return a checkout URL.");
    }

    return NextResponse.redirect(checkout.checkoutUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    return redirectWithQuery(request, locale, "/settings", {
      billingError: message.includes("creem") || message.includes("product") ? "billing-unavailable" : "billing-request-failed",
    });
  }
}
