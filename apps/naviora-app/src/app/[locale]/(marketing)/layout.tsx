import type { ReactNode } from "react";

import { MarketingFooter } from "@/components/layout/marketing-footer";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { isLocale, type Locale } from "@/i18n/config";
import { getCurrentAppUser } from "@/lib/supabase/server-auth";

export default async function MarketingLayout({
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

  const currentUser = await getCurrentAppUser();

  return (
    <div className="min-h-screen">
      <MarketingHeader locale={locale as Locale} initialUser={currentUser} />
      <main>{children}</main>
      <MarketingFooter locale={locale as Locale} />
    </div>
  );
}
