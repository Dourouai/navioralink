import { cache } from "react";

import { COUNTRIES } from "@/lib/countries";
import { createEmptyEntryAnalyticsDetail, entryAnalyticsById, type BreakdownRow, type EntryAnalyticsDetail, type VisitLogRow } from "@/mock/entry-analytics";
import type { QRCodeItem } from "@/types/qr";

import { hasSupabaseEnv } from "./env";
import { getEntriesServer, getEntryByIdServer } from "./entries-server";
import { createServerSupabaseClient } from "./server";

export const ANALYTICS_RANGE_OPTIONS = [7, 30, 90, 180, 365] as const;
const DEFAULT_ANALYTICS_RANGE = 7;
const MAX_ANALYTICS_RANGE = 365;
type AnalyticsDimension = "region" | "device" | "os" | "language" | "source";

interface EntryVisitRow {
  entry_id: string;
  locale: string | null;
  country_code: string | null;
  region_code: string | null;
  device_type: string | null;
  device_os: string | null;
  language: string | null;
  referrer: string | null;
  user_agent: string | null;
  resolved_url: string | null;
  created_at: string;
}

interface EntryVisitDailyTotalRow {
  entry_id: string;
  visit_date: string;
  visit_count: number | string | null;
  last_visit_at: string | null;
}

interface EntryVisitDailyDimensionRow {
  entry_id: string;
  visit_date: string;
  dimension: AnalyticsDimension;
  dimension_value: string;
  visit_count: number | string | null;
}

interface EntryUniqueVisitorCountRow {
  entry_id: string;
  unique_visitors: number | string | null;
}

interface EntryAnalyticsAggregateBundle {
  dailyTotalsByEntryId: Record<string, EntryVisitDailyTotalRow[]>;
  dimensionRowsByEntryId: Record<string, Partial<Record<AnalyticsDimension, EntryVisitDailyDimensionRow[]>>>;
  uniqueVisitorsByEntryId: Record<string, number>;
}

function isMissingAnalyticsAggregateError(message: string) {
  return /(entry_visit_daily_totals|entry_visit_daily_dimensions|entry_unique_visitors|get_entry_unique_visitor_counts)/i.test(message) && /schema cache|does not exist/i.test(message);
}

export interface EntryVisitLogPageData {
  normalizedRange: number;
  totalLogs: number;
  totalPages: number;
  currentPage: number;
  visibleStart: number;
  visibleEnd: number;
  lastScan: string;
  logs: VisitLogRow[];
}

const COUNTRY_LABELS = new Map(COUNTRIES.map((country) => [country.code.toUpperCase(), country.en]));

export function normalizeAnalyticsRange(value?: string | number | null) {
  const parsed = Number(value);
  return ANALYTICS_RANGE_OPTIONS.includes(parsed as (typeof ANALYTICS_RANGE_OPTIONS)[number]) ? parsed : DEFAULT_ANALYTICS_RANGE;
}

function getAnalyticsSinceIso(days = MAX_ANALYTICS_RANGE) {
  const safeDays = Math.max(DEFAULT_ANALYTICS_RANGE, Math.min(MAX_ANALYTICS_RANGE, days));
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - safeDays + 1);
  return since.toISOString();
}

function getAnalyticsSinceDate(days = MAX_ANALYTICS_RANGE) {
  return getAnalyticsSinceIso(days).slice(0, 10);
}

function humanizeCountryCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  return COUNTRY_LABELS.get(normalized) ?? null;
}

