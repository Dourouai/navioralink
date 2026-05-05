import { createHash, randomUUID } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlanCode } from "@/types/billing";
import { getPlanMonthlyPrice } from "@/lib/pricing";
import {
  addMonthsToIso,
  calculatePlanDurationMonthsFromValue,
  calculateSubscriptionRemainingValue,
  getPlanDisplayName,
  inferSubscriptionBillingCycle,
  normalizePlanCode,
  resolveSubscriptionMonthlyPrice,
} from "@/lib/billing/membership";
import {
  getCurrentSubscriptionForUser,
  recordMembershipChange,
  type SubscriptionRow,
} from "@/lib/supabase/billing-shared";

import { normalizeActivationCode } from "./activation-codes";

export type ActivationCodeRedemptionStrategy =
  | "activate_now"
  | "queue_after_current"
  | "upgrade_difference"
  | "start_now";

interface ActivationCodeRow {
  id: string;
  code_prefix: string;
  plan_code: string;
  billing_cycle: string;
  duration_months: number;
  max_redemptions: number;
  redeemed_count: number;
  status: string;
  expires_at: string | null;
}

interface ActivationCodeRedemptionRow {
  id: string;
}

interface CreateSubscriptionInput {
  userId: string;
  planCode: PlanCode;
  provider: string;
  startAt: string;
  durationMonths: number;
  billingCycle?: "monthly" | "yearly";
  monthlyPrice?: number;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  status?: string;
}

export interface ActivationCodePreviewOption {
  strategy: ActivationCodeRedemptionStrategy;
  nextPlanCode: PlanCode;
  nextPlanName: string;
  nextPeriodEnd: string;
  queuedPlanCode: PlanCode | null;
  queuedPlanName: string | null;
  queuedPeriodEnd: string | null;
}

export interface ActivationCodePreviewResult {
  requiresChoice: boolean;
  currentPlanCode: PlanCode | null;
  currentPlanName: string | null;
  currentPeriodEnd: string | null;
  targetPlanCode: PlanCode;
  targetPlanName: string;
  targetDurationMonths: number;
  recommendedStrategy: ActivationCodeRedemptionStrategy;
  options: ActivationCodePreviewOption[];
}

function hashActivationCode(rawCode: string) {
  return createHash("sha256").update(normalizeActivationCode(rawCode)).digest("hex");
}

function resolveActivationCodePlanCode(code: Pick<ActivationCodeRow, "plan_code">) {
  return normalizePlanCode(code.plan_code);
}

function resolveActivationCodeBillingCycle(code: Pick<ActivationCodeRow, "billing_cycle">): "monthly" | "yearly" {
  return code.billing_cycle?.trim().toLowerCase() === "yearly" ? "yearly" : "monthly";
}

function resolveActivationCodeMonthlyPrice(code: Pick<ActivationCodeRow, "plan_code" | "billing_cycle">) {
  return getPlanMonthlyPrice(resolveActivationCodePlanCode(code), resolveActivationCodeBillingCycle(code));
}

function resolveActivationCodeValue(code: Pick<ActivationCodeRow, "plan_code" | "billing_cycle" | "duration_months">) {
  return Number((resolveActivationCodeMonthlyPrice(code) * Math.max(1, code.duration_months ?? 1)).toFixed(2));
}

async function getActivationCodeRow(
  supabase: SupabaseClient,
  rawCode: string,
): Promise<ActivationCodeRow | null> {
  const normalizedCode = normalizeActivationCode(rawCode);
  if (!normalizedCode) {
    throw new Error("ACTIVATION_CODE_REQUIRED");
  }

  const { data, error } = await supabase
    .from("activation_codes")
    .select("id, code_prefix, plan_code, billing_cycle, duration_months, max_redemptions, redeemed_count, status, expires_at")
    .eq("code_hash", hashActivationCode(normalizedCode))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ActivationCodeRow | null) ?? null;
}

