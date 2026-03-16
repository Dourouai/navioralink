import type { QRRuleMode } from "@/types/qr";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface QRDraftFromAI {
  name?: string;
  defaultUrl?: string;
  ruleMode?: QRRuleMode;
  languageRules?: Array<{ language: string; url: string }>;
  regionRules?: Array<{ region: string; url: string }>;
  tracking?: {
    ga4Id?: string;
    metaPixelId?: string;
    enabled: boolean;
  };
  password?: string;
  folder?: string;
  expiresAt?: string;
}
