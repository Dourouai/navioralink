import type { QRCodeItem } from "@/types/qr";

export const ENTRY_BASE_URL = "https://go.naviora.link";
export const ENTRY_SLUG_LENGTH = 10;

type EntryPathKind = "link" | "content";

// Public entry path convention:
// l = link
// c = content
export function getEntryPathPrefix(type: QRCodeItem["type"]) {
  const kind: EntryPathKind = type === "url" ? "link" : "content";
  return kind === "link" ? "l" : "c";
}

export function buildEntryUrl(type: QRCodeItem["type"], slug: string) {
  return `${ENTRY_BASE_URL}/${getEntryPathPrefix(type)}/${slug}`;
}

function createStableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function getEntrySlug(item: Pick<QRCodeItem, "id">) {
  const hashed = createStableHash(item.id).toString(36);
  return hashed.padStart(ENTRY_SLUG_LENGTH, "0").slice(0, ENTRY_SLUG_LENGTH);
}

export function getEntryUrl(item: Pick<QRCodeItem, "id" | "type">) {
  return buildEntryUrl(item.type, getEntrySlug(item));
}
