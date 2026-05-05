import { createCreem, type Metadata } from "creem_io";

import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import type { PlanCode } from "@/types/billing";

import { inferBillingCycle, normalizePlanCode } from "./plan-entitlements";

export type BillingCycle = "monthly" | "yearly";
export type PaidPlanCode = Exclude<PlanCode, "free">;

const paidPlanCodes: readonly PaidPlanCode[] = ["starter", "premium"];

function getMetadataValue(metadata: Metadata | Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  return null;
}

function resolveCreemTestMode() {
  return process.env.CREEM_TEST_MODE?.trim().toLowerCase() === "true";
}

export function isBillingCycle(value: string | null | undefined): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

export function isPaidPlanCode(value: string | null | undefined): value is PaidPlanCode {
  return Boolean(value && paidPlanCodes.includes(value as PaidPlanCode));
}

export function resolveBillingLocale(locale?: string | null, fallback?: string | null): Locale {
  if (locale && isLocale(locale)) {
    return locale;
  }

  if (fallback && isLocale(fallback)) {
    return fallback;
  }

  return defaultLocale;
}

export function formatBillingProviderLabel(provider?: string | null) {
  const normalized = provider?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return null;
  }

  if (normalized === "creem") {
    return "Creem";
  }

  if (normalized === "activation_code" || normalized === "activation-code") {
    return "Activation code";
  }

  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function hasCreemApiKey() {
  return Boolean(process.env.CREEM_API_KEY?.trim());
}

export function hasCreemWebhookSecret() {
  return Boolean(process.env.CREEM_WEBHOOK_SECRET?.trim());
}

export function getCreemApiKey() {
  const apiKey = process.env.CREEM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Creem API key is missing. Add CREEM_API_KEY first.");
  }

  return apiKey;
}

export function getCreemWebhookSecret() {
  const webhookSecret = process.env.CREEM_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error("Creem webhook secret is missing. Add CREEM_WEBHOOK_SECRET first.");
  }

  return webhookSecret;
}

export function createCreemClient() {
  return createCreem({
    apiKey: getCreemApiKey(),
    webhookSecret: hasCreemWebhookSecret() ? getCreemWebhookSecret() : undefined,
    testMode: resolveCreemTestMode(),
  });
}

export function getCreemProductId(planCode: PaidPlanCode, billingCycle: BillingCycle) {
  const envKey =
    planCode === "starter"
      ? billingCycle === "yearly"
        ? "CREEM_STARTER_YEARLY_PRODUCT_ID"
        : "CREEM_STARTER_MONTHLY_PRODUCT_ID"
      : billingCycle === "yearly"
        ? "CREEM_PREMIUM_YEARLY_PRODUCT_ID"
        : "CREEM_PREMIUM_MONTHLY_PRODUCT_ID";

  const productId = process.env[envKey]?.trim();
  if (!productId) {
    throw new Error(`Creem product id is missing. Add ${envKey} first.`);
  }

  return productId;
}

export function resolvePlanCodeFromCreemProductId(productId?: string | null): PlanCode {
  const normalized = productId?.trim();
  if (!normalized) {
    return "free";
  }

  if (
    normalized === process.env.CREEM_STARTER_MONTHLY_PRODUCT_ID?.trim() ||
    normalized === process.env.CREEM_STARTER_YEARLY_PRODUCT_ID?.trim()
  ) {
    return "starter";
  }

  if (
    normalized === process.env.CREEM_PREMIUM_MONTHLY_PRODUCT_ID?.trim() ||
    normalized === process.env.CREEM_PREMIUM_YEARLY_PRODUCT_ID?.trim()
  ) {
    return "premium";
  }

  return "free";
}

export function resolvePlanCodeFromCreemData(
  metadata: Metadata | Record<string, unknown> | null | undefined,
  productId?: string | null,
): PlanCode {
  const metadataPlanCode = normalizePlanCode(getMetadataValue(metadata, "planCode") ?? getMetadataValue(metadata, "plan_code"));
  if (metadataPlanCode !== "free") {
    return metadataPlanCode;
  }

  return resolvePlanCodeFromCreemProductId(productId);
}

export function resolveBillingCycleFromCreemData({
  metadata,
  currentPeriodStart,
  currentPeriodEnd,
}: {
  metadata: Metadata | Record<string, unknown> | null | undefined;
  currentPeriodStart?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
}): BillingCycle {
  const explicitCycle = getMetadataValue(metadata, "billingCycle") ?? getMetadataValue(metadata, "billing_cycle");

  if (isBillingCycle(explicitCycle)) {
    return explicitCycle;
  }

  return inferBillingCycle({
    current_period_start: serializeCreemDate(currentPeriodStart),
    current_period_end: serializeCreemDate(currentPeriodEnd),
  });
}

export function serializeCreemDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}
