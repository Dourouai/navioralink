import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { AuthShell } from "@/features/auth/auth-shell";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentAppUser } from "@/lib/supabase/server-auth";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "forgotPassword");
}

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const appUser = await getCurrentAppUser();

  if (hasSupabaseEnv() && appUser) {
    redirect(withLocale(locale, "/dashboard"));
  }

  return (
    <AuthShell
      locale={locale}
      mode="login"
      headerLinkOverride={{
        href: withLocale(locale, "/login"),
        label: locale === "zh-Hant" ? "返回登入" : locale === "zh-Hans" ? "返回登录" : "Back to login",
      }}
    >
      <ForgotPasswordForm locale={locale} />
    </AuthShell>
  );
}