async function ensureActivationCodeIsRedeemable(
  supabase: SupabaseClient,
  userId: string,
  rawCode: string,
) {
  const code = await getActivationCodeRow(supabase, rawCode);
  if (!code) {
    throw new Error("ACTIVATION_CODE_INVALID");
  }

  const { data: existingRedemption, error: redemptionError } = await supabase
    .from("activation_code_redemptions")
    .select("id")
    .eq("activation_code_id", code.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (redemptionError) {
    throw new Error(redemptionError.message);
  }

  if ((existingRedemption as ActivationCodeRedemptionRow | null)?.id) {
    throw new Error("ACTIVATION_CODE_ALREADY_REDEEMED");
  }

  if (code.expires_at && new Date(code.expires_at).getTime() < Date.now()) {
    throw new Error("ACTIVATION_CODE_EXPIRED");
  }

  if (!["active", "issued"].includes((code.status ?? "").trim().toLowerCase())) {
    throw new Error("ACTIVATION_CODE_UNAVAILABLE");
  }

  if ((code.redeemed_count ?? 0) >= (code.max_redemptions ?? 0)) {
    throw new Error("ACTIVATION_CODE_LIMIT_REACHED");
  }

  return code;
}

async function createSubscriptionRecord(
  supabase: SupabaseClient,
  input: CreateSubscriptionInput,
) {
  const durationMonths = Math.max(1, input.durationMonths);
  const currentPeriodEnd = addMonthsToIso(input.startAt, durationMonths);
  const billingCycle =
    input.billingCycle ??
    (durationMonths >= 12 && durationMonths % 12 === 0 ? "yearly" : "monthly");
  const monthlyPrice = input.monthlyPrice ?? getPlanMonthlyPrice(input.planCode, billingCycle);
  const providerSubscriptionId =
    input.providerSubscriptionId ??
    `${input.provider}_${randomUUID().replace(/-/g, "")}`;

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: input.userId,
      provider: input.provider,
      provider_customer_id: input.providerCustomerId ?? null,
      provider_subscription_id: providerSubscriptionId,
      plan_code: input.planCode,
      status: input.status ?? "active",
      current_period_start: input.startAt,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: false,
      billing_cycle: billingCycle,
      duration_months: durationMonths,
      monthly_price: monthlyPrice,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SubscriptionRow;
}

async function replaceCurrentSubscription(
  supabase: SupabaseClient,
  subscription: SubscriptionRow,
  effectiveNowIso: string,
) {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "replaced",
      current_period_end: effectiveNowIso,
      cancel_at_period_end: true,
    })
    .eq("id", subscription.id);

  if (error) {
    throw new Error(error.message);
  }
}

function buildActivationCodePreviewInternal(
  currentSubscription: SubscriptionRow | null,
  code: ActivationCodeRow,
  referenceDate: Date = new Date(),
): ActivationCodePreviewResult {
  const nowIso = referenceDate.toISOString();
  const targetPlanCode = resolveActivationCodePlanCode(code);
  const targetPlanName = getPlanDisplayName(targetPlanCode);
  const targetDurationMonths = Math.max(1, code.duration_months ?? 1);
  const currentPlanCode = currentSubscription ? normalizePlanCode(currentSubscription.plan_code) : null;
  const currentPlanName = currentPlanCode ? getPlanDisplayName(currentPlanCode) : null;
  const codeValue = resolveActivationCodeValue(code);

  if (!currentSubscription || currentPlanCode === "free") {
    return {
      requiresChoice: false,
      currentPlanCode,
      currentPlanName,
      currentPeriodEnd: currentSubscription?.current_period_end ?? null,
      targetPlanCode,
      targetPlanName,
      targetDurationMonths,
      recommendedStrategy: "activate_now",
      options: [
        {
          strategy: "activate_now",
          nextPlanCode: targetPlanCode,
          nextPlanName: targetPlanName,
          nextPeriodEnd: addMonthsToIso(nowIso, targetDurationMonths),
          queuedPlanCode: null,
          queuedPlanName: null,
          queuedPeriodEnd: null,
        },
      ],
    };
  }

  const currentRemainingValue = calculateSubscriptionRemainingValue(currentSubscription, referenceDate);
  const currentRemainingMonths =
    currentPlanCode ? calculatePlanDurationMonthsFromValue(currentRemainingValue, currentPlanCode) : 0;

  if (targetPlanCode === "premium" && currentPlanCode === "starter") {
    const upgradeDurationMonths = calculatePlanDurationMonthsFromValue(
      currentRemainingValue + codeValue,
      targetPlanCode,
    );
    const startNowEnd = addMonthsToIso(nowIso, targetDurationMonths);
    const queuedPeriodEnd =
      currentRemainingMonths > 0 ? addMonthsToIso(startNowEnd, currentRemainingMonths) : null;

    return {
      requiresChoice: true,
      currentPlanCode,
      currentPlanName,
      currentPeriodEnd: currentSubscription.current_period_end,
      targetPlanCode,
      targetPlanName,
      targetDurationMonths,
      recommendedStrategy: "upgrade_difference",
      options: [
        {
          strategy: "upgrade_difference",
          nextPlanCode: targetPlanCode,
          nextPlanName: targetPlanName,
          nextPeriodEnd: addMonthsToIso(nowIso, upgradeDurationMonths),
          queuedPlanCode: null,
          queuedPlanName: null,
          queuedPeriodEnd: null,
        },
        {
          strategy: "start_now",
          nextPlanCode: targetPlanCode,
          nextPlanName: targetPlanName,
          nextPeriodEnd: startNowEnd,
          queuedPlanCode: currentRemainingMonths > 0 ? currentPlanCode : null,
          queuedPlanName: currentRemainingMonths > 0 ? currentPlanName : null,
          queuedPeriodEnd,
        },
      ],
    };
  }

  const queueStartAt =
    currentSubscription.current_period_end && new Date(currentSubscription.current_period_end).getTime() > referenceDate.getTime()
      ? currentSubscription.current_period_end
      : nowIso;

  return {
    requiresChoice: false,
    currentPlanCode,
    currentPlanName,
    currentPeriodEnd: currentSubscription.current_period_end,
    targetPlanCode,
    targetPlanName,
    targetDurationMonths,
    recommendedStrategy: "queue_after_current",
    options: [
      {
        strategy: "queue_after_current",
        nextPlanCode: currentPlanCode ?? "free",
        nextPlanName: currentPlanName ?? "Free",
        nextPeriodEnd: currentSubscription.current_period_end ?? addMonthsToIso(nowIso, 0),
        queuedPlanCode: targetPlanCode,
        queuedPlanName: targetPlanName,
        queuedPeriodEnd: addMonthsToIso(queueStartAt, targetDurationMonths),
      },
    ],
  };
}

