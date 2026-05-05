import { NextRequest, NextResponse } from "next/server";

import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { createCreemClient, resolveBillingLocale } from "@/lib/billing/creem";
import { getCurrentAppUser } from "@/lib/supabase/server-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBillingPortalSubscriptionForUser } from "@/lib/supabase/billing-shared";

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
  const appUser = await getCurrentAppUser();
  const locale = resolveBillingLocale(requestedLocale, appUser?.defaultLocale ?? null);

  if (!appUser) {
    const loginUrl = buildLocalizedUrl(request, locale, "/login");
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const subscription = await getBillingPortalSubscriptionForUser(supabase, appUser.id);
    const customerId = subscription?.provider_customer_id?.trim();

    if (!customerId) {
      return redirectWithQuery(request, locale, "/settings", {
        billingError: "portal-unavailable",
      });
    }

    const creem = createCreemClient();
    const portal = await creem.customers.createPortal({
      customerId,
    });

    if (!portal.customerPortalLink) {
      throw new Error("Creem portal did not return a URL.");
    }

    return NextResponse.redirect(portal.customerPortalLink);
  } catch {
    return redirectWithQuery(request, locale, "/settings", {
      billingError: "portal-unavailable",
    });
  }
}
