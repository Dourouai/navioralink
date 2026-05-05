import type { PlanCode } from "@/types/billing";

import { getPlanMonthlyPrice } from "@/lib/pricing";

export interface SubscriptionWindowRecord {
  plan_code?: string | null;
  status?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  billing_cycle?: string | null;
  duration_months?: number | null;
  monthly_price?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
  provider?: string | null;
  provider_customer_id?: string | null;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

function toTimestamp(value?: string | null) {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function normalizeNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

export function normalizePlanCode(value?: string | null): PlanCode {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (normalized === "starter") return "starter";
  if (normalized === "premium" || normalized === "plus" || normalized === "pro") return "premium";
  return "free";
}

export function getPlanDisplayName(planCode: PlanCode) {
  if (planCode === "starter") return "Starter";
  if (planCode === "premium") return "Plus";
  return "Free";
}

export function isSubscriptionStatusActive(status?: string | null) {
  const normalized = status?.trim().toLowerCase() ?? "";
  return ACTIVE_SUBSCRIPTION_STATUSES.has(normalized);
}

export function inferSubscriptionBillingCycle(
  subscription?: Pick<SubscriptionWindowRecord, "billing_cycle" | "current_period_start" | "current_period_end"> | null,
): "monthly" | "yearly" {
  const explicitCycle = subscription?.billing_cycle?.trim().toLowerCase();
  if (explicitCycle === "yearly") {
    return "yearly";
  }

  const start = subscription?.current_period_start ? new Date(subscription.current_period_start).getTime() : 0;
  const end = subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() : 0;

  if (start && end) {
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (days >= 300) {
      return "yearly";
    }
  }

  return "monthly";
}

export function resolveSubscriptionDurationMonths(
  subscription?: Pick<SubscriptionWindowRecord, "duration_months" | "billing_cycle" | "current_period_start" | "current_period_end"> | null,
) {
  const explicitDuration = normalizeNumber(subscription?.duration_months);
  if (explicitDuration && explicitDuration > 0) {
    return Math.ceil(explicitDuration);
  }

  const cycle = inferSubscriptionBillingCycle(subscription);
  if (cycle === "yearly") {
    return 12;
  }

  const start = subscription?.current_period_start ? new Date(subscription.current_period_start).getTime() : 0;
  const end = subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() : 0;

  if (start && end && end > start) {
    const approximateMonths = Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 30));
    return Math.max(1, approximateMonths);
  }

  return 1;
}

export function resolveSubscriptionMonthlyPrice(
  subscription?: Pick<SubscriptionWindowRecord, "monthly_price" | "plan_code" | "billing_cycle" | "current_period_start" | "current_period_end"> | null,
) {
  const explicitPrice = normalizeNumber(subscription?.monthly_price);
  if (explicitPrice && explicitPrice >= 0) {
    return roundCurrency(explicitPrice);
  }

  return getPlanMonthlyPrice(
    normalizePlanCode(subscription?.plan_code),
    inferSubscriptionBillingCycle(subscription),
  );
}

export function isSubscriptionActiveAt(
  subscription?: Pick<SubscriptionWindowRecord, "status" | "current_period_start" | "current_period_end"> | null,
  referenceDate: Date = new Date(),
) {
  if (!subscription || !isSubscriptionStatusActive(subscription.status)) {
    return false;
  }

  const referenceTime = referenceDate.getTime();
  const periodStart = subscription.current_period_start ? new Date(subscription.current_period_start).getTime() : Number.NEGATIVE_INFINITY;
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end).getTime() : Number.POSITIVE_INFINITY;

  return periodStart <= referenceTime && periodEnd >= referenceTime;
}

function compareCurrentSubscriptionPriority<T extends SubscriptionWindowRecord>(left: T, right: T) {
  return (
    toTimestamp(right.current_period_start) - toTimestamp(left.current_period_start) ||
    toTimestamp(right.current_period_end) - toTimestamp(left.current_period_end) ||
    toTimestamp(right.updated_at) - toTimestamp(left.updated_at) ||
    toTimestamp(right.created_at) - toTimestamp(left.created_at)
  );
}

export function pickCurrentSubscription<T extends SubscriptionWindowRecord>(
  subscriptions: T[],
  referenceDate: Date = new Date(),
) {
  const currentSubscriptions = subscriptions.filter((subscription) => isSubscriptionActiveAt(subscription, referenceDate));
  if (!currentSubscriptions.length) {
    return null;
  }

  return [...currentSubscriptions].sort(compareCurrentSubscriptionPriority)[0] ?? null;
}

export function pickMostRecentSubscription<T extends SubscriptionWindowRecord>(subscriptions: T[]) {
  if (!subscriptions.length) {
    return null;
  }

  return [...subscriptions].sort(compareCurrentSubscriptionPriority)[0] ?? null;
}

export function calculateSubscriptionTotalValue(
  subscription?: Pick<SubscriptionWindowRecord, "monthly_price" | "duration_months" | "plan_code" | "billing_cycle" | "current_period_start" | "current_period_end"> | null,
) {
  if (!subscription) {
    return 0;
  }

  return roundCurrency(resolveSubscriptionMonthlyPrice(subscription) * resolveSubscriptionDurationMonths(subscription));
}

export function calculateSubscriptionRemainingValue(
  subscription?: Pick<SubscriptionWindowRecord, "status" | "monthly_price" | "duration_months" | "plan_code" | "billing_cycle" | "current_period_start" | "current_period_end"> | null,
  referenceDate: Date = new Date(),
) {
  if (!subscription || !isSubscriptionStatusActive(subscription.status)) {
    return 0;
  }

  const totalValue = calculateSubscriptionTotalValue(subscription);
  if (totalValue <= 0) {
    return 0;
  }

  const start = subscription.current_period_start ? new Date(subscription.current_period_start).getTime() : null;
  const end = subscription.current_period_end ? new Date(subscription.current_period_end).getTime() : null;
  const now = referenceDate.getTime();

  if (!end) {
    return totalValue;
  }

  if (end <= now) {
    return 0;
  }

  if (!start || end <= start) {
    return totalValue;
  }

  const remainingRatio = Math.min(1, Math.max(0, (end - now) / (end - start)));
  return roundCurrency(totalValue * remainingRatio);
}

export function calculatePlanDurationMonthsFromValue(value: number, planCode: PlanCode) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(value / getPlanMonthlyPrice(planCode)));
}

export function addMonthsToIso(start: Date | string, months: number) {
  const baseDate = start instanceof Date ? new Date(start) : new Date(start);
  if (!Number.isFinite(baseDate.getTime())) {
    return new Date().toISOString();
  }

  const nextDate = new Date(baseDate);
  nextDate.setUTCMonth(nextDate.getUTCMonth() + Math.max(0, months));
  return nextDate.toISOString();
}
