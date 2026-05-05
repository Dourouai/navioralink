import type { Metadata } from "next";

import { SettingsCenter } from "@/features/settings/settings-center";
import type { Locale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import {
  getBillingHistoryServer,
  getCurrentPlanSnapshotServer,
  getMembershipChangeHistoryServer,
} from "@/lib/supabase/billing-server";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "settings");
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [currentPlan, billingHistory, membershipChanges] = await Promise.all([
    getCurrentPlanSnapshotServer(),
    getBillingHistoryServer(),
    getMembershipChangeHistoryServer(),
  ]);

  return (
    <SettingsCenter
      locale={locale}
      currentPlan={currentPlan}
      billingHistory={billingHistory}
      membershipChanges={membershipChanges}
    />
  );
}
