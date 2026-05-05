import type { QRCodeItem } from "@/types/qr";

export interface BreakdownRow {
  label: string;
  scans: number;
  share: string;
}

export interface TrendPoint {
  date: string;
  scans: number;
}

export interface VisitLogRow {
  id: string;
  visitedAt: string;
  region: string;
  deviceType: string;
  os: string;
  language: string;
  source: string;
  targetUrl: string;
}

export interface EntryAnalyticsDetail {
  id: string;
  totalScans: number;
  todayScans: number;
  uniqueVisitors: number;
  uniqueVisitorRatio: number;
  conversionRate: string;
  lastScan: string;
  topRegion: string;
  topDevice: string;
  topOs: string;
  topLanguage: string;
  trendData: Array<{ day: string; scans: number }>;
  yearlyTrendData: TrendPoint[];
  regionData: BreakdownRow[];
  deviceData: BreakdownRow[];
  osData: BreakdownRow[];
  languageData: BreakdownRow[];
  visitLogs: VisitLogRow[];
}

interface EntryAnalyticsSeed {
  id: string;
  uniqueVisitors: number;
  conversionRate: string;
  lastScan: string;
  trendData: Array<{ day: string; scans: number }>;
  regionData: BreakdownRow[];
  deviceData: BreakdownRow[];
  osData: BreakdownRow[];
  languageData: BreakdownRow[];
  visitLogs: VisitLogRow[];
  base: number;
  weeklyLift: number;
  seasonalLift: number;
}

export interface RuleTrigger {
  label: string;
  url: string;
  scans: number;
  share: string;
}

export interface EntryAnalyticsWindow {
  totalScans: number;
  todayScans: number;
  uniqueVisitors: number;
  conversionRate: string;
  lastScan: string;
  topRegion: string;
  topDevice: string;
  topOs: string;
  topLanguage: string;
  trendPoints: TrendPoint[];
  regionData: BreakdownRow[];
  deviceData: BreakdownRow[];
  osData: BreakdownRow[];
  languageData: BreakdownRow[];
  ruleTriggers: RuleTrigger[];
  visitLogs: VisitLogRow[];
}

function buildWindowFromTrendPoints(detail: EntryAnalyticsDetail, trendPoints: TrendPoint[]): EntryAnalyticsWindow {
  const totalScans = trendPoints.reduce((sum, point) => sum + point.scans, 0);
  const todayScans = trendPoints[trendPoints.length - 1]?.scans ?? 0;
  const uniqueVisitors = Math.round(totalScans * detail.uniqueVisitorRatio);
  const regionData = buildScaledRows(detail.regionData, totalScans);
  const deviceData = buildScaledRows(detail.deviceData, totalScans);
  const osData = buildScaledRows(detail.osData, totalScans);
  const languageData = buildScaledRows(detail.languageData, totalScans);

  return {
    totalScans,
    todayScans,
    uniqueVisitors,
    conversionRate: detail.conversionRate,
    lastScan: detail.lastScan,
    topRegion: regionData[0]?.label ?? detail.topRegion,
    topDevice: deviceData[0]?.label ?? detail.topDevice,
    topOs: osData[0]?.label ?? detail.topOs,
    topLanguage: languageData[0]?.label ?? detail.topLanguage,
    trendPoints,
    regionData,
    deviceData,
    osData,
    languageData,
    ruleTriggers: [],
    visitLogs: detail.visitLogs
      .filter((row) => trendPoints.some((point) => point.date === row.visitedAt.slice(0, 10)))
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt)),
  };
}