function humanizeRegionCode(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  const countryLabel = humanizeCountryCode(normalized);
  if (countryLabel) {
    return countryLabel;
  }

  if (/^\d+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function emptyBreakdown(): BreakdownRow[] {
  return [];
}

function createEmptyYearlyTrendData() {
  const rows: Array<{ date: string; scans: number }> = [];

  for (let offset = MAX_ANALYTICS_RANGE - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    rows.push({
      date: date.toISOString().slice(0, 10),
      scans: 0,
    });
  }

  return rows;
}

function buildDateSeriesFromDailyTotals(rows: EntryVisitDailyTotalRow[]) {
  const dayMap = new Map(createEmptyYearlyTrendData().map((row) => [row.date, row.scans]));

  rows.forEach((row) => {
    dayMap.set(row.visit_date, Number(row.visit_count ?? 0));
  });

  return Array.from(dayMap.entries()).map(([date, scans]) => ({ date, scans }));
}

function formatPercent(value: number, total: number) {
  return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";
}

function normalizeRegionDimensionValue(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized || normalized === "Unknown") {
    return "Unknown";
  }

  return humanizeCountryCode(normalized) ?? humanizeRegionCode(normalized) ?? normalized;
}

function normalizeDimensionValue(dimension: AnalyticsDimension, value?: string | null) {
  const normalized = value?.trim();

  if (dimension === "region") {
    return normalizeRegionDimensionValue(normalized);
  }

  if (!normalized) {
    return dimension === "source" ? "Direct" : "Unknown";
  }

  return normalized;
}

function buildBreakdownRows(rows: EntryVisitDailyDimensionRow[], dimension: AnalyticsDimension) {
  const counts = rows.reduce<Map<string, number>>((map, row) => {
    const label = normalizeDimensionValue(dimension, row.dimension_value);
    map.set(label, (map.get(label) ?? 0) + Number(row.visit_count ?? 0));
    return map;
  }, new Map());

  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);

  return Array.from(counts.entries())
    .map(([label, scans]) => ({
      label,
      scans,
      share: formatPercent(scans, total),
    }))
    .sort((a, b) => b.scans - a.scans);
}

function buildVisitLogs(visits: EntryVisitRow[]): VisitLogRow[] {
  return visits
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((visit, index) => ({
      id: `${visit.entry_id}-${index}-${visit.created_at}`,
      visitedAt: visit.created_at,
      region: normalizeRegionDimensionValue(visit.country_code ?? visit.region_code),
      deviceType: visit.device_type?.trim() || "Unknown",
      os: visit.device_os?.trim() || "Unknown",
      language: visit.language?.trim() || visit.locale?.trim() || "Unknown",
      source: visit.referrer?.trim() || "Direct",
      targetUrl: visit.resolved_url?.trim() || "",
    }));
}

function buildAggregateBundle(
  dailyTotals: EntryVisitDailyTotalRow[],
  dimensionRows: EntryVisitDailyDimensionRow[],
  uniqueVisitorCounts: EntryUniqueVisitorCountRow[],
): EntryAnalyticsAggregateBundle {
  const dailyTotalsByEntryId = dailyTotals.reduce<Record<string, EntryVisitDailyTotalRow[]>>((map, row) => {
    const entryId = String(row.entry_id);
    const current = map[entryId] ?? [];
    current.push(row);
    map[entryId] = current;
    return map;
  }, {});

  const dimensionRowsByEntryId = dimensionRows.reduce<Record<string, Partial<Record<AnalyticsDimension, EntryVisitDailyDimensionRow[]>>>>((map, row) => {
    const entryId = String(row.entry_id);
    const current = map[entryId] ?? {};
    const currentRows = current[row.dimension] ?? [];
    currentRows.push(row);
    current[row.dimension] = currentRows;
    map[entryId] = current;
    return map;
  }, {});

  const uniqueVisitorsByEntryId = uniqueVisitorCounts.reduce<Record<string, number>>((map, row) => {
    map[String(row.entry_id)] = Number(row.unique_visitors ?? 0);
    return map;
  }, {});

  return {
    dailyTotalsByEntryId,
    dimensionRowsByEntryId,
    uniqueVisitorsByEntryId,
  };
}

