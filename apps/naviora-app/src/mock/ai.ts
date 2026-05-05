import type { ChatMessage, QRDraftFromAI } from "@/types/ai";

export const defaultConversation: ChatMessage[] = [
  {
    id: "m1",
    role: "assistant",
    content: "告诉我你的二维码要服务什么场景，我会先帮你整理成可编辑草稿。",
  },
  {
    id: "m2",
    role: "user",
    content: "我要做一个 2026 展会海报二维码，英文用户去英文页，香港用户去繁中页。",
  },
  {
    id: "m3",
    role: "assistant",
    content: "收到。请继续补充 Default URL、繁中 URL，以及是否需要 GA4 或 Meta Pixel。",
  },
];

export const defaultDraft: QRDraftFromAI = {
  name: "2026 展会海报",
  defaultUrl: "https://naviora.com/en/expo",
  ruleMode: "language",
  languageRules: [
    { language: "en", url: "https://naviora.com/en/expo" },
    { language: "zh-Hant", url: "https://naviora.com/hk/expo" },
  ],
  tracking: {
    ga4Id: "G-7TWEXPO26",
    metaPixelId: "204820482",
    enabled: true,
  },
  expiresAt: "2026-06-30",
};
