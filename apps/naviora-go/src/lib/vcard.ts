import type { Locale } from "@/i18n/config";
import type { VCardProfile, VCardSocialPlatform } from "@/types/qr";

export const VCARD_PAGE_BASE_URL = process.env.NEXT_PUBLIC_GO_URL?.trim() || "https://go.naviora.link";
export const VCARD_MAX_AVATAR_SIZE = 1024 * 1024;
export const VCARD_STORAGE_PREFIX = "naviora:vcard-content:";
export const VCARD_ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const LEGACY_COS_PUBLIC_HOST = "cos.naviora.link";
const COS_PUBLIC_FALLBACK_BASE_URL = "https://naviora-1253356561.cos.ap-singapore.myqcloud.com/";

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
    value: "threads",
    label: { en: "Threads", "zh-Hant": "Threads", "zh-Hans": "Threads" },
    placeholder: "https://www.threads.net/@your-handle",
  },
  {
    value: "youtube",
    label: { en: "YouTube", "zh-Hant": "YouTube", "zh-Hans": "YouTube" },
    placeholder: "https://youtube.com/@your-channel",
  },
  {
    value: "tiktok",
    label: { en: "TikTok", "zh-Hant": "TikTok", "zh-Hans": "TikTok" },
    placeholder: "https://www.tiktok.com/@your-handle",
  },
  {
    value: "github",
    label: { en: "GitHub", "zh-Hant": "GitHub", "zh-Hans": "GitHub" },
    placeholder: "https://github.com/your-handle",
  },
  {
    value: "pinterest",
    label: { en: "Pinterest", "zh-Hant": "Pinterest", "zh-Hans": "Pinterest" },
    placeholder: "https://pinterest.com/your-handle",
  },
  {
    value: "reddit",
    label: { en: "Reddit", "zh-Hant": "Reddit", "zh-Hans": "Reddit" },
    placeholder: "https://reddit.com/u/your-handle",
  },
  {
    value: "wechat",
    label: { en: "WeChat", "zh-Hant": "微信", "zh-Hans": "微信" },
    placeholder: "your-wechat-id",
  },
  {
    value: "wechatofficial",
    label: { en: "WeChat Official Account", "zh-Hant": "微信公眾號", "zh-Hans": "微信公众号" },
    placeholder: "your-official-account-id",
  },
  {
    value: "whatsapp",
    label: { en: "WhatsApp", "zh-Hant": "WhatsApp", "zh-Hans": "WhatsApp" },
    placeholder: "https://wa.me/8613800138000",
  },
  {
    value: "telegram",
    label: { en: "Telegram", "zh-Hant": "Telegram", "zh-Hans": "Telegram" },
    placeholder: "https://t.me/your-handle",
  },
  {
    value: "line",
    label: { en: "LINE", "zh-Hant": "LINE", "zh-Hans": "LINE" },
    placeholder: "https://line.me/ti/p/~your-id",
  },
  {
    value: "messenger",
    label: { en: "Messenger", "zh-Hant": "Messenger", "zh-Hans": "Messenger" },
    placeholder: "https://m.me/your-handle",
  },
  {
    value: "discord",
    label: { en: "Discord", "zh-Hant": "Discord", "zh-Hans": "Discord" },
    placeholder: "https://discord.gg/your-invite",
  },
  {
    value: "skype",
    label: { en: "Skype", "zh-Hant": "Skype", "zh-Hans": "Skype" },
    placeholder: "skype:live:your-id?chat",
  },
  {
    value: "signal",
    label: { en: "Signal", "zh-Hant": "Signal", "zh-Hans": "Signal" },
    placeholder: "https://signal.me/#p/+8613800138000",
  },
  {
    value: "weibo",
    label: { en: "Weibo", "zh-Hant": "微博", "zh-Hans": "微博" },
    placeholder: "https://weibo.com/your-account",
  },
  {
    value: "xiaohongshu",
    label: { en: "Xiaohongshu", "zh-Hant": "小紅書", "zh-Hans": "小红书" },
    placeholder: "https://www.xiaohongshu.com/user/profile/...",
  },
  {
    value: "bilibili",
    label: { en: "Bilibili", "zh-Hant": "Bilibili", "zh-Hans": "Bilibili" },
    placeholder: "https://space.bilibili.com/your-uid",
  },
  {
    value: "douyin",
    label: { en: "Douyin", "zh-Hant": "抖音", "zh-Hans": "抖音" },
    placeholder: "https://www.douyin.com/user/...",
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
  return `/card/${encodeURIComponent(id)}`;
}

