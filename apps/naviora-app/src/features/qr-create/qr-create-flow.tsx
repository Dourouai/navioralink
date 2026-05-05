"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Check,
  ChevronDown,
  CircleOff,
  Copy,
  LockKeyhole,
  Palette,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  ShieldHalf,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { deleteManagedAsset } from "@/lib/assets-client";
import { DEVICE_SYSTEMS } from "@/lib/device-systems";
import { getEntryUrl } from "@/lib/entry-url";
import { isManagedAssetImageMimeType, type ManagedAssetRecord } from "@/lib/managed-assets";
import {
  getCallingCountryOptions,
  getCountryDialCode,
  getRegionCountryOptions,
  inferCountryCodeFromDialCode,
} from "@/lib/phone-countries";
import { buildQrDataUri, buildQrSvgFromContent } from "@/lib/qr-download";
import { chatWithQwen } from "@/lib/services";
import { getEntryForEditing, refreshEntryPreviewLink, saveEntryFromDraft } from "@/lib/supabase/entries-browser";
import { buildDraftFromItem } from "@/lib/supabase/entries-shared";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getLanguageDisplayDescription, getLanguageDisplayLabel, LANGUAGES } from "@/lib/languages";
import { useQrCreateStore } from "@/store/qr-create-store";
import {
  createVCardContentId,
  formatAssetSize,
  persistVCardProfile,
  resolveVCardAvatarSrc,
  VCARD_SOCIAL_PLATFORMS,
} from "@/lib/vcard";
import type { OpenAppPreset, OpenAppTarget, QRRuleMode, QRStatus, QRTargetType, VCardImageAsset, VCardProfile, VCardSocialLink, VCardSocialPlatform } from "@/types/qr";

const SearchableSelect = dynamic(
  () => import("@/components/ui/searchable-select").then((mod) => mod.SearchableSelect),
  {
    ssr: false,
    loading: () => <div className="h-[52px] w-full rounded-[16px] border border-slate-200 bg-white/88" />,
  },
);

const MediaLibraryModal = dynamic(
  () => import("@/features/assets/media-library-modal").then((mod) => mod.MediaLibraryModal),
  {
    ssr: false,
  },
);

interface QrCreateFlowProps {
  locale: Locale;
  editEntryId?: string;
}

function hasExternalTrackingConfig(tracking?: { ga4Id?: string; metaPixelId?: string; enabled?: boolean }) {
  return Boolean(tracking?.ga4Id?.trim() || tracking?.metaPixelId?.trim());
}

const qrStyles = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Rounded" },
  { id: "classy", label: "Classy" },
  { id: "classy-rounded", label: "Classy Rounded" },
  { id: "extra-rounded", label: "Extra Rounded" },
  { id: "diamond", label: "Diamond" },
  { id: "star", label: "Star" },
  { id: "heart", label: "Heart" },
] as const;

type QrStyleId = (typeof qrStyles)[number]["id"];
type CornerBorderStyleId = (typeof borderCornerStyles)[number]["id"];
type CornerCenterStyleId = (typeof centerCornerStyles)[number]["id"];
type CorrectionLevelId = (typeof correctionLevels)[number]["id"];

const CREATE_FLOW_PRIMARY_BUTTON_CLASS = "h-12 w-full rounded-[18px] px-6 text-base sm:min-w-[148px] sm:w-auto sm:px-7";
const CREATE_FLOW_SECONDARY_BUTTON_CLASS = "h-12 w-full rounded-[18px] px-5 text-base sm:min-w-[132px] sm:w-auto sm:px-6";

const borderCornerStyles = [
  { id: "square", label: "Square", symbol: "□" },
  { id: "rounded", label: "Rounded", symbol: "◯" },
  { id: "thick", label: "Thick", symbol: "▣" },
  { id: "dot", label: "Dot", symbol: "◉" },
];

const centerCornerStyles = [
  { id: "square", label: "Square", symbol: "■" },
  { id: "dot", label: "Dot", symbol: "●" },
  { id: "diamond", label: "Diamond", symbol: "◆" },
  { id: "star", label: "Star", symbol: "★" },
];

const correctionLevels = [
  { id: "Q", label: "Level Q", note: "25%", icon: ShieldHalf, tone: "bg-sky-50 text-sky-600 ring-sky-100" },
  { id: "H", label: "Level H", note: "30%", icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-600 ring-emerald-100" },
  { id: "M", label: "Level M", note: "15%", icon: ShieldEllipsis, tone: "bg-amber-50 text-amber-600 ring-amber-100" },
  { id: "L", label: "Level L", note: "7%", icon: ShieldAlert, tone: "bg-rose-50 text-rose-600 ring-rose-100" },
] as const;
const QR_CREATE_DRAFT_STORAGE_KEY = "naviora:qr-create-draft:v1";

const logoOptions = [
  { id: "none", label: "None" },
  {
    id: "whatsapp",
    label: "WhatsApp",
    url: "/assets/qr-logos.svg#whatsapp",
  },
  {
    id: "link",
    label: "Link",
    url: "/assets/qr-logos.svg#link",
  },
  {
    id: "email",
    label: "Email",
    url: "/assets/qr-logos.svg#email",
  },
  {
    id: "location",
    label: "Location",
    url: "/assets/qr-logos.svg#location",
  },
  {
    id: "scan",
    label: "Scan",
    url: "/assets/qr-logos.svg#scan",
  },
] as const;

type FinderCellType = "outer" | "center" | "gap" | undefined;

function getFinderCellType(row: number, col: number, size: number): FinderCellType {
  if (size < 7) return undefined;

  const origins = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ] as const;

  for (const [originRow, originCol] of origins) {
    const rowOffset = row - originRow;
    const colOffset = col - originCol;
    const inZone = rowOffset >= 0 && rowOffset < 7 && colOffset >= 0 && colOffset < 7;
    if (!inZone) continue;

    const isOuterRing = rowOffset === 0 || rowOffset === 6 || colOffset === 0 || colOffset === 6;
    if (isOuterRing) return "outer";
    const isCenter = rowOffset >= 2 && rowOffset <= 4 && colOffset >= 2 && colOffset <= 4;
    if (isCenter) return "center";
    return "gap";
  }

  return undefined;
}

function hasExplicitUrlScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function looksLikeUrlValue(value: string) {
  return /^https?:\/\//i.test(value) || /^[\w-]+\.[\w.-]+(?:\/.*)?$/i.test(value);
}

function normalizeUrlCandidate(value: string) {
  const normalized = value.trim();
  if (!normalized) return normalized;
  if (hasExplicitUrlScheme(normalized)) return normalized;
  if (looksLikeUrlValue(normalized)) return `https://${normalized}`;
  return normalized;
}

