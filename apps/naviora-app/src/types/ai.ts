import type { OpenAppTarget, QRRuleMode, QRTargetType, VCardProfile, WhatsAppTarget } from "@/types/qr";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface QRDraftFromAI {
  name?: string;
  defaultUrl?: string;
  targetType?: QRTargetType;
  ruleMode?: QRRuleMode;
  languageRules?: Array<{ language: string; url: string }>;
  regionRules?: Array<{ region: string; url: string }>;
  deviceRules?: Array<{ os: string; url: string }>;
  paramRules?: Array<{ key: string; value: string; url: string }>;
  abRules?: Array<{ variant: "A" | "B"; weight: number; url: string }>;
  whatsapp?: WhatsAppTarget;
  vcard?: VCardProfile;
  openApp?: OpenAppTarget;
  tracking?: {
    ga4Id?: string;
    metaPixelId?: string;
    enabled: boolean;
  };
  password?: string;
  passwordConfigured?: boolean;
  folder?: string;
  expiresAt?: string;
}
