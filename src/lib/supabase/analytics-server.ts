import { entryAnalyticsById, getEntryAnalyticsWindow, type BreakdownRow, type EntryAnalyticsDetail, type VisitLogRow } from "@/mock/entry-analytics";
import type { QRCodeItem } from "@/types/qr";

import { hasSupabaseEnv } from "./env";
import { getEntriesServer } from "./entries-server";
import { createServerSupabaseClient } from "./server";

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

function emptyBreakdown(): BreakdownRow[] {
  return [];
}

function buildDateSeries(visits: EntryVisitRow[]) {
  const dayMap = new Map<string, number>();

  for (let offset = 364; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    dayMap.set(date.toISOString().slice(0, 10), 0);
  }

  visits.forEach((visit) => {
    const dateKey = visit.created_at.slice(0, 10);
    dayMap.set(dateKey, (dayMap.get(dateKey) ?? 0) + 1);
  });

  return Array.from(dayMap.entries()).map(([date, scans]) => ({ date, scans }));
}

function formatPercent(value: number, total: number) {
  return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";
}

function countBreakdown(labels: string[]) {
  const counts = labels.reduce<Map<string, number>>((map, label) => {
    map.set(label, (map.get(label) ?? 0) + 1);
    return map;
  }, new Map());

  const total = labels.length;
  return Array.from(counts.entries())
    .map(([label, scans]) => ({
      label,
      scans,
      share: formatPercent(scans, total),
    }))
    .sort((a, b) => b.scans - a.scans);
}

function normalizeRegion(visit: EntryVisitRow) {
  if (visit.region_code?.trim()) {
    return visit.region_code.trim();
  }

  if (visit.country_code?.trim()) {
    return visit.country_code.trim();
  }

  return "Unknown";
}

function normalizeLanguage(visit: EntryVisitRow) {
  if (visit.language?.trim()) {
    return visit.language.trim();
  }

  if (visit.locale?.trim()) {
    return visit.locale.trim();
  }

  return "Unknown";
}

function normalizeDeviceType(visit: EntryVisitRow) {
  return visit.device_type?.trim() || "Unknown";
}

function normalizeOs(visit: EntryVisitRow) {
  return visit.device_os?.trim() || "Unknown";
}

function normalizeSource(visit: EntryVisitRow) {
  return visit.referrer?.trim() || "Direct";
}

function buildVisitLogs(visits: EntryVisitRow[]): VisitLogRow[] {
  return visits
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((visit, index) => ({
      id: `${visit.entry_id}-${index}-${visit.created_at}`,
      visitedAt: visit.created_at,
      region: normalizeRegion(visit),
      deviceType: normalizeDeviceType(visit),
      os: normalizeOs(visit),
      language: normalizeLanguage(visit),
      source: normalizeSource(visit),
      targetUrl: visit.resolved_url?.trim() || "",
    }));
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

function buildAnalyticsDetailFromItem(item: QRCodeItem, visits: EntryVisitRow[]): EntryAnalyticsDetail {
  const yearlyTrendData = buildDateSeries(visits);
  const totalScans = visits.length;
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayScans = visits.filter((visit) => visit.created_at.startsWith(todayKey)).length;
  const regionData = countBreakdown(visits.map(normalizeRegion));
  const deviceData = countBreakdown(visits.map(normalizeDeviceType));
  const osData = countBreakdown(visits.map(normalizeOs));
  const languageData = countBreakdown(visits.map(normalizeLanguage));
  const uniqueVisitors = buildUniqueVisitorCount(visits);
  const conversionRate = formatPercent(uniqueVisitors, totalScans);
  const lastScan = visits[0]?.created_at ?? item.updatedAt;

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
    trendData: getEntryAnalyticsWindow(
      {
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
        trendData: yearlyTrendData.slice(-7).map((point) => ({ day: point.date, scans: point.scans })),
        yearlyTrendData,
        regionData: regionData.length ? regionData : emptyBreakdown(),
        deviceData: deviceData.length ? deviceData : emptyBreakdown(),
        osData: osData.length ? osData : emptyBreakdown(),
        languageData: languageData.length ? languageData : emptyBreakdown(),
        visitLogs: buildVisitLogs(visits),
      },
      7,
    ).trendPoints.map((point) => ({ day: point.date, scans: point.scans })),
    yearlyTrendData,
    regionData,
    deviceData,
    osData,
    languageData,
    visitLogs: buildVisitLogs(visits),
  };
}

export async function getEntryAnalyticsDetailsServer() {
  const items = await getEntriesServer({ includeArchived: true });

  if (!hasSupabaseEnv()) {
    return Object.fromEntries(
      items.map((item) => [item.id, entryAnalyticsById[item.id] ?? buildAnalyticsDetailFromItem(item, [])]),
    ) as Record<string, EntryAnalyticsDetail>;
  }

  const entryIds = items.map((item) => item.id);
  if (!entryIds.length) {
    return {} as Record<string, EntryAnalyticsDetail>;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("entry_visits")
    .select("entry_id, locale, country_code, region_code, device_type, device_os, language, referrer, user_agent, resolved_url, created_at")
    .in("entry_id", entryIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const visitsByEntryId = (data ?? []).reduce<Record<string, EntryVisitRow[]>>((map, visit) => {
    const entryId = String(visit.entry_id);
    map[entryId] = [...(map[entryId] ?? []), visit as EntryVisitRow];
    return map;
  }, {});

  return Object.fromEntries(
    items.map((item) => [item.id, buildAnalyticsDetailFromItem(item, visitsByEntryId[item.id] ?? [])]),
  ) as Record<string, EntryAnalyticsDetail>;
}

export async function getEntryAnalyticsDetailServer(id: string) {
  const allDetails = await getEntryAnalyticsDetailsServer();
  return allDetails[id] ?? null;
}