async function getVisitAggregateBundle(entryIds: string[], options?: { days?: number }) {
  if (!entryIds.length) {
    return {
      dailyTotalsByEntryId: {},
      dimensionRowsByEntryId: {},
      uniqueVisitorsByEntryId: {},
    } satisfies EntryAnalyticsAggregateBundle;
  }

  const supabase = await createServerSupabaseClient();
  const sinceIso = getAnalyticsSinceIso(options?.days ?? MAX_ANALYTICS_RANGE);
  const sinceDate = getAnalyticsSinceDate(options?.days ?? MAX_ANALYTICS_RANGE);
  const [{ data: dailyTotals, error: dailyTotalsError }, { data: dimensionRows, error: dimensionRowsError }, { data: uniqueVisitorCounts, error: uniqueVisitorCountsError }] =
    await Promise.all([
      supabase
        .from("entry_visit_daily_totals")
        .select("entry_id, visit_date, visit_count, last_visit_at")
        .in("entry_id", entryIds)
        .gte("visit_date", sinceDate),
      supabase
        .from("entry_visit_daily_dimensions")
        .select("entry_id, visit_date, dimension, dimension_value, visit_count")
        .in("entry_id", entryIds)
        .gte("visit_date", sinceDate),
      supabase.rpc("get_entry_unique_visitor_counts", {
        p_entry_ids: entryIds,
        p_since: sinceIso,
      }),
    ]);

  const aggregateError = dailyTotalsError ?? dimensionRowsError ?? uniqueVisitorCountsError;
  if (aggregateError) {
    if (isMissingAnalyticsAggregateError(aggregateError.message)) {
      return null;
    }

    throw new Error(aggregateError.message);
  }

  return buildAggregateBundle(
    (dailyTotals ?? []) as EntryVisitDailyTotalRow[],
    (dimensionRows ?? []) as EntryVisitDailyDimensionRow[],
    (uniqueVisitorCounts ?? []) as EntryUniqueVisitorCountRow[],
  );
}

function buildUniqueVisitorCount(visits: EntryVisitRow[]) {
  const fingerprints = new Set(
    visits.map((visit) =>
      [
        visit.user_agent?.trim() || "ua",
        visit.referrer?.trim() || "ref",
        visit.country_code?.trim() || "country",
        visit.language?.trim() || visit.locale?.trim() || "lang",
      ].join("::"),
    ),
  );

  return fingerprints.size;
}

function buildAnalyticsDetailFromAggregates(
  item: QRCodeItem,
  params: {
    dailyTotals: EntryVisitDailyTotalRow[];
    dimensionRows: Partial<Record<AnalyticsDimension, EntryVisitDailyDimensionRow[]>>;
    uniqueVisitors: number;
  },
): EntryAnalyticsDetail {
  const sortedDailyTotals = params.dailyTotals.slice().sort((a, b) => b.visit_date.localeCompare(a.visit_date));
  const yearlyTrendData = buildDateSeriesFromDailyTotals(sortedDailyTotals);
  const totalScans = sortedDailyTotals.reduce((sum, row) => sum + Number(row.visit_count ?? 0), 0);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayScans = Number(sortedDailyTotals.find((row) => row.visit_date === todayKey)?.visit_count ?? 0);
  const regionData = buildBreakdownRows(params.dimensionRows.region ?? [], "region");
  const deviceData = buildBreakdownRows(params.dimensionRows.device ?? [], "device");
  const osData = buildBreakdownRows(params.dimensionRows.os ?? [], "os");
  const languageData = buildBreakdownRows(params.dimensionRows.language ?? [], "language");
  const uniqueVisitors = params.uniqueVisitors;
  const conversionRate = formatPercent(uniqueVisitors, totalScans);
  const lastScan = sortedDailyTotals[0]?.last_visit_at ?? item.updatedAt;

  return {
    id: item.id,
    totalScans,
    todayScans,
    uniqueVisitors,
    uniqueVisitorRatio: totalScans > 0 ? uniqueVisitors / totalScans : 0,
    conversionRate,
    lastScan,
    topRegion: regionData[0]?.label ?? "",
    topDevice: deviceData[0]?.label ?? "",
    topOs: osData[0]?.label ?? "",
    topLanguage: languageData[0]?.label ?? "",
    trendData: yearlyTrendData.slice(-DEFAULT_ANALYTICS_RANGE).map((point) => ({ day: point.date, scans: point.scans })),
    yearlyTrendData,
    regionData: regionData.length ? regionData : emptyBreakdown(),
    deviceData: deviceData.length ? deviceData : emptyBreakdown(),
    osData: osData.length ? osData : emptyBreakdown(),
    languageData: languageData.length ? languageData : emptyBreakdown(),
    visitLogs: [],
  };
}

