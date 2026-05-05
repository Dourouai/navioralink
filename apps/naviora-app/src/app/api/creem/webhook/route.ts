import { NextRequest } from "next/server";

import { createCreemClient, resolveBillingCycleFromCreemData, resolvePlanCodeFromCreemData } from "@/lib/billing/creem";
import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { recordCreemBillingEvent, upsertCreemSubscriptionRecord } from "@/lib/supabase/billing-shared";

export const runtime = "nodejs";

function getMetadataUserId(metadata: Record<string, unknown> | null | undefined) {
  const direct = metadata?.userId;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const fallback = metadata?.referenceId;
  if (typeof fallback === "string" && fallback.trim()) {
    return fallback.trim();
  }

  return null;
}

async function handleSubscriptionEvent(
  eventType: string,
  payload: unknown,
  subscription: {
    id: string;
    status: string;
    metadata?: Record<string, unknown> | null;
    product?: { id?: string } | null;
    customer?: { id?: string } | null;
    currentPeriodStartDate?: Date | string | null;
    currentPeriodEndDate?: Date | string | null;
  },
  providerEventId: string,
) {
  const supabase = createAdminSupabaseClient();
  const metadata = subscription.metadata ?? {};
  const subscriptionRow = await upsertCreemSubscriptionRecord(supabase, {
    userId: getMetadataUserId(metadata),
    providerCustomerId: subscription.customer?.id ?? null,
    providerSubscriptionId: subscription.id,
    productId: subscription.product?.id ?? null,
    status: subscription.status,
    metadata,
    currentPeriodStart: subscription.currentPeriodStartDate,
    currentPeriodEnd: subscription.currentPeriodEndDate,
    cancelAtPeriodEnd: eventType === "subscription.scheduled_cancel",
  });

  await recordCreemBillingEvent(supabase, {
    userId: subscriptionRow?.user_id ?? getMetadataUserId(metadata),
    subscriptionId: subscriptionRow?.id ?? null,
    providerEventId,
    eventType,
    payload,
  });
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminEnv()) {
    return new Response("Supabase admin environment is missing.", { status: 500 });
  }

  const signature = request.headers.get("creem-signature");
  if (!signature) {
    return new Response("Missing Creem signature.", { status: 400 });
  }

  const body = await request.text();

  try {
    const creem = createCreemClient();

    await creem.webhooks.handleEvents(body, signature, {
      onCheckoutCompleted: async (data) => {
        const supabase = createAdminSupabaseClient();
        const metadata = (data.metadata as Record<string, unknown> | undefined) ?? {};
        const subscriptionRow = data.subscription
          ? await upsertCreemSubscriptionRecord(supabase, {
              userId: getMetadataUserId(metadata),
              providerCustomerId: data.customer?.id ?? null,
              providerSubscriptionId: data.subscription.id,
              productId: data.product.id,
              status: data.subscription.status,
              metadata,
              currentPeriodStart: data.subscription.currentPeriodStartDate,
              currentPeriodEnd: data.subscription.currentPeriodEndDate,
              cancelAtPeriodEnd: data.subscription.status === "scheduled_cancel",
            })
          : null;

        await recordCreemBillingEvent(supabase, {
          userId: subscriptionRow?.user_id ?? getMetadataUserId(metadata),
          subscriptionId: subscriptionRow?.id ?? null,
          providerEventId: data.webhookId,
          eventType: data.webhookEventType,
          payload: {
            ...data,
            planCode: resolvePlanCodeFromCreemData(metadata, data.product.id),
            billingCycle: resolveBillingCycleFromCreemData({
              metadata,
              currentPeriodStart: data.subscription?.currentPeriodStartDate,
              currentPeriodEnd: data.subscription?.currentPeriodEndDate,
            }),
          },
        });
      },
      onSubscriptionActive: async (data) => handleSubscriptionEvent(data.webhookEventType, data, data, data.webhookId),
      onSubscriptionTrialing: async (data) => handleSubscriptionEvent(data.webhookEventType, data, data, data.webhookId),
      onSubscriptionCanceled: async (data) => handleSubscriptionEvent(data.webhookEventType, data, data, data.webhookId),
      onSubscriptionPaid: async (data) => handleSubscriptionEvent(data.webhookEventType, data, data, data.webhookId),
      onSubscriptionExpired: async (data) => handleSubscriptionEvent(data.webhookEventType, data, data, data.webhookId),
      onSubscriptionUnpaid: async (data) => handleSubscriptionEvent(data.webhookEventType, data, data, data.webhookId),
      onSubscriptionPastDue: async (data) => handleSubscriptionEvent(data.webhookEventType, data, data, data.webhookId),
      onSubscriptionPaused: async (data) => handleSubscriptionEvent(data.webhookEventType, data, data, data.webhookId),
      onSubscriptionUpdate: async (data) => handleSubscriptionEvent(data.webhookEventType, data, data, data.webhookId),
      onSubscriptionScheduledCancel: async (data) => handleSubscriptionEvent(data.webhookEventType, data, data, data.webhookId),
      onRefundCreated: async (data) => {
        const supabase = createAdminSupabaseClient();
        await recordCreemBillingEvent(supabase, {
          providerEventId: data.webhookId,
          eventType: data.webhookEventType,
          payload: data,
        });
      },
      onDisputeCreated: async (data) => {
        const supabase = createAdminSupabaseClient();
        await recordCreemBillingEvent(supabase, {
          providerEventId: data.webhookId,
          eventType: data.webhookEventType,
          payload: data,
        });
      },
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook.";
    return new Response(message, { status: 400 });
  }
}
