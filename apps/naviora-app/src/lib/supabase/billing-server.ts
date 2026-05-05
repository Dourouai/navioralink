import { getPlanPriceByCode } from "@/lib/pricing";
import {
  PLAN_LIMITS,
  getEffectivePlanCode,
  getPlanName,
  inferBillingCycle,
  normalizePlanCode,
} from "@/lib/billing/plan-entitlements";
import { formatBillingProviderLabel } from "@/lib/billing/creem";
import { pickCurrentSubscription, pickMostRecentSubscription } from "@/lib/billing/membership";
import type { BillingHistoryItem, CurrentPlanSnapshot, MembershipChangeItem } from "@/types/billing";

import { hasSupabaseEnv } from "./env";
import { getCurrentAppUser } from "./server-auth";
import { hasSupabaseAdminEnv } from "./admin";
import { createServerSupabaseClient } from "./server";
import { getSubscriptionsForUser } from "./billing-shared";
import {
  getCurrentMonthAiConversationUsageForUser,
  getCurrentMonthVisitUsageForUser,
  syncCurrentUserPlanConstraints,
} from "./subscription-controls";

interface BillingEventRow {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  provider: string;
  provider_event_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
}

interface MembershipChangeLogRow {
  id: string;
  action: string;
  source: string;
  provider: string;
  previous_plan_code: string | null;
  previous_period_end: string | null;
  current_plan_code: string;
  current_period_end: string | null;
  created_at: string;
}

interface AssetSizeRow {
  size_bytes: number | null;
}

type BillingEventKind = "payment" | "refund";
type AmountUnit = "major" | "minor";

function createFallbackPlanSnapshot(): CurrentPlanSnapshot {
  return {
    code: "free",
    name: "Free",
    billingCycle: "monthly",
    price: getPlanPriceByCode("free", "monthly"),
    currency: "USD",
    renewalDate: null,
    paymentMethod: null,
    accessState: "normal",
    downgradedFrom: null,
    usage: PLAN_LIMITS.free,
  };
}

function getPayloadRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
}

function getPayloadValue(payload: Record<string, unknown>, path: string) {
  const segments = path.split(".");
  let current: unknown = payload;

  for (const segment of segments) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current ?? null;
}

function getPayloadStringAtPaths(payload: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = getPayloadValue(payload, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getPayloadNumberAtPaths(payload: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = getPayloadValue(payload, path);

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getPayloadNumberWithPathAtPaths(payload: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = getPayloadValue(payload, path);

    if (typeof value === "number" && Number.isFinite(value)) {
      return { value, path };
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return { value: parsed, path };
      }
    }
  }

  return null;
}

function getCurrencyExponent(payload: Record<string, unknown>) {
  const exponent = getPayloadNumberAtPaths(payload, [
    "currencyExponent",
    "currency_exponent",
    "refund.currencyExponent",
    "order.currencyExponent",
    "lastTransaction.currencyExponent",
  ]);

  if (!Number.isFinite(exponent)) {
    return 2;
  }

  return Math.max(0, Math.min(6, Math.trunc(exponent ?? 2)));
}

function getAmountUnitHint(payload: Record<string, unknown>): AmountUnit | null {
  const hint =
    getPayloadStringAtPaths(payload, [
      "amountUnit",
      "amount_unit",
      "refund.amountUnit",
      "order.amountUnit",
      "lastTransaction.amountUnit",
    ])?.toLowerCase() ?? null;

  if (!hint) {
    return null;
  }

  if (["minor", "cents", "cent", "minor_unit", "minor-units"].includes(hint)) {
    return "minor";
  }

  if (["major", "dollars", "major_unit", "major-units"].includes(hint)) {
    return "major";
  }

  return null;
}

function normalizeAmountByUnit(value: number | null, unit: AmountUnit, exponent = 2) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (unit === "minor") {
    const divisor = 10 ** exponent;
    return Number(((value ?? 0) / divisor).toFixed(exponent));
  }

  return value ?? 0;
}

function resolveAmountFromPayload(
  payload: Record<string, unknown>,
  candidates: Array<{ path: string; unit: AmountUnit }>,
) {
  const explicitUnitHint = getAmountUnitHint(payload);
  const exponent = getCurrencyExponent(payload);

  for (const candidate of candidates) {
    const withPath = getPayloadNumberWithPathAtPaths(payload, [candidate.path]);
    if (!withPath) {
      continue;
    }

    const unit = explicitUnitHint ?? candidate.unit;
    return normalizeAmountByUnit(withPath.value, unit, exponent);
  }

  return 0;
}

