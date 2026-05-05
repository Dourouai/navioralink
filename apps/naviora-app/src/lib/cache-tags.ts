export const APP_CACHE_REVALIDATE_SECONDS = {
  entries: 120,
  dashboard: 120,
  assets: 120,
  analytics: 60,
} as const;

export function getEntriesListTag(userId: string) {
  return `entries:user:${userId}`;
}

export function getDashboardStatsTag(userId: string) {
  return `dashboard:user:${userId}`;
}

export function getEntryDetailTag(entryId: string) {
  return `entry:${entryId}`;
}

export function getEntryAnalyticsCollectionTag(userId: string) {
  return `entry-analytics:user:${userId}`;
}

export function getEntryAnalyticsTag(entryId: string) {
  return `entry-analytics:${entryId}`;
}

export function getAssetsTag(userId: string) {
  return `assets:user:${userId}`;
}
