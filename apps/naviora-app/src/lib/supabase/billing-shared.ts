import type { Metadata } from "creem_io";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlanCode } from "@/types/billing";
import {
  resolvePlanCodeFromCreemData,
  serializeCreemDate,
} from "@/lib/billing/creem";
import {
  inferSubscriptionBillingCycle,
  pickCurrentSubscription,
  pickMostRecentSubscription,
  resolveSubscriptionDurationMonths,
} from "@/lib/billing/membership";
import { getPlanMonthlyPrice } from "@/lib/pricing";

import type { SubscriptionAccessRecord } from "@/lib/billing/plan-entitlements";

export interface SubscriptionRow extends SubscriptionAccessRecord {
  id: string;
  user_id: string;
  provider: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  plan_code: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  billing_cycle: string | null;
  duration_months: number | null;
  monthly_price: number | null;
  created_at: string;
  updated_at: string;
}

interface BillingEventInsert {
  userId?: string | null;
  subscriptionId?: string | null;
  providerEventId?: string | null;
  eventType: string;
  payload: unknown;
  processedAt?: string | null;
}

interface MembershipChangeLogInsert {
  userId: string;
  action: "activation_code_redeemed" | "upgrade" | "downgrade";
  source: string;
  provider: string;
  referenceId?: string | null;
  previousPlanCode?: string | null;
  previousPeriodEnd?: string | null;
  currentPlanCode: string;
  currentPeriodEnd?: string | null;
  details?: Record<string, unknown>;
}

interface CreemSubscriptionUpsertInput {
  userId?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  productId?: string | null;
  status?: string | null;
  metadata?: Metadata | Record<string, unknown> | null;
  currentPeriodStart?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean | null;
}

type JsonRecord = Record<string, unknown>;

function toJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as JsonRecord;
}

function isMissingMembershipChangeLogRelation(message: string) {
  const normalized = message.trim().toLowerCase();
  return normalized.includes("membership_change_logs") && normalized.includes("does not exist");
}

export async function getLatestSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionRow | null> {
  const subscriptions = await getSubscriptionsForUser(supabase, userId);
  return pickMostRecentSubscription(subscriptions);
}

export async function getSubscriptionsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionRow[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("current_period_start", { ascending: false, nullsFirst: false })
    .order("current_period_end", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(32);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SubscriptionRow[];
}

export async function getCurrentSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionRow | null> {
  const subscriptions = await getSubscriptionsForUser(supabase, userId);
  return pickCurrentSubscription(subscriptions);
}

export async function getBillingPortalSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "creem")
    .not("provider_customer_id", "is", null)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new Error(error.message);
  }

  return pickMostRecentSubscription((data ?? []) as SubscriptionRow[]);
}

async function getSubscriptionByProviderSubscriptionId(
  supabase: SupabaseClient,
  providerSubscriptionId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("provider", "creem")
    .eq("provider_subscription_id", providerSubscriptionId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? [])[0] as SubscriptionRow | undefined) ?? null;
}

export async function getSubscriptionByProviderCustomerId(
  supabase: SupabaseClient,
  providerCustomerId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("provider", "creem")
    .eq("provider_customer_id", providerCustomerId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? [])[0] as SubscriptionRow | undefined) ?? null;
}

async function resolveUserIdForCreemSubscription(
  supabase: SupabaseClient,
  explicitUserId?: string | null,
  providerCustomerId?: string | null,
) {
  if (explicitUserId?.trim()) {
    return explicitUserId.trim();
  }

  if (!providerCustomerId?.trim()) {
    return null;
  }

  const subscription = await getSubscriptionByProviderCustomerId(supabase, providerCustomerId.trim());
  return subscription?.user_id ?? null;
}

export async function upsertCreemSubscriptionRecord(
  supabase: SupabaseClient,
  input: CreemSubscriptionUpsertInput,
): Promise<SubscriptionRow | null> {
  const providerSubscriptionId = input.providerSubscriptionId?.trim();
  if (!providerSubscriptionId) {
    return null;
  }

  const providerCustomerId = input.providerCustomerId?.trim() ?? null;
  const resolvedUserId = await resolveUserIdForCreemSubscription(supabase, input.userId, providerCustomerId);
  if (!resolvedUserId) {
    return null;
  }

  const planCode: PlanCode = resolvePlanCodeFromCreemData(input.metadata, input.productId);
  const currentPeriodStart = serializeCreemDate(input.currentPeriodStart);
  const currentPeriodEnd = serializeCreemDate(input.currentPeriodEnd);
  const billingCycle = inferSubscriptionBillingCycle({
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
  });
  const durationMonths = resolveSubscriptionDurationMonths({
    billing_cycle: billingCycle,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
  });
  const monthlyPrice = getPlanMonthlyPrice(planCode, billingCycle);

  const payload = {
    user_id: resolvedUserId,
    provider: "creem",
    provider_customer_id: providerCustomerId,
    provider_subscription_id: providerSubscriptionId,
    plan_code: planCode,
    status: input.status?.trim() || "active",
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: Boolean(input.cancelAtPeriodEnd),
    billing_cycle: billingCycle,
    duration_months: durationMonths,
    monthly_price: monthlyPrice,
  };

  const existing = await getSubscriptionByProviderSubscriptionId(supabase, providerSubscriptionId);

  if (existing) {
    const { data, error } = await supabase
      .from("subscriptions")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as SubscriptionRow;
  }

  const { data, error } = await supabase.from("subscriptions").insert(payload).select("*").single();
  if (error) {
    throw new Error(error.message);
  }

  return data as SubscriptionRow;
}

export async function recordCreemBillingEvent(
  supabase: SupabaseClient,
  input: BillingEventInsert,
) {
  const providerEventId = input.providerEventId?.trim() ?? null;

  if (providerEventId) {
    const { data, error } = await supabase
      .from("billing_events")
      .select("id")
      .eq("provider", "creem")
      .eq("provider_event_id", providerEventId)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    if ((data ?? []).length > 0) {
      return (data ?? [])[0];
    }
  }

  const { data, error } = await supabase
    .from("billing_events")
    .insert({
      user_id: input.userId?.trim() || null,
      subscription_id: input.subscriptionId ?? null,
      provider: "creem",
      provider_event_id: providerEventId,
      event_type: input.eventType,
      payload: toJsonRecord(input.payload),
      processed_at: input.processedAt ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function recordMembershipChange(
  supabase: SupabaseClient,
  input: MembershipChangeLogInsert,
) {
  const { error } = await supabase.from("membership_change_logs").insert({
    user_id: input.userId,
    action: input.action,
    source: input.source,
    provider: input.provider,
    reference_id: input.referenceId ?? null,
    previous_plan_code: input.previousPlanCode ?? null,
    previous_period_end: input.previousPeriodEnd ?? null,
    current_plan_code: input.currentPlanCode,
    current_period_end: input.currentPeriodEnd ?? null,
    details: input.details ?? {},
  });

  if (error) {
    if (isMissingMembershipChangeLogRelation(error.message)) {
      return;
    }

    throw new Error(error.message);
  }
}