function classifyBillingEvent(event: BillingEventRow): BillingEventKind | null {
  const normalized = event.event_type.toLowerCase();

  if (normalized.includes("refund")) {
    return "refund";
  }

  if (
    normalized.includes("checkout.completed") ||
    normalized.includes("unpaid") ||
    normalized.includes("past_due") ||
    normalized.includes("trial") ||
    normalized.includes("active") ||
    normalized.includes("update") ||
    normalized.includes("cancel") ||
    normalized.includes("expire") ||
    normalized.includes("pause") ||
    normalized.includes("redeem") ||
    normalized.includes("dispute") ||
    normalized.includes("fail")
  ) {
    return null;
  }

  if (
    normalized.includes("paid") ||
    normalized.includes("charge.succeeded") ||
    normalized.includes("payment_succeeded") ||
    normalized.includes("payment.succeeded")
  ) {
    return "payment";
  }

  return null;
}

function mapBillingEventToInvoice(event: BillingEventRow): BillingHistoryItem | null {
  const kind = classifyBillingEvent(event);
  if (!kind) {
    return null;
  }

  const payload = getPayloadRecord(event.payload);
  const amount =
    kind === "refund"
      ? -Math.abs(
          resolveAmountFromPayload(payload, [
            { path: "refund.amount", unit: "minor" },
            { path: "refund.amountRefunded", unit: "minor" },
            { path: "amount_refunded", unit: "minor" },
            { path: "amount_refund", unit: "minor" },
            { path: "refunded_amount", unit: "minor" },
            { path: "lastTransaction.refundedAmount", unit: "minor" },
            { path: "amount", unit: "major" },
          ]),
        )
      : resolveAmountFromPayload(payload, [
          { path: "lastTransaction.amountPaid", unit: "minor" },
          { path: "lastTransaction.amount", unit: "minor" },
          { path: "order.amountPaid", unit: "minor" },
          { path: "order.amount", unit: "minor" },
          { path: "amount_paid", unit: "minor" },
          { path: "amount", unit: "major" },
          { path: "total", unit: "major" },
          { path: "subtotal", unit: "major" },
        ]);

  const currency =
    getPayloadStringAtPaths(payload, [
      "refund.currency",
      "lastTransaction.currency",
      "order.currency",
      "currency",
      "currency_code",
      "product.currency",
    ]) ?? "USD";
  const invoiceId =
    getPayloadStringAtPaths(payload, [
      "refund.id",
      "lastTransaction.id",
      "lastTransactionId",
      "order.id",
      "invoice_id",
      "invoice_number",
      "id",
      "number",
    ]) ??
    event.provider_event_id ??
    event.id;
  const issuedAt =
    getPayloadStringAtPaths(payload, [
      "refund.createdAt",
      "lastTransactionDate",
      "lastTransaction.createdAt",
      "order.updatedAt",
      "order.createdAt",
      "createdAt",
      "updatedAt",
    ]) ??
    event.processed_at ??
    event.created_at;

  if (kind === "payment" && amount <= 0) {
    return null;
  }

  return {
    id: invoiceId,
    issuedAt,
    amount,
    currency,
    status: kind === "refund" ? "refunded" : "paid",
  };
}

async function getUserStorageBytesServer(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const { data, error } = await supabase.rpc("get_user_storage_bytes", {
    p_user_id: userId,
  });

  if (!error) {
    return Number(data ?? 0);
  }

  // Backward-compatible fallback for environments where the aggregate function is not applied yet.
  if (!/get_user_storage_bytes/i.test(error.message)) {
    throw new Error(error.message);
  }

  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select("size_bytes")
    .eq("user_id", userId);

  if (assetsError) {
    throw new Error(assetsError.message);
  }

  return ((assets ?? []) as AssetSizeRow[]).reduce((total, asset) => total + Number(asset.size_bytes ?? 0), 0);
}

