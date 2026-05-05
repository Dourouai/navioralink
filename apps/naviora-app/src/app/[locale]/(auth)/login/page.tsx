import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentAppUser } from "@/lib/supabase/server-auth";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "login");
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  const appUser = await getCurrentAppUser();
  const safeNextPath = next?.startsWith("/") ? next : withLocale(locale, "/dashboard");

  if (hasSupabaseEnv() && appUser) {
    redirect(safeNextPath);
  }

  return (
    <AuthShell locale={locale} mode="login">
      <AuthForm locale={locale} mode="login" />
    </AuthShell>
  );
}
