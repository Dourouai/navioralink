"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AnalyticsChart } from "@/features/analytics/analytics-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getIntlLocale } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import type { EntryAnalyticsDetail, TrendPoint } from "@/mock/entry-analytics";
import { cn } from "@/lib/utils";
import { getEntryAnalyticsWindow } from "@/mock/entry-analytics";
import type { QRCodeItem } from "@/types/qr";

type RangeValue = "7" | "30" | "90" | "180" | "365";
type EntryFilterValue = "all" | string;
const DETAIL_SCROLL_THRESHOLD = 5;

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatMonth(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "short",
    year: "2-digit",
  }).format(new Date(value));
}

function parseRate(value: string) {
  return Number.parseFloat(value.replace("%", ""));
}

function aggregateBreakdownRows(rows: Array<Array<{ label: string; scans: number }>>) {
  const totals = new Map<string, number>();

  rows.flat().forEach((row) => {
    totals.set(row.label, (totals.get(row.label) ?? 0) + row.scans);
  });

  const totalScans = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);

  return Array.from(totals.entries())
    .map(([label, scans]) => ({
      label,
      scans,
      share: totalScans ? `${((scans / totalScans) * 100).toFixed(1)}%` : "0.0%",
    }))
    .sort((a, b) => b.scans - a.scans);
}

function buildChartData(points: TrendPoint[], rangeDays: number, locale: Locale) {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));

  if (rangeDays <= 31) {
    return sorted.map((point) => ({
      day: formatShortDate(point.date, locale),
      scans: point.scans,
    }));
  }

  if (rangeDays <= 90) {
    const rows: Array<{ day: string; scans: number }> = [];

    for (let index = 0; index < sorted.length; index += 7) {
      const chunk = sorted.slice(index, index + 7);
      rows.push({
        day: formatShortDate(chunk[chunk.length - 1].date, locale),
        scans: chunk.reduce((sum, point) => sum + point.scans, 0),
      });
    }

    return rows;
  }

  const monthMap = new Map<string, { date: string; scans: number }>();
  sorted.forEach((point) => {
    const key = point.date.slice(0, 7);
    const current = monthMap.get(key);
    if (current) {
      current.scans += point.scans;
    } else {
      monthMap.set(key, { date: `${key}-01`, scans: point.scans });
    }
  });

  return Array.from(monthMap.values()).map((point) => ({
    day: formatMonth(point.date, locale),
    scans: point.scans,
  }));
}

interface AnalyticsOverviewClientProps {
  locale: Locale;
  initialItems: QRCodeItem[];
  initialAnalyticsById: Record<string, EntryAnalyticsDetail>;
}

