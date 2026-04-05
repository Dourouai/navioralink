import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalyticsChart } from "@/features/analytics/analytics-chart";
import { BreakdownBarChart } from "@/features/analytics/breakdown-bar-chart";
import { BreakdownDonutChart } from "@/features/analytics/breakdown-donut-chart";
import { WorldTrafficMap } from "@/features/analytics/world-traffic-map";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { getIntlLocale } from "@/i18n/format";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { buildEntryAnalyticsMetadata } from "@/lib/metadata";
import { getEntryAnalyticsDetailServer } from "@/lib/supabase/analytics-server";
import { getEntryByIdServer } from "@/lib/supabase/entries-server";
import { cn } from "@/lib/utils";
import type { EntryAnalyticsWindow } from "@/mock/entry-analytics";
import { createEmptyEntryAnalyticsDetail, getEntryAnalyticsWindow } from "@/mock/entry-analytics";
import type { QRCodeItem } from "@/types/qr";

const DETAIL_SCROLL_THRESHOLD = 5;
const CHART_BUCKET_LIMIT = 10;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const item = await getEntryByIdServer(id);

  if (!item) {
    return locale === "zh-Hant"
      ? { title: "入口分析 | Naviora", description: "查看智能入口的掃碼趨勢、分布與分析資料。" }
      : { title: "Entry Analytics | Naviora", description: "Review scan trends, breakdowns, and analytics for a smart entry." };
  }

  return buildEntryAnalyticsMetadata(locale, item.name);
}

function formatDate(value: string, locale: Locale, withTime = false) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

function formatShare(value: number, total: number, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(total === 0 ? 0 : value / total);
}

function buildChartRows(
  rows: Array<{ label: string; scans: number; share: string }>,
  locale: Locale,
  otherLabel: string,
) {
  if (rows.length <= CHART_BUCKET_LIMIT) {
    return rows.map((row) => ({ label: row.label, scans: row.scans }));
  }

  const visibleRows = rows.slice(0, CHART_BUCKET_LIMIT - 1);
  const remainingRows = rows.slice(CHART_BUCKET_LIMIT - 1);
  const otherScans = remainingRows.reduce((sum, row) => sum + row.scans, 0);
  const totalScans = rows.reduce((sum, row) => sum + row.scans, 0);

  return [
    ...visibleRows.map((row) => ({ label: row.label, scans: row.scans })),
    {
      label: `${otherLabel} · ${formatShare(otherScans, totalScans, locale)}`,
      scans: otherScans,
    },
  ];
}

function getRoutingTargets(item: QRCodeItem, t: ReturnType<typeof getMessages>) {
  if (item.ruleMode === "language") {
    return [
      { label: t.analytics.defaultRoute, url: item.defaultUrl },
      ...(item.languageRules ?? []).map((rule) => ({ label: rule.language, url: rule.url })),
    ];
  }

  if (item.ruleMode === "region") {
    return [
      { label: t.analytics.defaultRoute, url: item.defaultUrl },
      ...(item.regionRules ?? []).map((rule) => ({ label: rule.region, url: rule.url })),
    ];
  }

  if (item.ruleMode === "device") {
    return [
      { label: t.analytics.defaultRoute, url: item.defaultUrl },
      ...(item.deviceRules ?? []).map((rule) => ({ label: rule.os, url: rule.url })),
    ];
  }

  if (item.ruleMode === "param") {
    return [
      { label: t.analytics.defaultRoute, url: item.defaultUrl },
      ...(item.paramRules ?? []).map((rule) => ({ label: `${rule.key}=${rule.value}`, url: rule.url })),
    ];
  }

  if (item.ruleMode === "ab") {
    return [
      { label: t.analytics.defaultRoute, url: item.defaultUrl },
      ...(item.abRules ?? []).map((rule) => ({ label: `Variant ${rule.variant} · ${rule.weight}%`, url: rule.url })),
    ];
  }

  return [{ label: t.analytics.defaultRoute, url: item.defaultUrl }];
}