const ANALYTICS_END_DATE = new Date("2026-03-17T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const seeds: EntryAnalyticsSeed[] = [
  {
    id: "qr_expo_2026",
    uniqueVisitors: 2146,
    conversionRate: "18.4%",
    lastScan: "2026-03-17T13:42:00.000Z",
    trendData: [
      { day: "Mar 11", scans: 254 },
      { day: "Mar 12", scans: 311 },
      { day: "Mar 13", scans: 367 },
      { day: "Mar 14", scans: 402 },
      { day: "Mar 15", scans: 495 },
      { day: "Mar 16", scans: 521 },
      { day: "Mar 17", scans: 491 },
    ],
    regionData: [
      { label: "Hong Kong", scans: 1098, share: "38.6%" },
      { label: "United States", scans: 744, share: "26.2%" },
      { label: "Japan", scans: 412, share: "14.5%" },
      { label: "Taiwan", scans: 306, share: "10.8%" },
    ],
    deviceData: [
      { label: "Mobile", scans: 1974, share: "69.5%" },
      { label: "Desktop", scans: 624, share: "22.0%" },
      { label: "Tablet", scans: 243, share: "8.5%" },
    ],
    osData: [
      { label: "iOS", scans: 1032, share: "36.3%" },
      { label: "Android", scans: 942, share: "33.2%" },
      { label: "Windows", scans: 501, share: "17.6%" },
      { label: "macOS", scans: 266, share: "9.4%" },
      { label: "iPadOS", scans: 100, share: "3.5%" },
    ],
    languageData: [
      { label: "English", scans: 1482, share: "52.2%" },
      { label: "繁體中文", scans: 964, share: "33.9%" },
      { label: "日本語", scans: 395, share: "13.9%" },
    ],
    visitLogs: [
      { id: "expo-1", visitedAt: "2026-03-17T13:42:00.000Z", region: "Hong Kong", deviceType: "Mobile", os: "iOS", language: "繁體中文", source: "QR Scan", targetUrl: "https://naviora.com/hk/expo" },
      { id: "expo-2", visitedAt: "2026-03-17T12:58:00.000Z", region: "United States", deviceType: "Desktop", os: "Windows", language: "English", source: "Campaign Link", targetUrl: "https://naviora.com/en/expo" },
      { id: "expo-3", visitedAt: "2026-03-17T11:16:00.000Z", region: "Japan", deviceType: "Mobile", os: "Android", language: "日本語", source: "QR Scan", targetUrl: "https://naviora.com/jp/expo" },
      { id: "expo-4", visitedAt: "2026-03-16T18:21:00.000Z", region: "Taiwan", deviceType: "Tablet", os: "iPadOS", language: "繁體中文", source: "Poster QR", targetUrl: "https://naviora.com/hk/expo" },
      { id: "expo-5", visitedAt: "2026-03-16T14:05:00.000Z", region: "Hong Kong", deviceType: "Mobile", os: "iOS", language: "English", source: "Ad Click", targetUrl: "https://naviora.com/en/expo" },
      { id: "expo-6", visitedAt: "2026-03-15T20:37:00.000Z", region: "Japan", deviceType: "Desktop", os: "macOS", language: "日本語", source: "Event Page", targetUrl: "https://naviora.com/jp/expo" },
      { id: "expo-7", visitedAt: "2026-03-15T10:14:00.000Z", region: "United States", deviceType: "Mobile", os: "Android", language: "English", source: "Newsletter", targetUrl: "https://naviora.com/en/expo" },
      { id: "expo-8", visitedAt: "2026-03-14T09:47:00.000Z", region: "Hong Kong", deviceType: "Mobile", os: "iOS", language: "繁體中文", source: "Booth QR", targetUrl: "https://naviora.com/hk/expo" },
    ],
    base: 19,
    weeklyLift: 9,
    seasonalLift: 6,
  },
  {
    id: "qr_packaging_global",
    uniqueVisitors: 1041,
    conversionRate: "11.7%",
    lastScan: "2026-03-17T12:08:00.000Z",
    trendData: [
      { day: "Mar 11", scans: 121 },
      { day: "Mar 12", scans: 136 },
      { day: "Mar 13", scans: 168 },
      { day: "Mar 14", scans: 205 },
      { day: "Mar 15", scans: 217 },
      { day: "Mar 16", scans: 241 },
      { day: "Mar 17", scans: 248 },
    ],
    regionData: [
      { label: "Japan", scans: 632, share: "47.3%" },
      { label: "Hong Kong", scans: 401, share: "30.0%" },
      { label: "Singapore", scans: 188, share: "14.1%" },
      { label: "United States", scans: 115, share: "8.6%" },
    ],
    deviceData: [
      { label: "Mobile", scans: 864, share: "64.7%" },
      { label: "Desktop", scans: 349, share: "26.1%" },
      { label: "Tablet", scans: 123, share: "9.2%" },
    ],
    osData: [
      { label: "iOS", scans: 454, share: "34.0%" },
      { label: "Android", scans: 410, share: "30.7%" },
      { label: "Windows", scans: 216, share: "16.2%" },
      { label: "macOS", scans: 133, share: "10.0%" },
      { label: "iPadOS", scans: 123, share: "9.2%" },
    ],
    languageData: [
      { label: "日本語", scans: 614, share: "46.0%" },
      { label: "English", scans: 392, share: "29.3%" },
      { label: "繁體中文", scans: 330, share: "24.7%" },
    ],
    visitLogs: [
      { id: "pkg-1", visitedAt: "2026-03-17T12:08:00.000Z", region: "Japan", deviceType: "Mobile", os: "iOS", language: "日本語", source: "Packaging QR", targetUrl: "https://naviora.com/jp/package" },
      { id: "pkg-2", visitedAt: "2026-03-17T10:41:00.000Z", region: "Hong Kong", deviceType: "Mobile", os: "Android", language: "繁體中文", source: "Product Box", targetUrl: "https://naviora.com/hk/package" },
      { id: "pkg-3", visitedAt: "2026-03-16T22:15:00.000Z", region: "Singapore", deviceType: "Desktop", os: "Windows", language: "English", source: "Manual Link", targetUrl: "https://naviora.com/en/package" },
      { id: "pkg-4", visitedAt: "2026-03-16T16:52:00.000Z", region: "Japan", deviceType: "Tablet", os: "iPadOS", language: "日本語", source: "Support Page", targetUrl: "https://naviora.com/jp/package" },
      { id: "pkg-5", visitedAt: "2026-03-15T14:20:00.000Z", region: "Hong Kong", deviceType: "Mobile", os: "iOS", language: "繁體中文", source: "QR Scan", targetUrl: "https://naviora.com/hk/package" },
      { id: "pkg-6", visitedAt: "2026-03-14T11:28:00.000Z", region: "United States", deviceType: "Desktop", os: "macOS", language: "English", source: "Distributor Page", targetUrl: "https://naviora.com/en/package" },
      { id: "pkg-7", visitedAt: "2026-03-13T08:16:00.000Z", region: "Japan", deviceType: "Mobile", os: "Android", language: "日本語", source: "Packaging QR", targetUrl: "https://naviora.com/jp/package" },
      { id: "pkg-8", visitedAt: "2026-03-12T19:09:00.000Z", region: "Hong Kong", deviceType: "Mobile", os: "iOS", language: "繁體中文", source: "Retail Display", targetUrl: "https://naviora.com/hk/package" },
    ],
    base: 11,
    weeklyLift: 7,
    seasonalLift: 5,
  },
  {
    id: "qr_menu_spring",
    uniqueVisitors: 92,
    conversionRate: "5.9%",
    lastScan: "2026-03-17T09:16:00.000Z",
    trendData: [
      { day: "Mar 11", scans: 8 },
      { day: "Mar 12", scans: 12 },
      { day: "Mar 13", scans: 16 },
      { day: "Mar 14", scans: 19 },
      { day: "Mar 15", scans: 18 },
      { day: "Mar 16", scans: 22 },
      { day: "Mar 17", scans: 23 },
    ],
    regionData: [
      { label: "Taiwan", scans: 58, share: "49.2%" },
      { label: "Hong Kong", scans: 31, share: "26.3%" },
      { label: "Japan", scans: 18, share: "15.3%" },
      { label: "United States", scans: 11, share: "9.2%" },
    ],
    deviceData: [
      { label: "Mobile", scans: 91, share: "77.1%" },
      { label: "Desktop", scans: 21, share: "17.8%" },
      { label: "Tablet", scans: 6, share: "5.1%" },
    ],
    osData: [
      { label: "iOS", scans: 46, share: "39.0%" },
      { label: "Android", scans: 45, share: "38.1%" },
      { label: "Windows", scans: 12, share: "10.2%" },
      { label: "macOS", scans: 9, share: "7.6%" },
      { label: "iPadOS", scans: 6, share: "5.1%" },
    ],
    languageData: [
      { label: "繁體中文", scans: 74, share: "62.7%" },
      { label: "English", scans: 32, share: "27.1%" },
      { label: "日本語", scans: 12, share: "10.2%" },
    ],
    visitLogs: [
      { id: "menu-1", visitedAt: "2026-03-17T09:16:00.000Z", region: "Taiwan", deviceType: "Mobile", os: "iOS", language: "繁體中文", source: "Store QR", targetUrl: "https://naviora.com/en/menu/ios" },
      { id: "menu-2", visitedAt: "2026-03-16T20:44:00.000Z", region: "Hong Kong", deviceType: "Mobile", os: "Android", language: "繁體中文", source: "Table Card", targetUrl: "https://naviora.com/en/menu/android" },
      { id: "menu-3", visitedAt: "2026-03-16T12:18:00.000Z", region: "Taiwan", deviceType: "Desktop", os: "Windows", language: "English", source: "Social Link", targetUrl: "https://naviora.com/en/menu" },
      { id: "menu-4", visitedAt: "2026-03-15T17:03:00.000Z", region: "Japan", deviceType: "Mobile", os: "iOS", language: "日本語", source: "QR Scan", targetUrl: "https://naviora.com/en/menu/ios" },
      { id: "menu-5", visitedAt: "2026-03-14T14:29:00.000Z", region: "Taiwan", deviceType: "Tablet", os: "iPadOS", language: "繁體中文", source: "Menu Preview", targetUrl: "https://naviora.com/en/menu" },
      { id: "menu-6", visitedAt: "2026-03-13T10:55:00.000Z", region: "United States", deviceType: "Mobile", os: "Android", language: "English", source: "Ad Campaign", targetUrl: "https://naviora.com/en/menu/android" },
    ],
    base: 2,
    weeklyLift: 2,
    seasonalLift: 1,
  },
];

