import { mockQrList } from "@/mock/qrs";

export const dashboardStats = {
  totalQrs: mockQrList.length,
  monthlyScans: 8450,
  activeQrs: mockQrList.filter((item) => item.status === "active").length,
  recentAdded: 4,
};

export const quickActions = [
  {
    title: "新增二维码",
    description: "通过 AI 对话快速创建一个新的动态 URL 二维码。",
    href: "/qrs/new",
  },
  {
    title: "管理二维码",
    description: "查看列表、编辑规则或复制链接。",
    href: "/qrs",
  },
  {
    title: "分析统计",
    description: "查看最近 7 天趋势和活跃二维码表现。",
    href: "/analytics",
  },
];
