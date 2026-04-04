import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { buildPageMetadata } from "@/lib/metadata";
import { formatPlanPrice, getYearlyOriginalPrices, getYearlyPlanPrices, monthlyPlanPrices } from "@/lib/pricing";
import { currentPlan } from "@/mock/billing";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "upgrade");
}

export default async function UpgradePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ billing?: string }>;
}) {
  const { locale } = await params;
  const { billing } = await searchParams;
  const t = getMessages(locale);
  const billingCycle = billing === "yearly" ? "yearly" : "monthly";
  const isYearly = billingCycle === "yearly";
  const yearlyPrices = getYearlyPlanPrices();
  const yearlyOriginalPrices = getYearlyOriginalPrices();
  const currentPlanIndex = Math.max(0, t.pricing.plans.findIndex((plan) => plan.name === currentPlan.name));
  const rows = [
    { label: t.pricing.usageItems[0], values: t.pricing.plans.map((plan) => plan.links) },
    { label: t.pricing.usageItems[1], values: t.pricing.plans.map((plan) => plan.aiConversations) },
    { label: t.pricing.usageItems[2], values: t.pricing.plans.map((plan) => plan.monthlyVisits) },
    { label: t.pricing.usageItems[3], values: t.pricing.plans.map((plan) => plan.storage) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badge={t.upgradePage.badge}
        title={t.upgradePage.title}
        description={t.upgradePage.subtitle}
        actions={
          <>
            <Link href={`${withLocale(locale, "/upgrade")}?billing=monthly`}>
              <Button variant={!isYearly ? "primary" : "secondary"}>{t.pricing.billingMonthly}</Button>
            </Link>
            <Link href={`${withLocale(locale, "/upgrade")}?billing=yearly`}>
              <Button variant={isYearly ? "primary" : "secondary"}>{t.pricing.billingYearly}</Button>
            </Link>
          </>
        }
      />

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t.upgradePage.currentPlan}</h2>
            <p className="mt-1 text-sm text-slate-500">{t.upgradePage.currentPlanNote}</p>
          </div>
          <Badge tone="info">{currentPlan.name}</Badge>
        </div>
        <div className="rounded-[24px] bg-[linear-gradient(165deg,#121c2f_0%,#1a2b45_60%,#131f36_100%)] p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-sky-200">{t.settings.currentPlanLabel}</div>
              <div className="mt-2 text-3xl font-semibold">{currentPlan.name}</div>
            </div>
            <div className="text-right">
                <div className="text-sm text-slate-300">{t.settings.billingCycle}</div>
                <div className="mt-2 text-xl font-semibold">
                  ${formatPlanPrice(isYearly ? yearlyPrices[currentPlanIndex] : monthlyPlanPrices[currentPlanIndex])} / {isYearly ? t.settings.yearly : t.settings.monthly}
                </div>
              </div>
            </div>
        </div>
      </Card>

      <section className="grid gap-5 lg:grid-cols-3">
        {t.pricing.plans.map((plan, index) => {
          const isCurrent = plan.name === currentPlan.name;
          const isFeatured = index === 1;
          const activePrice = isYearly ? yearlyPrices[index] : monthlyPlanPrices[index];
          const activeSuffix = isYearly ? t.pricing.priceSuffixYear : t.pricing.priceSuffixMonth;
          const originalYearlyPrice = yearlyOriginalPrices[index];

          return (
            <article
              key={plan.name}
              className={`rounded-[30px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.09)] ring-1 ${
                isFeatured
                  ? "relative overflow-hidden bg-[linear-gradient(165deg,#121c2f_0%,#1a2b45_60%,#131f36_100%)] text-white ring-[rgba(118,164,255,0.45)]"
                  : "bg-white/90 text-slate-900 ring-[rgba(190,206,226,0.55)]"
              }`}
            >
              {isCurrent ? (
                <div className="absolute right-4 top-4 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-sky-100 ring-1 ring-white/20">
                  {t.upgradePage.currentPlanAction}
                </div>
              ) : isFeatured ? (
                <div className="absolute right-4 top-4 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-sky-100 ring-1 ring-white/20">
                  {t.pricing.popularTag}
                </div>
              ) : null}

              <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>
              <div className="mt-4 flex items-end gap-2">
                {isYearly && originalYearlyPrice > 0 ? (
                  <span className={`pb-1 text-sm line-through ${isFeatured ? "text-slate-400" : "text-slate-400"}`}>${formatPlanPrice(originalYearlyPrice)}</span>
                ) : null}
                <span className="text-4xl font-semibold tracking-tight">${formatPlanPrice(activePrice)}</span>
                <span className={`pb-1 text-sm ${isFeatured ? "text-slate-300" : "text-slate-500"}`}>{activeSuffix}</span>
              </div>
              <p className={`mt-1 text-xs ${isFeatured ? "text-slate-300" : "text-slate-500"}`}>{isYearly ? t.pricing.yearlyNote : t.pricing.monthlyNote}</p>
              <p className={`mt-2 text-sm leading-7 ${isFeatured ? "text-slate-200" : "text-slate-600"}`}>{t.pricing.planSummaries[index]}</p>

              <ul className="mt-6 space-y-3">
                {[plan.links, plan.aiConversations, plan.monthlyVisits, plan.storage].map((item) => (
                  <li
                    key={item}
                    className={`rounded-[14px] px-4 py-3 text-sm ${
                      isFeatured ? "bg-white/9 text-slate-100 ring-1 ring-white/14" : "bg-white ring-1 ring-[rgba(190,206,226,0.5)]"
                    }`}
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="secondary" className="w-full justify-center" disabled>
                    {t.upgradePage.currentPlanAction}
                  </Button>
                ) : (
                  <Button
                    variant={isFeatured ? "secondary" : "primary"}
                    className={`w-full justify-center ${isFeatured ? "!bg-white !text-slate-900 hover:!bg-white/95" : ""}`}
                  >
                    {t.upgradePage.choosePlan}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[30px] bg-white/88 shadow-[0_20px_42px_rgba(15,23,42,0.08)] ring-1 ring-[rgba(190,206,226,0.55)]">
        <div className="border-b border-[rgba(190,206,226,0.45)] px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">{t.upgradePage.compareTitle}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[rgba(246,250,255,0.88)]">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-500">{t.pricing.usageTitle}</th>
                {t.pricing.plans.map((plan) => (
                  <th key={plan.name} className="px-6 py-3 font-semibold text-slate-700">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-[rgba(190,206,226,0.38)]">
                  <td className="px-6 py-4 font-medium text-slate-700">{row.label}</td>
                  {row.values.map((value) => (
                    <td key={`${row.label}-${value}`} className="px-6 py-4 text-slate-600">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
