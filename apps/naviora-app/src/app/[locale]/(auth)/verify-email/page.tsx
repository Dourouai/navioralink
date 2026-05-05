import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/features/auth/auth-shell";
import { VerifyEmailActions } from "@/features/auth/verify-email-actions";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { buildPageMetadata } from "@/lib/metadata";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentAppUser } from "@/lib/supabase/server-auth";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "verifyEmail");
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale } = await params;
  const { email } = await searchParams;
  const t = getMessages(locale);
  const appUser = await getCurrentAppUser();

  if (hasSupabaseEnv() && appUser) {
    redirect(withLocale(locale, "/dashboard"));
  }

  return (
    <AuthShell locale={locale} mode="register">
      <div className="w-full rounded-[30px] border border-[rgba(196,210,228,0.5)] bg-white/92 p-6 shadow-[0_24px_50px_rgba(31,55,92,0.08)] backdrop-blur-xl md:p-9">
        <div className="inline-flex rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-sky-700">
          {locale === "zh-Hant" ? "確認信箱" : locale === "zh-Hans" ? "确认邮箱" : "VERIFY EMAIL"}
        </div>
        <h1 className="mt-4 text-balance text-[34px] font-semibold leading-[1.15] text-slate-900">{t.auth.verifyEmailTitle}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{t.auth.verifyEmailBody}</p>
        {email ? (
          <div className="mt-6 rounded-[18px] border border-slate-200 bg-slate-50/85 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {locale === "zh-Hant" ? "已發送至" : locale === "zh-Hans" ? "已发送至" : "Sent to"}
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900">{email}</div>
          </div>
        ) : null}
        <p className="mt-5 text-sm leading-6 text-slate-500">{t.auth.verifyEmailHint}</p>
        <VerifyEmailActions locale={locale} email={email} />
        <div className="mt-8">
          <Link
            href={withLocale(locale, "/login")}
            className="soft-shimmer inline-flex h-12 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#1ac0f3_0%,#3f8cff_56%,#8d79ff_100%)] px-6 text-base font-semibold text-white shadow-[0_18px_36px_rgba(79,140,255,0.24)] transition hover:translate-y-[-1px]"
          >
            {t.auth.verifyEmailAction}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