function isValidHttpUrl(value: string) {
  const normalized = normalizeUrlCandidate(value);
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidOpenAppUrl(value: string) {
  const normalized = value.trim();
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    return !["javascript:", "data:", "file:", "vbscript:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isValidSocialField(platform: VCardSocialPlatform, value: string) {
  const normalized = value.trim();
  if (!normalized) return true;

  if (platform === "wechat" || platform === "wechatofficial") {
    return /^[^\s]{3,64}$/.test(normalized);
  }

  if (platform === "skype") {
    const candidate = normalizeUrlCandidate(normalized);
    try {
      const parsed = new URL(candidate);
      return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "skype:";
    } catch {
      return false;
    }
  }

  return isValidHttpUrl(normalized);
}

function getUrlHint(locale: Locale, example: string) {
  if (locale === "zh-Hant") {
    return `請填寫完整 URL，例如 ${example}`;
  }

  if (locale === "zh-Hans") {
    return `请填写完整 URL，例如 ${example}`;
  }

  return `Use a full URL, for example ${example}`;
}

function getUrlError(locale: Locale, example: string) {
  if (locale === "zh-Hant") {
    return `請輸入有效 URL，例如 ${example}`;
  }

  if (locale === "zh-Hans") {
    return `请输入有效 URL，例如 ${example}`;
  }

  return `Enter a valid URL, for example ${example}`;
}

function getUrlRequiredError(locale: Locale) {
  if (locale === "zh-Hant") {
    return "請先填寫 URL。";
  }

  if (locale === "zh-Hans") {
    return "请先填写 URL。";
  }

  return "Please enter a URL first.";
}

function getWeChatAccountIdHint(locale: Locale, platform: VCardSocialPlatform) {
  const accountName =
    platform === "wechatofficial"
      ? locale === "zh-Hant"
        ? "微信公眾號"
        : locale === "zh-Hans"
          ? "微信公众号"
          : "WeChat Official Account"
      : locale === "zh-Hant"
        ? "微信"
        : locale === "zh-Hans"
          ? "微信"
          : "WeChat";

  if (locale === "zh-Hant") {
    return `${accountName}請填 Account ID，例如 your-wechat-id。`;
  }

  if (locale === "zh-Hans") {
    return `${accountName}请填 Account ID，例如 your-wechat-id。`;
  }

  return `For ${accountName}, enter the Account ID, for example your-wechat-id.`;
}

function getWeChatAccountIdError(locale: Locale, platform: VCardSocialPlatform) {
  const accountName =
    platform === "wechatofficial"
      ? locale === "zh-Hant"
        ? "微信公眾號"
        : locale === "zh-Hans"
          ? "微信公众号"
          : "WeChat Official Account"
      : "WeChat";

  if (locale === "zh-Hant") {
    return `請輸入有效的 ${accountName} Account ID，且不要包含空格。`;
  }

  if (locale === "zh-Hans") {
    return `请输入有效的 ${accountName} Account ID，且不要包含空格。`;
  }

  return `Enter a valid ${accountName} Account ID without spaces.`;
}

function getSocialInputHint(locale: Locale, platform: VCardSocialPlatform) {
  if (platform === "wechat" || platform === "wechatofficial") {
    return getWeChatAccountIdHint(locale, platform);
  }

  return getUrlHint(locale, getVCardSocialPlaceholder(platform));
}

function getSocialInputError(locale: Locale, platform: VCardSocialPlatform, value: string) {
  const normalized = value.trim();
  if (!normalized) return undefined;

  if (platform === "wechat" || platform === "wechatofficial") {
    return isValidSocialField(platform, normalized) ? undefined : getWeChatAccountIdError(locale, platform);
  }

  return isValidSocialField(platform, normalized) ? undefined : getUrlError(locale, getVCardSocialPlaceholder(platform));
}

function getCorrectionDelta(level: CorrectionLevelId) {
  if (level === "L") return -1;
  if (level === "M") return 0;
  if (level === "Q") return 1;
  return 2;
}

function isStyleCellActive(
  style: QrStyleId,
  row: number,
  col: number,
  size: number,
  showFinders: boolean,
  correctionLevel: CorrectionLevelId,
) {
  if (showFinders) {
    const finderType = getFinderCellType(row, col, size);
    if (finderType !== undefined) return finderType !== "gap";
  }

  const seed = (row * 17 + col * 31 + row * col * 7) % 97;
  const stripe = (row + col) % 5 === 0;
  const diagonal = (row - col + size) % 6 === 0;
  const threshold = 5 + getCorrectionDelta(correctionLevel);

  switch (style) {
    case "square":
      return seed % 10 < threshold;
    case "rounded":
      return seed % 10 < threshold || stripe;
    case "classy":
      return seed % 10 < threshold || (diagonal && seed % 3 === 0);
    case "classy-rounded":
      return seed % 10 < threshold + 1 && (stripe || seed % 4 !== 0);
    case "extra-rounded":
      return seed % 10 < threshold + 1;
    case "diamond":
      return seed % 10 < threshold || diagonal;
    case "star":
      return seed % 10 < threshold - 1 || ((row + col) % 4 === 0 && seed % 2 === 0);
    case "heart":
      return seed % 10 < threshold - 1 || ((row * col + row + col) % 9 === 0);
    default:
      return seed % 10 < threshold;
  }
}

function getStyleCellClass(style: QrStyleId, row: number, col: number) {
  switch (style) {
    case "square":
      return "rounded-[2px]";
    case "rounded":
      return "rounded-[5px]";
    case "classy":
      return (row + col) % 2 === 0 ? "rounded-[2px]" : "rounded-[7px]";
    case "classy-rounded":
      return (row + col) % 3 === 0 ? "rounded-full" : "rounded-[7px]";
    case "extra-rounded":
      return "rounded-full";
    case "diamond":
      return "rounded-[2px] rotate-45 scale-[0.82]";
    case "star":
      return "scale-[0.86]";
    case "heart":
      return "scale-[0.86]";
    default:
      return "rounded-[3px]";
  }
}

function getStyleCellShape(style: QrStyleId): CSSProperties | undefined {
  if (style === "star") {
    return {
      clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
    };
  }

  if (style === "heart") {
    return {
      clipPath: "polygon(50% 92%,95% 45%,82% 20%,62% 14%,50% 28%,38% 14%,18% 20%,5% 45%)",
    };
  }

  return undefined;
}

function getCornerCellClass(type: "outer" | "center", borderStyle: CornerBorderStyleId, centerStyle: CornerCenterStyleId) {
  if (type === "outer") {
    if (borderStyle === "square") return "rounded-[1px]";
    if (borderStyle === "rounded") return "rounded-[4px]";
    if (borderStyle === "thick") return "rounded-[2px] scale-[1.05]";
    return "rounded-full scale-[0.78]";
  }

  if (centerStyle === "square") return "rounded-[1px]";
  if (centerStyle === "dot") return "rounded-full scale-[0.76]";
  if (centerStyle === "diamond") return "rounded-[1px] rotate-45 scale-[0.82]";
  return "scale-[0.82]";
}

function getCornerCellShape(type: "outer" | "center", borderStyle: CornerBorderStyleId, centerStyle: CornerCenterStyleId): CSSProperties | undefined {
  if (type === "center" && centerStyle === "star") {
    return {
      clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
    };
  }

  if (type === "outer" && borderStyle === "dot") {
    return { borderRadius: "9999px" };
  }

  return undefined;
}

interface QrStyleMatrixPreviewProps {
  style: QrStyleId;
  size: number;
  color: string;
  backgroundColor: string;
  cellPx: number;
  gapPx: number;
  correctionLevel: CorrectionLevelId;
  cornerBorderStyle: CornerBorderStyleId;
  cornerCenterStyle: CornerCenterStyleId;
  inactiveColor?: string;
  showFinders?: boolean;
}

function QrStyleMatrixPreview({
  style,
  size,
  color,
  backgroundColor,
  cellPx,
  gapPx,
  correctionLevel,
  cornerBorderStyle,
  cornerCenterStyle,
  inactiveColor = "rgba(148,163,184,0.35)",
  showFinders = false,
}: QrStyleMatrixPreviewProps) {
  return (
    <div
      className="grid"
      style={{
        backgroundColor,
        gap: `${gapPx}px`,
        gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
      }}
    >
      {Array.from({ length: size * size }).map((_, index) => {
        const row = Math.floor(index / size);
        const col = index % size;
        const finderType = showFinders ? getFinderCellType(row, col, size) : undefined;
        const active = isStyleCellActive(style, row, col, size, showFinders, correctionLevel);

        if (!active) {
          return (
            <span
              key={`${row}-${col}`}
              className="rounded-[2px]"
              style={{ backgroundColor: inactiveColor, height: cellPx, width: cellPx }}
            />
          );
        }

        const cellClass =
          finderType === "outer" || finderType === "center"
            ? getCornerCellClass(finderType, cornerBorderStyle, cornerCenterStyle)
            : getStyleCellClass(style, row, col);
        const cellShape =
          finderType === "outer" || finderType === "center"
            ? getCornerCellShape(finderType, cornerBorderStyle, cornerCenterStyle)
            : getStyleCellShape(style);

        return (
          <span
            key={`${row}-${col}`}
            className={`block ${cellClass}`}
            style={{
              ...cellShape,
              backgroundColor: color,
              height: cellPx,
              width: cellPx,
            }}
          />
        );
      })}
    </div>
  );
}

function buildAutoQrName(defaultUrl: string, locale: Locale) {
  const fallback = locale === "zh-Hant" ? "未命名二維碼" : "Untitled QR";

  try {
    const parsed = new URL(defaultUrl);
    const pathLastSegment = parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
    const cleanedPath = decodeURIComponent(pathLastSegment)
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();

    if (cleanedPath) {
      return cleanedPath.slice(0, 48);
    }

    const hostname = parsed.hostname.replace(/^www\./, "").trim();
    if (!hostname) return fallback;
    return locale === "zh-Hant" ? `${hostname} 二維碼` : `${hostname} QR`;
  } catch {
    return fallback;
  }
}

function getDefaultAbRules(
  existing?: Array<{ variant: "A" | "B"; weight: number; url: string }>,
) {
  const variantA = existing?.find((rule) => rule.variant === "A");
  const variantB = existing?.find((rule) => rule.variant === "B");
  const normalizedWeightA = Number.isFinite(variantA?.weight) ? Math.min(99, Math.max(1, Math.round(variantA!.weight))) : 50;
  const normalizedWeightB = 100 - normalizedWeightA;

  return [
    { variant: "A" as const, weight: normalizedWeightA, url: variantA?.url ?? "" },
    { variant: "B" as const, weight: normalizedWeightB, url: variantB?.url ?? "" },
  ];
}

function normalizeAbWeight(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(99, Math.max(1, Math.round(value)));
}

function sanitizePhoneNumber(value: string | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function buildWhatsAppUrl(whatsapp?: { countryCode?: string; phone?: string; message?: string }) {
  const digits = `${sanitizePhoneNumber(whatsapp?.countryCode)}${sanitizePhoneNumber(whatsapp?.phone)}`;
  if (!digits) return "";

  const params = new URLSearchParams();
  if (whatsapp?.message?.trim()) {
    params.set("text", whatsapp.message.trim());
  }

  const query = params.toString();
  return `https://wa.me/${digits}${query ? `?${query}` : ""}`;
}

function isLikelyLocalOrigin(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function buildLocalCosHint(locale: Locale, origin: string) {
  if (locale === "zh-Hant") {
    return `本地上傳需要先在騰訊雲 COS 的 CORS 中放行 ${origin}，並允許 PUT / GET / POST / DELETE。`;
  }

  if (locale === "zh-Hans") {
    return `本地上传需要先在腾讯云 COS 的 CORS 中放行 ${origin}，并允许 PUT / GET / POST / DELETE。`;
  }

  return `Local uploads need Tencent COS CORS to allow ${origin} with PUT / GET / POST / DELETE enabled first.`;
}

function buildNextVCardProfile(currentVCard: VCardProfile | undefined, fallbackName = "", patch: Partial<VCardProfile> = {}): VCardProfile {
  const hasPatch = (key: keyof VCardProfile) => Object.prototype.hasOwnProperty.call(patch, key);

  return {
    contentId: hasPatch("contentId") ? patch.contentId : currentVCard?.contentId ?? createVCardContentId(),
    fullName: hasPatch("fullName") ? patch.fullName : currentVCard?.fullName ?? fallbackName,
    phone: hasPatch("phone") ? patch.phone : currentVCard?.phone ?? "",
    email: hasPatch("email") ? patch.email : currentVCard?.email ?? "",
    company: hasPatch("company") ? patch.company : currentVCard?.company ?? "",
    title: hasPatch("title") ? patch.title : currentVCard?.title ?? "",
    website: hasPatch("website") ? patch.website : currentVCard?.website ?? "",
    avatarAssetId: hasPatch("avatarAssetId") ? patch.avatarAssetId : currentVCard?.avatarAssetId,
    avatarDataUrl: hasPatch("avatarDataUrl") ? patch.avatarDataUrl : currentVCard?.avatarDataUrl,
    avatarFileName: hasPatch("avatarFileName") ? patch.avatarFileName : currentVCard?.avatarFileName,
    imageAssets: hasPatch("imageAssets") ? patch.imageAssets ?? [] : currentVCard?.imageAssets ?? [],
    socialLinks: hasPatch("socialLinks") ? patch.socialLinks ?? [] : currentVCard?.socialLinks ?? [],
  };
}

function getVCardSocialConfig(platform: VCardSocialPlatform) {
  return VCARD_SOCIAL_PLATFORMS.find((item) => item.value === platform);
}

function getVCardSocialPlaceholder(platform: VCardSocialPlatform) {
  return getVCardSocialConfig(platform)?.placeholder ?? "https://";
}

function getVCardSocialSummary(socialLinks: VCardSocialLink[] | undefined, locale: Locale) {
  const configuredLinks = (socialLinks ?? []).filter((item) => item.url.trim());

  if (!configuredLinks.length) {
    return "";
  }

  const labels = configuredLinks.slice(0, 3).map((item) => getVCardSocialConfig(item.platform)?.label[locale] ?? item.platform);
  const summary = labels.join(locale === "en" ? ", " : "、");
  const extraCount = configuredLinks.length - labels.length;

  if (extraCount <= 0) {
    return summary;
  }

  if (locale === "zh-Hant") {
    return `${summary} 等 ${configuredLinks.length} 項`;
  }

  if (locale === "zh-Hans") {
    return `${summary} 等 ${configuredLinks.length} 项`;
  }

  return `${summary} +${extraCount} more`;
}

function createVCardImageAsset(asset: ManagedAssetRecord): VCardImageAsset {
  return {
    id: asset.id,
    name: asset.name,
    mimeType: asset.mimeType,
    size: asset.size,
    url: asset.url,
    provider: asset.provider,
    createdAt: asset.createdAt,
    visibility: "public",
  };
}

function collectManagedAssetIds(params: { vcard?: VCardProfile; design?: { logoAssetId?: string } }) {
  const ids = new Set<string>();

  params.vcard?.imageAssets?.forEach((asset) => {
    if (asset.provider === "cos") {
      ids.add(asset.id);
    }
  });

  if (params.design?.logoAssetId) {
    ids.add(params.design.logoAssetId);
  }

  return ids;
}

function extractFileNameFromUrl(url?: string) {
  if (!url) return null;

  try {
    const pathname = new URL(url).pathname;
    const rawName = pathname.split("/").pop();
    return rawName ? decodeURIComponent(rawName) : null;
  } catch {
    return null;
  }
}

function inferCreateSuggestion(text: string, fallbackTargetType: QRTargetType = "web"): {
  targetType: QRTargetType;
  ruleMode: QRRuleMode;
  detected: boolean;
} {
  const source = text.trim();

  if (!source) {
    return {
      targetType: fallbackTargetType,
      ruleMode: "none",
      detected: false,
    };
  }

  const matches = (...patterns: RegExp[]) => patterns.some((pattern) => pattern.test(source));

  if (
    matches(
      /weixin:\/\//i,
      /deep\s*link/i,
      /deeplink/i,
      /url scheme/i,
      /app scheme/i,
      /\bopen app\b/i,
      /打開\s*app/i,
      /打开\s*app/i,
      /喚起\s*app/i,
      /唤起\s*app/i,
      /微信\s*app/i,
      /wechat\s*app/i,
      /自定義\s*app/i,
      /自定义\s*app/i,
      /copy.*(text|content)/i,
      /複製.*(文字|文本|內容)/i,
      /复制.*(文字|文本|内容)/i,
      /\b(?!https?:\/\/)[a-z][a-z0-9+.-]*:\/\//i,
    )
  ) {
    return {
      targetType: "openapp",
      ruleMode: "none",
      detected: true,
    };
  }

  if (
    matches(
      /wa\.me/i,
      /whatsapp/i,
      /加我/i,
      /聯絡我/i,
      /联系我/i,
      /諮詢/i,
      /咨询/i,
      /message me/i,
      /chat with/i,
    )
  ) {
    return {
      targetType: "whatsapp",
      ruleMode: "none",
      detected: true,
    };
  }

  if (
    matches(
      /\bvcard\b/i,
      /\bvcf\b/i,
      /名片/,
      /聯絡人/,
      /联系人/,
      /contact card/i,
      /save contact/i,
    )
  ) {
    return {
      targetType: "vcard",
      ruleMode: "none",
      detected: true,
    };
  }

  if (matches(/a\/b/i, /ab test/i, /split test/i, /experiment/i, /variant/i, /實驗/i, /实验/i, /測試/i, /测试/i)) {
    return {
      targetType: "web",
      ruleMode: "ab",
      detected: true,
    };
  }

  if (matches(/utm[_=]/i, /\bparam/i, /\bquery\b/i, /參數/i, /参数/i, /\bref=/i, /\bsource=/i)) {
    return {
      targetType: "web",
      ruleMode: "param",
      detected: true,
    };
  }

  if (
    matches(
      /地區/i,
      /地区/i,
      /國家/i,
      /国家/i,
      /香港/,
      /台灣/,
      /台湾/,
      /日本/,
      /美國/,
      /美国/,
      /region/i,
      /country/i,
      /market/i,
      /geo/i,
    )
  ) {
    return {
      targetType: "web",
      ruleMode: "region",
      detected: true,
    };
  }

  if (matches(/多語/i, /多语言/i, /語言/i, /语言/i, /英文/, /繁中/, /簡中/, /简中/, /locale/i, /multilingual/i, /language/i)) {
    return {
      targetType: "web",
      ruleMode: "language",
      detected: true,
    };
  }

  if (matches(/設備/i, /设备/i, /裝置/i, /装置/i, /ios/i, /android/i, /iphone/i, /ipad/i, /windows/i, /macos/i, /device/i)) {
    return {
      targetType: "web",
      ruleMode: "device",
      detected: true,
    };
  }

  if (
    matches(
      /https?:\/\//i,
      /www\./i,
      /網址/i,
      /网址/i,
      /連結/i,
      /链接/i,
      /\blink\b/i,
      /\burl\b/i,
      /官網/i,
      /官网/i,
      /網站/i,
      /网站/i,
      /落地頁/i,
      /落地页/i,
      /頁面/i,
      /页面/i,
      /活動/i,
      /活动/i,
      /展會/i,
      /展会/i,
      /海報/i,
      /海报/i,
      /包裝/i,
      /包装/i,
      /說明/i,
      /说明/i,
      /產品/i,
      /产品/i,
      /campaign/i,
      /landing/i,
      /page/i,
      /website/i,
      /product/i,
      /poster/i,
      /packaging/i,
    )
  ) {
    return {
      targetType: "web",
      ruleMode: "none",
      detected: true,
    };
  }

  return {
    targetType: "web",
    ruleMode: "none",
    detected: false,
  };
}

export function QrCreateFlow({ locale, editEntryId }: QrCreateFlowProps) {
  const t = getMessages(locale);
  const router = useRouter();
  const {
    step,
    messages,
    draft,
    design,
    reset,
    setStep,
    addMessage,
    updateDraft,
    updateDesign,
    updateLanguageRule,
    addLanguageRule,
    removeLanguageRule,
    updateRegionRule,
    addRegionRule,
    removeRegionRule,
    updateDeviceRule,
    addDeviceRule,
    removeDeviceRule,
    updateParamRule,
    addParamRule,
    removeParamRule,
    updateAbRule,
  } = useQrCreateStore();
  const isEditing = Boolean(editEntryId);
  const [workingEntryId, setWorkingEntryId] = useState<string | null>(editEntryId ?? null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [expiresOpen, setExpiresOpen] = useState(false);
  const [qrStyleOpen, setQrStyleOpen] = useState(false);
  const [cornersOpen, setCornersOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [logoOpen, setLogoOpen] = useState(false);
  type Step2Errors = {
    qrName?: string;
    targetUrl?: string;
    openAppName?: string;
    openAppCopyText?: string;
    openAppUrl?: string;
    whatsappPhone?: string;
    vcardName?: string;
    vcardPhone?: string;
    vcardWebsite?: string;
    vcardSocialLinks?: Array<string | undefined>;
    languageRuleUrls?: Array<string | undefined>;
    regionRuleUrls?: Array<string | undefined>;
    deviceRuleUrls?: Array<string | undefined>;
    paramRuleUrls?: Array<string | undefined>;
    password?: string;
    expiresAt?: string;
    abWeight?: string;
    abUrlA?: string;
    abUrlB?: string;
  };
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});
  const [customLogoName, setCustomLogoName] = useState<string | null>(null);
  const [entryUrlCopied, setEntryUrlCopied] = useState(false);
  const [directionConfirmed, setDirectionConfirmed] = useState(false);
  const [persistingAction, setPersistingAction] = useState<"draft" | "generate" | null>(null);
  const [isHydratingEntry, setIsHydratingEntry] = useState(isEditing);
  const [editLoadError, setEditLoadError] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<QRStatus>("draft");
  const [existingPublicUrl, setExistingPublicUrl] = useState<string | null>(null);
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);
  const [draftPreviewLoading, setDraftPreviewLoading] = useState(false);
  const [draftPreviewError, setDraftPreviewError] = useState<string | null>(null);
  const [mediaLibraryTarget, setMediaLibraryTarget] = useState<"avatar" | "logo" | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const previousStepRef = useRef(step);
  const persistedManagedAssetIdsRef = useRef<Set<string>>(new Set());
  const transientManagedAssetIdsRef = useRef<Set<string>>(new Set());
  const selectedTargetType = draft.targetType ?? "web";
  const localPreviewOrigin = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return isLikelyLocalOrigin(window.location.hostname) ? window.location.origin : null;
  }, []);
  const localCosHint = useMemo(
    () => (localPreviewOrigin ? buildLocalCosHint(locale, localPreviewOrigin) : null),
    [locale, localPreviewOrigin],
  );
  const whatsappCountryOptions = useMemo(() => getCallingCountryOptions(locale), [locale]);
  const regionCountryOptions = useMemo(() => getRegionCountryOptions(locale), [locale]);
  const selectedWhatsappCountryIso =
    draft.whatsapp?.countryIso || inferCountryCodeFromDialCode(draft.whatsapp?.countryCode, draft.whatsapp?.countryIso) || "CN";
  const selectedWhatsappCountryOption =
    whatsappCountryOptions.find((option) => option.value === selectedWhatsappCountryIso) ?? whatsappCountryOptions[0];
  const selectedQrStyle = (qrStyles.find((item) => item.id === design.qrStyle)?.id ?? "rounded") as QrStyleId;
  const vcardImageAssets = useMemo(() => draft.vcard?.imageAssets ?? [], [draft.vcard?.imageAssets]);
  const selectedVCardAvatarAsset = useMemo(
    () => vcardImageAssets.find((asset) => asset.id === draft.vcard?.avatarAssetId) ?? null,
    [draft.vcard?.avatarAssetId, vcardImageAssets],
  );
  const hasConfiguredPassword = Boolean(draft.passwordConfigured || draft.password?.trim());
  const vcardSocialOptions = useMemo(
    () =>
      (
        (draft.vcard?.socialLinks ?? []).some((item) => item.platform === "website")
          ? VCARD_SOCIAL_PLATFORMS
          : VCARD_SOCIAL_PLATFORMS.filter((item) => item.value !== "website")
      ).map((item) => ({
        value: item.value,
        label: item.label[locale],
        keywords: `${item.label.en} ${item.value}`,
      })),
    [draft.vcard?.socialLinks, locale],
  );
  const vcardAvatarPreviewSrc = useMemo(
    () =>
      resolveVCardAvatarSrc(
        draft.vcard,
        draft.vcard?.contentId ?? draft.name?.trim() ?? "vcard-avatar",
        draft.vcard?.fullName?.trim() || draft.name?.trim() || "Naviora",
      ),
    [draft.name, draft.vcard],
  );
  const previewEntryUrl = editingStatus === "draft" ? draftPreviewUrl : existingPublicUrl;
  const isDraftEntry = editingStatus === "draft";
  const canSaveDraft = !isEditing || isDraftEntry;
  const isTargetTypeLocked = Boolean(workingEntryId);
  const primaryActionLabel = isDraftEntry ? t.common.generate : isEditing ? t.common.save : t.common.generate;
  const entryUrlLabel =
    editingStatus === "draft" || !workingEntryId
      ? locale === "zh-Hant"
        ? "草稿 Preview URL"
        : locale === "zh-Hans"
          ? "草稿 Preview URL"
          : "Draft preview URL"
      : t.create.entryUrlLabel;
  const previewEntryUrlDisplay =
    previewEntryUrl ??
    (workingEntryId
      ? editingStatus === "draft"
        ? draftPreviewLoading
          ? locale === "zh-Hant"
            ? "正在生成草稿 preview link…"
            : locale === "zh-Hans"
              ? "正在生成草稿 preview link…"
              : "Generating the draft preview link..."
          : locale === "zh-Hant"
            ? "這個草稿只展示 preview link。若本次編輯剛開啟，系統會自動刷新一條新的預覽地址。"
            : locale === "zh-Hans"
              ? "这个草稿只展示 preview link。若本次编辑刚打开，系统会自动刷新一条新的预览地址。"
              : "Draft entries only show preview links. Opening the draft refreshes a new preview URL."
        : existingPublicUrl ??
          (locale === "zh-Hant" ? "正式連結暫時不可用。" : locale === "zh-Hans" ? "正式链接暂时不可用。" : "The published link is temporarily unavailable.")
      : locale === "zh-Hant"
        ? "進入設計預覽後，系統會先自動保存草稿並生成 preview link。"
        : locale === "zh-Hans"
        ? "进入设计预览后，系统会先自动保存草稿并生成 preview link。"
          : "Once you continue to Design, we will auto-save a draft and generate a preview URL.");
  const previewQrSvg = useMemo(() => {
    if (!previewEntryUrl) {
      return null;
    }

    try {
      return buildQrSvgFromContent({
        content: previewEntryUrl,
        design,
        name: draft.name?.trim() || "Naviora QR",
      });
    } catch {
      return null;
    }
  }, [design, draft.name, previewEntryUrl]);
  const previewQrDataUri = useMemo(() => (previewQrSvg ? buildQrDataUri(previewQrSvg) : null), [previewQrSvg]);
  const targetTypePreviewLabel =
    selectedTargetType === "whatsapp"
      ? t.create.targetTypeWhatsapp
      : selectedTargetType === "openapp"
        ? t.create.targetTypeOpenApp
      : selectedTargetType === "vcard"
        ? t.create.targetTypeVcard
        : t.create.targetTypeWeb;
  const showTargetContentPreview = selectedTargetType !== "vcard";
  const targetTypePreviewValue =
    selectedTargetType === "whatsapp"
      ? buildWhatsAppUrl(draft.whatsapp) || "—"
      : selectedTargetType === "openapp"
        ? draft.openApp?.appUrl?.trim() || draft.defaultUrl?.trim() || "—"
      : draft.defaultUrl?.trim() || "—";
  const enabledAdvancedSettingsCount =
    Number(hasExternalTrackingConfig(draft.tracking)) +
    Number(hasConfiguredPassword) +
    Number(Boolean(draft.expiresAt?.trim()));
  const advancedSettingsSummary =
    enabledAdvancedSettingsCount > 0
      ? locale === "zh-Hant"
        ? `已啟用 ${enabledAdvancedSettingsCount} 項進階控制`
        : locale === "zh-Hans"
          ? `已启用 ${enabledAdvancedSettingsCount} 项高级控制`
          : `${enabledAdvancedSettingsCount} advanced control${enabledAdvancedSettingsCount > 1 ? "s" : ""} enabled`
      : t.create.advancedSettingsHint;
  const abRules = useMemo(() => getDefaultAbRules(draft.abRules), [draft.abRules]);
  const abWeightA = abRules[0]?.weight ?? 50;
  const abWeightB = abRules[1]?.weight ?? 50;
  const latestSubmittedUserIntent = [...messages].reverse().find((message) => message.role === "user")?.content.trim() || "";
  const hasAssistantReply = messages.some((message) => message.role === "assistant");
  const suggestedIntent = useMemo(() => {
    if (!latestSubmittedUserIntent) {
      return {
        targetType: selectedTargetType,
        ruleMode: selectedTargetType === "web" ? draft.ruleMode ?? "none" : "none",
        detected: false,
      };
    }

    return inferCreateSuggestion(latestSubmittedUserIntent, selectedTargetType);
  }, [draft.ruleMode, latestSubmittedUserIntent, selectedTargetType]);
  const showSuggestionCard =
    !directionConfirmed &&
    hasAssistantReply &&
    suggestedIntent.detected &&
    suggestedIntent.targetType === "web" &&
    selectedTargetType === "web";
  const suggestedTargetLabel =
    suggestedIntent.targetType === "whatsapp"
      ? t.create.targetTypeWhatsapp
      : suggestedIntent.targetType === "openapp"
        ? t.create.targetTypeOpenApp
      : suggestedIntent.targetType === "vcard"
        ? t.create.targetTypeVcard
        : t.create.targetTypeWeb;
  const suggestedRuleLabel =
    suggestedIntent.ruleMode === "language"
      ? t.create.suggestionRuleModeLanguage
      : suggestedIntent.ruleMode === "region"
        ? t.create.suggestionRuleModeRegion
        : suggestedIntent.ruleMode === "device"
          ? t.create.suggestionRuleModeDevice
          : suggestedIntent.ruleMode === "param"
            ? t.create.suggestionRuleModeParam
            : suggestedIntent.ruleMode === "ab"
              ? t.create.suggestionRuleModeAb
              : t.create.suggestionRuleModeNone;
  const step1MissingFields = useMemo(() => {
    if (selectedTargetType === "whatsapp") {
      return [
        !draft.name?.trim() ? t.create.qrName : null,
        !draft.whatsapp?.phone?.trim() ? t.create.whatsappPhone : null,
      ].filter(Boolean) as string[];
    }

    if (selectedTargetType === "vcard") {
      return [
        !draft.name?.trim() ? t.create.qrName : null,
        !draft.vcard?.fullName?.trim() ? t.create.vcardFullName : null,
      ].filter(Boolean) as string[];
    }

    if (selectedTargetType === "openapp") {
      return [
        !draft.name?.trim() ? t.create.qrName : null,
        draft.openApp?.preset === "custom" && !draft.openApp?.appName?.trim() ? t.create.openAppNameLabel : null,
        !draft.openApp?.appUrl?.trim() ? t.create.openAppUrlLabel : null,
      ].filter(Boolean) as string[];
    }

    return [
      !draft.name?.trim() ? t.create.qrName : null,
      !draft.defaultUrl?.trim() ? t.create.webUrlLabel : null,
    ].filter(Boolean) as string[];
  }, [draft.defaultUrl, draft.name, draft.openApp?.appName, draft.openApp?.appUrl, draft.openApp?.copyText, draft.openApp?.preset, draft.vcard?.fullName, draft.whatsapp?.phone, selectedTargetType, t.create.openAppCopyTextLabel, t.create.openAppNameLabel, t.create.openAppUrlLabel, t.create.qrName, t.create.vcardFullName, t.create.webUrlLabel, t.create.whatsappPhone]);
  const canEnterReview = true;
  const showDirectionPendingCard = false;
  const showDirectionReadyCard = directionConfirmed;
  const confirmedTargetLabel =
    selectedTargetType === "whatsapp"
      ? t.create.targetTypeWhatsapp
      : selectedTargetType === "openapp"
        ? t.create.targetTypeOpenApp
      : selectedTargetType === "vcard"
        ? t.create.targetTypeVcard
        : t.create.targetTypeWeb;
  const confirmedRuleLabel =
    selectedTargetType !== "web"
      ? t.create.suggestionRuleModeNone
      : draft.ruleMode === "language"
        ? t.create.suggestionRuleModeLanguage
        : draft.ruleMode === "region"
          ? t.create.suggestionRuleModeRegion
          : draft.ruleMode === "device"
            ? t.create.suggestionRuleModeDevice
            : draft.ruleMode === "param"
              ? t.create.suggestionRuleModeParam
              : draft.ruleMode === "ab"
                ? t.create.suggestionRuleModeAb
                : t.create.suggestionRuleModeNone;
  const missingFieldsText = step1MissingFields.join(locale === "en" ? ", " : "、");
  const collectionTargetType: QRTargetType | null = directionConfirmed ? selectedTargetType : showSuggestionCard ? suggestedIntent.targetType : null;
  const collectionRuleLabel = directionConfirmed ? confirmedRuleLabel : suggestedRuleLabel;
  const step1PlaceholderText =
    collectionTargetType === "whatsapp"
      ? t.create.step1PlaceholderWhatsapp
      : collectionTargetType === "vcard"
        ? t.create.step1PlaceholderVcard
        : collectionTargetType === "openapp"
          ? locale === "zh-Hant"
            ? "例如：掃碼後打開微信；先複製客服微信號 wechat_service。"
            : locale === "zh-Hans"
              ? "例如：扫码后打开微信；先复制客服微信号 wechat_service。"
              : "For example: open WeChat after scanning and copy wechat_service first."
        : collectionTargetType === "web"
          ? t.create.step1PlaceholderWeb
          : t.create.step1Placeholder;
  const collectionGuide = useMemo(() => {
    if (!collectionTargetType) return null;

    if (collectionTargetType === "whatsapp") {
      return {
        title: t.create.collectionGuideTitleWhatsapp,
        body: t.create.collectionGuideBodyWhatsapp,
        required: [
          { label: t.create.qrName, value: draft.name?.trim() || "" },
          { label: t.create.whatsappPhone, value: draft.whatsapp?.phone?.trim() || "" },
        ],
        optional: [
          { label: t.create.whatsappCountryCode, value: selectedWhatsappCountryOption?.label ?? "" },
          { label: t.create.whatsappMessage, value: draft.whatsapp?.message?.trim() || "" },
        ],
      };
    }

    if (collectionTargetType === "vcard") {
      const socialSummary = getVCardSocialSummary(draft.vcard?.socialLinks, locale);

      return {
        title: t.create.collectionGuideTitleVcard,
        body: t.create.collectionGuideBodyVcard,
        required: [
          { label: t.create.qrName, value: draft.name?.trim() || "" },
          { label: t.create.vcardFullName, value: draft.vcard?.fullName?.trim() || draft.name?.trim() || "" },
        ],
        optional: [
          { label: t.create.vcardPhone, value: draft.vcard?.phone?.trim() || "" },
          { label: t.create.vcardEmail, value: draft.vcard?.email?.trim() || "" },
          { label: t.create.vcardCompany, value: draft.vcard?.company?.trim() || "" },
          { label: t.create.vcardTitle, value: draft.vcard?.title?.trim() || "" },
          { label: t.create.vcardWebsite, value: draft.vcard?.website?.trim() || "" },
          { label: t.create.vcardSocialTitle, value: socialSummary },
          { label: t.create.vcardAvatarTitle, value: draft.vcard?.avatarFileName?.trim() || "" },
        ],
      };
    }

    if (collectionTargetType === "openapp") {
      return {
        title: locale === "zh-Hant" ? "接下來收集 Open App 內容" : locale === "zh-Hans" ? "接下来收集 Open App 内容" : "Next, collect the Open App target",
        body:
          locale === "zh-Hant"
            ? "如需先複製內容可填寫文字；自訂 App 時再補上名稱與 App URL。"
            : locale === "zh-Hans"
              ? "如需先复制内容可填写文字；自定义 App 时再补上名称与 App URL。"
              : "Add copy text if needed, then provide the app name and app URL for custom apps.",
        required: [
          { label: t.create.qrName, value: draft.name?.trim() || "" },
          ...(draft.openApp?.preset === "custom" ? [{ label: t.create.openAppNameLabel, value: draft.openApp?.appName?.trim() || "" }] : []),
          { label: t.create.openAppUrlLabel, value: draft.openApp?.appUrl?.trim() || "" },
        ],
        optional: [
          { label: t.create.openAppCopyTextLabel, value: draft.openApp?.copyText?.trim() || "" },
          { label: t.create.openAppSilentCopyLabel, value: draft.openApp?.silentCopy ? t.create.openAppSilentCopyEnabled : t.create.openAppSilentCopyDisabled },
          { label: t.create.openAppPresetLabel, value: draft.openApp?.preset === "custom" ? t.create.openAppPresetCustom : t.create.openAppPresetWechat },
        ],
      };
    }

    return {
      title: t.create.collectionGuideTitleWeb,
      body: t.create.collectionGuideBodyWeb,
      required: [
        { label: t.create.qrName, value: draft.name?.trim() || "" },
        { label: t.create.webUrlLabel, value: draft.defaultUrl?.trim() || "" },
      ],
      optional: [
        { label: t.create.collectionWebRoutingLabel, value: draft.ruleMode && draft.ruleMode !== "none" ? collectionRuleLabel : "" },
      ],
    };
  }, [
    collectionRuleLabel,
    collectionTargetType,
    draft.defaultUrl,
    draft.name,
    draft.openApp?.appName,
    draft.openApp?.appUrl,
    draft.openApp?.copyText,
    draft.openApp?.preset,
    draft.ruleMode,
    draft.vcard?.company,
    draft.vcard?.email,
    draft.vcard?.avatarFileName,
    draft.vcard?.fullName,
    draft.vcard?.phone,
    draft.vcard?.socialLinks,
    draft.vcard?.title,
    draft.vcard?.website,
    draft.whatsapp?.message,
    draft.whatsapp?.phone,
    locale,
    selectedWhatsappCountryOption?.label,
    t.create.collectionGuideBodyVcard,
    t.create.collectionGuideBodyWeb,
    t.create.collectionGuideBodyWhatsapp,
    t.create.openAppCopyTextLabel,
    t.create.openAppNameLabel,
    t.create.openAppPresetCustom,
    t.create.openAppPresetLabel,
    t.create.openAppPresetWechat,
    t.create.openAppSilentCopyDisabled,
    t.create.openAppSilentCopyEnabled,
    t.create.openAppSilentCopyLabel,
    t.create.openAppUrlLabel,
    t.create.collectionGuideTitleVcard,
    t.create.collectionGuideTitleWeb,
    t.create.collectionGuideTitleWhatsapp,
    t.create.collectionWebRoutingLabel,
    t.create.qrName,
    t.create.vcardCompany,
    t.create.vcardEmail,
    t.create.vcardAvatarTitle,
    t.create.vcardFullName,
    t.create.vcardPhone,
    t.create.vcardSocialTitle,
    t.create.vcardTitle,
    t.create.vcardWebsite,
    t.create.webUrlLabel,
    t.create.whatsappCountryCode,
    t.create.whatsappMessage,
    t.create.whatsappPhone,
  ]);

  function collectStep2Errors(): Step2Errors {
    const nextErrors: Step2Errors = {};

    if (!draft.name?.trim()) {
      nextErrors.qrName = t.create.qrNameRequiredError;
    }

    if (selectedTargetType === "web" && !draft.defaultUrl?.trim()) {
      nextErrors.targetUrl = t.create.targetUrlRequiredError;
    } else if (selectedTargetType === "web" && draft.defaultUrl?.trim() && !isValidHttpUrl(draft.defaultUrl)) {
      nextErrors.targetUrl = getUrlError(locale, "https://example.com");
    }

    if (selectedTargetType === "openapp" && !draft.openApp?.appUrl?.trim()) {
      nextErrors.openAppUrl = t.create.openAppUrlRequiredError;
    } else if (selectedTargetType === "openapp" && draft.openApp?.appUrl?.trim() && !isValidOpenAppUrl(draft.openApp.appUrl)) {
      nextErrors.openAppUrl = locale === "zh-Hant" ? "請輸入有效的 App URL，例如 weixin:// 或 myapp://open。" : locale === "zh-Hans" ? "请输入有效的 App URL，例如 weixin:// 或 myapp://open。" : "Enter a valid app URL such as weixin:// or myapp://open.";
    }

    if (selectedTargetType === "openapp" && draft.openApp?.preset === "custom" && !draft.openApp?.appName?.trim()) {
      nextErrors.openAppName = t.create.openAppNameRequiredError;
    }

    if (selectedTargetType === "whatsapp" && !draft.whatsapp?.phone?.trim()) {
      nextErrors.whatsappPhone = t.create.whatsappPhoneRequiredError;
    }

    if (selectedTargetType === "vcard") {
      if (!draft.vcard?.fullName?.trim()) {
        nextErrors.vcardName = t.create.vcardNameRequiredError;
      }

      if (draft.vcard?.website?.trim() && !isValidHttpUrl(draft.vcard.website)) {
        nextErrors.vcardWebsite = getUrlError(locale, "https://your-site.com");
      }

      const socialLinkErrors = (draft.vcard?.socialLinks ?? []).map((item) => getSocialInputError(locale, item.platform, item.url));
      if (socialLinkErrors.some(Boolean)) {
        nextErrors.vcardSocialLinks = socialLinkErrors;
      }
    }

    if (passwordOpen && !draft.password?.trim() && !draft.passwordConfigured) {
      nextErrors.password = t.create.passwordRequiredError;
    }

    if (expiresOpen && !draft.expiresAt?.trim()) {
      nextErrors.expiresAt = t.create.expirationDateRequiredError;
    }

    if (selectedTargetType === "web" && draft.ruleMode === "language") {
      const languageRuleUrlErrors = (draft.languageRules ?? []).map((rule) => {
        if (!rule.url.trim()) return getUrlRequiredError(locale);
        return isValidHttpUrl(rule.url) ? undefined : getUrlError(locale, "https://example.com/en");
      });

      if (languageRuleUrlErrors.some(Boolean)) {
        nextErrors.languageRuleUrls = languageRuleUrlErrors;
      }
    }

    if (selectedTargetType === "web" && draft.ruleMode === "region") {
      const regionRuleUrlErrors = (draft.regionRules ?? []).map((rule) => {
        if (!rule.url.trim()) return getUrlRequiredError(locale);
        return isValidHttpUrl(rule.url) ? undefined : getUrlError(locale, "https://example.com/tw");
      });

      if (regionRuleUrlErrors.some(Boolean)) {
        nextErrors.regionRuleUrls = regionRuleUrlErrors;
      }
    }

    if (selectedTargetType === "web" && draft.ruleMode === "device") {
      const deviceRuleUrlErrors = (draft.deviceRules ?? []).map((rule) => {
        if (!rule.url.trim()) return getUrlRequiredError(locale);
        return isValidHttpUrl(rule.url) ? undefined : getUrlError(locale, "https://example.com/mobile");
      });

      if (deviceRuleUrlErrors.some(Boolean)) {
        nextErrors.deviceRuleUrls = deviceRuleUrlErrors;
      }
    }

    if (selectedTargetType === "web" && draft.ruleMode === "param") {
      const paramRuleUrlErrors = (draft.paramRules ?? []).map((rule) => {
        if (!rule.url.trim()) return getUrlRequiredError(locale);
        return isValidHttpUrl(rule.url) ? undefined : getUrlError(locale, "https://example.com/campaign");
      });

      if (paramRuleUrlErrors.some(Boolean)) {
        nextErrors.paramRuleUrls = paramRuleUrlErrors;
      }
    }

    if (selectedTargetType === "web" && draft.ruleMode === "ab") {
      if (!abRules[0]?.url.trim()) {
        nextErrors.abUrlA =
          locale === "zh-Hant" ? "請填寫 A 版本 URL。" : locale === "zh-Hans" ? "请填写 A 版本 URL。" : "Please enter a URL for variant A.";
      } else if (!isValidHttpUrl(abRules[0].url)) {
        nextErrors.abUrlA = getUrlError(locale, "https://example.com/a");
      }

      if (!abRules[1]?.url.trim()) {
        nextErrors.abUrlB =
          locale === "zh-Hant" ? "請填寫 B 版本 URL。" : locale === "zh-Hans" ? "请填写 B 版本 URL。" : "Please enter a URL for variant B.";
      } else if (!isValidHttpUrl(abRules[1].url)) {
        nextErrors.abUrlB = getUrlError(locale, "https://example.com/b");
      }

      if ((abRules[0]?.weight ?? 0) + (abRules[1]?.weight ?? 0) !== 100) {
        nextErrors.abWeight =
          locale === "zh-Hant"
            ? "A/B Test 的占比總和必須等於 100%。"
            : locale === "zh-Hans"
              ? "A/B Test 的占比总和必须等于 100%。"
              : "A/B test percentages must add up to 100%.";
      }
    }

    return nextErrors;
  }

  const requiredFieldsComplete = Object.keys(collectStep2Errors()).length === 0;

  const requiredInfoHint =
    locale === "zh-Hant"
      ? "請先完成所有必填資訊，才能保存草稿或生成二維碼。"
      : locale === "zh-Hans"
        ? "请先完成所有必填信息，才能保存草稿或生成二维码。"
        : "Complete all required fields before saving the draft or generating the QR code.";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (previousStepRef.current === step) {
      return;
    }

    previousStepRef.current = step;

    if (window.innerWidth >= 1024) {
      return;
    }

    window.requestAnimationFrame(() => {
      const top = (flowRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 86;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }, [step]);

  useEffect(() => {
    let cancelled = false;

    async function prepareEntryDraft() {
      reset();
      setInput("");
      setDirectionConfirmed(false);
      setStep2Errors({});
      setCustomLogoName(null);
      setEntryUrlCopied(false);
      setEditLoadError(null);
      setEditingStatus("draft");
      setExistingPublicUrl(null);
      setDraftPreviewUrl(null);
      setDraftPreviewLoading(false);
      setDraftPreviewError(null);
      setMediaLibraryTarget(null);
      persistedManagedAssetIdsRef.current = new Set();
      transientManagedAssetIdsRef.current = new Set();

      if (!editEntryId) {
        localStorage.removeItem(QR_CREATE_DRAFT_STORAGE_KEY);
        setWorkingEntryId(null);
        setIsHydratingEntry(false);
        return;
      }

      if (!hasSupabaseEnv()) {
        setEditLoadError(
          locale === "zh-Hant"
            ? "目前尚未連接 Supabase，無法載入這個入口。"
            : locale === "zh-Hans"
              ? "当前尚未连接 Supabase，无法加载这个入口。"
              : "Supabase is not configured yet, so this entry cannot be loaded.",
        );
        setIsHydratingEntry(false);
        return;
      }

      setIsHydratingEntry(true);

      try {
        const entry = await getEntryForEditing(editEntryId);

        if (!entry) {
          throw new Error(
            locale === "zh-Hant" ? "找不到這個入口。" : locale === "zh-Hans" ? "找不到这个入口。" : "Unable to find this entry.",
          );
        }

        if (cancelled) return;

        const entryDraft = buildDraftFromItem(entry);

        updateDraft(entryDraft);
        updateDesign(entry.design ?? {});
        setWorkingEntryId(entry.id);
        setEditingStatus(entry.status);
        setExistingPublicUrl(getEntryUrl(entry));
        setDirectionConfirmed(true);
        setStep(2);
        setPasswordOpen(Boolean(entryDraft.passwordConfigured || entryDraft.password?.trim()));
        persistedManagedAssetIdsRef.current = collectManagedAssetIds({
          vcard: entry.vcard,
          design: entry.design,
        });

        if (entry.status === "draft") {
          setDraftPreviewLoading(true);

          try {
            const preview = await refreshEntryPreviewLink(entry.id);

            if (!cancelled) {
              setDraftPreviewUrl(preview.previewUrl);
            }
          } catch (error) {
            if (!cancelled) {
              setDraftPreviewError(
                error instanceof Error
                  ? error.message
                  : locale === "zh-Hant"
                    ? "草稿預覽連結生成失敗，請稍後再試。"
                    : locale === "zh-Hans"
                      ? "草稿预览链接生成失败，请稍后再试。"
                      : "Failed to generate a draft preview link. Please try again.",
              );
            }
          } finally {
            if (!cancelled) {
              setDraftPreviewLoading(false);
            }
          }
        }
      } catch (error) {
        if (cancelled) return;

        setEditLoadError(
          error instanceof Error
            ? error.message
            : locale === "zh-Hant"
              ? "載入入口失敗，請稍後再試。"
              : locale === "zh-Hans"
                ? "加载入口失败，请稍后再试。"
                : "Failed to load this entry. Please try again.",
        );
      } finally {
        if (!cancelled) {
          setIsHydratingEntry(false);
        }
      }
    }

    void prepareEntryDraft();

    return () => {
      cancelled = true;
    };
  }, [editEntryId, locale, reset, setStep, updateDesign, updateDraft]);

  useEffect(() => {
    if (selectedTargetType !== "vcard" || !draft.vcard?.contentId) return;
    persistVCardProfile(draft.vcard.contentId, draft.vcard);
  }, [draft.vcard, selectedTargetType]);

  useEffect(() => {
    if (design.logoType !== "custom") {
      setCustomLogoName(null);
      return;
    }

    setCustomLogoName(design.logoFileName ?? extractFileNameFromUrl(design.logoUrl) ?? null);
  }, [design.logoFileName, design.logoType, design.logoUrl]);

  function clearStep2Errors() {
    setStep2Errors((current) => ({
      ...current,
      qrName: undefined,
      targetUrl: undefined,
      openAppName: undefined,
      openAppCopyText: undefined,
      openAppUrl: undefined,
      whatsappPhone: undefined,
      vcardName: undefined,
      vcardPhone: undefined,
      vcardWebsite: undefined,
      vcardSocialLinks: undefined,
      languageRuleUrls: undefined,
      regionRuleUrls: undefined,
      deviceRuleUrls: undefined,
      paramRuleUrls: undefined,
      abWeight: undefined,
      abUrlA: undefined,
      abUrlB: undefined,
    }));
  }

  function clearIndexedStep2Error(
    key: "vcardSocialLinks" | "languageRuleUrls" | "regionRuleUrls" | "deviceRuleUrls" | "paramRuleUrls",
    index: number,
  ) {
    setStep2Errors((current) => {
      const currentErrors = current[key];
      if (!currentErrors?.length) {
        return current;
      }

      const nextErrors = [...currentErrors];
      nextErrors[index] = undefined;

      return {
        ...current,
        [key]: nextErrors.some(Boolean) ? nextErrors : undefined,
      };
    });
  }

  function buildTargetTypeDraftUpdate(nextType: QRTargetType) {
    const resetRules = {
      ruleMode: "none" as const,
      languageRules: [],
      regionRules: [],
      deviceRules: [],
      paramRules: [],
      abRules: [],
    };

    if (nextType === "web") {
      return {
        ...resetRules,
        targetType: "web" as const,
        defaultUrl: selectedTargetType === "web" ? draft.defaultUrl ?? "" : "",
      };
    }

    if (nextType === "whatsapp") {
      const nextCountryIso =
        draft.whatsapp?.countryIso || inferCountryCodeFromDialCode(draft.whatsapp?.countryCode, draft.whatsapp?.countryIso) || "CN";
      const nextWhatsapp = {
        countryIso: nextCountryIso,
        countryCode: draft.whatsapp?.countryCode ?? getCountryDialCode(nextCountryIso) ?? "86",
        phone: draft.whatsapp?.phone ?? "",
        message: draft.whatsapp?.message ?? "",
      };

      return {
        ...resetRules,
        targetType: "whatsapp" as const,
        whatsapp: nextWhatsapp,
        defaultUrl: buildWhatsAppUrl(nextWhatsapp),
      };
    }

    if (nextType === "openapp") {
      const nextOpenApp: OpenAppTarget = {
        preset: draft.openApp?.preset ?? "wechat",
        appName: draft.openApp?.appName ?? "",
        copyText: draft.openApp?.copyText ?? "",
        silentCopy: draft.openApp?.silentCopy ?? false,
        appUrl: draft.openApp?.appUrl ?? "weixin://",
      };

      return {
        ...resetRules,
        targetType: "openapp" as const,
        openApp: nextOpenApp,
        defaultUrl: nextOpenApp.appUrl ?? "weixin://",
      };
    }

    const nextVCard = buildNextVCardProfile(draft.vcard, draft.name ?? "");

    return {
      ...resetRules,
      targetType: "vcard" as const,
      vcard: nextVCard,
      defaultUrl: "",
    };
  }

  const recognizedCount = useMemo(() => {
    const fields = [
      draft.name,
      draft.defaultUrl,
      draft.targetType && draft.targetType !== "web" ? draft.targetType : undefined,
        draft.openApp?.preset === "custom" ? draft.openApp?.appName : undefined,
      draft.openApp?.copyText,
      draft.whatsapp?.phone,
      draft.vcard?.fullName,
      draft.ruleMode,
      draft.languageRules?.length ? "language" : undefined,
      draft.regionRules?.length ? "region" : undefined,
      draft.deviceRules?.length ? "device" : undefined,
      draft.paramRules?.length ? "param" : undefined,
      draft.abRules?.length ? "ab" : undefined,
      hasExternalTrackingConfig(draft.tracking) ? "tracking" : undefined,
      draft.password,
      draft.expiresAt,
    ];
    return fields.filter(Boolean).length;
  }, [draft]);

  function enterReviewStep(nextDraft?: typeof draft) {
    const reviewDraft = nextDraft ?? draft;

    if (!reviewDraft.name?.trim()) {
      if (reviewDraft.defaultUrl) {
        updateDraft({ name: buildAutoQrName(reviewDraft.defaultUrl, locale) });
      }
    }

    setStep(2);
  }

  async function submitMessage() {
    if (!input.trim()) return;

    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: input };
    addMessage(userMsg);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
      const result = await chatWithQwen(history, locale);
      const nextTargetType = isTargetTypeLocked ? selectedTargetType : result.draft.targetType ?? draft.targetType ?? suggestedIntent.targetType;
      const generatedName =
        !draft.name?.trim() && !result.draft.name && result.draft.defaultUrl
          ? buildAutoQrName(result.draft.defaultUrl, locale)
          : undefined;
      addMessage({ id: crypto.randomUUID(), role: "assistant", content: result.reply });
      if (Object.keys(result.draft).length > 0 || generatedName) {
        const normalizedDraft = { ...result.draft, ...(generatedName ? { name: generatedName } : {}) };

        if (nextTargetType === "vcard") {
          const nextVCard = buildNextVCardProfile(draft.vcard, draft.name ?? "", {
            ...normalizedDraft.vcard,
            fullName: normalizedDraft.vcard?.fullName ?? normalizedDraft.name ?? draft.vcard?.fullName ?? draft.name ?? "",
          });

          updateDraft({
            ...normalizedDraft,
            targetType: "vcard",
            ruleMode: "none",
            vcard: nextVCard,
            defaultUrl: "",
          });
        } else if (nextTargetType === "whatsapp") {
          const nextCountryIso =
            normalizedDraft.whatsapp?.countryIso ||
            draft.whatsapp?.countryIso ||
            inferCountryCodeFromDialCode(
              normalizedDraft.whatsapp?.countryCode ?? draft.whatsapp?.countryCode,
              draft.whatsapp?.countryIso,
            ) ||
            "CN";
          const nextWhatsapp = {
            countryIso: nextCountryIso,
            countryCode:
              normalizedDraft.whatsapp?.countryCode ??
              getCountryDialCode(nextCountryIso) ??
              draft.whatsapp?.countryCode ??
              "86",
            phone: normalizedDraft.whatsapp?.phone ?? draft.whatsapp?.phone ?? "",
            message: normalizedDraft.whatsapp?.message ?? draft.whatsapp?.message ?? "",
          };

          updateDraft({
            ...normalizedDraft,
            targetType: "whatsapp",
            ruleMode: "none",
            whatsapp: nextWhatsapp,
            defaultUrl: normalizedDraft.defaultUrl ?? buildWhatsAppUrl(nextWhatsapp),
          });
        } else if (nextTargetType === "openapp") {
          const nextOpenApp: OpenAppTarget = {
            preset: normalizedDraft.openApp?.preset ?? draft.openApp?.preset ?? "wechat",
            appName:
              (normalizedDraft.openApp?.preset ?? draft.openApp?.preset ?? "wechat") === "custom"
                ? normalizedDraft.openApp?.appName ?? draft.openApp?.appName ?? ""
                : "",
            copyText: normalizedDraft.openApp?.copyText ?? draft.openApp?.copyText ?? "",
            silentCopy: Boolean((normalizedDraft.openApp?.copyText ?? draft.openApp?.copyText)?.trim() && (normalizedDraft.openApp?.silentCopy ?? draft.openApp?.silentCopy)),
            appUrl: normalizedDraft.openApp?.appUrl ?? normalizedDraft.defaultUrl ?? draft.openApp?.appUrl ?? draft.defaultUrl ?? "weixin://",
          };

          updateDraft({
            ...normalizedDraft,
            targetType: "openapp",
            ruleMode: "none",
            openApp: nextOpenApp,
            defaultUrl: nextOpenApp.appUrl,
          });
        } else {
          updateDraft({
            ...normalizedDraft,
            targetType: "web",
          });
        }

        if ((normalizedDraft.ruleMode ?? draft.ruleMode) && (normalizedDraft.ruleMode ?? draft.ruleMode) !== "none" && nextTargetType === "web") setRuleOpen(true);
        if (hasExternalTrackingConfig(normalizedDraft.tracking) || hasExternalTrackingConfig(draft.tracking)) setTrackingOpen(true);
        if (normalizedDraft.password || normalizedDraft.passwordConfigured) setPasswordOpen(true);
        if (normalizedDraft.expiresAt) setExpiresOpen(true);
      }
      const shouldConfirmDirection =
        Boolean(result.draft.targetType) ||
        nextTargetType === "openapp" ||
        nextTargetType === "vcard" ||
        nextTargetType === "whatsapp" ||
        draft.targetType === "openapp" ||
        draft.targetType === "vcard" ||
        draft.targetType === "whatsapp";

      if (shouldConfirmDirection || result.readyForReview) {
        setDirectionConfirmed(true);
      }
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: t.create.aiFallbackError,
      });
    }

    setLoading(false);
  }

  function setRuleMode(mode: QRRuleMode) {
    if (selectedTargetType !== "web" && mode !== "none") {
      return;
    }

    if (mode === "language") {
      updateDraft({ ruleMode: mode, regionRules: [], deviceRules: [], paramRules: [], abRules: [] });
      return;
    }
    if (mode === "region") {
      updateDraft({ ruleMode: mode, languageRules: [], deviceRules: [], paramRules: [], abRules: [] });
      return;
    }
    if (mode === "device") {
      updateDraft({ ruleMode: mode, languageRules: [], regionRules: [], paramRules: [], abRules: [] });
      return;
    }
    if (mode === "param") {
      updateDraft({
        ruleMode: mode,
        languageRules: [],
        regionRules: [],
        deviceRules: [],
        abRules: [],
        paramRules: draft.paramRules?.length ? draft.paramRules : [{ key: "", value: "", url: "" }],
      });
      return;
    }
    if (mode === "ab") {
      updateDraft({
        ruleMode: mode,
        languageRules: [],
        regionRules: [],
        deviceRules: [],
        paramRules: [],
        abRules,
      });
      return;
    }
    updateDraft({ ruleMode: mode, languageRules: [], regionRules: [], deviceRules: [], paramRules: [], abRules: [] });
  }

  function setTargetType(nextType: QRTargetType) {
    if (isTargetTypeLocked) {
      return;
    }

    clearStep2Errors();
    updateDraft(buildTargetTypeDraftUpdate(nextType));
  }

  function confirmDirection(nextDraft: typeof draft) {
    if (isTargetTypeLocked) {
      return;
    }

    updateDraft(nextDraft);
    setDirectionConfirmed(true);
  }

  function applySuggestedSetup() {
    clearStep2Errors();

    const nextDraft: typeof draft = {
      ...draft,
      ...buildTargetTypeDraftUpdate(suggestedIntent.targetType),
    };

    if (suggestedIntent.targetType === "web") {
      nextDraft.ruleMode = suggestedIntent.ruleMode;

      if (suggestedIntent.ruleMode === "param") {
        nextDraft.paramRules = draft.paramRules?.length ? draft.paramRules : [{ key: "", value: "", url: "" }];
      }

      if (suggestedIntent.ruleMode === "ab") {
        nextDraft.abRules = abRules;
      }
    }

    confirmDirection(nextDraft);
  }

  function updateWhatsAppField(field: "countryCode" | "phone" | "message", value: string) {
    const nextCountryIso =
      draft.whatsapp?.countryIso || inferCountryCodeFromDialCode(draft.whatsapp?.countryCode, draft.whatsapp?.countryIso) || "CN";
    const nextWhatsapp = {
      countryIso: nextCountryIso,
      countryCode: draft.whatsapp?.countryCode ?? getCountryDialCode(nextCountryIso) ?? "86",
      phone: draft.whatsapp?.phone ?? "",
      message: draft.whatsapp?.message ?? "",
      [field]: value,
    };

    updateDraft({
      targetType: "whatsapp",
      whatsapp: nextWhatsapp,
      defaultUrl: buildWhatsAppUrl(nextWhatsapp),
    });

    if (field === "phone" && step2Errors.whatsappPhone) {
      setStep2Errors((current) => ({ ...current, whatsappPhone: undefined }));
    }
  }

  function updateWhatsAppCountry(countryIso: string) {
    const dialCode = getCountryDialCode(countryIso);
    const nextWhatsapp = {
      countryIso,
      countryCode: dialCode || draft.whatsapp?.countryCode || "86",
      phone: draft.whatsapp?.phone ?? "",
      message: draft.whatsapp?.message ?? "",
    };

    updateDraft({
      targetType: "whatsapp",
      whatsapp: nextWhatsapp,
      defaultUrl: buildWhatsAppUrl(nextWhatsapp),
    });
  }

  function updateOpenAppField(field: "appName" | "copyText" | "appUrl", value: string) {
    const nextOpenApp: OpenAppTarget = {
      preset: draft.openApp?.preset ?? "wechat",
      appName: draft.openApp?.appName ?? "",
      copyText: draft.openApp?.copyText ?? "",
      silentCopy: draft.openApp?.silentCopy ?? false,
      appUrl: draft.openApp?.appUrl ?? "weixin://",
      [field]: value,
    };

    if (field === "copyText" && !value.trim()) {
      nextOpenApp.silentCopy = false;
    }

    updateDraft({
      targetType: "openapp",
      openApp: nextOpenApp,
      defaultUrl: nextOpenApp.appUrl ?? "",
    });

    if (field === "appName" && step2Errors.openAppName) {
      setStep2Errors((current) => ({ ...current, openAppName: undefined }));
    }

    if (field === "copyText" && step2Errors.openAppCopyText) {
      setStep2Errors((current) => ({ ...current, openAppCopyText: undefined }));
    }

    if (field === "appUrl" && step2Errors.openAppUrl) {
      setStep2Errors((current) => ({ ...current, openAppUrl: undefined }));
    }
  }

  function updateOpenAppPreset(preset: OpenAppPreset) {
    const nextAppUrl = preset === "wechat" ? "weixin://" : draft.openApp?.preset === "wechat" ? "" : draft.openApp?.appUrl ?? "";
    const nextOpenApp: OpenAppTarget = {
      preset,
      appName: draft.openApp?.appName ?? "",
      copyText: draft.openApp?.copyText ?? "",
      silentCopy: draft.openApp?.silentCopy ?? false,
      appUrl: nextAppUrl,
    };

    updateDraft({
      targetType: "openapp",
      openApp: nextOpenApp,
      defaultUrl: nextAppUrl,
    });

    if (step2Errors.openAppUrl) {
      setStep2Errors((current) => ({ ...current, openAppUrl: undefined }));
    }

    if (preset !== "custom" && step2Errors.openAppName) {
      setStep2Errors((current) => ({ ...current, openAppName: undefined }));
    }
  }

  function updateOpenAppSilentCopy(enabled: boolean) {
    const hasCopyText = Boolean(draft.openApp?.copyText?.trim());
    const nextOpenApp: OpenAppTarget = {
      preset: draft.openApp?.preset ?? "wechat",
      appName: draft.openApp?.appName ?? "",
      copyText: draft.openApp?.copyText ?? "",
      silentCopy: hasCopyText ? enabled : false,
      appUrl: draft.openApp?.appUrl ?? "weixin://",
    };

    updateDraft({
      targetType: "openapp",
      openApp: nextOpenApp,
      defaultUrl: nextOpenApp.appUrl ?? "",
    });
  }

  function updateVCardProfile(patch: Partial<VCardProfile>) {
    const nextVCard = buildNextVCardProfile(draft.vcard, draft.name ?? "", patch);

    updateDraft({
      targetType: "vcard",
      vcard: nextVCard,
      defaultUrl: "",
    });
  }

  function updateVCardField(field: "fullName" | "phone" | "email" | "company" | "title" | "website", value: string) {
    const patch: Partial<VCardProfile> = { [field]: value };
    updateVCardProfile(patch);

    if (field === "fullName" && step2Errors.vcardName) {
      setStep2Errors((current) => ({ ...current, vcardName: undefined }));
    }

    if (field === "phone" && step2Errors.vcardPhone) {
      setStep2Errors((current) => ({ ...current, vcardPhone: undefined }));
    }

    if (field === "website" && step2Errors.vcardWebsite) {
      setStep2Errors((current) => ({ ...current, vcardWebsite: undefined }));
    }
  }

  function addVCardSocialLink() {
    const currentSocialLinks = draft.vcard?.socialLinks ?? [];
    const nextPlatform =
      vcardSocialOptions.find((item) => !currentSocialLinks.some((social) => social.platform === item.value))?.value ?? "linkedin";

    updateVCardProfile({
      socialLinks: [...currentSocialLinks, { platform: nextPlatform as VCardSocialPlatform, url: "" }],
    });
  }

  function updateVCardSocialLink(index: number, patch: Partial<VCardSocialLink>) {
    const currentSocialLinks = draft.vcard?.socialLinks ?? [];
    const nextSocialLinks = currentSocialLinks.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    updateVCardProfile({ socialLinks: nextSocialLinks });
    clearIndexedStep2Error("vcardSocialLinks", index);
  }

  function removeVCardSocialLink(index: number) {
    const currentSocialLinks = draft.vcard?.socialLinks ?? [];
    updateVCardProfile({
      socialLinks: currentSocialLinks.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function openVCardImagePicker() {
    setMediaLibraryTarget("avatar");
  }

  async function discardUnpersistedManagedAsset(assetId?: string) {
    if (!assetId || persistedManagedAssetIdsRef.current.has(assetId) || !transientManagedAssetIdsRef.current.has(assetId)) {
      return;
    }

    await deleteManagedAsset(assetId).catch(() => undefined);
    transientManagedAssetIdsRef.current.delete(assetId);
  }

  async function syncRemovedManagedAssetsAfterSave() {
    const currentIds = collectManagedAssetIds({
      vcard: draft.vcard,
      design,
    });
    persistedManagedAssetIdsRef.current = currentIds;
  }

  async function resetVCardAvatar() {
    const currentAvatarAssetId = draft.vcard?.avatarAssetId;
    updateVCardProfile({
      imageAssets: [],
      avatarAssetId: undefined,
      avatarDataUrl: undefined,
      avatarFileName: undefined,
    });
    await discardUnpersistedManagedAsset(currentAvatarAssetId);
  }

  async function handleAvatarAssetSelect(asset: ManagedAssetRecord) {
    if (!isManagedAssetImageMimeType(asset.mimeType)) {
      return;
    }

    const previousAvatarAssetId = draft.vcard?.avatarAssetId;
    const nextAsset = createVCardImageAsset(asset);

    updateVCardProfile({
      imageAssets: [nextAsset],
      avatarAssetId: nextAsset.id,
      avatarDataUrl: nextAsset.dataUrl,
      avatarFileName: nextAsset.name,
    });
    setMediaLibraryTarget(null);

    if (previousAvatarAssetId && previousAvatarAssetId !== nextAsset.id) {
      await discardUnpersistedManagedAsset(previousAvatarAssetId);
    }
  }

  function updateAbWeight(nextWeight: number) {
    const safeWeight = normalizeAbWeight(nextWeight);
    updateDraft({
      abRules: [
        { variant: "A", weight: safeWeight, url: abRules[0]?.url ?? "" },
        { variant: "B", weight: 100 - safeWeight, url: abRules[1]?.url ?? "" },
      ],
    });
    if (step2Errors.abWeight) {
      setStep2Errors((current) => ({ ...current, abWeight: undefined }));
    }
  }

  function updateAbUrl(index: 0 | 1, nextUrl: string) {
    updateAbRule(index, { url: nextUrl });
    if (index === 0 && step2Errors.abUrlA) {
      setStep2Errors((current) => ({ ...current, abUrlA: undefined }));
    }
    if (index === 1 && step2Errors.abUrlB) {
      setStep2Errors((current) => ({ ...current, abUrlB: undefined }));
    }
  }

  async function setLogoType(type: (typeof logoOptions)[number]["id"]) {
    const currentCustomLogoAssetId = design.logoType === "custom" ? design.logoAssetId : undefined;

    if (type === "none") {
      updateDesign({ logoType: "none", logoUrl: undefined, logoAssetId: undefined, logoFileName: undefined });
      await discardUnpersistedManagedAsset(currentCustomLogoAssetId);
      return;
    }

    const preset = logoOptions.find((item) => item.id === type);
    updateDesign({
      logoType: type,
      logoUrl: preset && "url" in preset ? preset.url : undefined,
      logoAssetId: undefined,
      logoFileName: undefined,
    });
    await discardUnpersistedManagedAsset(currentCustomLogoAssetId);
  }

  function openLogoMediaLibrary() {
    setMediaLibraryTarget("logo");
  }

  async function handleLogoAssetSelect(asset: ManagedAssetRecord) {
    if (!isManagedAssetImageMimeType(asset.mimeType)) {
      return;
    }

    const previousCustomLogoAssetId = design.logoType === "custom" ? design.logoAssetId : undefined;

    setCustomLogoName(asset.name);
    updateDesign({
      logoType: "custom",
      logoUrl: asset.url,
      logoAssetId: asset.id,
      logoFileName: asset.name,
    });
    setMediaLibraryTarget(null);

    if (previousCustomLogoAssetId && previousCustomLogoAssetId !== asset.id) {
      await discardUnpersistedManagedAsset(previousCustomLogoAssetId);
    }
  }

  async function goToDesignStep() {
    const nextErrors = collectStep2Errors();
    setStep2Errors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (hasSupabaseEnv() && editingStatus === "draft") {
      setDraftPreviewLoading(true);
      setDraftPreviewError(null);

      try {
        const savedDraft = await saveEntryFromDraft({
          draft,
          design,
          status: "draft",
          existingId: workingEntryId ?? undefined,
        });
        const nextEntryId = savedDraft.id;

        updateDraft(buildDraftFromItem(savedDraft));
        updateDesign(savedDraft.design ?? design);
        setWorkingEntryId(savedDraft.id);
        setEditingStatus(savedDraft.status);
        setExistingPublicUrl(getEntryUrl(savedDraft));
        setPasswordOpen(Boolean(savedDraft.passwordConfigured));
        persistedManagedAssetIdsRef.current = collectManagedAssetIds({
          vcard: savedDraft.vcard,
          design: savedDraft.design,
        });

        if (nextEntryId) {
          const preview = await refreshEntryPreviewLink(nextEntryId);
          setDraftPreviewUrl(preview.previewUrl);
        }
      } catch (error) {
        setDraftPreviewError(
          error instanceof Error
            ? error.message
            : locale === "zh-Hant"
              ? "草稿預覽連結生成失敗，請稍後再試。"
              : locale === "zh-Hans"
                ? "草稿预览链接生成失败，请稍后再试。"
                : "Failed to generate a draft preview link. Please try again.",
        );
      } finally {
        setDraftPreviewLoading(false);
      }
    }

    setStep(3);
  }

  async function copyEntryUrl() {
    if (!previewEntryUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(previewEntryUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = previewEntryUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setEntryUrlCopied(true);
    window.setTimeout(() => setEntryUrlCopied(false), 1800);
  }

  async function saveDraftSnapshot() {
    const nextErrors = collectStep2Errors();
    if (Object.keys(nextErrors).length > 0) {
      setStep2Errors(nextErrors);
      return;
    }

    setPersistingAction("draft");

    try {
      if (hasSupabaseEnv()) {
        await saveEntryFromDraft({
          draft,
          design,
          status: "draft",
          existingId: workingEntryId ?? undefined,
        });
        await syncRemovedManagedAssetsAfterSave();
      }

      router.push(withLocale(locale, "/qrs"));
      router.refresh();
    } catch (error) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : locale === "zh-Hant"
              ? "儲存草稿失敗，請稍後再試。"
              : locale === "zh-Hans"
                ? "保存草稿失败，请稍后再试。"
                : "Failed to save the draft. Please try again.",
      });
    } finally {
      setPersistingAction(null);
    }
  }

  async function generateEntry() {
    const nextErrors = collectStep2Errors();
    if (Object.keys(nextErrors).length > 0) {
      setStep2Errors(nextErrors);
      return;
    }

    setPersistingAction("generate");

    try {
      if (hasSupabaseEnv()) {
        await saveEntryFromDraft({
          draft,
          design,
          status: isDraftEntry ? "active" : isEditing ? editingStatus : "active",
          existingId: workingEntryId ?? undefined,
        });
        await syncRemovedManagedAssetsAfterSave();
      }

      router.push(withLocale(locale, "/qrs"));
      router.refresh();
    } catch (error) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : locale === "zh-Hant"
              ? "發布入口失敗，請稍後再試。"
              : locale === "zh-Hans"
                ? "发布入口失败，请稍后再试。"
                : "Failed to publish the entry. Please try again.",
      });
    } finally {
      setPersistingAction(null);
    }
  }

  if (isHydratingEntry) {
    return (
      <Card>
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-900">
            {locale === "zh-Hant" ? "正在載入入口…" : locale === "zh-Hans" ? "正在加载入口…" : "Loading entry…"}
          </div>
          <div className="text-sm text-slate-500">
            {locale === "zh-Hant"
              ? "我們正在帶入這個入口的既有設定。"
              : locale === "zh-Hans"
                ? "我们正在带入这个入口的已有设置。"
                : "We are loading the existing entry configuration now."}
          </div>
        </div>
      </Card>
    );
  }

  if (editLoadError) {
    return (
      <Card>
        <div className="space-y-4">
          <div className="text-sm font-semibold text-rose-600">{editLoadError}</div>
          <Button type="button" variant="secondary" onClick={() => router.push(withLocale(locale, "/qrs"))}>
            {locale === "zh-Hant" ? "返回入口管理" : locale === "zh-Hans" ? "返回入口管理" : "Back to entry management"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div ref={flowRef} className="space-y-6 overflow-x-clip">
      <section className="rounded-[30px] border border-white/70 bg-white/75 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {t.create.steps.map((item, index) => {
            const active = step === index + 1;
            const done = step > index + 1;
            return (
              <button
                key={item}
                onClick={() => setStep(index + 1)}
                className={`min-w-0 rounded-[24px] px-3 py-4 text-left transition sm:px-5 sm:py-5 ${
                  active
                    ? "bg-[linear-gradient(135deg,rgba(99,188,248,0.16),rgba(141,121,255,0.1))] ring-1 ring-[rgba(145,180,247,0.3)]"
                    : done
                    ? "bg-emerald-50 ring-1 ring-emerald-100"
                    : "bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(250,252,255,0.86))] ring-1 ring-[rgba(190,206,226,0.4)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold sm:h-10 sm:w-10 ${
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                        ? "bg-[linear-gradient(135deg,#26bdf0_0%,#8b7cfb_100%)] text-white"
                        : "bg-white text-slate-500 ring-1 ring-slate-200"
                    }`}
                  >
                    {done ? <Check size={16} /> : index + 1}
                  </span>
                  <span className="hidden text-[11px] uppercase tracking-[0.16em] text-slate-400 sm:block">
                    {index === 0 ? "Describe" : index === 1 ? "Review" : "Design"}
                  </span>
                </div>
                <div className="mt-3 text-sm font-medium text-slate-800 sm:mt-4 sm:text-base">{item}</div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card className="space-y-5">
          {step === 1 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{t.create.step1FriendlyTitle}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t.create.step1FriendlyBody}</p>
                </div>
                <Badge tone="info">{messages.length} msgs</Badge>
              </div>

              <div className="space-y-3">
                <div className="max-w-[86%] ml-auto rounded-[24px] px-4 py-4 text-sm leading-7 shadow-[0_10px_24px_rgba(31,55,92,0.04)] bg-[linear-gradient(135deg,rgba(99,188,248,0.12),rgba(141,121,255,0.08))] ring-1 ring-[rgba(145,180,247,0.28)]">
                  <div className="mb-1 text-xs uppercase tracking-[0.16em] text-slate-400">AI</div>
                  {t.create.step1Intro}
                </div>

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[86%] rounded-[24px] px-4 py-4 text-sm leading-7 shadow-[0_10px_24px_rgba(31,55,92,0.04)] ${
                      message.role === "user"
                        ? "bg-white ring-1 ring-[rgba(190,206,226,0.42)]"
                        : "ml-auto bg-[linear-gradient(135deg,rgba(99,188,248,0.12),rgba(141,121,255,0.08))] ring-1 ring-[rgba(145,180,247,0.28)]"
                    }`}
                  >
                    <div className="mb-1 text-xs uppercase tracking-[0.16em] text-slate-400">{message.role === "user" ? "You" : "AI"}</div>
                    {message.content}
                  </div>
                ))}

                {showSuggestionCard ? (
                  <div className="rounded-[24px] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.95),rgba(243,244,255,0.98))] px-4 py-4 shadow-[0_10px_24px_rgba(31,55,92,0.04)]">
                    <div className="text-sm font-semibold text-slate-900">{t.create.suggestionTitle}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">{t.create.suggestionBody}</div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[18px] bg-white/90 px-4 py-3 ring-1 ring-slate-100">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{t.create.suggestionTargetLabel}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{suggestedTargetLabel}</div>
                      </div>
                      <div className="rounded-[18px] bg-white/90 px-4 py-3 ring-1 ring-slate-100">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{t.create.suggestionRuleLabel}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{suggestedRuleLabel}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button onClick={applySuggestedSetup} className={CREATE_FLOW_PRIMARY_BUTTON_CLASS}>
                        {t.create.suggestionApply}
                      </Button>
                      <span className="text-sm text-slate-500">{t.create.suggestionManualHint}</span>
                    </div>
                  </div>
                ) : null}

                {showDirectionPendingCard ? (
                  <div className="rounded-[24px] border border-amber-100 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] px-4 py-4 shadow-[0_10px_24px_rgba(31,55,92,0.04)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{t.create.directionPendingTitle}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-500">{t.create.directionPendingBody}</div>
                      </div>
                      <Badge tone="info">{t.create.directionConfirmedBadge}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[18px] bg-white/90 px-4 py-3 ring-1 ring-slate-100">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{t.create.suggestionTargetLabel}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{confirmedTargetLabel}</div>
                      </div>
                      <div className="rounded-[18px] bg-white/90 px-4 py-3 ring-1 ring-slate-100">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{t.create.suggestionRuleLabel}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{confirmedRuleLabel}</div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[18px] bg-white/90 px-4 py-3 text-sm text-slate-600 ring-1 ring-[rgba(190,206,226,0.42)]">
                      <span className="font-semibold text-slate-900">{t.create.directionMissingLabel}</span>
                      <span className="ml-2">{missingFieldsText}</span>
                    </div>
                  </div>
                ) : null}

                {showDirectionReadyCard ? (
                  <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,0.98),rgba(255,255,255,0.98))] px-4 py-4 shadow-[0_10px_24px_rgba(31,55,92,0.04)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{t.create.directionReadyTitle}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-500">{t.create.directionReadyBody}</div>
                      </div>
                      <Badge tone="success">{t.create.directionReadyBadge}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[18px] bg-white/90 px-4 py-3 ring-1 ring-slate-100">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{t.create.suggestionTargetLabel}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{confirmedTargetLabel}</div>
                      </div>
                      <div className="rounded-[18px] bg-white/90 px-4 py-3 ring-1 ring-slate-100">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{t.create.suggestionRuleLabel}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{confirmedRuleLabel}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button onClick={() => enterReviewStep()} className={CREATE_FLOW_PRIMARY_BUTTON_CLASS}>
                        {t.create.enterReview}
                      </Button>
                      <span className="text-sm text-slate-500">{t.create.directionReadyHint}</span>
                    </div>
                  </div>
                ) : null}

                {collectionGuide ? (
                  <div className="rounded-[24px] border border-slate-100 bg-white/94 px-4 py-4 shadow-[0_10px_24px_rgba(31,55,92,0.04)]">
                    <div className="text-sm font-semibold text-slate-900">{collectionGuide.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">{collectionGuide.body}</div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{t.create.collectionRequiredTitle}</div>
                        {collectionGuide.required.map((item) => {
                          const filled = Boolean(item.value);
                          return (
                            <div key={`required-${item.label}`} className="flex items-center justify-between gap-3 rounded-[18px] bg-slate-50/90 px-4 py-3 ring-1 ring-slate-100">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900">{item.label}</div>
                                <div className="mt-1 truncate text-xs text-slate-500">{item.value || t.create.collectionPendingField}</div>
                              </div>
                              <Badge tone={filled ? "success" : "default"}>{filled ? t.create.collectionFilled : t.create.collectionPending}</Badge>
                            </div>
                          );
                        })}
                      </div>
                      <div className="space-y-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{t.create.collectionOptionalTitle}</div>
                        {collectionGuide.optional.map((item) => {
                          const filled = Boolean(item.value);
                          return (
                            <div key={`optional-${item.label}`} className="flex items-center justify-between gap-3 rounded-[18px] bg-slate-50/90 px-4 py-3 ring-1 ring-slate-100">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900">{item.label}</div>
                                <div className="mt-1 truncate text-xs text-slate-500">{item.value || t.create.collectionOptionalField}</div>
                              </div>
                              <Badge tone={filled ? "info" : "default"}>{filled ? t.create.collectionFilled : t.create.collectionOptional}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(245,249,255,0.95),rgba(248,244,255,0.92))] p-4 shadow-inner">
                <div className="rounded-[24px] border border-slate-100 bg-white/95 p-4">
                  <textarea
                    className="min-h-[120px] w-full resize-none rounded-[20px] border border-[rgba(190,206,226,0.42)] bg-white px-4 py-3 text-sm outline-none focus:border-sky-300"
                    placeholder={step1PlaceholderText}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (!loading) submitMessage();
                      }
                    }}
                  />
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-500">
                      {t.create.recognized}: {recognizedCount}
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                      <Button
                        variant="secondary"
                        onClick={() => enterReviewStep()}
                        disabled={!canEnterReview}
                        className={CREATE_FLOW_SECONDARY_BUTTON_CLASS}
                      >
                        {t.create.enterReview}
                      </Button>
                      <Button onClick={submitMessage} disabled={loading} className={`${CREATE_FLOW_PRIMARY_BUTTON_CLASS} justify-center`}>
                        {loading ? t.common.loading : t.create.send}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{t.create.step2Title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {locale === "zh-Hant" ? "確認必填資訊，其他選項可按需展開。" : "Fill in the required fields. Expand optional settings as needed."}
                </p>
              </div>

              {/* Required: Basic info */}
              <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-base font-semibold text-slate-900">
                    {locale === "zh-Hant" ? "基本資訊" : "Basic information"}
                  </div>
                  <Badge tone="info">{t.common.required}</Badge>
                </div>
      <div className="space-y-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium text-slate-700">{t.create.targetTypeLabel}</div>
                      {isTargetTypeLocked ? (
                        <Badge className="gap-1.5">
                          <LockKeyhole size={12} />
                          {t.create.targetTypeLockedBadge}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{isTargetTypeLocked ? t.create.targetTypeLockedHint : t.create.targetTypeBody}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {([
                        { id: "web" as const, title: t.create.targetTypeWeb, body: t.create.targetTypeWebBody },
                        { id: "openapp" as const, title: t.create.targetTypeOpenApp, body: t.create.targetTypeOpenAppBody },
                        { id: "whatsapp" as const, title: t.create.targetTypeWhatsapp, body: t.create.targetTypeWhatsappBody },
                        { id: "vcard" as const, title: t.create.targetTypeVcard, body: t.create.targetTypeVcardBody },
                      ]).map((target) => (
                        <button
                          key={target.id}
                          type="button"
                          disabled={isTargetTypeLocked}
                          onClick={() => setTargetType(target.id)}
                          className={`rounded-[20px] px-4 py-4 text-left ring-1 transition ${
                            selectedTargetType === target.id
                              ? "bg-[linear-gradient(135deg,rgba(18,119,255,0.12),rgba(8,184,164,0.1))] ring-sky-100"
                              : "bg-white ring-slate-100"
                          } ${isTargetTypeLocked ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          <div className="text-sm font-semibold text-slate-900">{target.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">{target.body}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label={t.create.qrName}
                      labelBadge={t.common.required}
                      value={draft.name ?? ""}
                      error={step2Errors.qrName}
                      onChange={(event) => {
                        updateDraft({ name: event.target.value });
                        if (step2Errors.qrName) {
                          setStep2Errors((current) => ({ ...current, qrName: undefined }));
                        }
                      }}
                    />

                    {selectedTargetType === "web" ? (
                      <Input
                        label={t.create.webUrlLabel}
                        labelBadge={t.common.required}
                        value={draft.defaultUrl ?? ""}
                        error={step2Errors.targetUrl}
                        hint={!step2Errors.targetUrl ? getUrlHint(locale, "https://example.com") : undefined}
                        placeholder="https://example.com"
                        onChange={(event) => {
                          updateDraft({ defaultUrl: event.target.value, targetType: "web" });
                          if (step2Errors.targetUrl) {
                            setStep2Errors((current) => ({ ...current, targetUrl: undefined }));
                          }
                        }}
                      />
                    ) : null}

                    {selectedTargetType === "openapp" ? (
                      <>
                          <div className="md:col-span-2">
                          <div className="text-sm font-medium text-slate-700">{t.create.openAppPresetLabel}</div>
                          <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            {([
                              { id: "wechat" as const, label: t.create.openAppPresetWechat, body: "weixin://" },
                              {
                                id: "custom" as const,
                                label: t.create.openAppPresetCustom,
                                body: locale === "zh-Hant" ? "自訂 Deep Link / Universal Link" : locale === "zh-Hans" ? "自定义 Deep Link / Universal Link" : "Custom deep link / universal link",
                              },
                            ]).map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => updateOpenAppPreset(option.id)}
                                className={`rounded-[20px] px-4 py-4 text-left ring-1 transition ${
                                  (draft.openApp?.preset ?? "wechat") === option.id
                                    ? "bg-[linear-gradient(135deg,rgba(18,119,255,0.12),rgba(8,184,164,0.1))] ring-sky-100"
                                    : "bg-white ring-slate-100"
                                }`}
                              >
                                <div className="text-sm font-semibold text-slate-900">{option.label}</div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">{option.body}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        {draft.openApp?.preset === "custom" ? (
                          <Input
                            label={t.create.openAppNameLabel}
                            labelBadge={t.common.required}
                            value={draft.openApp?.appName ?? ""}
                            error={step2Errors.openAppName}
                            hint={!step2Errors.openAppName ? t.create.openAppNameHint : undefined}
                            placeholder={locale === "zh-Hant" ? "例如：Telegram" : locale === "zh-Hans" ? "例如：Telegram" : "For example: Telegram"}
                            onChange={(event) => updateOpenAppField("appName", event.target.value)}
                          />
                        ) : null}
                        <Input
                          label={t.create.openAppCopyTextLabel}
                          value={draft.openApp?.copyText ?? ""}
                          error={step2Errors.openAppCopyText}
                          hint={
                            locale === "zh-Hant"
                              ? "選填。填寫後會顯示單按鈕確認頁；留空則直接跳轉。"
                              : locale === "zh-Hans"
                                ? "选填。填写后会显示单按钮确认页；留空则直接跳转。"
                                : "Optional. When provided, visitors will see a single-button confirmation page before opening the app."
                          }
                          placeholder={locale === "zh-Hant" ? "例如：客服微信號 / 邀請碼" : locale === "zh-Hans" ? "例如：客服微信号 / 邀请码" : "For example: WeChat ID or invite code"}
                          onChange={(event) => updateOpenAppField("copyText", event.target.value)}
                        />
                        {draft.openApp?.copyText?.trim() ? (
                          <div className="md:col-span-2">
                            <section className="rounded-[20px] border border-slate-100 bg-slate-50/75 p-5 shadow-sm">
                              <div className="flex items-center justify-between gap-4">
                                <div className="text-base font-semibold text-slate-900">{t.create.openAppSilentCopyLabel}</div>
                                <button
                                  type="button"
                                  onClick={() => updateOpenAppSilentCopy(!Boolean(draft.openApp?.silentCopy && draft.openApp?.copyText?.trim()))}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    draft.openApp?.silentCopy && draft.openApp?.copyText?.trim() ? "bg-sky-500" : "bg-slate-200"
                                  }`}
                                  aria-pressed={Boolean(draft.openApp?.silentCopy && draft.openApp?.copyText?.trim())}
                                  aria-label={t.create.openAppSilentCopyLabel}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                      draft.openApp?.silentCopy && draft.openApp?.copyText?.trim() ? "translate-x-6" : "translate-x-1"
                                    }`}
                                  />
                                </button>
                              </div>
                              <div className="mt-2 text-xs leading-5 text-slate-400">{t.create.openAppSilentCopyHint}</div>
                            </section>
                          </div>
                        ) : null}
                        <div className="md:col-span-2">
                          <Input
                            label={t.create.openAppUrlLabel}
                            labelBadge={t.common.required}
                            value={draft.openApp?.appUrl ?? ""}
                            error={step2Errors.openAppUrl}
                            hint={!step2Errors.openAppUrl ? t.create.openAppUrlHint : undefined}
                            placeholder={draft.openApp?.preset === "custom" ? "myapp://open" : "weixin://"}
                            onChange={(event) => updateOpenAppField("appUrl", event.target.value)}
                          />
                        </div>
                      </>
                    ) : null}

                    {selectedTargetType === "whatsapp" ? (
                      <>
                        <div>
                          <SearchableSelect
                            label={t.create.whatsappCountryCode}
                            labelBadge={t.common.required}
                            value={selectedWhatsappCountryIso}
                            options={whatsappCountryOptions}
                            placeholder={locale === "zh-Hant" ? "選擇國家 / 區號" : locale === "zh-Hans" ? "选择国家 / 区号" : "Select country / code"}
                            searchPlaceholder={locale === "zh-Hant" ? "搜索國家、區號或英文名…" : locale === "zh-Hans" ? "搜索国家、区号或英文名…" : "Search country, code, or English name…"}
                            noResultsLabel={locale === "zh-Hant" ? "找不到對應國家" : locale === "zh-Hans" ? "找不到对应国家" : "No matching country"}
                            showValue={false}
                            onChange={updateWhatsAppCountry}
                          />
                          <p className="mt-2 text-xs text-slate-500">
                            {locale === "zh-Hant"
                              ? "支援全部國家，可直接搜索國家名稱、區號或英文名。"
                              : locale === "zh-Hans"
                                ? "支持全部国家，可直接搜索国家名称、区号或英文名。"
                                : "Supports all countries. Search by country name, dialing code, or English name."}
                          </p>
                        </div>
                        <Input
                          label={t.create.whatsappPhone}
                          labelBadge={t.common.required}
                          value={draft.whatsapp?.phone ?? ""}
                          error={step2Errors.whatsappPhone}
                          placeholder="13800138000"
                          onChange={(event) => updateWhatsAppField("phone", event.target.value)}
                        />
                        <div className="md:col-span-2">
                          <Input
                            label={t.create.whatsappMessage}
                            value={draft.whatsapp?.message ?? ""}
                            hint={t.create.whatsappHint}
                            placeholder={locale === "zh-Hant" ? "你好，我想了解更多。" : locale === "zh-Hans" ? "你好，我想了解更多。" : "Hi, I'd like to learn more."}
                            onChange={(event) => updateWhatsAppField("message", event.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <div className="rounded-[20px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(239,246,255,0.88))] p-4 ring-1 ring-slate-100/90">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                  <span>{t.common.defaultUrl}</span>
                                  <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                                    {locale === "zh-Hant" ? "自動生成" : locale === "zh-Hans" ? "自动生成" : "Auto"}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{t.create.autoGeneratedUrlHint}</p>
                              </div>
                              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/90 text-slate-500 ring-1 ring-slate-200">
                                <LockKeyhole size={16} />
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-3 rounded-[16px] border border-dashed border-slate-200 bg-white/90 px-4 py-3">
                              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700 ring-1 ring-sky-100">
                                wa.me
                              </span>
                              <div className="min-w-0 flex-1 truncate font-mono text-sm text-slate-700">{draft.defaultUrl ?? "https://wa.me/"}</div>
                            </div>
                            <div className="mt-2 text-xs font-medium text-slate-400">
                              {locale === "zh-Hant"
                                ? "此欄位會跟著國碼、號碼與預填訊息自動更新，目前不可手動編輯。"
                                : locale === "zh-Hans"
                                  ? "此字段会跟着国家区号、号码与预填消息自动更新，目前不可手动编辑。"
                                  : "This URL updates automatically from the country code, phone number, and prefilled message. It cannot be edited manually right now."}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}

                    {selectedTargetType === "vcard" ? (
                      <>
                        <Input
                          label={t.create.vcardFullName}
                          labelBadge={t.common.required}
                          value={draft.vcard?.fullName ?? ""}
                          error={step2Errors.vcardName}
                          onChange={(event) => updateVCardField("fullName", event.target.value)}
                        />
                        <Input
                          label={t.create.vcardPhone}
                          value={draft.vcard?.phone ?? ""}
                          error={step2Errors.vcardPhone}
                          onChange={(event) => updateVCardField("phone", event.target.value)}
                        />
                        <Input
                          label={t.create.vcardEmail}
                          value={draft.vcard?.email ?? ""}
                          onChange={(event) => updateVCardField("email", event.target.value)}
                        />
                        <Input label={t.create.vcardCompany} value={draft.vcard?.company ?? ""} onChange={(event) => updateVCardField("company", event.target.value)} />
                        <Input label={t.create.vcardTitle} value={draft.vcard?.title ?? ""} onChange={(event) => updateVCardField("title", event.target.value)} />
                        <Input
                          label={t.create.vcardWebsite}
                          value={draft.vcard?.website ?? ""}
                          error={step2Errors.vcardWebsite}
                          hint={!step2Errors.vcardWebsite ? getUrlHint(locale, "https://your-site.com") : undefined}
                          placeholder="https://your-site.com"
                          onChange={(event) => updateVCardField("website", event.target.value)}
                        />
                        <div className="md:col-span-2 rounded-[22px] border border-[rgba(190,206,226,0.52)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] md:p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{t.create.vcardSocialTitle}</div>
                              <div className="mt-1 text-xs leading-5 text-slate-500">{t.create.vcardSocialBody}</div>
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              className="self-start rounded-[14px] px-4 py-2.5 text-xs md:min-w-[160px]"
                              icon={<Plus size={14} />}
                              onClick={addVCardSocialLink}
                            >
                              {t.create.vcardSocialAdd}
                            </Button>
                          </div>

                          {draft.vcard?.socialLinks?.length ? (
                            <div className="mt-4 space-y-3">
                              {draft.vcard.socialLinks.map((social, index) => (
                                <div
                                  key={`${social.platform}-${index}`}
                                  className="rounded-[20px] border border-slate-100 bg-slate-50/70 p-4"
                                >
                                  <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
                                    <SearchableSelect
                                      label={t.create.vcardSocialPlatform}
                                      value={social.platform}
                                      options={vcardSocialOptions}
                                      placeholder={locale === "zh-Hant" ? "選擇平台" : locale === "zh-Hans" ? "选择平台" : "Choose a platform"}
                                      searchPlaceholder={t.create.vcardSocialSearchPlaceholder}
                                      noResultsLabel={t.create.vcardSocialNoResults}
                                      showValue={false}
                                      onChange={(value) => updateVCardSocialLink(index, { platform: value as VCardSocialPlatform })}
                                    />
                                    <Input
                                      label={t.create.vcardSocialUrl}
                                      value={social.url}
                                      error={step2Errors.vcardSocialLinks?.[index]}
                                      hint={!step2Errors.vcardSocialLinks?.[index] ? getSocialInputHint(locale, social.platform) : undefined}
                                      placeholder={getVCardSocialPlaceholder(social.platform)}
                                      onChange={(event) => updateVCardSocialLink(index, { url: event.target.value })}
                                    />
                                  </div>
                                  <div className="mt-3 flex justify-end">
                                    <Button type="button" variant="ghost" className="text-rose-600" onClick={() => removeVCardSocialLink(index)} icon={<Trash2 size={14} />}>
                                      {t.common.remove}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm leading-6 text-slate-500">
                              {t.create.vcardSocialEmpty}
                            </div>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <div className="rounded-[22px] border border-[rgba(190,206,226,0.52)] bg-slate-50/75 p-4 md:p-5">
                            <div className="flex flex-col gap-5">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{t.create.vcardAvatarTitle}</div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">{t.create.vcardAvatarBody}</div>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-[120px_minmax(0,1fr)] md:items-center">
                              <div className="relative h-28 w-28 overflow-hidden rounded-[28px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
                                <Image src={vcardAvatarPreviewSrc} alt={draft.vcard?.fullName || draft.name || "vCard avatar"} fill unoptimized sizes="112px" className="object-cover" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-base font-semibold text-slate-900">
                                  {selectedVCardAvatarAsset?.name ?? draft.vcard?.avatarFileName ?? t.create.vcardAvatarDefaultState}
                                </div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">
                                  {selectedVCardAvatarAsset
                                    ? `${formatAssetSize(selectedVCardAvatarAsset.size)} · ${t.create.vcardImageVisibilityPublic}`
                                    : t.create.vcardAvatarDefaultHint}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="rounded-[14px] px-3 py-2 text-xs"
                                    icon={<Upload size={14} />}
                                    onClick={openVCardImagePicker}
                                  >
                                    {locale === "zh-Hant" ? "從媒體庫選擇" : locale === "zh-Hans" ? "从媒体库选择" : "Choose from library"}
                                  </Button>
                                  {selectedVCardAvatarAsset || draft.vcard?.avatarDataUrl ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="rounded-[14px] px-3 py-2 text-xs"
                                      onClick={resetVCardAvatar}
                                    >
                                      {t.create.vcardAvatarReset}
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </section>

              {/* Collapsible: Rule mode */}
              <section className="rounded-[24px] border border-white/80 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setRuleOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-900">
                      {locale === "zh-Hant" ? "訪問規則" : locale === "zh-Hans" ? "访问规则" : "Routing rules"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {selectedTargetType !== "web"
                        ? t.create.simpleTargetRulesHint
                        : draft.ruleMode && draft.ruleMode !== "none"
                        ? draft.ruleMode === "language"
                          ? locale === "zh-Hant" ? "語言模式已啟用" : "Language mode on"
                          : draft.ruleMode === "region"
                            ? locale === "zh-Hant" ? "地區模式已啟用" : locale === "zh-Hans" ? "地区模式已启用" : "Region mode on"
                          : draft.ruleMode === "device"
                            ? locale === "zh-Hant" ? "設備系統模式已啟用" : locale === "zh-Hans" ? "设备系统模式已启用" : "Device OS mode on"
                            : draft.ruleMode === "param"
                              ? locale === "zh-Hant" ? "參數模式已啟用" : locale === "zh-Hans" ? "参数模式已启用" : "Param mode on"
                              : locale === "zh-Hant" ? "A/B Test 已啟用" : locale === "zh-Hans" ? "A/B Test 已启用" : "A/B test on"
                        : locale === "zh-Hant" ? "預設關閉，所有訪客使用同一連結" : locale === "zh-Hans" ? "默认关闭，所有访客使用同一链接" : "Off by default — all visitors use the same URL"}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${ruleOpen ? "rotate-180" : ""}`} />
                </button>
                {ruleOpen ? (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                      {(["none", "language", "region", "device", "param", "ab"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          disabled={selectedTargetType !== "web" && mode !== "none"}
                          className={`rounded-[20px] px-4 py-4 text-left ring-1 transition ${
                            (draft.ruleMode ?? "none") === mode
                              ? "bg-[linear-gradient(135deg,rgba(18,119,255,0.12),rgba(8,184,164,0.1))] ring-sky-100"
                              : "bg-white ring-slate-100"
                          } ${selectedTargetType !== "web" && mode !== "none" ? "cursor-not-allowed opacity-45" : ""}`}
                          onClick={() => setRuleMode(mode)}
                        >
                          <div className="text-sm font-semibold text-slate-900">
                            {mode === "none" ? (locale === "zh-Hant" ? "關閉" : locale === "zh-Hans" ? "关闭" : "Off") : null}
                            {mode === "language" ? (locale === "zh-Hant" ? "語言" : locale === "zh-Hans" ? "语言" : "Language") : null}
                            {mode === "region" ? (locale === "zh-Hant" ? "國家/地區" : locale === "zh-Hans" ? "国家/地区" : "Region") : null}
                            {mode === "device" ? (locale === "zh-Hant" ? "設備系統" : locale === "zh-Hans" ? "设备系统" : "Device OS") : null}
                            {mode === "param" ? (locale === "zh-Hant" ? "參數" : locale === "zh-Hans" ? "参数" : "Param") : null}
                            {mode === "ab" ? "A/B Test" : null}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {mode === "none"
                              ? locale === "zh-Hant" ? "統一跳轉" : locale === "zh-Hans" ? "统一跳转" : "Single URL"
                              : locale === "zh-Hant" ? "與其他模式互斥" : locale === "zh-Hans" ? "与其他模式互斥" : "Mutually exclusive"}
                          </div>
                        </button>
                      ))}
                    </div>

                    {selectedTargetType !== "web" ? (
                      <div className="rounded-[20px] border border-sky-100 bg-sky-50/85 px-4 py-4 text-sm leading-6 text-slate-600">
                        {t.create.simpleTargetRulesHint}
                      </div>
                    ) : null}

                    {draft.ruleMode === "language" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-700">
                            {locale === "zh-Hant" ? "語言規則" : locale === "zh-Hans" ? "语言规则" : "Language rules"}
                          </div>
                          <Button variant="secondary" icon={<Plus size={14} />} onClick={addLanguageRule}>
                            {t.create.addLanguage}
                          </Button>
                        </div>
                        {draft.languageRules?.map((rule, index) => (
                          <div key={`lang-${index}`} className="grid gap-3 rounded-[20px] bg-slate-50/85 p-4 ring-1 ring-slate-100 md:grid-cols-[220px_1fr_auto]">
                            <SearchableSelect
                              label={t.create.language}
                              value={rule.language}
                              options={LANGUAGES.map((language) => ({
                                value: language.code,
                                label: getLanguageDisplayLabel(language, locale),
                                description: getLanguageDisplayDescription(language, locale),
                                keywords: `${language.code} ${language.en} ${language["zh-Hant"]}`,
                              }))}
                              placeholder={locale === "zh-Hant" ? "選擇語言" : locale === "zh-Hans" ? "选择语言" : "Select language"}
                              searchPlaceholder={locale === "zh-Hant" ? "搜索語言…" : locale === "zh-Hans" ? "搜索语言…" : "Search language…"}
                              onChange={(val) => updateLanguageRule(index, { language: val })}
                            />
                            <Input
                              label="URL"
                              value={rule.url}
                              error={step2Errors.languageRuleUrls?.[index]}
                              hint={!step2Errors.languageRuleUrls?.[index] ? getUrlHint(locale, "https://example.com/en") : undefined}
                              placeholder="https://example.com/en"
                              onChange={(e) => {
                                updateLanguageRule(index, { url: e.target.value });
                                clearIndexedStep2Error("languageRuleUrls", index);
                              }}
                            />
                            <Button variant="ghost" className="mt-7 text-rose-600" onClick={() => removeLanguageRule(index)} icon={<Trash2 size={14} />}>
                              {t.common.remove}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {draft.ruleMode === "region" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-700">
                            {locale === "zh-Hant" ? "國家/地區規則" : locale === "zh-Hans" ? "国家/地区规则" : "Region rules"}
                          </div>
                          <Button variant="secondary" icon={<Plus size={14} />} onClick={addRegionRule}>
                            {t.create.addRegion}
                          </Button>
                        </div>
                        {draft.regionRules?.map((rule, index) => (
                          <div key={`region-${index}`} className="grid gap-3 rounded-[20px] bg-slate-50/85 p-4 ring-1 ring-slate-100 md:grid-cols-[220px_1fr_auto]">
                            <SearchableSelect
                              label={t.create.region}
                              value={rule.region}
                              options={regionCountryOptions}
                              placeholder={locale === "zh-Hant" ? "選擇國家/地區" : locale === "zh-Hans" ? "选择国家/地区" : "Select country / region"}
                              searchPlaceholder={locale === "zh-Hant" ? "搜索國家、代碼或英文名…" : locale === "zh-Hans" ? "搜索国家、代码或英文名…" : "Search country, code, or English name…"}
                              noResultsLabel={locale === "zh-Hant" ? "找不到對應國家/地區" : locale === "zh-Hans" ? "找不到对应国家/地区" : "No matching country / region"}
                              showValue={false}
                              onChange={(val) => updateRegionRule(index, { region: val })}
                            />
                            <Input
                              label="URL"
                              value={rule.url}
                              error={step2Errors.regionRuleUrls?.[index]}
                              hint={!step2Errors.regionRuleUrls?.[index] ? getUrlHint(locale, "https://example.com/tw") : undefined}
                              placeholder="https://example.com/tw"
                              onChange={(e) => {
                                updateRegionRule(index, { url: e.target.value });
                                clearIndexedStep2Error("regionRuleUrls", index);
                              }}
                            />
                            <Button variant="ghost" className="mt-7 text-rose-600" onClick={() => removeRegionRule(index)} icon={<Trash2 size={14} />}>
                              {t.common.remove}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {draft.ruleMode === "device" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-700">
                            {locale === "zh-Hant" ? "設備系統規則" : locale === "zh-Hans" ? "设备系统规则" : "Device OS rules"}
                          </div>
                          <Button variant="secondary" icon={<Plus size={14} />} onClick={addDeviceRule}>
                            {t.create.addDevice}
                          </Button>
                        </div>
                        {draft.deviceRules?.map((rule, index) => (
                          <div key={`device-${index}`} className="grid gap-3 rounded-[20px] bg-slate-50/85 p-4 ring-1 ring-slate-100 md:grid-cols-[220px_1fr_auto]">
                            <SearchableSelect
                              label={t.create.deviceOs}
                              value={rule.os}
                              options={DEVICE_SYSTEMS.map((item) => ({
                                value: item.value,
                                label: locale === "zh-Hant" ? item.zhHant : item.en,
                              }))}
                              placeholder={locale === "zh-Hant" ? "選擇設備系統" : locale === "zh-Hans" ? "选择设备系统" : "Select device OS"}
                              searchPlaceholder={locale === "zh-Hant" ? "搜索設備系統…" : locale === "zh-Hans" ? "搜索设备系统…" : "Search device OS…"}
                              onChange={(val) => updateDeviceRule(index, { os: val })}
                            />
                            <Input
                              label="URL"
                              value={rule.url}
                              error={step2Errors.deviceRuleUrls?.[index]}
                              hint={!step2Errors.deviceRuleUrls?.[index] ? getUrlHint(locale, "https://example.com/mobile") : undefined}
                              placeholder="https://example.com/mobile"
                              onChange={(e) => {
                                updateDeviceRule(index, { url: e.target.value });
                                clearIndexedStep2Error("deviceRuleUrls", index);
                              }}
                            />
                            <Button variant="ghost" className="mt-7 text-rose-600" onClick={() => removeDeviceRule(index)} icon={<Trash2 size={14} />}>
                              {t.common.remove}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {draft.ruleMode === "param" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-700">
                            {locale === "zh-Hant" ? "參數規則" : locale === "zh-Hans" ? "参数规则" : "Param rules"}
                          </div>
                          <Button variant="secondary" icon={<Plus size={14} />} onClick={addParamRule}>
                            {t.create.addParam}
                          </Button>
                        </div>
                        {draft.paramRules?.map((rule, index) => (
                          <div
                            key={`param-${index}`}
                            className="grid gap-3 rounded-[20px] bg-slate-50/85 p-4 ring-1 ring-slate-100 md:grid-cols-[160px_160px_1fr_auto]"
                          >
                            <Input
                              label={t.create.paramKey}
                              value={rule.key}
                              placeholder={locale === "zh-Hant" ? "例如 utm_campaign" : locale === "zh-Hans" ? "例如 utm_campaign" : "e.g. utm_campaign"}
                              onChange={(e) => updateParamRule(index, { key: e.target.value })}
                            />
                            <Input
                              label={t.create.paramValue}
                              value={rule.value}
                              placeholder={locale === "zh-Hant" ? "例如 spring" : locale === "zh-Hans" ? "例如 spring" : "e.g. spring"}
                              onChange={(e) => updateParamRule(index, { value: e.target.value })}
                            />
                            <Input
                              label="URL"
                              value={rule.url}
                              error={step2Errors.paramRuleUrls?.[index]}
                              hint={!step2Errors.paramRuleUrls?.[index] ? getUrlHint(locale, "https://example.com/campaign") : undefined}
                              placeholder="https://example.com/campaign"
                              onChange={(e) => {
                                updateParamRule(index, { url: e.target.value });
                                clearIndexedStep2Error("paramRuleUrls", index);
                              }}
                            />
                            <Button variant="ghost" className="mt-7 text-rose-600" onClick={() => removeParamRule(index)} icon={<Trash2 size={14} />}>
                              {t.common.remove}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {draft.ruleMode === "ab" ? (
                      <div className="space-y-4">
                        <div className="rounded-[20px] bg-slate-50/85 p-4 ring-1 ring-slate-100">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-slate-700">
                                {locale === "zh-Hant" ? "流量占比" : locale === "zh-Hans" ? "流量占比" : "Traffic split"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {locale === "zh-Hant"
                                  ? "系統會依照百分比分配流量，A 與 B 會自動合計 100%。"
                                  : locale === "zh-Hans"
                                    ? "系统会依照百分比分配流量，A 与 B 会自动合计 100%。"
                                    : "Traffic is distributed by percentage. A and B always add up to 100%."}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone="info">{`A ${abWeightA}%`}</Badge>
                              <Badge tone="info">{`B ${abWeightB}%`}</Badge>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px] md:items-end">
                            <label className="block space-y-2">
                              <span className="text-sm font-medium text-slate-700">
                                {locale === "zh-Hant" ? "A 版本占比" : locale === "zh-Hans" ? "A 版本占比" : "Variant A split"}
                              </span>
                              <input
                                type="range"
                                min={1}
                                max={99}
                                value={abWeightA}
                                onChange={(event) => updateAbWeight(Number(event.target.value))}
                                className="h-3 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-500"
                              />
                            </label>
                            <Input
                              type="number"
                              min={1}
                              max={99}
                              label="%"
                              value={String(abWeightA)}
                              error={step2Errors.abWeight}
                              onChange={(event) => updateAbWeight(Number(event.target.value))}
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-[20px] bg-slate-50/85 p-4 ring-1 ring-slate-100">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-slate-700">Variant A</div>
                              <Badge tone="info">{`${abWeightA}%`}</Badge>
                            </div>
                            <Input
                              label="A URL"
                              value={abRules[0]?.url ?? ""}
                              error={step2Errors.abUrlA}
                              hint={!step2Errors.abUrlA ? getUrlHint(locale, "https://example.com/a") : undefined}
                              placeholder="https://example.com/a"
                              onChange={(event) => updateAbUrl(0, event.target.value)}
                            />
                          </div>
                          <div className="rounded-[20px] bg-slate-50/85 p-4 ring-1 ring-slate-100">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-slate-700">Variant B</div>
                              <Badge tone="info">{`${abWeightB}%`}</Badge>
                            </div>
                            <Input
                              label="B URL"
                              value={abRules[1]?.url ?? ""}
                              error={step2Errors.abUrlB}
                              hint={!step2Errors.abUrlB ? getUrlHint(locale, "https://example.com/b") : undefined}
                              placeholder="https://example.com/b"
                              onChange={(event) => updateAbUrl(1, event.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                  </div>
                ) : null}
              </section>

              <section className="rounded-[24px] border border-white/80 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setAdvancedSettingsOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                      <LockKeyhole size={18} />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-slate-900">{t.create.advancedSettings}</div>
                      <div className="text-sm text-slate-500">{advancedSettingsSummary}</div>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${advancedSettingsOpen ? "rotate-180" : ""}`} />
                </button>

                {advancedSettingsOpen ? (
                  <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
                    <section className="rounded-[20px] border border-slate-100 bg-slate-50/75 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setTrackingOpen((v) => !v)}
                        className="flex w-full items-center justify-between px-5 py-4 text-left"
                      >
                        <div>
                          <div className="text-base font-semibold text-slate-900">{t.create.tracking}</div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {hasExternalTrackingConfig(draft.tracking) ? t.create.trackingConfigured : t.create.trackingOptional}
                          </div>
                        </div>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${trackingOpen ? "rotate-180" : ""}`} />
                      </button>
                      {trackingOpen ? (
                        <div className="grid gap-4 border-t border-slate-100 px-5 pb-5 pt-4 md:grid-cols-2">
                          <Input
                            label="GA4 Measurement ID"
                            value={draft.tracking?.ga4Id ?? ""}
                            placeholder="e.g. G-AB12C3D4E5"
                            onChange={(e) =>
                              updateDraft({
                                tracking: {
                                  ga4Id: e.target.value,
                                  metaPixelId: draft.tracking?.metaPixelId ?? "",
                                  enabled: hasExternalTrackingConfig({
                                    ga4Id: e.target.value,
                                    metaPixelId: draft.tracking?.metaPixelId,
                                  }),
                                },
                              })
                            }
                          />
                          <Input
                            label="Meta Pixel ID"
                            value={draft.tracking?.metaPixelId ?? ""}
                            placeholder="e.g. 123456789012345"
                            onChange={(e) =>
                              updateDraft({
                                tracking: {
                                  ga4Id: draft.tracking?.ga4Id ?? "",
                                  metaPixelId: e.target.value,
                                  enabled: hasExternalTrackingConfig({
                                    ga4Id: draft.tracking?.ga4Id,
                                    metaPixelId: e.target.value,
                                  }),
                                },
                              })
                            }
                          />
                        </div>
                      ) : null}
                    </section>

                    <section className="rounded-[20px] border border-slate-100 bg-slate-50/75 p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{t.create.password}</div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {locale === "zh-Hant"
                              ? "訪客掃碼前需輸入密碼"
                              : locale === "zh-Hans"
                                ? "访客扫码前需输入密码"
                                : "Require a password before redirecting"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordOpen((v) => {
                              if (v) {
                                updateDraft({ password: undefined, passwordConfigured: false });
                                setStep2Errors((current) => ({ ...current, password: undefined }));
                              }
                              return !v;
                            });
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${passwordOpen ? "bg-sky-500" : "bg-slate-200"}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${passwordOpen ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </div>
                      {passwordOpen ? (
                        <div className="mt-4">
                          <Input
                            label={t.create.password}
                            value={draft.password ?? ""}
                            hint={
                              !step2Errors.password
                                ? draft.passwordConfigured && !draft.password?.trim()
                                  ? locale === "zh-Hant"
                                    ? "目前已啟用密碼保護；若不需更換，保持空白即可沿用目前密碼。"
                                    : locale === "zh-Hans"
                                      ? "当前已启用密码保护；如果不需要更换，保持留空即可沿用当前密码。"
                                      : "Password protection is already enabled. Leave this blank to keep the current password."
                                  : t.create.passwordRequiredHint
                                : undefined
                            }
                            error={step2Errors.password}
                            onChange={(e) => {
                              updateDraft({ password: e.target.value });
                              if (step2Errors.password) {
                                setStep2Errors((current) => ({ ...current, password: undefined }));
                              }
                            }}
                          />
                        </div>
                      ) : null}
                    </section>

                    <section className="rounded-[20px] border border-slate-100 bg-slate-50/75 p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{t.create.expirationDate}</div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {locale === "zh-Hant"
                              ? "到期後二維碼自動失效"
                              : locale === "zh-Hans"
                                ? "到期后二维码自动失效"
                                : "QR code expires and stops redirecting"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setExpiresOpen((v) => {
                              if (v) {
                                updateDraft({ expiresAt: undefined });
                                setStep2Errors((current) => ({ ...current, expiresAt: undefined }));
                              }
                              return !v;
                            });
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${expiresOpen ? "bg-sky-500" : "bg-slate-200"}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${expiresOpen ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </div>
                      {expiresOpen ? (
                        <div className="mt-4">
                          <DatePickerInput
                            locale={locale}
                            label={t.create.expirationDate}
                            value={draft.expiresAt ?? ""}
                            hint={!step2Errors.expiresAt ? t.create.expirationDateRequiredHint : undefined}
                            error={step2Errors.expiresAt}
                            onChange={(nextValue) => {
                              updateDraft({ expiresAt: nextValue || undefined });
                              if (step2Errors.expiresAt) {
                                setStep2Errors((current) => ({ ...current, expiresAt: undefined }));
                              }
                            }}
                          />
                        </div>
                      ) : null}
                    </section>
                  </div>
                ) : null}
              </section>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="secondary" onClick={() => setStep(1)} className={CREATE_FLOW_SECONDARY_BUTTON_CLASS}>
                  {t.common.back}
                </Button>
                <Button onClick={goToDesignStep} className={CREATE_FLOW_PRIMARY_BUTTON_CLASS}>
                  {t.common.continue}
                </Button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{t.create.step3Title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {locale === "zh-Hant"
                    ? "第一版聚焦 QR style、Corners、Correction level 和 Logo。"
                    : "V1 keeps the design surface focused on style, corners, correction level, and logo."}
                </p>
              </div>

              <section className="rounded-[24px] border border-white/80 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setQrStyleOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                      <Palette size={18} />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-slate-900">{t.create.qrStyle}</div>
                      <div className="text-sm text-slate-500">{locale === "zh-Hant" ? "預設收起，可按需展開。" : "Collapsed by default. Expand when needed."}</div>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${qrStyleOpen ? "rotate-180" : ""}`} />
                </button>

                {qrStyleOpen ? (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                    <div className="grid gap-3 sm:grid-cols-4">
                      {qrStyles.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => updateDesign({ qrStyle: item.id })}
                          className={`rounded-[18px] p-3 ring-1 transition ${
                            design.qrStyle === item.id
                              ? "bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(245,243,255,0.95))] ring-sky-100"
                              : "bg-slate-50 ring-slate-100"
                          }`}
                        >
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-white ring-1 ring-slate-100">
                            <QrStyleMatrixPreview
                              style={item.id}
                              size={7}
                              color="#64748b"
                              backgroundColor="#ffffff"
                              cellPx={4}
                              gapPx={1}
                              correctionLevel="H"
                              cornerBorderStyle="rounded"
                              cornerCenterStyle="dot"
                              inactiveColor="rgba(203,213,225,0.8)"
                            />
                          </div>
                          <div className="mt-2 text-center text-sm text-slate-700">{item.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[24px] border border-white/80 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setCornersOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                      <Wand2 size={18} />
                    </div>
                    <div className="text-base font-semibold text-slate-900">{t.create.corners}</div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${cornersOpen ? "rotate-180" : ""}`} />
                </button>

                {cornersOpen ? (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Border style</div>
                        <div className="grid gap-3 sm:grid-cols-4">
                          {borderCornerStyles.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => updateDesign({ cornerBorderStyle: item.id })}
                              className={`rounded-[16px] p-3 ring-1 transition ${
                                design.cornerBorderStyle === item.id ? "bg-sky-50 ring-sky-100 text-sky-700" : "bg-white ring-slate-100 text-slate-700"
                              }`}
                            >
                              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-white text-base ring-1 ring-slate-100">
                                {item.symbol}
                              </div>
                              <div className="mt-2 text-sm">{item.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Center style</div>
                        <div className="grid gap-3 sm:grid-cols-4">
                          {centerCornerStyles.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => updateDesign({ cornerCenterStyle: item.id })}
                              className={`rounded-[16px] p-3 ring-1 transition ${
                                design.cornerCenterStyle === item.id ? "bg-sky-50 ring-sky-100 text-sky-700" : "bg-white ring-slate-100 text-slate-700"
                              }`}
                            >
                              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-white text-base ring-1 ring-slate-100">
                                {item.symbol}
                              </div>
                              <div className="mt-2 text-sm">{item.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[24px] border border-white/80 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setCorrectionOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-900">{t.create.correctionLevel}</div>
                    <div className="mt-1 text-sm text-slate-500">{t.create.correctionHint}</div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${correctionOpen ? "rotate-180" : ""}`} />
                </button>

                {correctionOpen ? (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                    <div className="grid gap-3 sm:grid-cols-4">
                      {correctionLevels.map((level) => {
                        const LevelIcon = level.icon;

                        return (
                          <button
                            key={level.id}
                            onClick={() => updateDesign({ correctionLevel: level.id })}
                            className={`rounded-[18px] p-4 text-center ring-1 transition ${
                              design.correctionLevel === level.id
                                ? "bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(245,243,255,0.95))] ring-sky-100"
                                : "bg-slate-50 ring-slate-100"
                            }`}
                          >
                            <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] ring-1 ${level.tone}`}>
                              <LevelIcon size={18} />
                            </div>
                            <div className="text-sm font-medium text-slate-800">{level.label}</div>
                            <div className="mt-1 text-xs text-slate-500">{level.note}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[24px] border border-white/80 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setLogoOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-900">{t.create.logoTitle}</div>
                    <p className="mt-1 text-sm text-slate-500">{t.create.logoBody}</p>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${logoOpen ? "rotate-180" : ""}`} />
                </button>

                {logoOpen ? (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {logoOptions.map((logo) => (
                        <button
                          key={logo.id}
                          onClick={() => setLogoType(logo.id)}
                          className={`rounded-[18px] p-3 ring-1 transition ${
                            design.logoType === logo.id
                              ? "bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(245,243,255,0.95))] ring-sky-100"
                              : "bg-slate-50 ring-slate-100"
                          }`}
                        >
                          <div className="mx-auto flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
                            {"url" in logo ? (
                              <div className="relative h-11 w-11">
                                <Image src={logo.url} alt={logo.label} fill unoptimized sizes="44px" />
                              </div>
                            ) : (
                              <CircleOff size={20} className="text-slate-400" />
                            )}
                          </div>
                          <div className="mt-2 text-sm text-slate-700">{logo.label}</div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={openLogoMediaLibrary}
                        className="flex w-full items-center justify-between rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100/80"
                      >
                        <div className="flex items-start gap-3">
                          <Upload size={18} className="mt-0.5 text-slate-500" />
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              {locale === "zh-Hant" ? "從媒體庫挑選 Logo" : locale === "zh-Hans" ? "从媒体库挑选 Logo" : "Choose a logo from the library"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {locale === "zh-Hant"
                                ? "可直接選用既有圖片，也可在彈窗裡上傳新的品牌圖。"
                                : locale === "zh-Hans"
                                  ? "可直接选用已有图片，也可在弹窗里上传新的品牌图。"
                                  : "Use an existing image or upload a new brand visual inside the media library."}
                            </div>
                          </div>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          {locale === "zh-Hant" ? "打開媒體庫" : locale === "zh-Hans" ? "打开媒体库" : "Open library"}
                        </span>
                      </button>

                      {customLogoName ? (
                        <div className="text-xs text-slate-500">
                          {t.create.logoSelectedFile}: {customLogoName}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </section>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:justify-between">
                <Button variant="secondary" onClick={() => setStep(2)} className={CREATE_FLOW_SECONDARY_BUTTON_CLASS}>
                  {t.common.back}
                </Button>
                <div className="flex flex-col gap-2 sm:items-end">
                  {!requiredFieldsComplete ? <div className="text-sm text-amber-600 sm:text-right">{requiredInfoHint}</div> : null}
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  {canSaveDraft ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={saveDraftSnapshot}
                      disabled={persistingAction !== null || !requiredFieldsComplete}
                      className={CREATE_FLOW_SECONDARY_BUTTON_CLASS}
                    >
                      {persistingAction === "draft" ? t.common.loading : t.common.saveDraft}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={generateEntry}
                    disabled={persistingAction !== null || !requiredFieldsComplete}
                    className={CREATE_FLOW_PRIMARY_BUTTON_CLASS}
                  >
                    {persistingAction === "generate" ? t.common.loading : primaryActionLabel}
                  </Button>
                </div>
                </div>
              </div>
            </>
          ) : null}
        </Card>

        <div className="space-y-5">
          {step === 1 ? (
            <>
              <Card>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles size={16} className="text-sky-600" />
                  {t.create.quickStartTitle}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">{t.create.quickStartBody}</p>
                {isTargetTypeLocked ? (
                  <div className="mt-3 rounded-[18px] border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-100">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <LockKeyhole size={14} className="text-slate-500" />
                      {t.create.targetTypeLockedBadge}
                    </div>
                    <p className="mt-1 leading-6 text-slate-500">{t.create.targetTypeLockedHint}</p>
                  </div>
                ) : null}
                <div className="mt-4 space-y-3">
                  {([
                    { id: "web" as const, title: t.create.targetTypeWeb, body: t.create.targetTypeWebBody },
                    { id: "openapp" as const, title: t.create.targetTypeOpenApp, body: t.create.targetTypeOpenAppBody },
                    { id: "whatsapp" as const, title: t.create.targetTypeWhatsapp, body: t.create.targetTypeWhatsappBody },
                    { id: "vcard" as const, title: t.create.targetTypeVcard, body: t.create.targetTypeVcardBody },
                  ]).map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      disabled={isTargetTypeLocked}
                      onClick={() => {
                        const nextDraft = {
                          ...draft,
                          ...buildTargetTypeDraftUpdate(target.id),
                        };
                        clearStep2Errors();
                        confirmDirection(nextDraft);
                      }}
                      className={`w-full rounded-[20px] px-4 py-4 text-left ring-1 transition ${
                        selectedTargetType === target.id
                          ? "bg-[linear-gradient(135deg,rgba(18,119,255,0.12),rgba(8,184,164,0.1))] ring-sky-100"
                          : "bg-white/90 ring-[rgba(190,206,226,0.42)]"
                      } ${isTargetTypeLocked ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                      <div className="text-sm font-semibold text-slate-900">{target.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{target.body}</div>
                    </button>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="text-sm font-semibold text-slate-900">{t.create.hintTitle}</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-500">
                  {t.create.hints.map((hint) => (
                    <div key={hint} className="rounded-[18px] bg-white/82 px-4 py-3 ring-1 ring-[rgba(190,206,226,0.4)]">
                      {hint}
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : null}

          {step >= 2 ? (
            <Card>
              <div className="text-sm font-semibold text-slate-900">{t.create.designPreview}</div>
              <div className="mt-4 rounded-[26px] bg-[linear-gradient(135deg,#f7fbff_0%,#edf6ff_48%,#f4f2ff_100%)] p-5">
                <div className="mx-auto flex h-48 w-48 items-center justify-center">
                  {previewQrDataUri ? (
                    <Image
                      key={previewQrDataUri}
                      src={previewQrDataUri}
                      alt={draft.name?.trim() || "QR preview"}
                      width={192}
                      height={192}
                      unoptimized
                      className="h-full w-full rounded-[24px] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white/90 p-5 text-center text-sm leading-6 text-slate-500">
                      {previewEntryUrlDisplay}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>{t.create.targetTypeLabel}</span>
                  <strong>{targetTypePreviewLabel}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>QR style</span>
                  <strong>{qrStyles.find((item) => item.id === selectedQrStyle)?.label ?? selectedQrStyle}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Correction</span>
                  <strong>{design.correctionLevel ?? "H"}</strong>
                </div>
              </div>
              {showTargetContentPreview ? (
                <div className="mt-4 rounded-[18px] bg-slate-50/85 px-4 py-3 text-sm text-slate-600 ring-1 ring-[rgba(190,206,226,0.45)]">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{t.create.targetTypeLabel}</div>
                  <div className="mt-2 truncate font-medium text-slate-800">{targetTypePreviewValue}</div>
                </div>
              ) : null}
              <div className="mt-5 rounded-[20px] border border-[rgba(190,206,226,0.52)] bg-white/90 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{entryUrlLabel}</div>
                <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 rounded-[14px] bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-100">
                    <div className="truncate">{previewEntryUrlDisplay}</div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={copyEntryUrl}
                    disabled={!previewEntryUrl}
                    className="h-10 rounded-[14px] px-3"
                    icon={<Copy size={14} />}
                  >
                    {entryUrlCopied ? t.common.copied : t.common.copy}
                  </Button>
                </div>
                {draftPreviewError ? <div className="mt-2 text-sm text-rose-600">{draftPreviewError}</div> : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <MediaLibraryModal
        open={mediaLibraryTarget !== null}
        locale={locale}
        title={
          mediaLibraryTarget === "avatar"
            ? locale === "zh-Hant"
              ? "選擇名片頭像"
              : locale === "zh-Hans"
                ? "选择名片头像"
                : "Choose a card avatar"
            : locale === "zh-Hant"
              ? "選擇 QR Logo"
              : locale === "zh-Hans"
                ? "选择 QR Logo"
                : "Choose a QR logo"
        }
        description={
          mediaLibraryTarget === "avatar"
            ? locale === "zh-Hant"
              ? "先從媒體庫挑一張圖片，也可以直接在彈窗裡上傳新的頭像素材。"
              : locale === "zh-Hans"
                ? "先从媒体库挑一张图片，也可以直接在弹窗里上传新的头像素材。"
                : "Pick an existing image from the media library, or upload a new avatar asset right inside the modal."
            : locale === "zh-Hant"
              ? "Logo 會優先從媒體庫選取；若還沒有品牌圖，也可直接在彈窗裡新增。"
              : locale === "zh-Hans"
                ? "Logo 会优先从媒体库选取；如果还没有品牌图，也可直接在弹窗里新增。"
                : "Logos now come from the media library first. If you do not have one yet, upload a new brand image inside the modal."
        }
        acceptKind="image"
        selectionMode={mediaLibraryTarget === "avatar" ? "avatar" : "logo"}
        helperText={localCosHint}
        onClose={() => setMediaLibraryTarget(null)}
        onSelectAsset={mediaLibraryTarget === "avatar" ? handleAvatarAssetSelect : handleLogoAssetSelect}
      />
    </div>
  );
}
