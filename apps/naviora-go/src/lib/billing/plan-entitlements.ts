import type { CurrentPlanSnapshot, PlanCode, PlanUsage } from "@/types/billing";

export interface SubscriptionAccessRecord {
  plan_code?: string | null;
  status?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
}

export const PLAN_LIMITS: Record<PlanCode, PlanUsage> = {
  free: {
    entries: { used: 0, limit: 10 },
    aiConversations: { used: 0, limit: 20 },
    monthlyVisits: { used: 0, limit: 500 },
    storageMb: { used: 0, limit: 10 },
  },
  starter: {
    entries: { used: 0, limit: 100 },
    aiConversations: { used: 0, limit: 300 },
    monthlyVisits: { used: 0, limit: 100000 },
    storageMb: { used: 0, limit: 1024 },
  },
  premium: {
    entries: { used: 0, limit: 1000 },
    aiConversations: { used: 0, limit: 2000 },
    monthlyVisits: { used: 0, limit: 300000 },
    storageMb: { used: 0, limit: 5120 },
  },
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

export const PLAN_ENTRY_LIMIT_ERROR = "PLAN_ENTRY_LIMIT_EXCEEDED";
export const PLAN_AI_CONVERSATION_LIMIT_ERROR = "PLAN_AI_CONVERSATION_LIMIT_EXCEEDED";
export const PLAN_MONTHLY_VISIT_LIMIT_ERROR = "PLAN_MONTHLY_VISIT_LIMIT_EXCEEDED";

export function normalizePlanCode(value?: string | null): PlanCode {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (normalized === "starter") return "starter";
  if (normalized === "premium" || normalized === "pro") return "premium";
  return "free";
}

export function getPlanName(code: PlanCode): CurrentPlanSnapshot["name"] {
  if (code === "starter") return "Starter";
  if (code === "premium") return "Plus";
  return "Free";
}

export function isUnlimitedLimit(value: number) {
  return !Number.isFinite(value);
}

export function inferBillingCycle(
  subscription?: Pick<SubscriptionAccessRecord, "current_period_start" | "current_period_end"> | null,
): "monthly" | "yearly" {
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

export function hasActiveSubscriptionAccess(subscription?: SubscriptionAccessRecord | null) {
  if (!subscription) {
    return false;
  }

  const normalizedStatus = subscription.status?.trim().toLowerCase() ?? "";
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(normalizedStatus)) {
    return false;
  }

  if (!subscription.current_period_end) {
    return true;
  }

  return new Date(subscription.current_period_end).getTime() >= Date.now();
}

export function getEffectivePlanCode(subscription?: SubscriptionAccessRecord | null): PlanCode {
  if (!hasActiveSubscriptionAccess(subscription)) {
    return "free";
  }

  return normalizePlanCode(subscription?.plan_code);
}

export function getEntryLimit(planCode: PlanCode) {
  return PLAN_LIMITS[planCode].entries.limit;
}

export function getMonthlyVisitLimit(planCode: PlanCode) {
  return PLAN_LIMITS[planCode].monthlyVisits.limit;
}

export function getAiConversationLimit(planCode: PlanCode) {
  return PLAN_LIMITS[planCode].aiConversations.limit;
}

export function getEntryLimitExceededMessage() {
  return "Your current plan has reached the entry limit. Archive another entry or upgrade to continue.";
}

export function getMonthlyVisitLimitExceededMessage() {
  return "This workspace has reached the monthly visit limit for the current plan. Upgrade to keep receiving traffic this month.";
}

export function getAiConversationLimitExceededMessage() {
  return "This workspace has reached the monthly AI conversation limit for the current plan. Upgrade to continue chatting this month.";
}

export function mapPlanConstraintMessage(message: string) {
  if (message.includes(PLAN_ENTRY_LIMIT_ERROR)) {
    return getEntryLimitExceededMessage();
  }

  if (message.includes(PLAN_MONTHLY_VISIT_LIMIT_ERROR)) {
    return getMonthlyVisitLimitExceededMessage();
  }

  if (message.includes(PLAN_AI_CONVERSATION_LIMIT_ERROR)) {
    return getAiConversationLimitExceededMessage();
  }

  return message;
}
