import { analyticsOverview, rankingData, trendData } from "@/mock/analytics";
import { mockUser } from "@/mock/auth";
import { dashboardStats } from "@/mock/dashboard";
import { mockQrList } from "@/mock/qrs";
import type { QRDraftFromAI } from "@/types/ai";

const wait = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login() {
  await wait(400);
  return { token: "mock-token", user: mockUser };
}

export async function register() {
  await wait(500);
  return { token: "mock-token", user: mockUser };
}

export async function getDashboardStats() {
  await wait(200);
  return dashboardStats;
}

export async function getQrList() {
  await wait(200);
  return mockQrList;
}

export async function getAnalyticsOverview() {
  await wait(200);
  return { overview: analyticsOverview, trendData, rankingData };
}

export async function chatWithQwen(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  locale: string
): Promise<{ reply: string; draft: Partial<QRDraftFromAI> }> {
  const res = await fetch("/api/qwen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, locale }),
  });
  const data = await res.json();
  return {
    reply: data.reply ?? "AI\u672a\u8fd4\u56de\u5185\u5bb9",
    draft: data.draft ?? {},
  };
}