function buildAnalyticsDetailFromVisits(item: QRCodeItem, visits: EntryVisitRow[]): EntryAnalyticsDetail {
  const sortedVisits = visits.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const dayMap = new Map(createEmptyYearlyTrendData().map((row) => [row.date, row.scans]));

  sortedVisits.forEach((visit) => {
    const dateKey = visit.created_at.slice(0, 10);
    dayMap.set(dateKey, (dayMap.get(dateKey) ?? 0) + 1);
  });

  const yearlyTrendData = Array.from(dayMap.entries()).map(([date, scans]) => ({ date, scans }));
  const totalScans = sortedVisits.length;
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayScans = sortedVisits.filter((visit) => visit.created_at.startsWith(todayKey)).length;
  const toBreakdownRows = (values: string[]) => {
    const counts = values.reduce<Map<string, number>>((map, label) => {
      map.set(label, (map.get(label) ?? 0) + 1);
      return map;
    }, new Map());

    return Array.from(counts.entries())
      .map(([label, scans]) => ({
        label,
        scans,
        share: formatPercent(scans, values.length),
      }))
      .sort((a, b) => b.scans - a.scans);
  };
  const regionData = toBreakdownRows(sortedVisits.map((visit) => normalizeRegionDimensionValue(visit.country_code ?? visit.region_code)));
  const deviceData = toBreakdownRows(sortedVisits.map((visit) => visit.device_type?.trim() || "Unknown"));
  const osData = toBreakdownRows(sortedVisits.map((visit) => visit.device_os?.trim() || "Unknown"));
  const languageData = toBreakdownRows(sortedVisits.map((visit) => visit.language?.trim() || visit.locale?.trim() || "Unknown"));
  const uniqueVisitors = buildUniqueVisitorCount(sortedVisits);
  const conversionRate = formatPercent(uniqueVisitors, totalScans);
  const lastScan = sortedVisits[0]?.created_at ?? item.updatedAt;

  return {
    id: item.id,
    totalScans,
    todayScans,
    uniqueVisitors,
    uniqueVisitorRatio: totalScans > 0 ? uniqueVisitors / totalScans : 0,
    conversionRate,
    lastScan,
    topRegion: regionData[0]?.label ?? "",
    topDevice: deviceData[0]?.label ?? "",
    topOs: osData[0]?.label ?? "",
    topLanguage: languageData[0]?.label ?? "",
    trendData: yearlyTrendData.slice(-DEFAULT_ANALYTICS_RANGE).map((point) => ({ day: point.date, scans: point.scans })),
    yearlyTrendData,
    regionData: regionData.length ? regionData : emptyBreakdown(),
    deviceData: deviceData.length ? deviceData : emptyBreakdown(),
    osData: osData.length ? osData : emptyBreakdown(),
    languageData: languageData.length ? languageData : emptyBreakdown(),
    visitLogs: [],
  };
}