function formatShare(scans: number, totalScans: number) {
  return totalScans ? `${((scans / totalScans) * 100).toFixed(1)}%` : "0.0%";
}

function createDate(offsetDays: number) {
  return new Date(ANALYTICS_END_DATE.getTime() - offsetDays * DAY_MS);
}

function createYearlyTrend(seed: EntryAnalyticsSeed): TrendPoint[] {
  const points: TrendPoint[] = [];
  const last7 = seed.trendData.map((item) => item.scans);

  for (let offset = 364; offset >= 7; offset -= 1) {
    const date = createDate(offset);
    const dayIndex = date.getUTCDay();
    const weekdayPattern = [0, 2, 4, 3, 5, 8, 6][dayIndex];
    const seasonalWave = Math.sin((364 - offset) / 17) * seed.seasonalLift;
    const quarterlyLift = Math.cos((364 - offset) / 53) * (seed.seasonalLift * 0.6);
    const progressiveLift = ((364 - offset) / 364) * seed.weeklyLift;
    const scans = Math.max(1, Math.round(seed.base + weekdayPattern + seasonalWave + quarterlyLift + progressiveLift));

    points.push({
      date: date.toISOString().slice(0, 10),
      scans,
    });
  }

  last7.forEach((scans, index) => {
    const date = createDate(6 - index);
    points.push({
      date: date.toISOString().slice(0, 10),
      scans,
    });
  });

  return points;
}

