import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { analyticsOverview, rankingData, trendData } from "@/mock/analytics";
import { formatDate, formatNumber } from "@/lib/utils";
import { AnalyticsChart } from "@/features/analytics/analytics-chart";

export default async function AnalyticsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getMessages(locale);

  return (
    <div className="space-y-6">
      <PageHeader badge="Analytics" title={t.analytics.title} description={t.analytics.subtitle} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.analytics.total} value={formatNumber(analyticsOverview.totalScans)} />
        <StatCard label={t.analytics.today} value={formatNumber(analyticsOverview.todayScans)} />
        <StatCard label={t.analytics.active} value={formatNumber(analyticsOverview.activeQrs)} />
        <StatCard label={t.analytics.trend} value={analyticsOverview.trendDelta} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="text-xl font-semibold text-slate-900">{t.analytics.chartTitle}</h2>
          <div className="mt-5">
            <AnalyticsChart data={trendData} />
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-slate-900">{t.analytics.rankTitle}</h2>
          <div className="mt-5 space-y-3">
            {rankingData.map((item, index) => (
              <div key={item.name} className="rounded-[20px] bg-white/84 p-4 ring-1 ring-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {index + 1}. {item.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{formatDate(item.lastScan)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{formatNumber(item.scans)}</div>
                    <div className="text-xs text-slate-500">{item.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
