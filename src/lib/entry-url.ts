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

export function getEntryUrl(item: Pick<QRCodeItem, "id" | "slug" | "type">) {
  return buildEntryUrl(item.type, getEntrySlug(item));
}
