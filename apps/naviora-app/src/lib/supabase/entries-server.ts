import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { dashboardStats } from "@/mock/dashboard";
import { mockQrList } from "@/mock/qrs";
import type { QRCodeItem } from "@/types/qr";
import {
  APP_CACHE_REVALIDATE_SECONDS,
  getDashboardStatsTag,
  getEntriesListTag,
  getEntryAnalyticsCollectionTag,
  getEntryAnalyticsTag,
  getEntryDetailTag,
} from "@/lib/cache-tags";

import { mapEntryRowsToItems, type SupabaseEntryRow, type SupabaseEntryRuleRow, type SupabaseEntryTargetRow } from "./entries-shared";
import { createAdminSupabaseClient, hasSupabaseAdminEnv } from "./admin";
import { hasSupabaseEnv } from "./env";
import { getCurrentAppUser } from "./server-auth";
import { createServerSupabaseClient } from "./server";

interface EntryVisitCountRow {
  entry_id: string;
  visit_count: number | string | null;
}

function isMissingAggregateRelationError(message: string) {
  return /entry_visit_daily_totals/i.test(message) && /schema cache|does not exist/i.test(message);
}

async function getEntryVisitCounts(entryIds: string[], supabase: SupabaseClient) {
  if (!entryIds.length) {
    return [] as EntryVisitCountRow[];
  }

  const { data, error } = await supabase.from("entry_visit_daily_totals").select("entry_id, visit_count").in("entry_id", entryIds);

  if (!error) {
    return (data ?? []) as EntryVisitCountRow[];
  }

  if (!isMissingAggregateRelationError(error.message)) {
    throw new Error(error.message);
  }

  const { data: fallbackData, error: fallbackError } = await supabase.rpc("get_entry_visit_counts", { p_entry_ids: entryIds });

  if (fallbackError) {
    throw new Error(fallbackError.message);
  }

  return (fallbackData ?? []) as EntryVisitCountRow[];
}

function createEmptyRelations() {
  return {
    targets: [] as SupabaseEntryTargetRow[],
    rules: [] as SupabaseEntryRuleRow[],
    scansByEntryId: {} as Record<string, number>,
  };
}

const getEntryRelations = cache(async (entryIdsKey: string) => {
  if (!entryIdsKey) {
    return createEmptyRelations();
  }

  const entryIds = entryIdsKey.split(",");
  const supabase = hasSupabaseAdminEnv() ? createAdminSupabaseClient() : await createServerSupabaseClient();
  const [{ data: targets, error: targetsError }, { data: rules, error: rulesError }, visitCounts] =
    await Promise.all([
      supabase.from("entry_targets").select("*").in("entry_id", entryIds).order("sort_order", { ascending: true }),
      supabase.from("entry_rules").select("*").in("entry_id", entryIds).order("sort_order", { ascending: true }),
      getEntryVisitCounts(entryIds, supabase),
    ]);

  if (targetsError) {
    throw new Error(targetsError.message);
  }

  if (rulesError) {
    throw new Error(rulesError.message);
  }

  const scansByEntryId = (visitCounts as EntryVisitCountRow[]).reduce<Record<string, number>>((counts, row) => {
    counts[row.entry_id] = (counts[row.entry_id] ?? 0) + Number(row.visit_count ?? 0);
    return counts;
  }, {});

  return {
    targets: (targets ?? []) as SupabaseEntryTargetRow[],
    rules: (rules ?? []) as SupabaseEntryRuleRow[],
    scansByEntryId,
  };
});

const getEntrySummaryRelations = cache(async (entryIdsKey: string) => {
  if (!entryIdsKey) {
    return createEmptyRelations();
  }

  const entryIds = entryIdsKey.split(",");
  const supabase = hasSupabaseAdminEnv() ? createAdminSupabaseClient() : await createServerSupabaseClient();
  const [{ data: targets, error: targetsError }, visitCounts] = await Promise.all([
    supabase
      .from("entry_targets")
      .select("*")
      .in("entry_id", entryIds)
      .eq("is_default", true)
      .order("sort_order", { ascending: true }),
    getEntryVisitCounts(entryIds, supabase),
  ]);

  if (targetsError) {
    throw new Error(targetsError.message);
  }

  const scansByEntryId = (visitCounts as EntryVisitCountRow[]).reduce<Record<string, number>>((counts, row) => {
    counts[row.entry_id] = (counts[row.entry_id] ?? 0) + Number(row.visit_count ?? 0);
    return counts;
  }, {});

  return {
    targets: (targets ?? []) as SupabaseEntryTargetRow[],
    rules: [] as SupabaseEntryRuleRow[],
    scansByEntryId,
  };
});

