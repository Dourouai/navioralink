import { notFound } from "next/navigation";

import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <div data-locale={locale as Locale}>{children}</div>;
}