async function getRawVisitsForEntryIds(entryIds: string[], options?: { days?: number }) {
  if (!entryIds.length) {
    return [] as EntryVisitRow[];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("entry_visits")
    .select("entry_id, locale, country_code, region_code, device_type, device_os, language, referrer, user_agent, resolved_url, created_at")
    .in("entry_id", entryIds)
    .gte("created_at", getAnalyticsSinceIso(options?.days ?? MAX_ANALYTICS_RANGE));

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EntryVisitRow[];
}

async function buildAnalyticsDetailsFromRawVisits(items: QRCodeItem[]) {
  const visits = await getRawVisitsForEntryIds(
    items.map((item) => item.id),
    { days: MAX_ANALYTICS_RANGE },
  );
  const visitsByEntryId = visits.reduce<Record<string, EntryVisitRow[]>>((map, visit) => {
    const entryId = String(visit.entry_id);
    const current = map[entryId] ?? [];
    current.push(visit);
    map[entryId] = current;
    return map;
  }, {});

  return Object.fromEntries(items.map((item) => [item.id, buildAnalyticsDetailFromVisits(item, visitsByEntryId[item.id] ?? [])])) as Record<string, EntryAnalyticsDetail>;
}

async function buildAnalyticsDetailFromRawVisits(item: QRCodeItem) {
  const visits = await getRawVisitsForEntryIds([item.id], { days: MAX_ANALYTICS_RANGE });
  return buildAnalyticsDetailFromVisits(item, visits);
}

async function getVisitsForEntryIds(entryId: string, options?: { days?: number; page?: number; pageSize?: number }) {
  const supabase = await createServerSupabaseClient();
  const sinceIso = getAnalyticsSinceIso(options?.days ?? MAX_ANALYTICS_RANGE);
  const startIndex = options?.page && options?.pageSize ? (options.page - 1) * options.pageSize : undefined;
  const endIndex = startIndex !== undefined && options?.pageSize ? startIndex + options.pageSize - 1 : undefined;
  let query = supabase
    .from("entry_visits")
    .select("entry_id, locale, country_code, region_code, device_type, device_os, language, referrer, user_agent, resolved_url, created_at")
    .eq("entry_id", entryId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  if (startIndex !== undefined && endIndex !== undefined) {
    query = query.range(startIndex, endIndex);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EntryVisitRow[];
}

async function getVisitLogSummaryForEntry(entryId: string, options?: { days?: number }) {
  const supabase = await createServerSupabaseClient();
  const sinceDate = getAnalyticsSinceDate(options?.days ?? MAX_ANALYTICS_RANGE);
  const { data, error } = await supabase
    .from("entry_visit_daily_totals")
    .select("visit_count, last_visit_at")
    .eq("entry_id", entryId)
    .gte("visit_date", sinceDate);

  if (error) {
    if (isMissingAnalyticsAggregateError(error.message)) {
      return null;
    }

    throw new Error(error.message);
  }

  const rows = (data ?? []) as Pick<EntryVisitDailyTotalRow, "visit_count" | "last_visit_at">[];

  return {
    totalLogs: rows.reduce((sum, row) => sum + Number(row.visit_count ?? 0), 0),
    lastScan:
      rows.reduce<string | null>((latest, row) => {
        if (!row.last_visit_at) {
          return latest;
        }

        if (!latest || row.last_visit_at > latest) {
          return row.last_visit_at;
        }

        return latest;
      }, null) ?? null,
  };
}

async function loadEntryAnalyticsDetailsForUser() {
  const items = await getEntriesServer({ includeArchived: true, summaryOnly: true });

  if (!hasSupabaseEnv()) {
    return Object.fromEntries(
      items.map((item) => [item.id, entryAnalyticsById[item.id] ?? buildAnalyticsDetailFromAggregates(item, { dailyTotals: [], dimensionRows: {}, uniqueVisitors: 0 })]),
    ) as Record<string, EntryAnalyticsDetail>;
  }

  const entryIds = items.map((item) => item.id);
  if (!entryIds.length) {
    return {} as Record<string, EntryAnalyticsDetail>;
  }

  const aggregates = await getVisitAggregateBundle(entryIds, { days: MAX_ANALYTICS_RANGE });
  if (!aggregates) {
    return buildAnalyticsDetailsFromRawVisits(items);
  }

  return Object.fromEntries(
    items.map((item) => [
      item.id,
      buildAnalyticsDetailFromAggregates(item, {
        dailyTotals: aggregates.dailyTotalsByEntryId[item.id] ?? [],
        dimensionRows: aggregates.dimensionRowsByEntryId[item.id] ?? {},
        uniqueVisitors: aggregates.uniqueVisitorsByEntryId[item.id] ?? 0,
      }),
    ]),
  ) as Record<string, EntryAnalyticsDetail>;
}

async function loadEntryAnalyticsDetailForUser(id: string) {
  const item = await getEntryByIdServer(id);

  if (!item) {
    return null;
  }

  if (!hasSupabaseEnv()) {
    return entryAnalyticsById[id] ?? createEmptyEntryAnalyticsDetail(item);
  }

  const aggregates = await getVisitAggregateBundle([id], { days: MAX_ANALYTICS_RANGE });
  if (!aggregates) {
    return buildAnalyticsDetailFromRawVisits(item);
  }

  return buildAnalyticsDetailFromAggregates(item, {
    dailyTotals: aggregates.dailyTotalsByEntryId[id] ?? [],
    dimensionRows: aggregates.dimensionRowsByEntryId[id] ?? {},
    uniqueVisitors: aggregates.uniqueVisitorsByEntryId[id] ?? 0,
  });
}

const getEntryAnalyticsDetailsServerCached = cache(async () => loadEntryAnalyticsDetailsForUser());

const getEntryAnalyticsDetailServerCached = cache(async (id: string) => loadEntryAnalyticsDetailForUser(id));

const getEntryVisitLogPageServerCached = cache(async (id: string, normalizedRange: number, currentPage: number, pageSize: number) => {
  const item = await getEntryByIdServer(id);

  if (!item) {
    return null;
  }

  if (!hasSupabaseEnv()) {
    const analyticsDetail = entryAnalyticsById[id] ?? createEmptyEntryAnalyticsDetail(item);
    const rangeStart = new Date();
    rangeStart.setUTCHours(0, 0, 0, 0);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - normalizedRange + 1);

    const allLogs = analyticsDetail.visitLogs
      .filter((row) => new Date(row.visitedAt) >= rangeStart)
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
    const totalLogs = allLogs.length;
    const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize));
    const safePage = Math.min(totalPages, Math.max(1, currentPage));
    const startIndex = (safePage - 1) * pageSize;
    const logs = allLogs.slice(startIndex, startIndex + pageSize);
    const visibleStart = totalLogs === 0 ? 0 : startIndex + 1;
    const visibleEnd = totalLogs === 0 ? 0 : Math.min(startIndex + pageSize, totalLogs);

    return {
      normalizedRange,
      totalLogs,
      totalPages,
      currentPage: safePage,
      visibleStart,
      visibleEnd,
      lastScan: analyticsDetail.lastScan,
      logs,
    } satisfies EntryVisitLogPageData;
  }

  const [logSummary, pagedRows] = await Promise.all([
    getVisitLogSummaryForEntry(id, { days: normalizedRange }),
    getVisitsForEntryIds(id, { days: normalizedRange, page: currentPage, pageSize }),
  ]);

  if (!logSummary) {
    const supabase = await createServerSupabaseClient();
    const sinceIso = getAnalyticsSinceIso(normalizedRange);

    const [{ count, error: countError }, { data: latestVisitRows, error: latestVisitError }] = await Promise.all([
      supabase
        .from("entry_visits")
        .select("id", { count: "exact", head: true })
        .eq("entry_id", id)
        .gte("created_at", sinceIso),
      supabase
        .from("entry_visits")
        .select("created_at")
        .eq("entry_id", id)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    if (countError) {
      throw new Error(countError.message);
    }

    if (latestVisitError) {
      throw new Error(latestVisitError.message);
    }

    const totalLogs = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize));
    const safePage = Math.min(totalPages, Math.max(1, currentPage));
    const startIndex = (safePage - 1) * pageSize;
    const visibleStart = totalLogs === 0 ? 0 : startIndex + 1;
    const visibleEnd = totalLogs === 0 ? 0 : Math.min(startIndex + pageSize, totalLogs);
    const fallbackPagedRows =
      safePage === currentPage ? pagedRows : await getVisitsForEntryIds(id, { days: normalizedRange, page: safePage, pageSize });

    return {
      normalizedRange,
      totalLogs,
      totalPages,
      currentPage: safePage,
      visibleStart,
      visibleEnd,
      lastScan: latestVisitRows?.[0]?.created_at ?? item.updatedAt,
      logs: buildVisitLogs(fallbackPagedRows),
    } satisfies EntryVisitLogPageData;
  }

  const totalLogs = logSummary.totalLogs;
  const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize));
  const safePage = Math.min(totalPages, Math.max(1, currentPage));
  const startIndex = (safePage - 1) * pageSize;
  const visibleStart = totalLogs === 0 ? 0 : startIndex + 1;
  const visibleEnd = totalLogs === 0 ? 0 : Math.min(startIndex + pageSize, totalLogs);
  const visibleRows = safePage === currentPage ? pagedRows : await getVisitsForEntryIds(id, { days: normalizedRange, page: safePage, pageSize });

  return {
    normalizedRange,
    totalLogs,
    totalPages,
    currentPage: safePage,
    visibleStart,
    visibleEnd,
    lastScan: logSummary.lastScan ?? item.updatedAt,
    logs: buildVisitLogs(visibleRows),
  } satisfies EntryVisitLogPageData;
});

export async function getEntryAnalyticsDetailsServer() {
  return getEntryAnalyticsDetailsServerCached();
}

export async function getEntryAnalyticsDetailServer(id: string) {
  return getEntryAnalyticsDetailServerCached(id);
}

export async function getEntryVisitLogPageServer(id: string, options?: { range?: string | number | null; page?: string | number | null; pageSize?: number }) {
  const normalizedRange = normalizeAnalyticsRange(options?.range);
  const requestedPage = Number.parseInt(String(options?.page ?? "1"), 10);
  const currentPage = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const pageSize = options?.pageSize ?? 20;

  return getEntryVisitLogPageServerCached(id, normalizedRange, currentPage, pageSize);
}
