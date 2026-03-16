export type QRStatus = "draft" | "active" | "expired";
export type QRRuleMode = "none" | "language" | "region";

export interface QRRuleItem {
  language?: string;
  region?: string;
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
  name: string;
  type: "url";
  status: QRStatus;
  defaultUrl: string;
  ruleMode: QRRuleMode;
  languageRules?: Array<{ language: string; url: string }>;
  regionRules?: Array<{ region: string; url: string }>;
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
