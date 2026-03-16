import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/components/layout/auth-gate";
import { isLocale, type Locale } from "@/i18n/config";

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

  return (
    <AppShell locale={locale as Locale}>
      <AuthGate locale={locale as Locale}>{children}</AuthGate>
    </AppShell>
  );
}
