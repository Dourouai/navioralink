import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivationCodeRedeemCard } from "@/features/billing/activation-code-redeem-card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { buildPageMetadata } from "@/lib/metadata";
import { formatPlanPrice, getYearlyOriginalPrices, getYearlyPlanPrices, monthlyPlanPrices, orderedPlanCodes } from "@/lib/pricing";
import { getCurrentAppUser } from "@/lib/supabase/server-auth";
import { getCurrentPlanSnapshotServer } from "@/lib/supabase/billing-server";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "pricing");
}

export default async function PricingPage({
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
  const appUser = await getCurrentAppUser();
  const currentPlan = appUser ? await getCurrentPlanSnapshotServer() : null;
  const rows = [
    { label: t.pricing.usageItems[0], values: t.pricing.plans.map((plan) => plan.links) },
    { label: t.pricing.usageItems[1], values: t.pricing.plans.map((plan) => plan.aiConversations) },
    { label: t.pricing.usageItems[2], values: t.pricing.plans.map((plan) => plan.monthlyVisits) },
    { label: t.pricing.usageItems[3], values: t.pricing.plans.map((plan) => plan.storage) },
  ];
  const pricingReturnPath = `${withLocale(locale, "/pricing")}?billing=${billingCycle}`;

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-8 md:pb-24">
      <div className="pointer-events-none absolute left-8 top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(120,191,255,0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-16 right-8 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(143,124,255,0.16),transparent_70%)]" />

      <section className="mx-auto max-w-4xl text-center">
        <Badge tone="info" className="px-4 py-1.5 text-[11px] uppercase tracking-[0.14em]">
          {t.pricing.badge}
        </Badge>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">{t.pricing.title}</h1>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">{t.pricing.subtitle}</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/90 p-1.5 ring-1 ring-[rgba(190,206,226,0.55)] shadow-[0_12px_26px_rgba(15,23,42,0.06)]">
          <Link
            href={`${withLocale(locale, "/pricing")}?billing=monthly`}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              !isYearly
                ? "bg-slate-900 !text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            {t.pricing.billingMonthly}
          </Link>
          <Link
            href={`${withLocale(locale, "/pricing")}?billing=yearly`}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              isYearly
                ? "bg-slate-900 !text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            {t.pricing.billingYearly}
            <span className={`ml-1 ${isYearly ? "text-sky-200" : "text-sky-600"}`}>({t.pricing.yearlyDiscountShort})</span>
          </Link>
        </div>
        <p className="mt-2 text-xs text-slate-500">{t.pricing.billingHint}</p>
      </section>

      <section className="mt-9 grid gap-5 lg:grid-cols-3">
        {t.pricing.plans.map((plan, index) => {
          const planCode = orderedPlanCodes[index] ?? "free";
          const isFeatured = index === 1;
          const activePrice = isYearly ? yearlyPrices[index] : monthlyPlanPrices[index];
          const activeSuffix = isYearly ? t.pricing.priceSuffixYear : t.pricing.priceSuffixMonth;
          const originalYearlyPrice = yearlyOriginalPrices[index];
          const checkoutPath = `/api/billing/checkout?plan=${planCode}&billing=${billingCycle}&locale=${locale}`;
          const actionHref = appUser
            ? checkoutPath
            : planCode === "free"
              ? withLocale(locale, "/register")
              : `${withLocale(locale, "/login")}?next=${encodeURIComponent(checkoutPath)}`;
          const isCurrent = currentPlan ? currentPlan.code === planCode && currentPlan.billingCycle === billingCycle : false;
          return (
            <article
              key={plan.name}
              className={`rounded-[30px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.09)] ring-1 ${
                isFeatured
                  ? "relative overflow-hidden bg-[linear-gradient(165deg,#121c2f_0%,#1a2b45_60%,#131f36_100%)] text-white ring-[rgba(118,164,255,0.45)]"
                  : "bg-white/90 text-slate-900 ring-[rgba(190,206,226,0.55)]"
              }`}
            >
              {isFeatured ? (
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
                    className={`flex items-center gap-3 rounded-[14px] px-4 py-3 text-sm ${
                      isFeatured ? "bg-white/9 text-slate-100 ring-1 ring-white/14" : "bg-white ring-1 ring-[rgba(190,206,226,0.5)]"
                    }`}
                  >
                    <Check size={16} className={isFeatured ? "text-sky-200" : "text-sky-600"} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="secondary" className="w-full justify-center" disabled>
                    {t.upgradePage.currentPlanAction}
                  </Button>
                ) : (
                  <Link href={actionHref}>
                    <Button
                      variant={isFeatured ? "secondary" : "primary"}
                      className={`w-full justify-center ${isFeatured ? "!bg-white !text-slate-900 hover:!bg-white/95" : ""}`}
                    >
                      {t.pricing.planActions[index]}
                    </Button>
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-6">
        <ActivationCodeRedeemCard locale={locale} isAuthenticated={Boolean(appUser)} returnPath={pricingReturnPath} />
      </section>

      <section className="mt-9 overflow-hidden rounded-[30px] bg-white/88 shadow-[0_20px_42px_rgba(15,23,42,0.08)] ring-1 ring-[rgba(190,206,226,0.55)]">
        <div className="border-b border-[rgba(190,206,226,0.45)] px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">{t.pricing.compareTitle}</h2>
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

      {!appUser ? (
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href={withLocale(locale, "/register")}>
            <Button>{t.pricing.ctaPrimary}</Button>
          </Link>
          <Link href={withLocale(locale, "/login")}>
            <Button variant="ghost">{t.pricing.ctaSecondary}</Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
