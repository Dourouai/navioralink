import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "resetPassword");
}

export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  return (
    <AuthShell
      locale={locale}
      mode="login"
      headerLinkOverride={{
        href: withLocale(locale, "/login"),
        label: locale === "zh-Hant" ? "返回登入" : locale === "zh-Hans" ? "返回登录" : "Back to login",
      }}
    >
      <ResetPasswordForm locale={locale} />
    </AuthShell>
  );
}