export function buildVCardPageUrl(id: string) {
  return `${VCARD_PAGE_BASE_URL}${buildVCardPagePath(id)}`;
}

function hasExplicitScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value) || /^[\w-]+\.[\w.-]+(?:\/.*)?$/i.test(value);
}

function ensureUrlLikeValue(value: string) {
  if (!value) return value;
  if (hasExplicitScheme(value)) return value;
  if (looksLikeUrl(value)) return `https://${value}`;
  return value;
}

function sanitizeHandle(value: string) {
  return value.trim().replace(/^@/, "");
}

function sanitizePhoneDigits(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseUrlLikeValue(value: string) {
  try {
    return new URL(ensureUrlLikeValue(value));
  } catch {
    return null;
  }
}

function getNormalizedHostname(parsed: URL) {
  return parsed.hostname.replace(/^www\./i, "");
}

function getPathSegments(parsed: URL) {
  return parsed.pathname
    .split("/")
    .map((segment) => safeDecodeURIComponent(segment).trim())
    .filter(Boolean);
}

function extractWhatsAppPhoneDisplay(value: string) {
  const normalized = value.trim();
  if (!normalized) return normalized;

  try {
    const parsed = new URL(ensureUrlLikeValue(normalized));
    const hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    let digits = "";

    if (hostname === "wa.me") {
      digits = parsed.pathname.replaceAll("/", "");
    } else if (hostname.includes("whatsapp.com")) {
      digits = parsed.searchParams.get("phone") ?? "";
    }

    const sanitized = digits.replace(/[^\d]/g, "");
    if (sanitized) {
      return `+${sanitized}`;
    }
  } catch {
    return normalized;
  }

  const sanitized = normalized.replace(/[^\d]/g, "");
  return sanitized ? `+${sanitized}` : normalized;
}

function ensureAtHandle(value: string) {
  const handle = sanitizeHandle(value);
  return handle ? `@${handle}` : value.trim();
}

function formatHostPathDisplay(parsed: URL, maxSegments = 2) {
  const hostname = getNormalizedHostname(parsed);
  const pathSegments = getPathSegments(parsed).slice(0, maxSegments);
  return pathSegments.length ? `${hostname}/${pathSegments.join("/")}` : hostname;
}

function getPlatformIdentifierDisplay(platform: VCardSocialPlatform, value: string) {
  const parsed = parseUrlLikeValue(value);
  const normalized = value.trim();

  if (!parsed) {
    if (platform === "bilibili" && /^\d+$/.test(normalized)) {
      return `UID ${normalized}`;
    }

    if (platform === "douyin" && normalized) {
      return normalized.startsWith("@") ? normalized : `ID ${normalized}`;
    }

    return null;
  }

  const hostname = getNormalizedHostname(parsed).toLowerCase();
  const segments = getPathSegments(parsed);
  const first = segments[0];
  const second = segments[1];
  const third = segments[2];

  if (!first) {
    return formatHostPathDisplay(parsed, 1);
  }

  if (platform === "linkedin") {
    if (["in", "company", "school", "showcase", "pub"].includes(first) && second) {
      return `${first}/${second}`;
    }

    return formatHostPathDisplay(parsed, 2);
  }

  if (platform === "instagram" || platform === "x" || platform === "threads" || platform === "tiktok" || platform === "telegram") {
    const candidate =
      first === "@" && second
        ? second
        : first.startsWith("@")
          ? first
          : ["intent", "share", "i"].includes(first) && second
            ? second
            : first;

    return ensureAtHandle(candidate);
  }

  if (platform === "youtube") {
    if (first.startsWith("@")) {
      return first;
    }

    if (["channel", "c", "user", "shorts"].includes(first) && second) {
      return `${first}/${second}`;
    }

    return formatHostPathDisplay(parsed, 2);
  }

  if (platform === "github" || platform === "pinterest" || platform === "messenger" || platform === "weibo") {
    return second && ["user", "users", "u"].includes(first) ? second : first;
  }

  if (platform === "facebook") {
    if (first === "profile.php") {
      return parsed.searchParams.get("id") ? `ID ${parsed.searchParams.get("id")}` : formatHostPathDisplay(parsed, 1);
    }

    if (["groups", "people", "events", "pages"].includes(first) && second) {
      return `${first}/${second}`;
    }

    return first;
  }

  if (platform === "reddit") {
    if (["u", "user", "r"].includes(first) && second) {
      return `${first === "user" ? "u" : first}/${second}`;
    }

    return formatHostPathDisplay(parsed, 2);
  }

  if (platform === "line") {
    const lineId = [...segments].reverse().find((segment) => !["R", "ti", "p"].includes(segment));
    if (!lineId) {
      return formatHostPathDisplay(parsed, 2);
    }

    return lineId.replace(/^~/, "");
  }

  if (platform === "discord") {
    if (hostname === "discord.gg" && first) {
      return `discord.gg/${first}`;
    }

    if (first === "invite" && second) {
      return `discord.gg/${second}`;
    }

    return formatHostPathDisplay(parsed, 2);
  }

  if (platform === "skype") {
    if (parsed.protocol === "skype:") {
      return `${parsed.pathname}${parsed.search}`.replace(/^\//, "").replace(/\?.*$/, "") || normalized;
    }

    return formatHostPathDisplay(parsed, 1);
  }

  if (platform === "xiaohongshu") {
    if (first === "user" && second === "profile" && third) {
      return `ID ${third}`;
    }

    return formatHostPathDisplay(parsed, 2);
  }

  if (platform === "bilibili") {
    if (hostname.includes("bilibili.com") && first) {
      return /^\d+$/.test(first) ? `UID ${first}` : formatHostPathDisplay(parsed, 2);
    }

    return formatHostPathDisplay(parsed, 2);
  }

  if (platform === "douyin") {
    if (first === "user" && second) {
      return `ID ${second}`;
    }

    if (first === "share" && second === "user" && third) {
      return `ID ${third}`;
    }

    return formatHostPathDisplay(parsed, 2);
  }

  if (platform === "website") {
    return formatHostPathDisplay(parsed, 2);
  }

  return formatHostPathDisplay(parsed, 2);
}

export function getVCardSocialLabel(platform: VCardSocialPlatform, locale: Locale) {
  return VCARD_SOCIAL_PLATFORMS.find((item) => item.value === platform)?.label[locale] ?? platform;
}

export function resolveVCardSocialHref(platform: VCardSocialPlatform, value: string) {
  const normalized = value.trim();
  if (!normalized) return null;

  if (platform === "wechat" || platform === "wechatofficial") {
    return null;
  }

  if (platform === "website") {
    return ensureUrlLikeValue(normalized);
  }

  if (hasExplicitScheme(normalized) || looksLikeUrl(normalized)) {
    return ensureUrlLikeValue(normalized);
  }

  const handle = sanitizeHandle(normalized);
  if (!handle) return null;

  if (platform === "linkedin") {
    return `https://linkedin.com/${handle.includes("/") ? handle : `in/${handle}`}`;
  }
  if (platform === "instagram") {
    return `https://instagram.com/${handle}`;
  }
  if (platform === "facebook") {
    return `https://facebook.com/${handle}`;
  }
  if (platform === "x") {
    return `https://x.com/${handle}`;
  }
  if (platform === "threads") {
    return `https://www.threads.net/${handle.startsWith("@") ? handle : `@${handle}`}`;
  }
  if (platform === "youtube") {
    return `https://youtube.com/${handle.startsWith("@") ? handle : `@${handle}`}`;
  }
  if (platform === "tiktok") {
    return `https://www.tiktok.com/${handle.startsWith("@") ? handle : `@${handle}`}`;
  }
  if (platform === "github") {
    return `https://github.com/${handle}`;
  }
  if (platform === "pinterest") {
    return `https://pinterest.com/${handle}`;
  }
  if (platform === "reddit") {
    return `https://reddit.com/${handle.startsWith("u/") ? handle : `u/${handle}`}`;
  }
  if (platform === "whatsapp") {
    const digits = sanitizePhoneDigits(normalized).replace(/^\+/, "");
    return digits ? `https://wa.me/${digits}` : null;
  }
  if (platform === "telegram") {
    return `https://t.me/${handle}`;
  }
  if (platform === "line") {
    return `https://line.me/ti/p/~${handle}`;
  }
  if (platform === "messenger") {
    return `https://m.me/${handle}`;
  }
  if (platform === "discord") {
    return normalized.includes("/") ? ensureUrlLikeValue(normalized) : `https://discord.gg/${handle}`;
  }
  if (platform === "skype") {
    return `skype:${handle}?chat`;
  }
  if (platform === "signal") {
    const signalValue = sanitizePhoneDigits(normalized);
    return signalValue ? `https://signal.me/#p/${signalValue}` : null;
  }
  if (platform === "weibo") {
    return `https://weibo.com/${handle}`;
  }
  if (platform === "bilibili") {
    return /^\d+$/.test(handle) ? `https://space.bilibili.com/${handle}` : null;
  }
  if (platform === "douyin") {
    return `https://www.douyin.com/user/${handle}`;
  }

  return null;
}

export function getVCardSocialDisplayValue(platform: VCardSocialPlatform, value: string) {
  const normalized = value.trim();
  if (!normalized) return normalized;

  if (platform === "wechat" || platform === "wechatofficial") return normalized;
  if (platform === "whatsapp") return extractWhatsAppPhoneDisplay(normalized);
  if (platform === "signal") return extractWhatsAppPhoneDisplay(normalized);

  if (platform === "skype" && /^skype:/i.test(normalized)) {
    return normalized.replace(/^skype:/i, "").replace(/\?.*$/, "");
  }

  const identifierDisplay = getPlatformIdentifierDisplay(platform, normalized);
  if (identifierDisplay) {
    return identifierDisplay;
  }

  if (looksLikeUrl(normalized) || hasExplicitScheme(normalized)) {
    const parsed = parseUrlLikeValue(normalized);
    return parsed ? formatHostPathDisplay(parsed, 2) : normalized.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }

  if (platform === "instagram" || platform === "x" || platform === "threads" || platform === "tiktok") {
    return normalized.startsWith("@") ? normalized : `@${sanitizeHandle(normalized)}`;
  }

  if (platform === "telegram") {
    return normalized.startsWith("@") ? normalized : `@${sanitizeHandle(normalized)}`;
  }

  if (platform === "reddit") {
    return normalized.startsWith("u/") ? normalized : `u/${sanitizeHandle(normalized)}`;
  }

  return normalized;
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

function normalizeManagedAssetUrl(url?: string) {
  if (!url) return url;

  try {
    const parsed = new URL(url);

    if (parsed.hostname === LEGACY_COS_PUBLIC_HOST) {
      return new URL(parsed.pathname.replace(/^\//, ""), COS_PUBLIC_FALLBACK_BASE_URL).toString();
    }
  } catch {
    return url;
  }

  return url;
}

export function resolveVCardAvatarSrc(profile: VCardProfile | null | undefined, seed: string, name?: string) {
  return (
    normalizeManagedAssetUrl(getSelectedVCardAvatarAsset(profile)?.url) ||
    getSelectedVCardAvatarAsset(profile)?.dataUrl ||
    profile?.avatarDataUrl ||
    buildDefaultAvatarDataUrl(seed, name)
  );
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