function buildScaledRows(source: BreakdownRow[], totalScans: number) {
  const sourceTotal = source.reduce((sum, row) => sum + row.scans, 0);

  return source
    .map((row) => {
      const scans = sourceTotal ? Math.round((row.scans / sourceTotal) * totalScans) : 0;
      return {
        label: row.label,
        scans,
        share: "0.0%",
      };
    })
    .sort((a, b) => b.scans - a.scans)
    .map((row, _, rows) => {
      const rowsTotal = rows.reduce((sum, item) => sum + item.scans, 0);
      return {
        ...row,
        share: formatShare(row.scans, rowsTotal),
      };
    });
}

function expandVisitLogs(rows: VisitLogRow[], targetCount = 28) {
  const sortedRows = [...rows].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));

  if (sortedRows.length >= targetCount) {
    return sortedRows;
  }

  const expandedRows = [...sortedRows];
  let index = 0;

  while (expandedRows.length < targetCount) {
    const template = sortedRows[index % sortedRows.length];
    const cycle = Math.floor(index / sortedRows.length) + 1;
    const generatedDate = new Date(template.visitedAt);

    generatedDate.setUTCHours(generatedDate.getUTCHours() - cycle * 5 - (index % sortedRows.length));
    generatedDate.setUTCMinutes(generatedDate.getUTCMinutes() - ((index % 4) + 1) * 11);

    expandedRows.push({
      ...template,
      id: `${template.id}-p${cycle}-${index}`,
      visitedAt: generatedDate.toISOString(),
    });

    index += 1;
  }

  return expandedRows.sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
}