async function loadEntriesForUser(
  userId: string,
  archivedOnly: boolean,
  includeArchived: boolean,
  limit: number | null,
  summaryOnly: boolean,
  supabase: SupabaseClient,
) {
  let query = supabase.from("entries").select("*").eq("user_id", userId).order("updated_at", { ascending: false });

  if (archivedOnly) {
    query = query.eq("status", "archived");
  } else if (!includeArchived) {
    query = query.neq("status", "archived");
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data: entries, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const typedEntries = (entries ?? []) as SupabaseEntryRow[];
  const entryIdsKey = typedEntries.map((entry) => entry.id).join(",");
  const relations = summaryOnly ? await getEntrySummaryRelations(entryIdsKey) : await getEntryRelations(entryIdsKey);

  return mapEntryRowsToItems({
    entries: typedEntries,
    targets: relations.targets,
    rules: relations.rules,
    scansByEntryId: relations.scansByEntryId,
  });
}

const getEntriesServerCached = cache((userId: string, archivedOnly: boolean, includeArchived: boolean, limit: number | null, summaryOnly: boolean) =>
  unstable_cache(
    () => loadEntriesForUser(userId, archivedOnly, includeArchived, limit, summaryOnly, createAdminSupabaseClient()),
    ["entries", userId, String(archivedOnly), String(includeArchived), String(limit ?? "all"), String(summaryOnly)],
    {
      revalidate: APP_CACHE_REVALIDATE_SECONDS.entries,
      tags: [getEntriesListTag(userId), getDashboardStatsTag(userId), getEntryAnalyticsCollectionTag(userId)],
    },
  )(),
);

async function loadEntryByIdForUser(userId: string, id: string, supabase: SupabaseClient) {
  const { data: entry, error } = await supabase
    .from("entries")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!entry) {
    return null;
  }

  const relations = await getEntryRelations(id);
  return (
    mapEntryRowsToItems({
      entries: [entry as SupabaseEntryRow],
      targets: relations.targets,
      rules: relations.rules,
      scansByEntryId: relations.scansByEntryId,
    })[0] ?? null
  );
}

const getEntryByIdServerCached = cache((userId: string, id: string) =>
  unstable_cache(() => loadEntryByIdForUser(userId, id, createAdminSupabaseClient()), ["entry", userId, id], {
    revalidate: APP_CACHE_REVALIDATE_SECONDS.entries,
    tags: [getEntriesListTag(userId), getEntryDetailTag(id), getEntryAnalyticsTag(id), getEntryAnalyticsCollectionTag(userId)],
  })(),
);

async function loadDashboardStatsForUser(userId: string, supabase: SupabaseClient) {
  const now = new Date();
  const usageMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [
    { count: totalQrs, error: totalError },
    { count: activeQrs, error: activeError },
    { count: recentAdded, error: recentError },
    { data: monthlyUsage, error: monthlyUsageError },
  ] = await Promise.all([
    supabase.from("entries").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "archived"),
    supabase.from("entries").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active"),
    supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "archived")
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase.from("user_monthly_usage").select("visit_count").eq("user_id", userId).eq("usage_month", usageMonth).maybeSingle(),
  ]);

  if (totalError) {
    throw new Error(totalError.message);
  }

  if (activeError) {
    throw new Error(activeError.message);
  }

  if (recentError) {
    throw new Error(recentError.message);
  }

  if (monthlyUsageError) {
    throw new Error(monthlyUsageError.message);
  }

  return {
    totalQrs: totalQrs ?? 0,
    monthlyScans: Number(monthlyUsage?.visit_count ?? 0),
    activeQrs: activeQrs ?? 0,
    recentAdded: recentAdded ?? 0,
  };
}

const getDashboardStatsServerCached = cache((userId: string) =>
  unstable_cache(() => loadDashboardStatsForUser(userId, createAdminSupabaseClient()), ["dashboard-stats", userId], {
    revalidate: APP_CACHE_REVALIDATE_SECONDS.dashboard,
    tags: [getDashboardStatsTag(userId), getEntriesListTag(userId)],
  })(),
);

export async function getEntriesServer(options?: {
  archivedOnly?: boolean;
  includeArchived?: boolean;
  limit?: number;
  summaryOnly?: boolean;
}) {
  if (!hasSupabaseEnv()) {
    const items = Boolean(options?.archivedOnly)
      ? mockQrList.filter((item) => item.status === "archived")
      : Boolean(options?.includeArchived)
        ? mockQrList
        : mockQrList.filter((item) => item.status !== "archived");

    return options?.limit ? items.slice(0, options.limit) : items;
  }

  const user = await getCurrentAppUser();
  if (!user) {
    return [] satisfies QRCodeItem[];
  }

  if (!hasSupabaseAdminEnv()) {
    return loadEntriesForUser(
      user.id,
      Boolean(options?.archivedOnly),
      Boolean(options?.includeArchived),
      options?.limit ?? null,
      Boolean(options?.summaryOnly),
      await createServerSupabaseClient(),
    );
  }

  return getEntriesServerCached(
    user.id,
    Boolean(options?.archivedOnly),
    Boolean(options?.includeArchived),
    options?.limit ?? null,
    Boolean(options?.summaryOnly),
  );
}

export async function getEntryByIdServer(id: string) {
  if (!hasSupabaseEnv()) {
    return mockQrList.find((item) => item.id === id) ?? null;
  }

  const user = await getCurrentAppUser();
  if (!user) {
    return null;
  }

  if (!hasSupabaseAdminEnv()) {
    return loadEntryByIdForUser(user.id, id, await createServerSupabaseClient());
  }

  return getEntryByIdServerCached(user.id, id);
}

export async function getDashboardStatsServer() {
  if (!hasSupabaseEnv()) {
    return dashboardStats;
  }

  const user = await getCurrentAppUser();
  if (!user) {
    return {
      totalQrs: 0,
      monthlyScans: 0,
      activeQrs: 0,
      recentAdded: 0,
    };
  }

  if (!hasSupabaseAdminEnv()) {
    return loadDashboardStatsForUser(user.id, await createServerSupabaseClient());
  }

  return getDashboardStatsServerCached(user.id);
}