export async function previewActivationCodeRedemption(
  supabase: SupabaseClient,
  userId: string,
  rawCode: string,
) {
  const code = await ensureActivationCodeIsRedeemable(supabase, userId, rawCode);
  const currentSubscription = await getCurrentSubscriptionForUser(supabase, userId);

  return buildActivationCodePreviewInternal(currentSubscription, code);
}

export async function redeemActivationCodeWithStrategy(
  supabase: SupabaseClient,
  userId: string,
  rawCode: string,
  strategy?: ActivationCodeRedemptionStrategy,
) {
  const now = new Date();
  const nowIso = now.toISOString();
  const code = await ensureActivationCodeIsRedeemable(supabase, userId, rawCode);
  const currentSubscription = await getCurrentSubscriptionForUser(supabase, userId);
  const preview = buildActivationCodePreviewInternal(currentSubscription, code, now);
  const nextStrategy = strategy ?? preview.recommendedStrategy;
  const codePlanCode = resolveActivationCodePlanCode(code);
  const codeDurationMonths = Math.max(1, code.duration_months ?? 1);
  const codeMonthlyPrice = resolveActivationCodeMonthlyPrice(code);
  const codeValue = resolveActivationCodeValue(code);
  const currentPlanCode = currentSubscription ? normalizePlanCode(currentSubscription.plan_code) : null;
  const currentRemainingValue = currentSubscription
    ? calculateSubscriptionRemainingValue(currentSubscription, now)
    : 0;
  const currentRemainingMonths =
    currentPlanCode && currentRemainingValue > 0
      ? calculatePlanDurationMonthsFromValue(currentRemainingValue, currentPlanCode)
      : 0;

  if (
    preview.requiresChoice &&
    !preview.options.some((option) => option.strategy === nextStrategy)
  ) {
    throw new Error("ACTIVATION_CODE_STRATEGY_REQUIRED");
  }

  let primarySubscription: SubscriptionRow | null = null;
  let queuedSubscription: SubscriptionRow | null = null;
  let currentPlanAfterChange: PlanCode = codePlanCode;
  let currentPeriodEndAfterChange: string | null = null;
  let membershipAction: "activation_code_redeemed" | "upgrade" = "activation_code_redeemed";

  if (nextStrategy === "queue_after_current") {
    const queueStartAt =
      currentSubscription?.current_period_end && new Date(currentSubscription.current_period_end).getTime() > now.getTime()
        ? currentSubscription.current_period_end
        : nowIso;

    primarySubscription = await createSubscriptionRecord(supabase, {
      userId,
      planCode: codePlanCode,
      provider: "activation_code",
      startAt: queueStartAt,
      durationMonths: codeDurationMonths,
      billingCycle: resolveActivationCodeBillingCycle(code),
      monthlyPrice: codeMonthlyPrice,
    });

    currentPlanAfterChange = currentPlanCode ?? codePlanCode;
    currentPeriodEndAfterChange = currentSubscription?.current_period_end ?? primarySubscription.current_period_end;
  } else if (nextStrategy === "start_now") {
    if (currentSubscription) {
      await replaceCurrentSubscription(supabase, currentSubscription, nowIso);
    }

    primarySubscription = await createSubscriptionRecord(supabase, {
      userId,
      planCode: codePlanCode,
      provider: "activation_code",
      startAt: nowIso,
      durationMonths: codeDurationMonths,
      billingCycle: resolveActivationCodeBillingCycle(code),
      monthlyPrice: codeMonthlyPrice,
    });

    if (currentPlanCode && currentRemainingMonths > 0) {
      queuedSubscription = await createSubscriptionRecord(supabase, {
        userId,
        planCode: currentPlanCode,
        provider: "internal_adjustment",
        startAt: primarySubscription.current_period_end ?? addMonthsToIso(nowIso, codeDurationMonths),
        durationMonths: currentRemainingMonths,
        billingCycle: inferSubscriptionBillingCycle(currentSubscription),
        monthlyPrice: resolveSubscriptionMonthlyPrice(currentSubscription),
      });
    }

    currentPlanAfterChange = codePlanCode;
    currentPeriodEndAfterChange = primarySubscription.current_period_end;
    membershipAction = "upgrade";
  } else if (nextStrategy === "upgrade_difference") {
    if (!currentSubscription) {
      throw new Error("ACTIVATION_CODE_UNAVAILABLE");
    }

    await replaceCurrentSubscription(supabase, currentSubscription, nowIso);

    const upgradeDurationMonths = calculatePlanDurationMonthsFromValue(
      currentRemainingValue + codeValue,
      codePlanCode,
    );

    primarySubscription = await createSubscriptionRecord(supabase, {
      userId,
      planCode: codePlanCode,
      provider: "activation_code",
      startAt: nowIso,
      durationMonths: upgradeDurationMonths,
      billingCycle: inferSubscriptionBillingCycle({
        billing_cycle: code.billing_cycle,
      }),
      monthlyPrice: getPlanMonthlyPrice(codePlanCode),
    });

    currentPlanAfterChange = codePlanCode;
    currentPeriodEndAfterChange = primarySubscription.current_period_end;
    membershipAction = "upgrade";
  } else {
    primarySubscription = await createSubscriptionRecord(supabase, {
      userId,
      planCode: codePlanCode,
      provider: "activation_code",
      startAt: nowIso,
      durationMonths: codeDurationMonths,
      billingCycle: resolveActivationCodeBillingCycle(code),
      monthlyPrice: codeMonthlyPrice,
    });

    currentPlanAfterChange = codePlanCode;
    currentPeriodEndAfterChange = primarySubscription.current_period_end;
  }

  if (!primarySubscription) {
    throw new Error("ACTIVATION_CODE_UNAVAILABLE");
  }

  const redemptionId = randomUUID();
  const providerEventId = `activation_code:${redemptionId.replace(/-/g, "")}`;

  const { error: redemptionInsertError } = await supabase.from("activation_code_redemptions").insert({
    id: redemptionId,
    activation_code_id: code.id,
    user_id: userId,
    subscription_id: primarySubscription.id,
    code_prefix: code.code_prefix,
    plan_code: codePlanCode,
    billing_cycle: code.billing_cycle,
    duration_months: code.duration_months,
    redeemed_at: nowIso,
  });

  if (redemptionInsertError) {
    throw new Error(redemptionInsertError.message);
  }

  const { error: codeUpdateError } = await supabase
    .from("activation_codes")
    .update({
      redeemed_count: (code.redeemed_count ?? 0) + 1,
      last_redeemed_at: nowIso,
      status: (code.redeemed_count ?? 0) + 1 >= (code.max_redemptions ?? 0) ? "redeemed" : code.status,
    })
    .eq("id", code.id);

  if (codeUpdateError) {
    throw new Error(codeUpdateError.message);
  }

  const { error: billingEventError } = await supabase.from("billing_events").insert({
    user_id: userId,
    subscription_id: primarySubscription.id,
    provider: "activation_code",
    provider_event_id: providerEventId,
    event_type: "activation_code.redeemed",
    payload: {
      activation_code_id: code.id,
      code_prefix: code.code_prefix,
      plan_code: codePlanCode,
      billing_cycle: code.billing_cycle,
      duration_months: code.duration_months,
      strategy: nextStrategy,
      queued_subscription_id: queuedSubscription?.id ?? null,
    },
    processed_at: nowIso,
  });

  if (billingEventError) {
    throw new Error(billingEventError.message);
  }

  await recordMembershipChange(supabase, {
    userId,
    action: membershipAction,
    source: "activation_code",
    provider: "activation_code",
    referenceId: providerEventId,
    previousPlanCode: currentPlanCode,
    previousPeriodEnd: currentSubscription?.current_period_end ?? null,
    currentPlanCode: currentPlanAfterChange,
    currentPeriodEnd: currentPeriodEndAfterChange,
    details: {
      strategy: nextStrategy,
      codePrefix: code.code_prefix,
      queuedPlanCode: queuedSubscription ? normalizePlanCode(queuedSubscription.plan_code) : null,
      queuedPeriodEnd: queuedSubscription?.current_period_end ?? null,
    },
  });

  return {
    preview,
    strategy: nextStrategy,
    primarySubscription,
    queuedSubscription,
    currentPlanCode: currentPlanAfterChange,
    currentPeriodEnd: currentPeriodEndAfterChange,
  };
}

