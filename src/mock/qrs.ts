import type { QRCodeItem } from "@/types/qr";

export const mockQrList: QRCodeItem[] = [
  {
    id: "qr_expo_2026",
    name: "2026 展会海报",
    type: "url",
    status: "active",
    defaultUrl: "https://zapsqr.com/en/expo",
    ruleMode: "language",
    languageRules: [
      { language: "English", url: "https://zapsqr.com/en/expo" },
      { language: "繁體中文", url: "https://zapsqr.com/hk/expo" },
    ],
    tracking: {
      ga4Id: "G-7TWEXPO26",
      metaPixelId: "204820482",
      enabled: true,
    },
    design: {
      qrStyle: "rounded",
      borderColor: "#0F172A",
      backgroundColor: "#F8FAFC",
      cornerBorderStyle: "rounded",
      cornerCenterStyle: "dot",
      correctionLevel: "H",
      logoType: "spark",
    },
    scans: 2841,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-15T11:30:00.000Z",
  },
  {
    id: "qr_packaging_global",
    name: "包装说明页",
    type: "url",
    status: "active",
    defaultUrl: "https://zapsqr.com/en/package",
    ruleMode: "region",
    regionRules: [
      { region: "中国香港", url: "https://zapsqr.com/hk/package" },
      { region: "日本", url: "https://zapsqr.com/jp/package" },
    ],
    tracking: {
      enabled: false,
    },
    design: {
      qrStyle: "classic",
      borderColor: "#082F49",
      backgroundColor: "#FFFFFF",
      cornerBorderStyle: "square",
      cornerCenterStyle: "square",
      correctionLevel: "Q",
      logoType: "none",
    },
    scans: 1336,
    createdAt: "2026-02-23T09:10:00.000Z",
    updatedAt: "2026-03-14T16:20:00.000Z",
  },
  {
    id: "qr_menu_spring",
    name: "春季菜单活动",
    type: "url",
    status: "draft",
    defaultUrl: "https://zapsqr.com/en/menu",
    ruleMode: "none",
    tracking: {
      enabled: false,
    },
    scans: 118,
    createdAt: "2026-03-12T07:00:00.000Z",
    updatedAt: "2026-03-15T08:00:00.000Z",
  },
];
