export const monthlyPlanPrices = [0, 9, 39] as const;

export function formatPlanPrice(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

export function getYearlyPlanPrices() {
  return monthlyPlanPrices.map((price) => Number((price * 12 * 0.85).toFixed(2)));
}

export function getYearlyOriginalPrices() {
  return monthlyPlanPrices.map((price) => price * 12);
}

export function getPlanPriceByName(planName: string) {
  if (planName === "Free") return monthlyPlanPrices[0];
  if (planName === "Starter") return monthlyPlanPrices[1];
  return monthlyPlanPrices[2];
}
