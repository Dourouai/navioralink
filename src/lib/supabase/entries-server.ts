import { dashboardStats } from "@/mock/dashboard";
import { mockQrList } from "@/mock/qrs";
import type { QRCodeItem } from "@/types/qr";

import { hasSupabaseEnv } from "./env";
import { buildDashboardStatsFromItems, mapEntryRowsToItems, type SupabaseEntryRow, type SupabaseEntryRuleRow, type SupabaseEntryTargetRow } from "./entries-shared";
import { getCurrentAppUser } from "./server-auth";
import { createServerSupabaseClient } from "./server";

async function getEntryRelations(entryIds: string[]) {
  if (!entryIds.length) {
    return {
      targets: [] as SupabaseEntryTargetRow[],
      rules: [] as SupabaseEntryRuleRow[],
      scansByEntryId: {} as Record<string, number>,
    };
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: targets, error: targetsError }, { data: rules, error: rulesError }, { data: visits, error: visitsError }] =
    await Promise.all([
      supabase.from("entry_targets").select("*").in("entry_id", entryIds).order("sort_order", { ascending: true }),
      supabase.from("entry_rules").select("*").in("entry_id", entryIds).order("sort_order", { ascending: true }),
      supabase.from("entry_visits").select("entry_id").in("entry_id", entryIds),
    ]);

  if (targetsError) {
    throw new Error(targetsError.message);
  }

  if (rulesError) {
    throw new Error(rulesError.message);
  }

  if (visitsError) {
    throw new Error(visitsError.message);
  }

  const scansByEntryId = (visits ?? []).reduce<Record<string, number>>((counts, visit) => {
    const entryId = String(visit.entry_id);
    counts[entryId] = (counts[entryId] ?? 0) + 1;
    return counts;
  }, {});

  return {
    targets: (targets ?? []) as SupabaseEntryTargetRow[],
    rules: (rules ?? []) as SupabaseEntryRuleRow[],
    scansByEntryId,
  };
}

export async function getEntriesServer(options?: {
  archivedOnly?: boolean;
  includeArchived?: boolean;
}) {
  if (!hasSupabaseEnv()) {
    const items = options?.archivedOnly
      ? mockQrList.filter((item) => item.status === "archived")
      : options?.includeArchived
        ? mockQrList
        : mockQrList.filter((item) => item.status !== "archived");

    return items;
  }

  const user = await getCurrentAppUser();
  if (!user) {
    return [] satisfies QRCodeItem[];
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase.from("entries").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });

  if (options?.archivedOnly) {
    query = query.eq("status", "archived");
  } else if (!options?.includeArchived) {
    query = query.neq("status", "archived");
  }

  const { data: entries, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const typedEntries = (entries ?? []) as SupabaseEntryRow[];
  const relations = await getEntryRelations(typedEntries.map((entry) => entry.id));
  return mapEntryRowsToItems({
    entries: typedEntries,
    targets: relations.targets,
    rules: relations.rules,
    scansByEntryId: relations.scansByEntryId,
  });
}

export async function getEntryByIdServer(id: string) {
  if (!hasSupabaseEnv()) {
    return mockQrList.find((item) => item.id === id) ?? null;
  }

  const user = await getCurrentAppUser();
  if (!user) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data: entry, error } = await supabase
    .from("entries")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!entry) {
    return null;
  }

  const relations = await getEntryRelations([id]);
  return (
    mapEntryRowsToItems({
      entries: [entry as SupabaseEntryRow],
      targets: relations.targets,
      rules: relations.rules,
      scansByEntryId: relations.scansByEntryId,
    })[0] ?? null
  );
}

export async function getDashboardStatsServer() {
  if (!hasSupabaseEnv()) {
    return dashboardStats;
  }

  const items = await getEntriesServer({ includeArchived: true });
  return buildDashboardStatsFromItems(items);
}
