import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { getIntlLocale } from "@/i18n/format";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { getEntryAnalyticsDetailServer } from "@/lib/supabase/analytics-server";
import { getEntryByIdServer } from "@/lib/supabase/entries-server";
import { createEmptyEntryAnalyticsDetail, getEntryAnalyticsWindow } from "@/mock/entry-analytics";

const PAGE_SIZE = 20;

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

function getRangeLabel(locale: Locale, t: ReturnType<typeof getMessages>, range: number) {
  if (range === 7) return t.analytics.range7d;
  if (range === 30) return t.analytics.range30d;
  if (range === 90) return t.analytics.range90d;
  if (range === 180) return t.analytics.range180d;
  if (range === 365) return t.analytics.range365d;
  return locale === "zh-Hant" ? `${range} 天` : locale === "zh-Hans" ? `${range} 天` : `${range} days`;
}

function formatPaginationInfo(locale: Locale, page: number, totalPages: number, start: number, end: number, total: number) {
  if (locale === "zh-Hant") {
    return `第 ${page} / ${totalPages} 頁 · 顯示 ${start}-${end} 筆，共 ${total} 筆`;
  }

  if (locale === "zh-Hans") {
    return `第 ${page} / ${totalPages} 页 · 显示 ${start}-${end} 条，共 ${total} 条`;
  }

  return `Page ${page} of ${totalPages} · Showing ${start}-${end} of ${total}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const item = await getEntryByIdServer(id);

  if (!item) {
    return locale === "zh-Hant"
      ? { title: "訪問明細 | Naviora", description: "查看智能入口的訪問明細與命中記錄。" }
      : locale === "zh-Hans"
        ? { title: "访问明细 | Naviora", description: "查看智能入口的访问明细与命中记录。" }
        : { title: "Visit Log | Naviora", description: "Review visit-level records for a smart entry." };
  }

  return {
    title:
      locale === "zh-Hant"
        ? `${item.name} | 訪問明細 | Naviora`
        : locale === "zh-Hans"
          ? `${item.name} | 访问明细 | Naviora`
          : `${item.name} | Visit Log | Naviora`,
    description:
      locale === "zh-Hant"
        ? `查看 ${item.name} 的最近訪問明細、來源、裝置與命中網址。`
        : locale === "zh-Hans"
          ? `查看 ${item.name} 的最近访问明细、来源、设备与命中网址。`
          : `Review recent visit records, sources, devices, and resolved URLs for ${item.name}.`,
  };
}

export default async function EntryVisitLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ range?: string; page?: string }>;
}) {
  const { locale, id } = await params;
  const { range, page } = await searchParams;
  const t = getMessages(locale);
  const item = await getEntryByIdServer(id);

  if (!item) {
    notFound();
  }

  const analyticsDetail = (await getEntryAnalyticsDetailServer(id)) ?? createEmptyEntryAnalyticsDetail(item);
  const normalizedRange = [7, 30, 90, 180, 365].includes(Number(range)) ? Number(range) : 7;
  const analytics = getEntryAnalyticsWindow(analyticsDetail, normalizedRange);
  const basePath = withLocale(locale, `/qrs/${id}/visits`);
  const totalLogs = analytics.visitLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE));
  const requestedPage = Number.parseInt(page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) ? Math.min(totalPages, Math.max(1, requestedPage)) : 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedLogs = analytics.visitLogs.slice(startIndex, startIndex + PAGE_SIZE);
  const visibleStart = totalLogs === 0 ? 0 : startIndex + 1;
  const visibleEnd = totalLogs === 0 ? 0 : Math.min(startIndex + PAGE_SIZE, totalLogs);

  function buildPageHref(targetPage: number) {
    const query = new URLSearchParams();
    query.set("range", String(normalizedRange));
    if (targetPage > 1) {
      query.set("page", String(targetPage));
    }
    return `${basePath}?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge={t.analytics.viewVisitLog}
        title={item.name}
        description={t.analytics.visitLogPageBody}
        actions={
          <>
            <Link href={withLocale(locale, `/qrs/${id}/analytics`)}>
              <Button variant="secondary">{t.analytics.backToAnalytics}</Button>
            </Link>
            <Link href={withLocale(locale, "/qrs")}>
              <Button variant="secondary">{t.analytics.backToList}</Button>
            </Link>
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t.analytics.dateFilterTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{t.analytics.visitLogBody}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[7, 30, 90, 180, 365].map((days) => (
              <Link key={days} href={days === 7 ? basePath : `${basePath}?range=${days}`}>
                <Button variant={normalizedRange === days ? "primary" : "secondary"} className="rounded-[12px] px-4 py-2.5 text-sm font-medium transition-all hover:shadow-sm">
                  {getRangeLabel(locale, t, days)}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t.analytics.visitLogTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">{t.analytics.lastScan}: {formatDate(analytics.lastScan, locale, true)}</p>
            {totalLogs > 0 ? <p className="mt-2 text-sm text-slate-500">{formatPaginationInfo(locale, currentPage, totalPages, visibleStart, visibleEnd, totalLogs)}</p> : null}
          </div>
          <Badge tone="default">{formatNumber(totalLogs, locale)}</Badge>
        </div>

        {totalLogs > 0 ? (
          <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-100">
            <div className="hidden grid-cols-[170px_110px_130px_110px_120px_1fr] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 lg:grid">
              <div>{t.analytics.visitLogTime}</div>
              <div>{t.analytics.visitLogRegion}</div>
              <div>{t.analytics.visitLogDevice}</div>
              <div>{t.analytics.visitLogLanguage}</div>
              <div>{t.analytics.visitLogSource}</div>
              <div>{t.analytics.visitLogTarget}</div>
            </div>

            {paginatedLogs.map((row) => (
              <div key={row.id} className="grid gap-3 border-t border-slate-100 bg-white px-5 py-4 lg:grid-cols-[170px_110px_130px_110px_120px_1fr] lg:items-center">
                <div className="text-sm font-medium text-slate-900">{formatDate(row.visitedAt, locale, true)}</div>
                <div className="text-sm text-slate-700">{row.region}</div>
                <div>
                  <div className="text-sm font-medium text-slate-900">{row.deviceType}</div>
                  <div className="mt-1 text-xs text-slate-500">{row.os}</div>
                </div>
                <div className="text-sm text-slate-700">{row.language}</div>
                <div className="text-sm text-slate-700">{row.source}</div>
                <div className="min-w-0 break-all text-sm text-slate-500">{row.targetUrl}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[22px] bg-slate-50/85 px-5 py-6 text-sm text-slate-500 ring-1 ring-slate-100">
            {t.analytics.visitLogEmpty}
          </div>
        )}

        {totalLogs > 0 ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">{formatPaginationInfo(locale, currentPage, totalPages, visibleStart, visibleEnd, totalLogs)}</p>
            <div className="flex items-center gap-3">
              {currentPage > 1 ? (
                <Link href={buildPageHref(currentPage - 1)}>
                  <Button variant="secondary">{t.analytics.paginationPrev}</Button>
                </Link>
              ) : (
                <Button variant="secondary" disabled>
                  {t.analytics.paginationPrev}
                </Button>
              )}
              <Badge tone="info">{formatNumber(currentPage, locale)} / {formatNumber(totalPages, locale)}</Badge>
              {currentPage < totalPages ? (
                <Link href={buildPageHref(currentPage + 1)}>
                  <Button variant="secondary">{t.analytics.paginationNext}</Button>
                </Link>
              ) : (
                <Button variant="secondary" disabled>
                  {t.analytics.paginationNext}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