export function AnalyticsOverviewClient({ locale, initialItems, initialAnalyticsById }: AnalyticsOverviewClientProps) {
  const t = getMessages(locale);
  const [selectedRange, setSelectedRange] = useState<RangeValue>("7");
  const [selectedEntryId, setSelectedEntryId] = useState<EntryFilterValue>("all");
  const rangeDays = Number(selectedRange);

  const rangeOptions = [
    { value: "7", label: t.analytics.range7d },
    { value: "30", label: t.analytics.range30d },
    { value: "90", label: t.analytics.range90d },
    { value: "180", label: t.analytics.range180d },
    { value: "365", label: t.analytics.range365d },
  ];
  const entryOptions = [
    { value: "all", label: t.analytics.allLinks, description: t.analytics.entryFilterAllHint },
    ...initialItems.map((item) => ({
      value: item.id,
      label: item.name,
      description: undefined,
    })),
  ];
  const selectedEntry = initialItems.find((item) => item.id === selectedEntryId) ?? null;

  const filteredEntries = useMemo(() => {
    return selectedEntryId === "all" ? initialItems : initialItems.filter((item) => item.id === selectedEntryId);
  }, [initialItems, selectedEntryId]);

  const report = useMemo(() => {
    const entriesWithAnalytics = filteredEntries
      .map((item) => {
        const detail = initialAnalyticsById[item.id];
        if (!detail) return null;
        return {
          item,
          analytics: getEntryAnalyticsWindow(detail, rangeDays),
        };
      })
      .filter(Boolean) as Array<{ item: QRCodeItem; analytics: ReturnType<typeof getEntryAnalyticsWindow> }>;

    const totalScans = entriesWithAnalytics.reduce((sum, current) => sum + current.analytics.totalScans, 0);
    const todayScans = entriesWithAnalytics.reduce((sum, current) => sum + current.analytics.todayScans, 0);
    const uniqueVisitors = entriesWithAnalytics.reduce((sum, current) => sum + current.analytics.uniqueVisitors, 0);
    const averageConversion =
      entriesWithAnalytics.length > 0
        ? `${(entriesWithAnalytics.reduce((sum, current) => sum + parseRate(current.analytics.conversionRate), 0) / entriesWithAnalytics.length).toFixed(1)}%`
        : "0.0%";

    const trendMap = new Map<string, number>();
    entriesWithAnalytics.forEach(({ analytics }) => {
      analytics.trendPoints.forEach((point) => {
        trendMap.set(point.date, (trendMap.get(point.date) ?? 0) + point.scans);
      });
    });
    const trendPoints = Array.from(trendMap.entries()).map(([date, scans]) => ({ date, scans }));
    const trendData = buildChartData(trendPoints, rangeDays, locale);

    const ranking = [...entriesWithAnalytics].sort((a, b) => b.analytics.totalScans - a.analytics.totalScans);
    const topEntry = ranking[0] ?? null;
    const latestScan = ranking.length
      ? ranking.reduce((latest, current) => (new Date(current.analytics.lastScan) > new Date(latest.analytics.lastScan) ? current : latest))
      : null;

    const regionData = aggregateBreakdownRows(entriesWithAnalytics.map((entry) => entry.analytics.regionData));
    const deviceData = aggregateBreakdownRows(entriesWithAnalytics.map((entry) => entry.analytics.deviceData));
    const osData = aggregateBreakdownRows(entriesWithAnalytics.map((entry) => entry.analytics.osData));
    const languageData = aggregateBreakdownRows(entriesWithAnalytics.map((entry) => entry.analytics.languageData));

    return {
      entriesWithAnalytics,
      totalScans,
      todayScans,
      uniqueVisitors,
      averageConversion,
      trendData,
      ranking,
      topEntry,
      latestScan,
      regionData,
      deviceData,
      osData,
      languageData,
    };
  }, [filteredEntries, initialAnalyticsById, locale, rangeDays]);

  const breakdownSections = [
    { title: t.analytics.regionBreakdown, rows: report.regionData },
    { title: t.analytics.deviceBreakdown, rows: report.deviceData },
    { title: t.analytics.osBreakdown, rows: report.osData },
    { title: t.analytics.languageBreakdown, rows: report.languageData },
  ];

  const dimensionBadges = [
    t.analytics.sourceDimensionScans,
    t.analytics.sourceDimensionTrend,
    t.analytics.sourceDimensionRegion,
    t.analytics.sourceDimensionDevice,
    t.analytics.sourceDimensionOs,
    t.analytics.sourceDimensionLanguage,
    t.analytics.sourceDimensionEvents,
  ];
  const selectedRangeLabel = rangeOptions.find((item) => item.value === selectedRange)?.label ?? t.analytics.range7d;
  const trendTitle = locale === "zh-Hant" ? `${selectedRangeLabel}掃碼趨勢` : `${selectedRangeLabel} scan trend`;

  return (
    <div className="space-y-6">
      <PageHeader badge="Analytics" title={t.analytics.title} description={t.analytics.subtitle} />

      <Card className="relative z-20 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t.analytics.filtersTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {t.analytics.entriesIncluded}: {formatNumber(report.entriesWithAnalytics.length, locale)}
            </p>
            <p className="mt-1 text-xs text-slate-400">{t.analytics.rangeHint}</p>
          </div>
          <Badge tone="info">
            {t.analytics.totalEntries}: {formatNumber(initialItems.length, locale)}
          </Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <SearchableSelect
              label={t.analytics.timeRangeFilter}
              value={selectedRange}
              options={rangeOptions}
              onChange={(value) => setSelectedRange(value as RangeValue)}
              placeholder={t.analytics.range7d}
              showValue={false}
              searchable={false}
            />
          </div>
          <div className="space-y-3">
            <SearchableSelect
              label={t.analytics.entryFilter}
              value={selectedEntryId}
              options={entryOptions}
              onChange={(value) => setSelectedEntryId(value as EntryFilterValue)}
              placeholder={t.analytics.allLinks}
              searchPlaceholder={t.analytics.entrySearchPlaceholder}
              noResultsLabel={t.common.empty}
              showValue={false}
              dropdownMode="overlay"
            />
            <div className="flex min-h-10 flex-wrap items-center gap-2">
              {selectedEntry ? (
                <>
                  <Badge tone="info">{t.analytics.filteredEntry}</Badge>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{selectedEntry.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedEntryId("all")}
                    className="text-sm font-medium text-sky-600 transition hover:text-sky-700"
                  >
                    {t.analytics.clearEntryFilter}
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-500">{t.analytics.entryFilterHint}</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {report.entriesWithAnalytics.length === 0 ? (
        <EmptyState title={t.analytics.noResultsTitle} body={t.analytics.noResultsBody} />
      ) : (
        <div className="relative z-0 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label={t.analytics.total} value={formatNumber(report.totalScans, locale)} />
            <StatCard label={t.analytics.today} value={formatNumber(report.todayScans, locale)} />
            <StatCard label={t.analytics.entriesIncluded} value={formatNumber(report.entriesWithAnalytics.length, locale)} />
            <StatCard label={t.analytics.uniqueVisitors} value={formatNumber(report.uniqueVisitors, locale)} />
            <StatCard label={t.analytics.avgConversionRate} value={report.averageConversion} note={t.analytics.avgConversionRateNote} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{trendTitle}</h2>
                  {report.latestScan ? (
                    <p className="mt-1 text-sm text-slate-500">
                      {t.analytics.lastScan}: {formatDate(report.latestScan.analytics.lastScan, locale)}
                    </p>
                  ) : null}
                </div>
                <Badge tone="default">{rangeOptions.find((item) => item.value === selectedRange)?.label}</Badge>
              </div>
              <div className="mt-5">
                <AnalyticsChart data={report.trendData} />
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{t.analytics.topEntry}</h2>
                </div>
                {report.topEntry ? (
                  <>
                    <div className="rounded-[22px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                      <div className="text-base font-semibold text-slate-900">{report.topEntry.item.name}</div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-500">
                        <span>
                          {formatNumber(report.topEntry.analytics.totalScans, locale)} {t.common.scans}
                        </span>
                        <Badge tone="success">{t.common[report.topEntry.item.status]}</Badge>
                      </div>
                    </div>
                    <Link href={withLocale(locale, `/qrs/${report.topEntry.item.id}/analytics`)}>
                      <Button className="w-full">{t.analytics.viewEntryAnalytics}</Button>
                    </Link>
                  </>
                ) : null}
              </Card>

              <Card>
                <h2 className="text-xl font-semibold text-slate-900">{t.analytics.trafficSources}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{t.analytics.trafficSourcesBody}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {dimensionBadges.map((label) => (
                    <Badge key={label} tone="info">
                      {label}
                    </Badge>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-4">
            {breakdownSections.map((section) => (
              <Card key={section.title}>
                <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                <div
                  className={cn(
                    "mt-5",
                    section.rows.length > DETAIL_SCROLL_THRESHOLD && "soft-scrollbar max-h-[420px] overflow-y-auto pr-2",
                  )}
                >
                  <div className="space-y-4">
                    {section.rows.map((row) => {
                      const width = Number.parseFloat(row.share);
                      return (
                        <div key={row.label}>
                          <div className="mb-2 flex items-center justify-between gap-4">
                            <div className="text-sm font-medium text-slate-700">{row.label}</div>
                            <div className="text-sm text-slate-500">
                              {formatNumber(row.scans, locale)} <span className="ml-1 text-xs">{row.share}</span>
                            </div>
                          </div>
                          <div className="h-2.5 rounded-full bg-slate-100">
                            <div
                              className="h-2.5 rounded-full bg-[linear-gradient(135deg,#1abef3_0%,#3f8cff_58%,#8d79ff_100%)]"
                              style={{ width: `${Math.min(100, width)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{t.analytics.rankingTitle}</h2>
                <p className="mt-1 text-sm text-slate-500">{t.analytics.rankTitle}</p>
              </div>
              <Badge tone="default">{formatNumber(report.ranking.length, locale)}</Badge>
            </div>
            <div
              className={cn(
                "mt-5",
                report.ranking.length > DETAIL_SCROLL_THRESHOLD && "soft-scrollbar max-h-[520px] overflow-y-auto pr-2",
              )}
            >
              <div className="space-y-3">
                {report.ranking.map(({ item, analytics }, index) => (
                  <div key={item.id} className="rounded-[20px] bg-white/84 p-4 ring-1 ring-slate-100">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {index + 1}. {item.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{formatDate(analytics.lastScan, locale)}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-900">{formatNumber(analytics.totalScans, locale)}</div>
                          <div className="text-xs text-slate-500">{t.common[item.status]}</div>
                        </div>
                        <Link href={withLocale(locale, `/qrs/${item.id}/analytics`)}>
                          <Button variant="secondary">{t.analytics.viewEntryAnalytics}</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
