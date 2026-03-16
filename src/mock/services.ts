import { analyticsOverview, rankingData, trendData } from "@/mock/analytics";
import { mockUser } from "@/mock/auth";
import { dashboardStats } from "@/mock/dashboard";
import { defaultDraft } from "@/mock/ai";
import { mockQrList } from "@/mock/qrs";

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

export async function chatWithAI(input: string) {
  await wait(450);
  return {
    reply: `我已经记录你的补充：“${input}”。接下来你可以继续补充规则，或者进入确认草稿。`,
    draft: defaultDraft,
  };
}
