import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getAiConversationLimit,
  getEntryLimit,
  getEffectivePlanCode,
  getMonthlyVisitLimit,
  hasActiveSubscriptionAccess,
  isUnlimitedLimit,
  normalizePlanCode,
  PLAN_AI_CONVERSATION_LIMIT_ERROR,
  PLAN_MONTHLY_VISIT_LIMIT_ERROR,
  type SubscriptionAccessRecord,
} from "@/lib/billing/plan-entitlements";
import type { PlanCode } from "@/types/billing";
import { getCurrentSubscriptionForUser } from "@/lib/supabase/billing-shared";

import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "./admin";

interface UserMonthlyUsageRow {
  user_id: string;
  usage_month: string;
  visit_count: number;
  ai_conversation_count: number;
}

interface EntryStatusRow {
  id: string;
  status: string;
  created_at: string;
}

export interface SubscriptionConstraintSnapshot {
  effectivePlanCode: PlanCode;
  subscriptionPlanCode: PlanCode;
  downgradedFrom: Exclude<PlanCode, "free"> | null;
  entryLimit: number;
  pausedEntryIds: string[];
}

export class PlanConstraintError extends Error {
  code: string;
  planCode: PlanCode;
  limit: number;

  constructor(code: string, message: string, planCode: PlanCode, limit: number) {
    super(message);
    this.name = "PlanConstraintError";
    this.code = code;
    this.planCode = planCode;
    this.limit = limit;
  }
}

function resolveAdminClient(supabase?: SupabaseClient) {
  return supabase ?? createAdminSupabaseClient();
}

export async function getLatestSubscriptionForUser(userId: string, supabase?: SupabaseClient) {
  return getCurrentSubscriptionForUser(resolveAdminClient(supabase), userId);
}

function getCurrentUsageMonth() {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  return startOfMonth.toISOString().slice(0, 10);
}

export async function getCurrentMonthVisitUsageForUser(userId: string, supabase?: SupabaseClient) {
  const admin = resolveAdminClient(supabase);
  const { data, error } = await admin
    .from("user_monthly_usage")
    .select("visit_count")
    .eq("user_id", userId)
    .eq("usage_month", getCurrentUsageMonth())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Number((data as Pick<UserMonthlyUsageRow, "visit_count"> | null)?.visit_count ?? 0);
}

export async function getCurrentMonthAiConversationUsageForUser(userId: string, supabase?: SupabaseClient) {
  const admin = resolveAdminClient(supabase);
  const { data, error } = await admin
    .from("user_monthly_usage")
    .select("ai_conversation_count")
    .eq("user_id", userId)
    .eq("usage_month", getCurrentUsageMonth())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Number((data as Pick<UserMonthlyUsageRow, "ai_conversation_count"> | null)?.ai_conversation_count ?? 0);
}

export async function syncUserPlanConstraints(userId: string, supabase?: SupabaseClient): Promise<SubscriptionConstraintSnapshot> {
  const admin = resolveAdminClient(supabase);
  const latestSubscription = await getLatestSubscriptionForUser(userId, admin);
  const effectivePlanCode = getEffectivePlanCode(latestSubscription);
  const subscriptionPlanCode = normalizePlanCode(latestSubscription?.plan_code);
  const entryLimit = getEntryLimit(effectivePlanCode);

  const { data, error } = await admin
    .from("entries")
    .select("id, status, created_at")
    .eq("user_id", userId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const visibleEntries = (data ?? []) as EntryStatusRow[];
  const overflowEntries = visibleEntries.slice(entryLimit);
  const entriesToPause = overflowEntries.filter((entry) => entry.status !== "paused").map((entry) => entry.id);

  if (entriesToPause.length > 0) {
    const { error: pauseError } = await admin.from("entries").update({ status: "paused" }).in("id", entriesToPause);

    if (pauseError) {
      throw new Error(pauseError.message);
    }
  }

  const downgradedFrom =
    effectivePlanCode === "free" &&
    latestSubscription &&
    !hasActiveSubscriptionAccess(latestSubscription) &&
    subscriptionPlanCode !== "free"
      ? subscriptionPlanCode
      : null;

  return {
    effectivePlanCode,
    subscriptionPlanCode,
    downgradedFrom,
    entryLimit,
    pausedEntryIds: overflowEntries.map((entry) => entry.id),
  };
}

export async function assertMonthlyVisitAllowanceForUser(userId: string, supabase?: SupabaseClient) {
  const admin = resolveAdminClient(supabase);
  const [latestSubscription, visitsUsed] = await Promise.all([
    getLatestSubscriptionForUser(userId, admin),
    getCurrentMonthVisitUsageForUser(userId, admin),
  ]);
  return assertMonthlyVisitAllowanceSnapshot(latestSubscription, visitsUsed);
}

export function assertMonthlyVisitAllowanceSnapshot(
  latestSubscription: SubscriptionAccessRecord | null | undefined,
  visitsUsed: number,
) {
  const effectivePlanCode = getEffectivePlanCode(latestSubscription);
  const visitLimit = getMonthlyVisitLimit(effectivePlanCode);

  if (isUnlimitedLimit(visitLimit)) {
    return {
      effectivePlanCode,
      visitLimit,
      visitsUsed,
    };
  }

  if (visitsUsed >= visitLimit) {
    throw new PlanConstraintError(
      PLAN_MONTHLY_VISIT_LIMIT_ERROR,
      `Monthly visit limit exceeded for ${effectivePlanCode}.`,
      effectivePlanCode,
      visitLimit,
    );
  }

  return {
    effectivePlanCode,
    visitLimit,
    visitsUsed,
  };
}

export async function assertAiConversationAllowanceForUser(userId: string, supabase?: SupabaseClient) {
  const admin = resolveAdminClient(supabase);
  const [latestSubscription, aiConversationsUsed] = await Promise.all([
    getLatestSubscriptionForUser(userId, admin),
    getCurrentMonthAiConversationUsageForUser(userId, admin),
  ]);
  return assertAiConversationAllowanceSnapshot(latestSubscription, aiConversationsUsed);
}

export function assertAiConversationAllowanceSnapshot(
  latestSubscription: SubscriptionAccessRecord | null | undefined,
  aiConversationsUsed: number,
) {
  const effectivePlanCode = getEffectivePlanCode(latestSubscription);
  const aiConversationLimit = getAiConversationLimit(effectivePlanCode);

  if (isUnlimitedLimit(aiConversationLimit)) {
    return {
      effectivePlanCode,
      aiConversationLimit,
      aiConversationsUsed,
    };
  }

  if (aiConversationsUsed >= aiConversationLimit) {
    throw new PlanConstraintError(
      PLAN_AI_CONVERSATION_LIMIT_ERROR,
      `Monthly AI conversation limit exceeded for ${effectivePlanCode}.`,
      effectivePlanCode,
      aiConversationLimit,
    );
  }

  return {
    effectivePlanCode,
    aiConversationLimit,
    aiConversationsUsed,
  };
}

export async function syncCurrentUserPlanConstraints(userId: string) {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  return syncUserPlanConstraints(userId);
}
