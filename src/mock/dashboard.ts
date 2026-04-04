import { mockQrList } from "@/mock/qrs";

export const dashboardStats = {
  totalQrs: mockQrList.length,
  monthlyScans: 8450,
  activeQrs: mockQrList.filter((item) => item.status === "active").length,
  recentAdded: 4,
};

export const quickActions = [
  {
    title: "创建智能入口",
    description: "通过 AI 对话快速创建一个新的智能入口。",
    href: "/qrs/new",
  },
  {
    title: "入口管理",
    description: "查看列表、编辑规则或复制链接。",
    href: "/qrs",
  },
  {
    title: "分析统计",
    description: "查看最近 7 天趋势和活跃入口表现。",
    href: "/analytics",
  },
];
