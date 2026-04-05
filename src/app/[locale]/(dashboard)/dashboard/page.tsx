import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, BarChart3, FolderKanban, PlusSquare, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { buildPageMetadata } from "@/lib/metadata";
import { getDashboardStatsServer, getEntriesServer } from "@/lib/supabase/entries-server";
import { formatDate, formatNumber } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "dashboard");
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getMessages(locale);
  const [dashboardStats, items] = await Promise.all([getDashboardStatsServer(), getEntriesServer()]);

  const ruleModeLabel =
    locale === "zh-Hant"
      ? { none: "無規則", language: "語言模式", region: "國家或地區模式", device: "設備系統模式", param: "參數模式", ab: "A/B Test" }
      : locale === "zh-Hans"
        ? { none: "无规则", language: "语言模式", region: "国家或地区模式", device: "设备系统模式", param: "参数模式", ab: "A/B Test" }
        : { none: "No rule", language: "Language", region: "Region", device: "Device OS", param: "Param", ab: "A/B Test" };

  const quickActions = [
    {
      title: t.nav.create,
      description: locale === "zh-Hant" ? "進入三步流程，透過 AI 對話快速生成入口草稿。" : "Enter the 3-step flow and shape an entry draft with AI conversation.",
      href: withLocale(locale, "/qrs/new"),
      icon: <Sparkles size={18} className="text-sky-600" />,
    },
    {
      title: t.nav.qrs,
      description: locale === "zh-Hant" ? "查看列表、編輯規則、歸檔入口或複製連結。" : "Review all entries, edit rules, archive entries, and copy links.",
      href: withLocale(locale, "/qrs"),
      icon: <FolderKanban size={18} className="text-violet-600" />,
    },
    {
      title: t.nav.analytics,
      description: locale === "zh-Hant" ? "查看 7 天趨勢和活躍入口表現。" : "Track 7-day trends and active entry performance.",
      href: withLocale(locale, "/analytics"),
      icon: <BarChart3 size={18} className="text-teal-600" />,
    },
  ];

  const activityItems =
    locale === "zh-Hant"
      ? [
          "過去 24 小時有 3 個入口掃碼量上升。",
          "你有 1 個草稿還未完成 Step 3 設計。",
          "最近一次規則更新發生在今天。",
        ]
      : [
          "3 entries increased in scans during the last 24 hours.",
          "You still have 1 draft waiting for Step 3 design.",
          "The most recent rule update happened today.",
        ];

  function getStatusTone(status: (typeof items)[number]["status"]) {
    if (status === "active") return "success" as const;
    if (status === "draft" || status === "paused" || status === "archived") return "default" as const;
    return "danger" as const;
  }

  return (
    <div className="space-y-6">
      <Card className="fade-up relative overflow-hidden p-7 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(141,121,255,0.16)_0%,transparent_70%)]" />
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <span className="pill-gradient inline-flex rounded-full px-3 py-1 text-xs font-medium text-sky-700">
              {t.dashboard.heroBadge}
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">{t.dashboard.heroTitle}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">{t.dashboard.heroBody}</p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-white/85 px-3 py-1.5 ring-1 ring-[rgba(190,206,226,0.45)]">
                {formatNumber(dashboardStats.activeQrs)} {t.dashboard.stats.active}
              </span>
              <span className="rounded-full bg-white/85 px-3 py-1.5 ring-1 ring-[rgba(190,206,226,0.45)]">
                {formatNumber(dashboardStats.monthlyScans)} {t.dashboard.stats.monthly}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={withLocale(locale, "/qrs")}>
              <Button variant="secondary">{t.nav.qrs}</Button>
            </Link>
            <Link href={withLocale(locale, "/qrs/new")}>
              <Button icon={<PlusSquare size={16} />}>{t.nav.create}</Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[26px] p-5">
          <div className="text-sm text-slate-500">{t.dashboard.stats.total}</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{formatNumber(dashboardStats.totalQrs)}</div>
          <div className="mt-2 text-sm text-sky-700">{locale === "zh-Hant" ? "+3 本週新增" : "+3 this week"}</div>
        </Card>
        <Card className="rounded-[26px] p-5">
          <div className="text-sm text-slate-500">{t.dashboard.stats.monthly}</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{formatNumber(dashboardStats.monthlyScans)}</div>
          <div className="mt-2 text-sm text-sky-700">+18.6% vs last month</div>
        </Card>
        <Card className="rounded-[26px] p-5">
          <div className="text-sm text-slate-500">{t.dashboard.stats.active}</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{formatNumber(dashboardStats.activeQrs)}</div>
          <div className="mt-2 text-sm text-sky-700">{locale === "zh-Hant" ? "可持續營運中的入口" : "Live smart entries"}</div>
        </Card>
        <Card className="rounded-[26px] p-5">
          <div className="text-sm text-slate-500">{t.dashboard.stats.recent}</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{formatNumber(dashboardStats.recentAdded)}</div>
          <div className="mt-2 text-sm text-sky-700">{locale === "zh-Hant" ? "最近 7 天新增" : "Added in the last 7 days"}</div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t.dashboard.recentTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{t.dashboard.recentNote}</p>
            </div>
            <Link href={withLocale(locale, "/qrs")}>
              <Button variant="secondary">{locale === "zh-Hant" ? "查看全部" : "View all"}</Button>
            </Link>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white/88">
            <div className="hidden grid-cols-[2fr_0.8fr_0.9fr_1fr_1fr_1fr] gap-3 border-b border-slate-100 px-5 py-3 text-xs uppercase tracking-[0.14em] text-slate-400 lg:grid">
              <div>{t.common.name}</div>
              <div>{t.common.type}</div>
              <div>{t.common.status}</div>
              <div>{locale === "zh-Hant" ? "規則" : "Mode"}</div>
              <div>{t.common.scans}</div>
              <div>{t.common.updatedAt}</div>
            </div>

            {items.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="grid gap-4 border-t border-slate-100 px-5 py-4 lg:grid-cols-[2fr_0.8fr_0.9fr_1fr_1fr_1fr] lg:items-center"
              >
                <div>
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="mt-1 text-xs text-slate-500">Dynamic URL QR</div>
                </div>
                <div className="text-sm text-slate-700">{item.type.toUpperCase()}</div>
                <div>
                  <Badge tone={getStatusTone(item.status)}>
                    {t.common[item.status]}
                  </Badge>
                </div>
                <div className="text-sm text-slate-700">{ruleModeLabel[item.ruleMode]}</div>
                <div className="text-sm font-semibold text-slate-900">{formatNumber(item.scans)}</div>
                <div className="text-sm text-slate-500">{formatDate(item.updatedAt)}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900">
              <Sparkles size={18} className="text-sky-600" />
              {t.dashboard.quickTitle}
            </div>
            <div className="space-y-4">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="block rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,251,255,0.98))] p-4 ring-1 ring-[rgba(190,206,226,0.45)] transition hover:translate-y-[-2px]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white ring-1 ring-[rgba(190,206,226,0.45)]">
                      {action.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{action.title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500">{action.description}</div>
                      <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700">
                        {locale === "zh-Hant" ? "前往頁面" : "Open page"}
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900">
              <Activity size={18} className="text-violet-600" />
              {locale === "zh-Hant" ? "最近動態" : "Recent activity"}
            </div>
            <div className="space-y-3">
              {activityItems.map((item) => (
                <div key={item} className="rounded-[18px] bg-white/88 px-4 py-3 text-sm text-slate-700 ring-1 ring-[rgba(190,206,226,0.45)]">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
