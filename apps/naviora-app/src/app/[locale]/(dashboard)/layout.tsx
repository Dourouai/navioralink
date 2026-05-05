import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { isLocale, type Locale, withLocale } from "@/i18n/config";
import { getCurrentAppUser } from "@/lib/supabase/server-auth";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return children;
  }

  const authEnabled = hasSupabaseEnv();
  const appUser = await getCurrentAppUser();

  if (authEnabled && !appUser) {
    redirect(withLocale(locale as Locale, "/login"));
  }

  return (
    <AppShell locale={locale as Locale} authEnabled={authEnabled} initialUser={appUser}>
      {children}
    </AppShell>
  );
}
