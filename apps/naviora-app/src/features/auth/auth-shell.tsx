import Link from "next/link";
import { MessageSquareMore, ShieldCheck } from "lucide-react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AppLogo } from "@/components/shared/app-logo";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";

interface AuthShellProps {
  locale: Locale;
  mode: "login" | "register";
  children: React.ReactNode;
  headerLinkOverride?: {
    href: string;
    label: string;
  };
}

export function AuthShell({ locale, mode, children, headerLinkOverride }: AuthShellProps) {
  const fallbackPath = mode === "login" ? "/register" : "/login";
  const fallbackLabel =
    mode === "login"
      ? locale === "zh-Hant"
        ? "建立帳號"
        : locale === "zh-Hans"
          ? "创建账号"
          : "Create account"
      : locale === "zh-Hant"
        ? "返回登入"
        : locale === "zh-Hans"
          ? "返回登录"
          : "Back to login";
  const headerLinkHref = headerLinkOverride?.href ?? withLocale(locale, fallbackPath);
  const headerLinkLabel = headerLinkOverride?.label ?? fallbackLabel;
  const bullets =
    locale === "zh-Hant"
      ? [
          "同一個 QR 支援多語言與地區分流",
          "可擴充 Tracking、到期與密碼保護",
          "從對話建立到發布都在同一工作台",
        ]
      : locale === "zh-Hans"
        ? [
            "同一个 QR 支持多语言与地区分流",
            "可扩展 Tracking、到期与密码保护",
            "从对话创建到发布都在同一工作台",
          ]
      : [
          "One QR with language and region routing",
          "Tracking, expiration, and password options",
          "One workspace from prompt to publishing",
        ];

  return (
    <div className="auth-stage min-h-screen p-2 md:p-4">
      <div className="auth-frame mx-auto grid min-h-[calc(100vh-1rem)] w-full max-w-[1600px] overflow-hidden rounded-[34px] border border-white/70 bg-white/70 shadow-[0_35px_80px_rgba(20,40,82,0.14)] lg:grid-cols-[460px_1fr]">
        <section className="auth-left-panel relative hidden overflow-hidden lg:flex lg:flex-col">
          <div className="auth-orb auth-orb-one" />
          <div className="auth-orb auth-orb-two" />
          <div className="auth-orb auth-orb-three" />

          <div className="relative z-10 flex h-full flex-col p-8">
            <AppLogo href={withLocale(locale, "/")} subtitle={locale === "zh-Hant" ? "智能入口工作台" : "Smart entry workspace"} />

            <div className="mt-14 max-w-[320px]">
              <div className="auth-hand-wave mb-3 inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/70 text-3xl shadow-[0_12px_24px_rgba(31,55,92,0.12)]">
                👋
              </div>
              <h2 className="text-balance text-[36px] font-semibold leading-[1.18] text-slate-900">
                {mode === "login"
                  ? locale === "zh-Hant"
                    ? "回到 Naviora，繼續你的 QR 任務。"
                    : locale === "zh-Hans"
                      ? "回到 Naviora，继续你的 QR 任务。"
                      : "Welcome back, continue your QR workflow."
                  : locale === "zh-Hant"
                    ? "建立帳號，開始你的第一個智能 QR。"
                    : locale === "zh-Hans"
                      ? "创建账号，开始你的第一个智能 QR。"
                      : "Create your account and launch your first smart QR."}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {locale === "zh-Hant"
                  ? "把活動頁、商品頁與多市場內容整合到同一個動態 QR 體驗中。"
                  : locale === "zh-Hans"
                    ? "把活动页、商品页与多市场内容整合到同一个动态 QR 体验中。"
                    : "Unify campaign pages, product links, and multi-market flows in one dynamic QR experience."}
              </p>
            </div>

            <div className="mt-10 space-y-3">
              {bullets.map((item) => (
                <div
                  key={item}
                  className="auth-fade-in flex items-center gap-3 rounded-[16px] border border-white/75 bg-white/52 px-4 py-3 text-sm text-slate-700 backdrop-blur-md"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/14 text-emerald-700">
                    <ShieldCheck size={14} />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

          </div>
        </section>

        <section className="relative flex min-h-[calc(100vh-1rem)] flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(250,252,255,0.9))] px-4 py-5 md:px-8 md:py-7 lg:px-16">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <Link
              href={withLocale(locale, "/about")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-600 transition hover:text-slate-900"
            >
              <MessageSquareMore size={14} />
              {locale === "zh-Hant" ? "說明中心" : locale === "zh-Hans" ? "帮助中心" : "Help Center"}
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href={headerLinkHref}
                className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-600 transition hover:text-slate-900 md:inline-flex"
              >
                {headerLinkLabel}
              </Link>
              <LanguageSwitcher locale={locale} direction="down" />
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[560px] flex-1 items-center py-6 md:py-10">{children}</div>
        </section>
      </div>
    </div>
  );
}
