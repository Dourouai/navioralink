import type { PlanCode } from "@/types/billing";

import type { BillingCycle } from "./billing/creem";

export const monthlyPlanPrices = [0, 6, 16] as const;
export const yearlyPlanPrices = [0, 59, 159] as const;
export const orderedPlanCodes: readonly PlanCode[] = ["free", "starter", "premium"];

export function formatPlanPrice(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

export function getYearlyPlanPrices() {
  return [...yearlyPlanPrices];
}

export function getYearlyOriginalPrices() {
  return monthlyPlanPrices.map((price) => price * 12);
}

export function getPlanPriceByCode(planCode: PlanCode, billingCycle: BillingCycle = "monthly") {
  const monthlyPrice = planCode === "starter" ? monthlyPlanPrices[1] : planCode === "premium" ? monthlyPlanPrices[2] : monthlyPlanPrices[0];

  if (billingCycle === "yearly") {
    return planCode === "starter" ? yearlyPlanPrices[1] : planCode === "premium" ? yearlyPlanPrices[2] : yearlyPlanPrices[0];
  }

  return monthlyPrice;
}

export function getPlanMonthlyPrice(planCode: PlanCode, billingCycle: BillingCycle = "monthly") {
  if (billingCycle === "yearly") {
    return Number((getPlanPriceByCode(planCode, "yearly") / 12).toFixed(2));
  }

  return getPlanPriceByCode(planCode, "monthly");
}

export function getPlanPriceByName(planName: string, billingCycle: BillingCycle = "monthly") {
  if (planName === "Free") return getPlanPriceByCode("free", billingCycle);
  if (planName === "Starter") return getPlanPriceByCode("starter", billingCycle);
  return getPlanPriceByCode("premium", billingCycle);
}