function getDetailedRoutingTargets(
  item: QRCodeItem,
  t: ReturnType<typeof getMessages>,
  analytics: EntryAnalyticsWindow,
) {
  const routingTargets = getRoutingTargets(item, t);
  const contentList = analytics.languageData;

  return routingTargets.map((target, index) => {
    const contentIndex = index > 0 ? index - 1 : 0;
    const contentRow = contentList[contentIndex];
    const scans = contentRow?.scans ?? Math.round(analytics.totalScans / routingTargets.length);
    const share = contentRow?.share ?? "N/A";

    return {
      label: target.label,
      url: target.url,
      scans,
      share,
    };
  });
}

function formatChartDay(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function getRangeLabel(locale: Locale, t: ReturnType<typeof getMessages>, range: number) {
  if (range === 7) return t.analytics.range7d;
  if (range === 30) return t.analytics.range30d;
  if (range === 90) return t.analytics.range90d;
  if (range === 180) return t.analytics.range180d;
  if (range === 365) return t.analytics.range365d;
  return locale === "zh-Hant" ? `${range} 天` : `${range} days`;
}

export default async function EntryAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { locale, id } = await params;
  const { range } = await searchParams;
  const t = getMessages(locale);
  const item = await getEntryByIdServer(id);

  if (!item) {
    notFound();
  }

  const analyticsDetail = (await getEntryAnalyticsDetailServer(id)) ?? createEmptyEntryAnalyticsDetail(item);
  const normalizedRange = [7, 30, 90, 180, 365].includes(Number(range)) ? Number(range) : 7;
  const analytics = getEntryAnalyticsWindow(analyticsDetail, normalizedRange);
  const chartData = analytics.trendPoints.map((point) => ({ day: formatChartDay(point.date, locale), scans: point.scans }));
  const chartTitle = `${t.analytics.chartTitleGeneric} · ${getRangeLabel(locale, t, normalizedRange)}`;
  const basePath = withLocale(locale, `/qrs/${id}/analytics`);
  const ruleTriggers = getDetailedRoutingTargets(item, t, analytics);
  const chartRegionData = buildChartRows(analytics.regionData, locale, t.analytics.otherBucket);
  const chartDeviceData = buildChartRows(analytics.deviceData, locale, t.analytics.otherBucket);
  const chartOsData = buildChartRows(analytics.osData, locale, t.analytics.otherBucket);
  const chartLanguageData = buildChartRows(analytics.languageData, locale, t.analytics.otherBucket);

  const ruleModeLabel =
    locale === "zh-Hant"
      ? { none: "無規則", language: "語言模式", region: "國家或地區模式", device: "設備系統模式", param: "參數模式", ab: "A/B Test" }
      : locale === "zh-Hans"
        ? { none: "无规则", language: "语言模式", region: "国家或地区模式", device: "设备系统模式", param: "参数模式", ab: "A/B Test" }
        : { none: "No rule", language: "Language", region: "Region", device: "Device OS", param: "Param", ab: "A/B Test" };
  const statusTone = item.status === "active" ? "success" : item.status === "expired" ? "danger" : "default";
  const detailListClass = (count: number) =>
    cn(count > DETAIL_SCROLL_THRESHOLD && "soft-scrollbar max-h-[420px] overflow-y-auto pr-2");

  return (
    <div className="space-y-6">
      <PageHeader
        badge={t.analytics.entryBadge}
        title={item.name}
        description={t.analytics.entrySubtitle}
        actions={
          <Link href={withLocale(locale, "/qrs")}>
            <Button variant="secondary">{t.analytics.backToList}</Button>
          </Link>
        }
      />

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t.analytics.dateFilterTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{t.analytics.lastScan + ": " + formatDate(analytics.lastScan, locale, true)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[7, 30, 90, 180, 365].map((days) => (
              <Link key={days} href={`${basePath}?range=${days}`}>
                <Button variant={normalizedRange === days ? "primary" : "secondary"} className="rounded-[12px] px-4 py-2.5 text-sm font-medium transition-all hover:shadow-sm">
                  {getRangeLabel(locale, t, days)}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.analytics.total} value={formatNumber(analytics.totalScans, locale)} />
        <StatCard label={t.analytics.today} value={formatNumber(analytics.todayScans, locale)} />
        <StatCard label={t.analytics.uniqueVisitors} value={formatNumber(analytics.uniqueVisitors, locale)} />
        <StatCard label={t.analytics.conversionRate} value={analytics.conversionRate} />
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{chartTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {t.analytics.lastScan}: {formatDate(analytics.lastScan, locale, true)}
            </p>
          </div>
          <Badge tone={statusTone}>{t.common[item.status]}</Badge>
        </div>
        <div className="mt-6">
          <AnalyticsChart data={chartData} />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t.analytics.routingSnapshot}</h2>
            <p className="mt-2 text-sm text-slate-500 break-all">{item.defaultUrl}</p>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="rounded-[20px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.analytics.topRegion}</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{analytics.topRegion}</div>
            </div>
            <div className="rounded-[20px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.analytics.topDevice}</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{analytics.topDevice}</div>
            </div>
            <div className="rounded-[20px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.analytics.topOs}</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{analytics.topOs}</div>
            </div>
            <div className="rounded-[20px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.analytics.topLanguage}</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{analytics.topLanguage}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,251,255,0.96))] p-5 ring-1 ring-[rgba(190,206,226,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">{t.analytics.defaultUrl}</span>
              <span className="text-sm font-medium text-slate-900">{item.type.toUpperCase()}</span>
            </div>
            <div className="text-sm text-slate-700 break-all">{item.defaultUrl}</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">{t.analytics.ruleMode}</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{ruleModeLabel[item.ruleMode]}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">{t.analytics.statusLabel}</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{t.common[item.status]}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">{t.analytics.createdAt}</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{formatDate(item.createdAt, locale)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">{t.analytics.trackingStatus}</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {item.tracking?.enabled ? t.analytics.trackingEnabled : t.analytics.trackingDisabled}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-slate-900">{t.analytics.routingTargets}</h2>
        <div className={cn("mt-5", detailListClass(ruleTriggers.length))}>
          <div className="space-y-3">
            {ruleTriggers.map((target) => (
              <div key={`${target.label}-${target.url}`} className="rounded-[20px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{target.label}</div>
                  <Badge tone="info">{target.share}</Badge>
                </div>
                <div className="mt-2 break-all text-sm text-slate-500">{target.url}</div>
                <div className="mt-2 text-sm text-slate-600">
                  {formatNumber(target.scans, locale)} {t.analytics.visitsUnit}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <WorldTrafficMap
        title={t.analytics.globalMapTitle}
        body={t.analytics.globalMapBody}
        locale={getIntlLocale(locale)}
        scansLabel={t.analytics.visitsUnit}
        rows={analytics.regionData}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold text-slate-900">{t.analytics.regionBreakdown}</h2>
          <div className="mt-5">
            <BreakdownBarChart data={chartRegionData} />
          </div>
          <div className={cn("mt-4", detailListClass(analytics.regionData.length))}>
            <div className="space-y-3">
              {analytics.regionData.map((row) => (
                <div key={row.label} className="rounded-[20px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">{row.label}</div>
                    <Badge tone="info">{row.share}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {formatNumber(row.scans, locale)} {t.analytics.visitsUnit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-slate-900">{t.analytics.deviceBreakdown}</h2>
          <div className="mt-5">
            <BreakdownDonutChart data={chartDeviceData} />
          </div>
          <div className={cn("mt-4", detailListClass(analytics.deviceData.length))}>
            <div className="space-y-3">
              {analytics.deviceData.map((row) => (
                <div key={row.label} className="rounded-[20px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">{row.label}</div>
                    <Badge tone="info">{row.share}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {formatNumber(row.scans, locale)} {t.analytics.visitsUnit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold text-slate-900">{t.analytics.osBreakdown}</h2>
          <div className="mt-5">
            <BreakdownDonutChart data={chartOsData} />
          </div>
          <div className={cn("mt-4", detailListClass(analytics.osData.length))}>
            <div className="space-y-3">
              {analytics.osData.map((row) => (
                <div key={row.label} className="rounded-[20px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">{row.label}</div>
                    <Badge tone="info">{row.share}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {formatNumber(row.scans, locale)} {t.analytics.visitsUnit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-slate-900">{t.analytics.languageBreakdown}</h2>
          <div className="mt-5">
            <BreakdownDonutChart data={chartLanguageData} />
          </div>
          <div className={cn("mt-4", detailListClass(analytics.languageData.length))}>
            <div className="space-y-3">
              {analytics.languageData.map((row) => (
                <div key={row.label} className="rounded-[20px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">{row.label}</div>
                    <Badge tone="info">{row.share}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {formatNumber(row.scans, locale)} {t.analytics.visitsUnit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
