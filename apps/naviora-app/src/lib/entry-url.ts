import type { QRCodeItem } from "@/types/qr";

export type PreviewSurface = "go";

const GO_BASE_URL = process.env.NEXT_PUBLIC_GO_URL?.trim() || "https://go.naviora.link";
const ENTRY_PATH_PREFIX_PATTERN = /^[a-z][a-z0-9]{0,7}$/;
const ENTRY_PATH_PREFIX_ALIASES = new Map<string, string>([["s", "l"]]);

export const ENTRY_BASE_URL = GO_BASE_URL;
export const ENTRY_SLUG_LENGTH = 10;
export const PREVIEW_PATH_PREFIX = "/preview";

type EntryPathPrefix = string;

function resolveDefaultEntryPathPrefix(): EntryPathPrefix {
  return normalizeEntryPathPrefix(process.env.NEXT_PUBLIC_DEFAULT_ENTRY_PATH_PREFIX) ?? "l";
}

export function normalizeEntryPathPrefix(pathPrefix?: string | null) {
  const normalized = pathPrefix?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const aliased = ENTRY_PATH_PREFIX_ALIASES.get(normalized) ?? normalized;
  return ENTRY_PATH_PREFIX_PATTERN.test(aliased) ? aliased : null;
}

// Official public entry URLs default to /l/:slug.
// /s/:slug remains a compatibility alias for /l/:slug, while other stored prefixes can be enabled without changing the link model.
export function getEntryPathPrefix(targetType?: QRCodeItem["targetType"], explicitPathPrefix?: string | null): EntryPathPrefix {
  void targetType;
  return normalizeEntryPathPrefix(explicitPathPrefix) ?? resolveDefaultEntryPathPrefix();
}

export function buildEntryUrl(targetType: QRCodeItem["targetType"] | undefined, slug: string, pathPrefix?: string | null) {
  return `${ENTRY_BASE_URL}/${getEntryPathPrefix(targetType, pathPrefix)}/${slug}`;
}

export function getPreviewSurface(): PreviewSurface {
  return "go";
}

export function getPreviewBaseUrl() {
  return GO_BASE_URL;
}

export function buildPreviewPath(token: string) {
  return `${PREVIEW_PATH_PREFIX}/${encodeURIComponent(token)}`;
}

export function buildPreviewUrl(token: string) {
  return `${getPreviewBaseUrl()}${buildPreviewPath(token)}`;
}

export function createEntrySlug() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(ENTRY_SLUG_LENGTH);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  }

  return Array.from({ length: ENTRY_SLUG_LENGTH }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function createStableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function getEntrySlug(item: Pick<QRCodeItem, "id" | "slug">) {
  if (item.slug?.trim()) {
    return item.slug.trim();
  }

  const hashed = createStableHash(item.id).toString(36);
  return hashed.padStart(ENTRY_SLUG_LENGTH, "0").slice(0, ENTRY_SLUG_LENGTH);
}

export function getEntryUrl(item: Pick<QRCodeItem, "id" | "slug" | "pathPrefix" | "type" | "targetType" | "vcard">) {
  return buildEntryUrl(item.targetType, getEntrySlug(item), item.pathPrefix);
}