export async function getCurrentPlanSnapshotServer(): Promise<CurrentPlanSnapshot> {
  if (!hasSupabaseEnv()) {
    return createFallbackPlanSnapshot();
  }

  const user = await getCurrentAppUser();
  if (!user) {
    return createFallbackPlanSnapshot();
  }

  const constraintSnapshot = await syncCurrentUserPlanConstraints(user.id);

  const supabase = await createServerSupabaseClient();
  const subscriptions = await getSubscriptionsForUser(supabase, user.id);
  const currentSubscription = pickCurrentSubscription(subscriptions);
  const latestSubscription = pickMostRecentSubscription(subscriptions);
  const subscription = currentSubscription ?? latestSubscription;
  const planCode = constraintSnapshot?.effectivePlanCode ?? getEffectivePlanCode(currentSubscription);
  const planName = getPlanName(planCode);
  const billingCycle = inferBillingCycle(subscription);

  const [{ count: activeEntryCount, error: entriesError }, storageBytes] = await Promise.all([
    supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "archived"),
    getUserStorageBytesServer(supabase, user.id),
  ]);

  if (entriesError) {
    throw new Error(entriesError.message);
  }
  const [monthlyVisitsUsed, aiConversationsUsed] = hasSupabaseAdminEnv()
    ? await Promise.all([
        getCurrentMonthVisitUsageForUser(user.id),
        getCurrentMonthAiConversationUsageForUser(user.id),
      ])
    : [0, 0];

  const storageMb = Number((storageBytes / (1024 * 1024)).toFixed(1));
  const baseUsage = PLAN_LIMITS[planCode];
  const subscriptionPlanCode = normalizePlanCode((currentSubscription ?? latestSubscription)?.plan_code);
  const billingPortalAvailable = subscriptions.some(
    (item) => item.provider === "creem" && Boolean(item.provider_customer_id?.trim()),
  );

  return {
    code: planCode,
    name: planName,
    billingCycle,
    price: getPlanPriceByCode(planCode, billingCycle),
    currency: "USD",
    renewalDate: subscription?.current_period_end ?? null,
    paymentMethod: formatBillingProviderLabel(subscription?.provider),
    billingProvider: subscription?.provider ?? null,
    billingPortalAvailable,
    accessState:
      constraintSnapshot?.downgradedFrom || (planCode === "free" && subscriptionPlanCode !== "free" && latestSubscription)
        ? "downgraded"
        : "normal",
    downgradedFrom:
      constraintSnapshot?.downgradedFrom ?? (planCode === "free" && subscriptionPlanCode !== "free" ? subscriptionPlanCode : null),
    usage: {
      entries: { ...baseUsage.entries, used: Number(activeEntryCount ?? 0) },
      aiConversations: { ...baseUsage.aiConversations, used: aiConversationsUsed },
      monthlyVisits: { ...baseUsage.monthlyVisits, used: monthlyVisitsUsed },
      storageMb: { ...baseUsage.storageMb, used: storageMb },
    },
  };
}

export async function getBillingHistoryServer(limit = 8): Promise<BillingHistoryItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const user = await getCurrentAppUser();
  if (!user) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("billing_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 6, 24));

  if (error) {
    throw new Error(error.message);
  }

  const visibleHistory: BillingHistoryItem[] = [];
  const seen = new Set<string>();

  for (const event of (data ?? []) as BillingEventRow[]) {
    const invoice = mapBillingEventToInvoice(event);
    if (!invoice) {
      continue;
    }

    const dedupeKey = `${invoice.status}:${invoice.id}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    visibleHistory.push(invoice);

    if (visibleHistory.length >= limit) {
      break;
    }
  }

  return visibleHistory;
}

export async function getMembershipChangeHistoryServer(limit = 10): Promise<MembershipChangeItem[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const user = await getCurrentAppUser();
  if (!user) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("membership_change_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.toLowerCase().includes("membership_change_logs") && error.message.toLowerCase().includes("does not exist")) {
      return [];
    }

    throw new Error(error.message);
  }

  return ((data ?? []) as MembershipChangeLogRow[]).map((item) => ({
    id: item.id,
    action:
      item.action === "upgrade" || item.action === "downgrade" || item.action === "activation_code_redeemed"
        ? item.action
        : "activation_code_redeemed",
    source: item.source,
    provider: item.provider,
    previousPlanCode: item.previous_plan_code ? normalizePlanCode(item.previous_plan_code) : null,
    previousPeriodEnd: item.previous_period_end,
    currentPlanCode: normalizePlanCode(item.current_plan_code),
    currentPeriodEnd: item.current_period_end,
    createdAt: item.created_at,
  }));
}