export const entryAnalyticsById: Record<string, EntryAnalyticsDetail> = Object.fromEntries(
  seeds.map((seed) => {
    const yearlyTrendData = createYearlyTrend(seed);
    const totalScans = seed.trendData.reduce((sum, point) => sum + point.scans, 0);
    const todayScans = seed.trendData[seed.trendData.length - 1]?.scans ?? 0;
    const uniqueVisitorRatio = totalScans ? seed.uniqueVisitors / totalScans : 0;

    return [
      seed.id,
      {
        id: seed.id,
        totalScans,
        todayScans,
        uniqueVisitors: seed.uniqueVisitors,
        uniqueVisitorRatio,
        conversionRate: seed.conversionRate,
        lastScan: seed.lastScan,
        topRegion: seed.regionData[0]?.label ?? "",
        topDevice: seed.deviceData[0]?.label ?? "",
        topOs: seed.osData[0]?.label ?? "",
        topLanguage: seed.languageData[0]?.label ?? "",
        trendData: seed.trendData,
        yearlyTrendData,
        regionData: seed.regionData,
        deviceData: seed.deviceData,
        osData: seed.osData,
        languageData: seed.languageData,
        visitLogs: expandVisitLogs(seed.visitLogs),
      } satisfies EntryAnalyticsDetail,
    ];
  }),
) as Record<string, EntryAnalyticsDetail>;

export function getEntryAnalyticsWindow(detail: EntryAnalyticsDetail, days: number): EntryAnalyticsWindow {
  const safeDays = Math.min(365, Math.max(7, days));
  const trendPoints = detail.yearlyTrendData.slice(-safeDays);
  return buildWindowFromTrendPoints(detail, trendPoints);
}

export function getEntryAnalyticsDateRange(detail: EntryAnalyticsDetail, from?: string, to?: string): EntryAnalyticsWindow {
  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null;

  const trendPoints = detail.yearlyTrendData.filter((point) => {
    const pointDate = new Date(`${point.date}T12:00:00.000Z`);
    if (fromDate && pointDate < fromDate) return false;
    if (toDate && pointDate > toDate) return false;
    return true;
  });

  return buildWindowFromTrendPoints(detail, trendPoints.length > 0 ? trendPoints : detail.yearlyTrendData.slice(-7));
}

export function createEmptyEntryAnalyticsDetail(item: QRCodeItem): EntryAnalyticsDetail {
  const yearlyTrendData = Array.from({ length: 365 }, (_, index) => {
    const date = createDate(364 - index);
    return {
      date: date.toISOString().slice(0, 10),
      scans: 0,
    };
  });

  return {
    id: item.id,
    totalScans: item.scans,
    todayScans: 0,
    uniqueVisitors: 0,
    uniqueVisitorRatio: 0,
    conversionRate: "0.0%",
    lastScan: item.updatedAt,
    topRegion: "",
    topDevice: "",
    topOs: "",
    topLanguage: "",
    trendData: yearlyTrendData.slice(-7).map((point) => ({
      day: point.date,
      scans: point.scans,
    })),
    yearlyTrendData,
    regionData: [],
    deviceData: [],
    osData: [],
    languageData: [],
    visitLogs: [],
  };
}
