export type ManagedAssetVisibility = "public" | "private";
export type ManagedAssetProvider = "cos" | "inline";
export type ManagedAssetScope = "vcardAvatar" | "vcardImage" | "qrLogo" | "media";

export interface ManagedAssetRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  visibility: ManagedAssetVisibility;
  provider: ManagedAssetProvider;
  url?: string;
  objectPath?: string;
}

export interface AssetUploadTicket {
  assetId: string;
  bucket: string;
  region: string;
  objectPath: string;
  visibility: ManagedAssetVisibility;
  publicUrl: string | null;
  credentials: {
    tempSecretId: string;
    tempSecretKey: string;
    sessionToken: string;
    startTime: number;
    expiredTime: number;
  };
}

export const MANAGED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
export const MANAGED_PDF_MIME_TYPES = new Set(["application/pdf"]);
export const MANAGED_MEDIA_ALLOWED_MIME_TYPES = new Set([...MANAGED_IMAGE_MIME_TYPES, ...MANAGED_PDF_MIME_TYPES]);

export const MANAGED_ASSET_SCOPE_CONFIG = {
  vcardAvatar: {
    prefix: "public/vcard/avatar",
    visibility: "public" as const,
    maxSizeBytes: 1024 * 1024,
    allowedMimeTypes: MANAGED_IMAGE_MIME_TYPES,
  },
  vcardImage: {
    prefix: "public/vcard/image",
    visibility: "public" as const,
    maxSizeBytes: 1024 * 1024,
    allowedMimeTypes: MANAGED_IMAGE_MIME_TYPES,
  },
  qrLogo: {
    prefix: "public/qr-logo",
    visibility: "public" as const,
    maxSizeBytes: 1024 * 1024,
    allowedMimeTypes: MANAGED_IMAGE_MIME_TYPES,
  },
  media: {
    prefix: "public/media",
    visibility: "public" as const,
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: MANAGED_MEDIA_ALLOWED_MIME_TYPES,
  },
} as const;

export function getManagedAssetScopeConfig(scope: ManagedAssetScope) {
  return MANAGED_ASSET_SCOPE_CONFIG[scope];
}

export function sanitizeAssetFileName(fileName: string) {
  const trimmed = fileName.trim();
  const normalized = trimmed.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
  const safe = normalized
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return safe || "asset";
}

export function buildManagedAssetObjectPrefix(scope: ManagedAssetScope, userId: string) {
  return `${getManagedAssetScopeConfig(scope).prefix}/${userId}/`;
}

export function buildManagedAssetObjectPath(scope: ManagedAssetScope, userId: string, assetId: string, fileName: string) {
  return `${buildManagedAssetObjectPrefix(scope, userId)}${assetId}-${sanitizeAssetFileName(fileName)}`;
}

export function encodeObjectPathForUrl(objectPath: string) {
  return objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function isManagedAssetImageMimeType(mimeType?: string | null) {
  return Boolean(mimeType && MANAGED_IMAGE_MIME_TYPES.has(mimeType));
}

export function isManagedAssetPdfMimeType(mimeType?: string | null) {
  return Boolean(mimeType && MANAGED_PDF_MIME_TYPES.has(mimeType));
}
