"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { Check, ChevronDown, CircleOff, Copy, Palette, Plus, Sparkles, Trash2, Upload, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { chatWithQwen } from "@/lib/services";
import { COUNTRIES } from "@/lib/countries";
import { DEVICE_SYSTEMS } from "@/lib/device-systems";
import { getEntryUrl } from "@/lib/entry-url";
import { LANGUAGES } from "@/lib/languages";
import { useQrCreateStore } from "@/store/qr-create-store";
import {
  buildVCardPageUrl,
  createVCardContentId,
  formatAssetSize,
  persistVCardProfile,
  resolveVCardAvatarSrc,
  VCARD_ALLOWED_IMAGE_MIME_TYPES,
  VCARD_MAX_AVATAR_SIZE,
} from "@/lib/vcard";
import type { QRRuleMode, QRTargetType, VCardImageAsset, VCardProfile } from "@/types/qr";

interface QrCreateFlowProps {
  locale: Locale;
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
  { id: "Q", label: "Level Q", note: "25%" },
  { id: "H", label: "Level H", note: "30%" },
  { id: "M", label: "Level M", note: "15%" },
  { id: "L", label: "Level L", note: "7%" },
] as const;

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
] as const;

const MAX_LOGO_FILE_SIZE = 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

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

function resolvePreviewColor(value: string | undefined, fallback: string) {
  const text = value?.trim();
  if (!text) return fallback;

  const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(text);
  const isRgb = /^rgba?\(.+\)$/.test(text);
  const isHsl = /^hsla?\(.+\)$/.test(text);
  return isHex || isRgb || isHsl ? text : fallback;
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

function buildVCardContentUrl(vcard?: { contentId?: string }) {
  if (!vcard?.contentId) return "";
  return buildVCardPageUrl(vcard.contentId);
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function createVCardImageAsset(file: File, dataUrl: string): VCardImageAsset {
  return {
    id: createVCardContentId(),
    name: file.name,
    mimeType: file.type,
    size: file.size,
    dataUrl,
    createdAt: new Date().toISOString(),
    visibility: "public",
  };
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

export function QrCreateFlow({ locale }: QrCreateFlowProps) {
  const t = getMessages(locale);
  const router = useRouter();
  const {
    step,
    messages,
    draft,
    design,
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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [expiresOpen, setExpiresOpen] = useState(false);
  const [qrStyleOpen, setQrStyleOpen] = useState(false);
  const [cornersOpen, setCornersOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [logoOpen, setLogoOpen] = useState(false);
  const [step2Errors, setStep2Errors] = useState<{
    targetUrl?: string;
    whatsappPhone?: string;
    vcardName?: string;
    password?: string;
    expiresAt?: string;
    abWeight?: string;
    abUrlA?: string;
    abUrlB?: string;
  }>({});
  const [customLogoName, setCustomLogoName] = useState<string | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [vcardImageError, setVcardImageError] = useState<string | null>(null);
  const [vcardUploadIntent, setVcardUploadIntent] = useState<"avatar" | "library">("library");
  const [entryUrlCopied, setEntryUrlCopied] = useState(false);
  const [directionConfirmed, setDirectionConfirmed] = useState(false);
  const vcardImageInputRef = useRef<HTMLInputElement>(null);
  const selectedTargetType = draft.targetType ?? "web";
  const selectedQrStyle = (qrStyles.find((item) => item.id === design.qrStyle)?.id ?? "rounded") as QrStyleId;
  const previewBorderColor = resolvePreviewColor(design.borderColor, "#0f172a");
  const previewBackgroundColor = resolvePreviewColor(design.backgroundColor, "#ffffff");
  const previewCorrection = (design.correctionLevel ?? "H") as CorrectionLevelId;
  const previewCornerBorder = (design.cornerBorderStyle ?? "rounded") as CornerBorderStyleId;
  const previewCornerCenter = (design.cornerCenterStyle ?? "dot") as CornerCenterStyleId;
  const selectedLogo = useMemo(
    () => logoOptions.find((item) => item.id === design.logoType) ?? logoOptions.find((item) => item.id === "none")!,
    [design.logoType],
  );
  const selectedLogoUrl =
    design.logoType === "none"
      ? undefined
      : design.logoUrl ?? ("url" in selectedLogo ? selectedLogo.url : undefined);
  const selectedLogoLabel = design.logoType === "custom" ? customLogoName ?? t.create.logoCustomLabel : selectedLogo.label;
  const vcardImageAssets = useMemo(() => draft.vcard?.imageAssets ?? [], [draft.vcard?.imageAssets]);
  const selectedVCardAvatarAsset = useMemo(
    () => vcardImageAssets.find((asset) => asset.id === draft.vcard?.avatarAssetId) ?? null,
    [draft.vcard?.avatarAssetId, vcardImageAssets],
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
  const previewEntryUrl = useMemo(
    () =>
      getEntryUrl({
        id: draft.defaultUrl?.trim() || draft.name?.trim() || "preview-entry",
        type: "url",
      }),
    [draft.defaultUrl, draft.name],
  );
  const targetTypePreviewLabel =
    selectedTargetType === "whatsapp"
      ? t.create.targetTypeWhatsapp
      : selectedTargetType === "vcard"
        ? t.create.targetTypeVcard
        : t.create.targetTypeWeb;
  const targetTypePreviewValue =
    selectedTargetType === "whatsapp"
      ? buildWhatsAppUrl(draft.whatsapp) || "—"
      : selectedTargetType === "vcard"
        ? draft.defaultUrl?.trim() || buildVCardContentUrl(draft.vcard) || "—"
        : draft.defaultUrl?.trim() || "—";
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
  const showSuggestionCard = !directionConfirmed && hasAssistantReply && suggestedIntent.detected;
  const suggestedTargetLabel =
    suggestedIntent.targetType === "whatsapp"
      ? t.create.targetTypeWhatsapp
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
  const ruleModePreviewLabel =
    draft.ruleMode === "language"
      ? locale === "zh-Hant"
        ? "語言"
        : locale === "zh-Hans"
          ? "语言"
          : "Language"
      : draft.ruleMode === "region"
        ? locale === "zh-Hant"
          ? "國家/地區"
          : locale === "zh-Hans"
            ? "国家/地区"
            : "Region"
        : draft.ruleMode === "device"
          ? locale === "zh-Hant"
            ? "設備系統"
            : locale === "zh-Hans"
              ? "设备系统"
              : "Device OS"
      : draft.ruleMode === "param"
        ? locale === "zh-Hant"
              ? "參數"
              : locale === "zh-Hans"
                ? "参数"
                : "Param"
            : draft.ruleMode === "ab"
              ? "A/B Test"
              : locale === "zh-Hant"
                ? "關閉"
                : locale === "zh-Hans"
                ? "关闭"
                : "Off";

  const step1MissingFields = useMemo(() => {
    if (selectedTargetType === "whatsapp") {
      return draft.whatsapp?.phone?.trim() ? [] : [t.create.whatsappPhone];
    }

    if (selectedTargetType === "vcard") {
      return draft.vcard?.fullName?.trim() || draft.name?.trim() ? [] : [t.create.vcardFullName];
    }

    return draft.defaultUrl?.trim() ? [] : [t.create.webUrlLabel];
  }, [draft.defaultUrl, draft.name, draft.vcard?.fullName, draft.whatsapp?.phone, selectedTargetType, t.create.vcardFullName, t.create.webUrlLabel, t.create.whatsappPhone]);
  const canEnterReview = step1MissingFields.length === 0;
  const showDirectionPendingCard = directionConfirmed && !canEnterReview;
  const showDirectionReadyCard = directionConfirmed && canEnterReview;
  const confirmedTargetLabel =
    selectedTargetType === "whatsapp"
      ? t.create.targetTypeWhatsapp
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
          { label: t.create.whatsappPhone, value: draft.whatsapp?.phone?.trim() || "" },
        ],
        optional: [
          { label: t.create.whatsappCountryCode, value: draft.whatsapp?.countryCode?.trim() || "" },
          { label: t.create.whatsappMessage, value: draft.whatsapp?.message?.trim() || "" },
        ],
      };
    }

    if (collectionTargetType === "vcard") {
      return {
        title: t.create.collectionGuideTitleVcard,
        body: t.create.collectionGuideBodyVcard,
        required: [
          { label: t.create.vcardFullName, value: draft.vcard?.fullName?.trim() || draft.name?.trim() || "" },
        ],
        optional: [
          { label: t.create.vcardPhone, value: draft.vcard?.phone?.trim() || "" },
          { label: t.create.vcardEmail, value: draft.vcard?.email?.trim() || "" },
          { label: t.create.vcardCompany, value: draft.vcard?.company?.trim() || "" },
          { label: t.create.vcardTitle, value: draft.vcard?.title?.trim() || "" },
          { label: t.create.vcardWebsite, value: draft.vcard?.website?.trim() || "" },
          { label: t.create.vcardAvatarTitle, value: draft.vcard?.avatarFileName?.trim() || "" },
        ],
      };
    }

    return {
      title: t.create.collectionGuideTitleWeb,
      body: t.create.collectionGuideBodyWeb,
      required: [
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
    draft.ruleMode,
    draft.vcard?.company,
    draft.vcard?.email,
    draft.vcard?.avatarFileName,
    draft.vcard?.fullName,
    draft.vcard?.phone,
    draft.vcard?.title,
    draft.vcard?.website,
    draft.whatsapp?.countryCode,
    draft.whatsapp?.message,
    draft.whatsapp?.phone,
    t.create.collectionGuideBodyVcard,
    t.create.collectionGuideBodyWeb,
    t.create.collectionGuideBodyWhatsapp,
    t.create.collectionGuideTitleVcard,
    t.create.collectionGuideTitleWeb,
    t.create.collectionGuideTitleWhatsapp,
    t.create.collectionWebRoutingLabel,
    t.create.vcardCompany,
    t.create.vcardEmail,
    t.create.vcardAvatarTitle,
    t.create.vcardFullName,
    t.create.vcardPhone,
    t.create.vcardTitle,
    t.create.vcardWebsite,
    t.create.webUrlLabel,
    t.create.whatsappCountryCode,
    t.create.whatsappMessage,
    t.create.whatsappPhone,
  ]);

  useEffect(() => {
    if (selectedTargetType !== "vcard" || !draft.vcard?.contentId) return;
    persistVCardProfile(draft.vcard.contentId, draft.vcard);
  }, [draft.vcard, selectedTargetType]);

  function clearStep2Errors() {
    setStep2Errors((current) => ({
      ...current,
      targetUrl: undefined,
      whatsappPhone: undefined,
      vcardName: undefined,
      abWeight: undefined,
      abUrlA: undefined,
      abUrlB: undefined,
    }));
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
      const nextWhatsapp = {
        countryCode: draft.whatsapp?.countryCode ?? "86",
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

    const nextVCard = buildNextVCardProfile(draft.vcard, draft.name ?? "");

    return {
      ...resetRules,
      targetType: "vcard" as const,
      vcard: nextVCard,
      defaultUrl: buildVCardContentUrl(nextVCard),
    };
  }

  const recognizedCount = useMemo(() => {
    const fields = [
      draft.name,
      draft.defaultUrl,
      draft.targetType && draft.targetType !== "web" ? draft.targetType : undefined,
      draft.whatsapp?.phone,
      draft.vcard?.fullName,
      draft.ruleMode,
      draft.languageRules?.length ? "language" : undefined,
      draft.regionRules?.length ? "region" : undefined,
      draft.deviceRules?.length ? "device" : undefined,
      draft.paramRules?.length ? "param" : undefined,
      draft.abRules?.length ? "ab" : undefined,
      draft.tracking?.enabled ? "tracking" : undefined,
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
      const nextTargetType = result.draft.targetType ?? draft.targetType ?? suggestedIntent.targetType;
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
            defaultUrl: normalizedDraft.defaultUrl ?? buildVCardContentUrl(nextVCard),
          });
        } else if (nextTargetType === "whatsapp") {
          const nextWhatsapp = {
            countryCode: normalizedDraft.whatsapp?.countryCode ?? draft.whatsapp?.countryCode ?? "86",
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
        } else {
          updateDraft({
            ...normalizedDraft,
            targetType: "web",
          });
        }

        if ((normalizedDraft.ruleMode ?? draft.ruleMode) && (normalizedDraft.ruleMode ?? draft.ruleMode) !== "none" && nextTargetType === "web") setRuleOpen(true);
        if (normalizedDraft.tracking?.enabled) setTrackingOpen(true);
        if (normalizedDraft.password) setPasswordOpen(true);
        if (normalizedDraft.expiresAt) setExpiresOpen(true);
      }
      if (result.readyForReview) {
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
    clearStep2Errors();
    updateDraft(buildTargetTypeDraftUpdate(nextType));
  }

  function confirmDirection(nextDraft: typeof draft) {
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
    const nextWhatsapp = {
      countryCode: draft.whatsapp?.countryCode ?? "86",
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

  function updateVCardProfile(patch: Partial<VCardProfile>) {
    const nextVCard = buildNextVCardProfile(draft.vcard, draft.name ?? "", patch);

    updateDraft({
      targetType: "vcard",
      vcard: nextVCard,
      defaultUrl: buildVCardContentUrl(nextVCard),
    });
  }

  function updateVCardField(field: "fullName" | "phone" | "email" | "company" | "title" | "website", value: string) {
    const patch: Partial<VCardProfile> = { [field]: value };
    updateVCardProfile(patch);

    if (field === "fullName" && step2Errors.vcardName) {
      setStep2Errors((current) => ({ ...current, vcardName: undefined }));
    }
  }

  function openVCardImagePicker(intent: "avatar" | "library") {
    setVcardUploadIntent(intent);
    setVcardImageError(null);
    vcardImageInputRef.current?.click();
  }

  function setVCardAvatarAsset(assetId: string) {
    const asset = vcardImageAssets.find((item) => item.id === assetId);
    if (!asset) return;

    setVcardImageError(null);
    updateVCardProfile({
      avatarAssetId: asset.id,
      avatarDataUrl: asset.dataUrl,
      avatarFileName: asset.name,
    });
  }

  function resetVCardAvatar() {
    setVcardImageError(null);
    updateVCardProfile({
      avatarAssetId: undefined,
      avatarDataUrl: undefined,
      avatarFileName: undefined,
    });
  }

  function deleteVCardImage(assetId: string) {
    const nextAssets = vcardImageAssets.filter((asset) => asset.id !== assetId);
    const deletingCurrentAvatar = draft.vcard?.avatarAssetId === assetId;

    setVcardImageError(null);
    updateVCardProfile({
      imageAssets: nextAssets,
      avatarAssetId: deletingCurrentAvatar ? undefined : draft.vcard?.avatarAssetId,
      avatarDataUrl: deletingCurrentAvatar ? undefined : draft.vcard?.avatarDataUrl,
      avatarFileName: deletingCurrentAvatar ? undefined : draft.vcard?.avatarFileName,
    });
  }

  async function handleVCardImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > VCARD_MAX_AVATAR_SIZE) {
      setVcardImageError(t.create.vcardImageUploadTooLarge);
      return;
    }

    if (!VCARD_ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      setVcardImageError(t.create.vcardImageUploadInvalidType);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const nextAsset = createVCardImageAsset(file, dataUrl);
      const nextAssets = [nextAsset, ...vcardImageAssets];
      const shouldSetAsAvatar = vcardUploadIntent === "avatar" || !draft.vcard?.avatarAssetId;

      updateVCardProfile({
        imageAssets: nextAssets,
        avatarAssetId: shouldSetAsAvatar ? nextAsset.id : draft.vcard?.avatarAssetId,
        avatarDataUrl: shouldSetAsAvatar ? nextAsset.dataUrl : draft.vcard?.avatarDataUrl,
        avatarFileName: shouldSetAsAvatar ? nextAsset.name : draft.vcard?.avatarFileName,
      });
      setVcardImageError(null);
    } catch {
      setVcardImageError(t.create.vcardImageUploadFailed);
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

  function setLogoType(type: (typeof logoOptions)[number]["id"]) {
    setLogoUploadError(null);

    if (type === "none") {
      updateDesign({ logoType: "none", logoUrl: undefined });
      return;
    }

    const preset = logoOptions.find((item) => item.id === type);
    updateDesign({
      logoType: type,
      logoUrl: preset && "url" in preset ? preset.url : undefined,
    });
  }

  function handleCustomLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_LOGO_FILE_SIZE) {
      setLogoUploadError(t.create.logoUploadTooLarge);
      return;
    }

    if (!ALLOWED_LOGO_MIME_TYPES.has(file.type)) {
      setLogoUploadError(t.create.logoUploadInvalidType);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setLogoUploadError(t.create.logoUploadFailed);
        return;
      }
      setLogoUploadError(null);
      setCustomLogoName(file.name);
      updateDesign({ logoType: "custom", logoUrl: reader.result });
    };
    reader.onerror = () => {
      setLogoUploadError(t.create.logoUploadFailed);
    };
    reader.readAsDataURL(file);
  }

  function goToDesignStep() {
    const nextErrors: {
      targetUrl?: string;
      whatsappPhone?: string;
      vcardName?: string;
      password?: string;
      expiresAt?: string;
      abWeight?: string;
      abUrlA?: string;
      abUrlB?: string;
    } = {};

    if (selectedTargetType === "web" && !draft.defaultUrl?.trim()) {
      nextErrors.targetUrl = t.create.targetUrlRequiredError;
    }

    if (selectedTargetType === "whatsapp" && !draft.whatsapp?.phone?.trim()) {
      nextErrors.whatsappPhone = t.create.whatsappPhoneRequiredError;
    }

    if (selectedTargetType === "vcard" && !draft.vcard?.fullName?.trim()) {
      nextErrors.vcardName = t.create.vcardNameRequiredError;
    }

    if (passwordOpen && !draft.password?.trim()) {
      nextErrors.password = t.create.passwordRequiredError;
    }

    if (expiresOpen && !draft.expiresAt?.trim()) {
      nextErrors.expiresAt = t.create.expirationDateRequiredError;
    }

    if (selectedTargetType === "web" && draft.ruleMode === "ab") {
      if (!abRules[0]?.url.trim()) {
        nextErrors.abUrlA =
          locale === "zh-Hant" ? "請填寫 A 版本 URL。" : locale === "zh-Hans" ? "请填写 A 版本 URL。" : "Please enter a URL for variant A.";
      }

      if (!abRules[1]?.url.trim()) {
        nextErrors.abUrlB =
          locale === "zh-Hant" ? "請填寫 B 版本 URL。" : locale === "zh-Hans" ? "请填写 B 版本 URL。" : "Please enter a URL for variant B.";
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

    setStep2Errors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setStep(3);
  }

  async function copyEntryUrl() {
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

  function saveDraftSnapshot() {
    const snapshot = {
      step,
      draft,
      design,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem("naviora:qr-create-draft:v1", JSON.stringify(snapshot));
    router.push(withLocale(locale, "/qrs"));
  }

  function generateEntry() {
    const snapshot = {
      step,
      draft,
      design,
      savedAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
    };

    localStorage.setItem("naviora:qr-create-draft:v1", JSON.stringify(snapshot));
    router.push(withLocale(locale, "/qrs"));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-white/70 bg-white/75 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-3">
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
                      <Button onClick={applySuggestedSetup}>{t.create.suggestionApply}</Button>
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
                      <Button onClick={() => enterReviewStep()}>{t.create.enterReview}</Button>
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
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-500">
                      {t.create.recognized}: {recognizedCount}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="secondary" onClick={() => enterReviewStep()} disabled={!canEnterReview}>
                        {t.create.enterReview}
                      </Button>
                      <Button onClick={submitMessage} disabled={loading}>
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
                    <div className="text-sm font-medium text-slate-700">{t.create.targetTypeLabel}</div>
                    <p className="mt-1 text-sm text-slate-500">{t.create.targetTypeBody}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {([
                        { id: "web" as const, title: t.create.targetTypeWeb, body: t.create.targetTypeWebBody },
                        { id: "whatsapp" as const, title: t.create.targetTypeWhatsapp, body: t.create.targetTypeWhatsappBody },
                        { id: "vcard" as const, title: t.create.targetTypeVcard, body: t.create.targetTypeVcardBody },
                      ]).map((target) => (
                        <button
                          key={target.id}
                          type="button"
                          onClick={() => setTargetType(target.id)}
                          className={`rounded-[20px] px-4 py-4 text-left ring-1 transition ${
                            selectedTargetType === target.id
                              ? "bg-[linear-gradient(135deg,rgba(18,119,255,0.12),rgba(8,184,164,0.1))] ring-sky-100"
                              : "bg-white ring-slate-100"
                          }`}
                        >
                          <div className="text-sm font-semibold text-slate-900">{target.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">{target.body}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label={t.create.qrName} value={draft.name ?? ""} onChange={(event) => updateDraft({ name: event.target.value })} />

                    {selectedTargetType === "web" ? (
                      <Input
                        label={t.create.webUrlLabel}
                        value={draft.defaultUrl ?? ""}
                        error={step2Errors.targetUrl}
                        onChange={(event) => {
                          updateDraft({ defaultUrl: event.target.value, targetType: "web" });
                          if (step2Errors.targetUrl) {
                            setStep2Errors((current) => ({ ...current, targetUrl: undefined }));
                          }
                        }}
                      />
                    ) : null}

                    {selectedTargetType === "whatsapp" ? (
                      <>
                        <Input
                          label={t.create.whatsappCountryCode}
                          value={draft.whatsapp?.countryCode ?? "86"}
                          placeholder="86"
                          onChange={(event) => updateWhatsAppField("countryCode", event.target.value)}
                        />
                        <Input
                          label={t.create.whatsappPhone}
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
                          <Input label={t.common.defaultUrl} value={draft.defaultUrl ?? ""} readOnly hint={t.create.autoGeneratedUrlHint} />
                        </div>
                      </>
                    ) : null}

                    {selectedTargetType === "vcard" ? (
                      <>
                        <input
                          ref={vcardImageInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleVCardImageUpload}
                        />
                        <Input
                          label={t.create.vcardFullName}
                          value={draft.vcard?.fullName ?? ""}
                          error={step2Errors.vcardName}
                          onChange={(event) => updateVCardField("fullName", event.target.value)}
                        />
                        <Input label={t.create.vcardPhone} value={draft.vcard?.phone ?? ""} onChange={(event) => updateVCardField("phone", event.target.value)} />
                        <Input label={t.create.vcardEmail} value={draft.vcard?.email ?? ""} onChange={(event) => updateVCardField("email", event.target.value)} />
                        <Input label={t.create.vcardCompany} value={draft.vcard?.company ?? ""} onChange={(event) => updateVCardField("company", event.target.value)} />
                        <Input label={t.create.vcardTitle} value={draft.vcard?.title ?? ""} onChange={(event) => updateVCardField("title", event.target.value)} />
                        <Input label={t.create.vcardWebsite} value={draft.vcard?.website ?? ""} onChange={(event) => updateVCardField("website", event.target.value)} />
                        <div className="md:col-span-2">
                          <Input label={t.common.defaultUrl} value={draft.defaultUrl ?? ""} readOnly hint={t.create.autoGeneratedUrlHint} />
                        </div>
                        <div className="md:col-span-2 grid gap-4 xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                          <div className="rounded-[20px] border border-[rgba(190,206,226,0.52)] bg-slate-50/70 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{t.create.vcardAvatarTitle}</div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">{t.create.vcardAvatarBody}</div>
                              </div>
                              <Badge tone={selectedVCardAvatarAsset || draft.vcard?.avatarDataUrl ? "info" : "default"}>
                                {selectedVCardAvatarAsset || draft.vcard?.avatarDataUrl ? t.create.vcardAvatarCurrentState : t.create.vcardAvatarDefaultState}
                              </Badge>
                            </div>

                            <div className="mt-4 flex items-center gap-4">
                              <div className="relative h-24 w-24 overflow-hidden rounded-[24px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
                                <Image src={vcardAvatarPreviewSrc} alt={draft.vcard?.fullName || draft.name || "vCard avatar"} fill unoptimized sizes="96px" className="object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-slate-900">
                                  {selectedVCardAvatarAsset?.name ?? draft.vcard?.avatarFileName ?? t.create.vcardAvatarDefaultState}
                                </div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">
                                  {selectedVCardAvatarAsset
                                    ? `${formatAssetSize(selectedVCardAvatarAsset.size)} · ${t.create.vcardImageVisibilityPublic}`
                                    : t.create.vcardAvatarDefaultHint}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Button type="button" variant="secondary" className="rounded-[14px] px-3 py-2 text-xs" icon={<Upload size={14} />} onClick={() => openVCardImagePicker("avatar")}>
                                    {t.create.vcardAvatarUpload}
                                  </Button>
                                  {selectedVCardAvatarAsset || draft.vcard?.avatarDataUrl ? (
                                    <Button type="button" variant="ghost" className="rounded-[14px] px-3 py-2 text-xs" onClick={resetVCardAvatar}>
                                      {t.create.vcardAvatarReset}
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[20px] border border-[rgba(190,206,226,0.52)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{t.create.vcardFileManagerTitle}</div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">{t.create.vcardFileManagerBody}</div>
                              </div>
                              <Button type="button" variant="secondary" className="rounded-[14px] px-3 py-2 text-xs" icon={<Upload size={14} />} onClick={() => openVCardImagePicker("library")}>
                                {t.create.vcardFileManagerUpload}
                              </Button>
                            </div>

                            <div className="mt-3 rounded-[16px] bg-sky-50/80 px-4 py-3 text-xs leading-5 text-slate-600 ring-1 ring-sky-100">
                              <div className="font-medium text-slate-800">{t.create.vcardFileManagerSupported}</div>
                              <div className="mt-1">{t.create.vcardFileManagerPermissionHint}</div>
                            </div>

                            {vcardImageAssets.length ? (
                              <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                                {vcardImageAssets.map((asset) => {
                                  const isCurrentAvatar = asset.id === draft.vcard?.avatarAssetId;

                                  return (
                                    <div
                                      key={asset.id}
                                      className="flex flex-col gap-3 rounded-[18px] border border-slate-100 bg-slate-50/65 p-3 md:flex-row md:items-center"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="relative h-14 w-14 overflow-hidden rounded-[16px] bg-white ring-1 ring-slate-200">
                                          <Image src={asset.dataUrl} alt={asset.name} fill unoptimized sizes="56px" className="object-cover" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="truncate text-sm font-medium text-slate-900">{asset.name}</div>
                                          <div className="mt-1 text-xs text-slate-500">
                                            {formatAssetSize(asset.size)} · {t.create.vcardImageVisibilityPublic}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 md:ml-auto md:justify-end">
                                        {isCurrentAvatar ? (
                                          <Badge tone="info">{t.create.vcardImageCurrentAvatar}</Badge>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setVCardAvatarAsset(asset.id)}
                                            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-[rgba(190,206,226,0.55)] transition hover:text-slate-950"
                                          >
                                            {t.create.vcardImageSetAvatar}
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => deleteVCardImage(asset.id)}
                                          className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-100"
                                        >
                                          <Trash2 size={12} />
                                          {t.create.vcardImageDelete}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm leading-6 text-slate-500">
                                {t.create.vcardFileManagerEmpty}
                              </div>
                            )}
                          </div>
                        </div>
                        {vcardImageError ? <div className="md:col-span-2 text-sm text-rose-600">{vcardImageError}</div> : null}
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
                              options={LANGUAGES.map((l) => ({ value: l.code, label: locale === "zh-Hant" ? l["zh-Hant"] : l.en }))}
                              placeholder={locale === "zh-Hant" ? "選擇語言" : locale === "zh-Hans" ? "选择语言" : "Select language"}
                              searchPlaceholder={locale === "zh-Hant" ? "搜索語言…" : locale === "zh-Hans" ? "搜索语言…" : "Search language…"}
                              onChange={(val) => updateLanguageRule(index, { language: val })}
                            />
                            <Input label="URL" value={rule.url} onChange={(e) => updateLanguageRule(index, { url: e.target.value })} />
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
                              options={COUNTRIES.map((c) => ({ value: c.code, label: locale === "zh-Hant" ? c["zh-Hant"] : c.en }))}
                              placeholder={locale === "zh-Hant" ? "選擇國家/地區" : locale === "zh-Hans" ? "选择国家/地区" : "Select country / region"}
                              searchPlaceholder={locale === "zh-Hant" ? "搜索國家/地區…" : locale === "zh-Hans" ? "搜索国家/地区…" : "Search country / region…"}
                              onChange={(val) => updateRegionRule(index, { region: val })}
                            />
                            <Input label="URL" value={rule.url} onChange={(e) => updateRegionRule(index, { url: e.target.value })} />
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
                            <Input label="URL" value={rule.url} onChange={(e) => updateDeviceRule(index, { url: e.target.value })} />
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
                            <Input label="URL" value={rule.url} onChange={(e) => updateParamRule(index, { url: e.target.value })} />
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
                              onChange={(event) => updateAbUrl(1, event.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                  </div>
                ) : null}
              </section>

              {/* Collapsible: Tracking */}
              <section className="rounded-[24px] border border-white/80 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setTrackingOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-900">{t.create.tracking}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {draft.tracking?.enabled
                        ? locale === "zh-Hant" ? "已啟用" : "Enabled"
                        : locale === "zh-Hant" ? "預設關閉" : "Off by default"}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${trackingOpen ? "rotate-180" : ""}`} />
                </button>
                {trackingOpen ? (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 grid gap-4 md:grid-cols-2">
                    <Input
                      label="GA4 Measurement ID"
                      value={draft.tracking?.ga4Id ?? ""}
                      placeholder="e.g. G-AB12C3D4E5"
                      onChange={(e) => updateDraft({ tracking: { ...draft.tracking, enabled: true, ga4Id: e.target.value } })}
                    />
                    <Input
                      label="Meta Pixel ID"
                      value={draft.tracking?.metaPixelId ?? ""}
                      placeholder="e.g. 123456789012345"
                      onChange={(e) => updateDraft({ tracking: { ...draft.tracking, enabled: true, metaPixelId: e.target.value } })}
                    />
                  </div>
                ) : null}
              </section>

              {/* Toggle: Password */}
              <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{t.create.password}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {locale === "zh-Hant" ? "訪客掃碼前需輸入密碼" : "Require a password before redirecting"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordOpen((v) => {
                        if (v) {
                          updateDraft({ password: undefined });
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
                      hint={!step2Errors.password ? t.create.passwordRequiredHint : undefined}
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

              {/* Toggle: Expiration */}
              <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{t.create.expirationDate}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {locale === "zh-Hant" ? "到期後二維碼自動失效" : "QR code expires and stops redirecting"}
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

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  {t.common.back}
                </Button>
                <Button onClick={goToDesignStep}>{t.common.continue}</Button>
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
                      {correctionLevels.map((level) => (
                        <button
                          key={level.id}
                          onClick={() => updateDesign({ correctionLevel: level.id })}
                          className={`rounded-[18px] p-4 text-center ring-1 transition ${
                            design.correctionLevel === level.id
                              ? "bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(245,243,255,0.95))] ring-sky-100"
                              : "bg-slate-50 ring-slate-100"
                          }`}
                        >
                          <div className="mx-auto mb-2 h-10 w-10 rounded-xl bg-white ring-1 ring-slate-100" />
                          <div className="text-sm font-medium text-slate-800">{level.label}</div>
                          <div className="mt-1 text-xs text-slate-500">{level.note}</div>
                        </button>
                      ))}
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
                      <input
                        id="logo-upload-input"
                        type="file"
                        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                        className="hidden"
                        onChange={handleCustomLogoUpload}
                      />
                      <label
                        htmlFor="logo-upload-input"
                        className="flex cursor-pointer items-center justify-between rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex items-start gap-3">
                          <Upload size={18} className="mt-0.5 text-slate-500" />
                          <div>
                            <div className="text-sm font-medium text-slate-800">{t.create.logoUploadAction}</div>
                            <div className="text-xs text-slate-500">{t.create.logoUploadHint}</div>
                          </div>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          {t.create.logoChooseFile}
                        </span>
                      </label>

                      {customLogoName ? (
                        <div className="text-xs text-slate-500">
                          {t.create.logoSelectedFile}: {customLogoName}
                        </div>
                      ) : null}

                      {logoUploadError ? <div className="text-xs text-rose-600">{logoUploadError}</div> : null}
                    </div>
                  </div>
                ) : null}
              </section>

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  {t.common.back}
                </Button>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="secondary" onClick={saveDraftSnapshot}>
                    {t.common.saveDraft}
                  </Button>
                  <Button type="button" onClick={generateEntry}>{t.common.generate}</Button>
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
                <div className="mt-4 space-y-3">
                  {([
                    { id: "web" as const, title: t.create.targetTypeWeb, body: t.create.targetTypeWebBody },
                    { id: "whatsapp" as const, title: t.create.targetTypeWhatsapp, body: t.create.targetTypeWhatsappBody },
                    { id: "vcard" as const, title: t.create.targetTypeVcard, body: t.create.targetTypeVcardBody },
                  ]).map((target) => (
                    <button
                      key={target.id}
                      type="button"
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
                      }`}
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

          {step !== 1 && step !== 3 ? (
            <Card>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles size={16} className="text-sky-600" />
                {t.create.hintTitle}
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
                {t.create.hints.map((hint) => (
                  <div key={hint} className="rounded-[18px] bg-white/82 px-4 py-3 ring-1 ring-[rgba(190,206,226,0.4)]">
                    {hint}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {step >= 2 ? (
            <Card>
              <div className="text-sm font-semibold text-slate-900">{t.create.designPreview}</div>
              <div className="mt-4 rounded-[26px] bg-[linear-gradient(135deg,#f7fbff_0%,#edf6ff_48%,#f4f2ff_100%)] p-5">
                <div className="relative mx-auto h-48 w-48">
                  <div
                    className="flex h-full w-full items-center justify-center rounded-[24px] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                    style={{ backgroundColor: previewBackgroundColor }}
                  >
                    <QrStyleMatrixPreview
                      style={selectedQrStyle}
                      size={21}
                      color={previewBorderColor}
                      backgroundColor={previewBackgroundColor}
                      cellPx={5}
                      gapPx={2}
                      correctionLevel={previewCorrection}
                      cornerBorderStyle={previewCornerBorder}
                      cornerCenterStyle={previewCornerCenter}
                      inactiveColor="transparent"
                      showFinders
                    />
                  </div>
                  {selectedLogoUrl ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative h-14 w-14 overflow-hidden rounded-[18px] bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.16)] ring-1 ring-slate-200">
                        <Image src={selectedLogoUrl} alt="Selected QR logo" fill unoptimized sizes="56px" className="object-contain p-2" />
                      </div>
                    </div>
                  ) : null}
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
                <div className="flex items-center justify-between">
                  <span>Rule mode</span>
                  <strong>{ruleModePreviewLabel}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Logo</span>
                  <strong>{selectedLogoLabel}</strong>
                </div>
              </div>
              <div className="mt-4 rounded-[18px] bg-slate-50/85 px-4 py-3 text-sm text-slate-600 ring-1 ring-[rgba(190,206,226,0.45)]">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{t.create.targetTypeLabel}</div>
                <div className="mt-2 truncate font-medium text-slate-800">{targetTypePreviewValue}</div>
              </div>
              <div className="mt-5 rounded-[20px] border border-[rgba(190,206,226,0.52)] bg-white/90 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{t.create.entryUrlLabel}</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1 rounded-[14px] bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-100">
                    <div className="truncate">{previewEntryUrl}</div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={copyEntryUrl}
                    className="h-10 rounded-[14px] px-3"
                    icon={<Copy size={14} />}
                  >
                    {entryUrlCopied ? t.common.copied : t.common.copy}
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