export async function applyInternalDowngrade(
  supabase: SupabaseClient,
  userId: string,
) {
  const currentSubscription = await getCurrentSubscriptionForUser(supabase, userId);
  const currentPlanCode = currentSubscription ? normalizePlanCode(currentSubscription.plan_code) : "free";

  if (!currentSubscription || currentPlanCode !== "premium") {
    throw new Error("DOWNGRADE_NOT_AVAILABLE");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const remainingValue = calculateSubscriptionRemainingValue(currentSubscription, now);
  const downgradedDurationMonths = calculatePlanDurationMonthsFromValue(remainingValue, "starter");

  if (downgradedDurationMonths < 1) {
    throw new Error("DOWNGRADE_NOT_AVAILABLE");
  }

  await replaceCurrentSubscription(supabase, currentSubscription, nowIso);

  const downgradedSubscription = await createSubscriptionRecord(supabase, {
    userId,
    planCode: "starter",
    provider: "internal_adjustment",
    startAt: nowIso,
    durationMonths: downgradedDurationMonths,
    billingCycle: "monthly",
    monthlyPrice: getPlanMonthlyPrice("starter"),
  });

  const providerEventId = `downgrade:${randomUUID().replace(/-/g, "")}`;

  const { error: billingEventError } = await supabase.from("billing_events").insert({
    user_id: userId,
    subscription_id: downgradedSubscription.id,
    provider: "internal_adjustment",
    provider_event_id: providerEventId,
    event_type: "subscription.downgraded",
    payload: {
      previous_plan_code: currentPlanCode,
      next_plan_code: "starter",
      remaining_value: remainingValue,
      duration_months: downgradedDurationMonths,
    },
    processed_at: nowIso,
  });

  if (billingEventError) {
    throw new Error(billingEventError.message);
  }

  await recordMembershipChange(supabase, {
    userId,
    action: "downgrade",
    source: "settings",
    provider: currentSubscription.provider ?? "internal_adjustment",
    referenceId: providerEventId,
    previousPlanCode: currentPlanCode,
    previousPeriodEnd: currentSubscription.current_period_end,
    currentPlanCode: "starter",
    currentPeriodEnd: downgradedSubscription.current_period_end,
    details: {
      remainingValue,
      durationMonths: downgradedDurationMonths,
    },
  });

  return {
    currentSubscription,
    downgradedSubscription,
    remainingValue,
    durationMonths: downgradedDurationMonths,
  };
}
