export type QRStatus = "draft" | "active" | "paused" | "expired" | "archived";
export type QRRuleMode = "none" | "language" | "region" | "device" | "param" | "ab";
export type QRTargetType = "web" | "whatsapp" | "vcard";

export type VCardSocialPlatform = "instagram" | "linkedin" | "facebook" | "x" | "youtube" | "wechat" | "website";
export type VCardImageVisibility = "public";

export interface VCardImageAsset {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  createdAt: string;
  visibility: VCardImageVisibility;
}

export interface VCardSocialLink {
  platform: VCardSocialPlatform;
  url: string;
}

export interface WhatsAppTarget {
  countryIso?: string;
  countryCode?: string;
  phone?: string;
  message?: string;
}

export interface VCardProfile {
  contentId?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  company?: string;
  title?: string;
  website?: string;
  avatarAssetId?: string;
  avatarDataUrl?: string;
  avatarFileName?: string;
  imageAssets?: VCardImageAsset[];
  socialLinks?: VCardSocialLink[];
}

export interface QRRuleItem {
  language?: string;
  region?: string;
  os?: string;
  variant?: "A" | "B";
  weight?: number;
  url: string;
}

export interface QRDesign {
  qrStyle?: string;
  borderColor?: string;
  backgroundColor?: string;
  cornerBorderStyle?: string;
  cornerCenterStyle?: string;
  correctionLevel?: "L" | "M" | "Q" | "H";
  logoType?: string;
  logoUrl?: string;
}

export interface QRCodeItem {
  id: string;
  slug?: string;
  name: string;
  // Public entry path prefixes are reserved as:
  // l = link
  // c = content
  type: "url";
  status: QRStatus;
  targetType?: QRTargetType;
  defaultUrl: string;
  ruleMode: QRRuleMode;
  languageRules?: Array<{ language: string; url: string }>;
  regionRules?: Array<{ region: string; url: string }>;
  deviceRules?: Array<{ os: string; url: string }>;
  paramRules?: Array<{ key: string; value: string; url: string }>;
  abRules?: Array<{ variant: "A" | "B"; weight: number; url: string }>;
  whatsapp?: WhatsAppTarget;
  vcard?: VCardProfile;
  tracking?: {
    ga4Id?: string;
    metaPixelId?: string;
    enabled: boolean;
  };
  password?: string;
  folderId?: string;
  expiresAt?: string;
  design?: QRDesign;
  scans: number;
  createdAt: string;
  updatedAt: string;
}
