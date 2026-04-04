import type { Locale } from "@/i18n/config";
import type { VCardProfile, VCardSocialPlatform } from "@/types/qr";

export const VCARD_PAGE_BASE_URL = "https://page.naviora.link";
export const VCARD_MAX_AVATAR_SIZE = 1024 * 1024;
export const VCARD_STORAGE_PREFIX = "naviora:vcard-content:";
export const VCARD_ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export const VCARD_SOCIAL_PLATFORMS: Array<{
  value: VCardSocialPlatform;
  label: Record<Locale, string>;
  placeholder: string;
}> = [
  {
    value: "linkedin",
    label: { en: "LinkedIn", "zh-Hant": "LinkedIn", "zh-Hans": "LinkedIn" },
    placeholder: "https://linkedin.com/in/your-profile",
  },
  {
    value: "instagram",
    label: { en: "Instagram", "zh-Hant": "Instagram", "zh-Hans": "Instagram" },
    placeholder: "https://instagram.com/your-handle",
  },
  {
    value: "facebook",
    label: { en: "Facebook", "zh-Hant": "Facebook", "zh-Hans": "Facebook" },
    placeholder: "https://facebook.com/your-page",
  },
  {
    value: "x",
    label: { en: "X", "zh-Hant": "X", "zh-Hans": "X" },
    placeholder: "https://x.com/your-handle",
  },
  {
    value: "youtube",
    label: { en: "YouTube", "zh-Hant": "YouTube", "zh-Hans": "YouTube" },
    placeholder: "https://youtube.com/@your-channel",
  },
  {
    value: "wechat",
    label: { en: "WeChat", "zh-Hant": "微信", "zh-Hans": "微信" },
    placeholder: "CloudCollect",
  },
  {
    value: "website",
    label: { en: "Website", "zh-Hant": "網站", "zh-Hans": "网站" },
    placeholder: "https://your-site.com",
  },
];

function createStableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function encodeSvg(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createVCardContentId() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  }

  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function buildVCardPagePath(id: string) {
  return `/c/${encodeURIComponent(id)}`;
}

export function buildVCardPageUrl(id: string) {
  return `${VCARD_PAGE_BASE_URL}${buildVCardPagePath(id)}`;
}

export function getVCardStorageKey(id: string) {
  return `${VCARD_STORAGE_PREFIX}${id}`;
}

function getDemoVCardProfile(id: string): VCardProfile | null {
  if (id !== "demo1234") return null;

  return {
    contentId: id,
    fullName: "Jane Foster",
    phone: "+54 11 1234-5678",
    email: "jane@foster.com",
    company: "Big Company",
    title: "UX / UI Designer",
    website: "https://qrfy.com/",
    socialLinks: [
      { platform: "linkedin", url: "https://linkedin.com/in/jane-foster" },
      { platform: "instagram", url: "https://instagram.com/janefoster" },
      { platform: "website", url: "https://qrfy.com/" },
    ],
  };
}

export function buildDefaultAvatarDataUrl(seed: string, name?: string) {
  const palette = [
    ["#0ea5e9", "#2563eb"],
    ["#14b8a6", "#3b82f6"],
    ["#8b5cf6", "#0ea5e9"],
    ["#f97316", "#ec4899"],
    ["#22c55e", "#06b6d4"],
  ] as const;
  const pair = palette[createStableHash(seed) % palette.length];
  const initials = (name?.trim() || "N")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "N";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" role="img" aria-label="${initials}">
  <defs>
    <linearGradient id="avatar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${pair[0]}" />
      <stop offset="100%" stop-color="${pair[1]}" />
    </linearGradient>
  </defs>
  <rect width="320" height="320" rx="80" fill="url(#avatar-gradient)" />
  <circle cx="250" cy="72" r="52" fill="rgba(255,255,255,0.16)" />
  <circle cx="72" cy="252" r="64" fill="rgba(255,255,255,0.12)" />
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="system-ui, sans-serif" font-size="112" font-weight="700">${initials}</text>
</svg>`;

  return encodeSvg(svg);
}

export function getSelectedVCardAvatarAsset(profile?: VCardProfile | null) {
  if (!profile?.imageAssets?.length || !profile.avatarAssetId) return null;

  return profile.imageAssets.find((asset) => asset.id === profile.avatarAssetId) ?? null;
}

export function resolveVCardAvatarSrc(profile: VCardProfile | null | undefined, seed: string, name?: string) {
  return getSelectedVCardAvatarAsset(profile)?.dataUrl || profile?.avatarDataUrl || buildDefaultAvatarDataUrl(seed, name);
}

export function formatAssetSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size >= 10 * 1024 ? 0 : 1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function persistVCardProfile(id: string, profile: VCardProfile) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(getVCardStorageKey(id), JSON.stringify(profile));
}

export function readVCardProfile(id: string): VCardProfile | null {
  if (typeof window === "undefined") return null;

  const demoProfile = getDemoVCardProfile(id);
  const raw = window.localStorage.getItem(getVCardStorageKey(id));
  if (!raw) return demoProfile;

  try {
    const parsed = JSON.parse(raw) as VCardProfile;

    if (!demoProfile) {
      return parsed;
    }

    return {
      ...demoProfile,
      ...parsed,
      socialLinks: parsed.socialLinks?.length ? parsed.socialLinks : demoProfile.socialLinks,
      imageAssets: parsed.imageAssets?.length ? parsed.imageAssets : demoProfile.imageAssets,
      avatarAssetId: parsed.avatarAssetId ?? demoProfile.avatarAssetId,
      avatarDataUrl: parsed.avatarDataUrl ?? demoProfile.avatarDataUrl,
      avatarFileName: parsed.avatarFileName ?? demoProfile.avatarFileName,
    };
  } catch {
    return demoProfile;
  }
}
