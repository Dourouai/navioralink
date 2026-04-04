import type { Metadata } from "next";

import type { Locale } from "@/i18n/config";

type PageMetadataKey =
  | "home"
  | "pricing"
  | "about"
  | "privacy"
  | "terms"
  | "beta"
  | "login"
  | "register"
  | "dashboard"
  | "qrs"
  | "qrsArchived"
  | "qrsNew"
  | "analytics"
  | "settings"
  | "upgrade";

const pageMetadata: Record<Locale, Record<PageMetadataKey, { title: string; description: string }>> = {
  "zh-Hant": {
    home: {
      title: "Naviora | 智能入口與 QR Routing 平台",
      description: "用 AI 建立智能入口、管理多語言與地區路由，並用同一套規則驅動 Smart Link 與 QR。",
    },
    pricing: {
      title: "方案價格 | Naviora",
      description: "查看 Naviora 的 Free、Starter 與 Premium 方案，了解價格、連結數量、AI 對話與訪問額度差異。",
    },
    about: {
      title: "關於我們 | Naviora",
      description: "認識 Naviora 與 ZAPS Lab，了解我們如何用 Rule-based Links 與 QR Routing 打造智能入口產品。",
    },
    privacy: {
      title: "隱私政策 | Naviora",
      description: "查看 Naviora 的隱私政策，了解我們如何蒐集、使用與保護帳號、入口與分析資料。",
    },
    terms: {
      title: "服務條款 | Naviora",
      description: "閱讀 Naviora 的服務條款，了解產品範圍、使用者責任與服務調整相關規範。",
    },
    beta: {
      title: "內測申請 | Naviora",
      description: "申請加入 Naviora 內測，分享你的品牌、網址與使用情境，我們會盡快和你聯繫。",
    },
    login: {
      title: "登入 | Naviora",
      description: "登入 Naviora 工作台，繼續管理你的智能入口、QR 路由規則與分析資料。",
    },
    register: {
      title: "建立帳號 | Naviora",
      description: "建立 Naviora 帳號，開始用 AI 建立智能入口、Smart Link 與 QR Routing 流程。",
    },
    dashboard: {
      title: "工作台 | Naviora",
      description: "在 Naviora 工作台快速查看入口狀態、掃碼趨勢、最近活動與常用操作入口。",
    },
    qrs: {
      title: "入口管理 | Naviora",
      description: "集中搜尋、篩選、編輯與管理所有智能入口，快速查看預設網址、規則模式與掃碼數據。",
    },
    qrsArchived: {
      title: "歸檔入口 | Naviora",
      description: "查看已歸檔的智能入口，保留歷史網址並在需要時恢復到主列表。",
    },
    qrsNew: {
      title: "创建智能入口 | Naviora",
      description: "透過 AI 對話建立智能入口，完成規則確認、QR 設計與發佈前的最後設定。",
    },
    analytics: {
      title: "分析統計 | Naviora",
      description: "預設統計全部入口資料，支援依名稱、狀態與規則模式篩選，查看地區、裝置、語言與趨勢分析。",
    },
    settings: {
      title: "設定中心 | Naviora",
      description: "管理 Naviora 帳號安全、登入信箱、密碼、目前方案與帳單紀錄。",
    },
    upgrade: {
      title: "升級方案 | Naviora",
      description: "在登入後查看與 Pricing 頁一致的方案價格、用量限制與升級選項。",
    },
  },
  "zh-Hans": {
    home: {
      title: "Naviora | 智能入口与 QR Routing 平台",
      description: "用 AI 建立智能入口、管理多语言与地区路由，并用同一套规则驱动 Smart Link 与 QR。",
    },
    pricing: {
      title: "方案价格 | Naviora",
      description: "查看 Naviora 的 Free、Starter 与 Premium 方案，了解价格、链接数量、AI 对话与访问额度差异。",
    },
    about: {
      title: "关于我们 | Naviora",
      description: "认识 Naviora 与 ZAPS Lab，了解我们如何用 Rule-based Links 与 QR Routing 打造智能入口产品。",
    },
    privacy: {
      title: "隐私政策 | Naviora",
      description: "查看 Naviora 的隐私政策，了解我们如何收集、使用与保护账号、入口与分析数据。",
    },
    terms: {
      title: "服务条款 | Naviora",
      description: "阅读 Naviora 的服务条款，了解产品范围、用户责任与服务调整相关规范。",
    },
    beta: {
      title: "内测申请 | Naviora",
      description: "申请加入 Naviora 内测，分享你的品牌、网址与使用情境，我们会尽快和你联系。",
    },
    login: {
      title: "登录 | Naviora",
      description: "登录 Naviora 工作台，继续管理你的智能入口、QR 路由规则与分析数据。",
    },
    register: {
      title: "创建账号 | Naviora",
      description: "创建 Naviora 账号，开始用 AI 建立智能入口、Smart Link 与 QR Routing 流程。",
    },
    dashboard: {
      title: "工作台 | Naviora",
      description: "在 Naviora 工作台快速查看入口状态、扫码趋势、最近活动与常用操作入口。",
    },
    qrs: {
      title: "入口管理 | Naviora",
      description: "集中搜索、筛选、编辑与管理所有智能入口，快速查看默认网址、规则模式与扫码数据。",
    },
    qrsArchived: {
      title: "归档入口 | Naviora",
      description: "查看已归档的智能入口，保留历史网址，并在需要时恢复到主列表。",
    },
    qrsNew: {
      title: "创建智能入口 | Naviora",
      description: "通过 AI 对话建立智能入口，完成规则确认、QR 设计与发布前的最后设置。",
    },
    analytics: {
      title: "分析统计 | Naviora",
      description: "预设统计全部入口数据，支持依名称、状态与规则模式筛选，查看地区、设备、语言与趋势分析。",
    },
    settings: {
      title: "设置中心 | Naviora",
      description: "管理 Naviora 账号安全、登录信箱、密码、目前方案与账单记录。",
    },
    upgrade: {
      title: "升级方案 | Naviora",
      description: "在登录后查看与 Pricing 页一致的方案价格、用量限制与升级选项。",
    },
  },
  en: {
    home: {
      title: "Naviora | Smart Entry and QR Routing Platform",
      description: "Use AI to create smart entries, manage language and region routing, and power both smart links and QR flows from one rule system.",
    },
    pricing: {
      title: "Pricing | Naviora",
      description: "Compare Free, Starter, and Premium plans in Naviora, including pricing, link limits, AI conversations, and visit capacity.",
    },
    about: {
      title: "About | Naviora",
      description: "Meet Naviora and ZAPS Lab, and learn how we build smart entry products with rule-based links and QR routing.",
    },
    privacy: {
      title: "Privacy Policy | Naviora",
      description: "Read the Naviora privacy policy to understand how account, entry, and analytics data is collected, used, and protected.",
    },
    terms: {
      title: "Terms of Service | Naviora",
      description: "Review the Naviora terms of service for product scope, user responsibilities, and service change policies.",
    },
    beta: {
      title: "Beta Application | Naviora",
      description: "Apply for the Naviora beta and tell us about your brand, website, and use case so we can invite the right early users.",
    },
    login: {
      title: "Log In | Naviora",
      description: "Log in to Naviora to continue managing your smart entries, QR routing rules, and analytics.",
    },
    register: {
      title: "Create Account | Naviora",
      description: "Create your Naviora account and start building smart entries, smart links, and QR routing flows with AI.",
    },
    dashboard: {
      title: "Dashboard | Naviora",
      description: "Use the Naviora dashboard to review entry health, scan trends, recent activity, and your most-used actions.",
    },
    qrs: {
      title: "Entry Management | Naviora",
      description: "Search, filter, edit, and manage all smart entries while reviewing default URLs, rule modes, and scan performance.",
    },
    qrsArchived: {
      title: "Archived Entries | Naviora",
      description: "Review archived entries, preserve historical URLs, and restore any entry back to the main list when needed.",
    },
    qrsNew: {
      title: "Create Entry | Naviora",
      description: "Use AI conversation to create a smart entry, confirm routing rules, and finish QR design before publishing.",
    },
    analytics: {
      title: "Analytics | Naviora",
      description: "Analyze all created entries by default, filter the report, and review trend, region, device, language, and ranking data.",
    },
    settings: {
      title: "Settings | Naviora",
      description: "Manage account security, sign-in email, password, current plan, and billing records in Naviora.",
    },
    upgrade: {
      title: "Upgrade | Naviora",
      description: "Review the same plan pricing and limits from the Pricing page and upgrade from inside the workspace.",
    },
  },
};

export function buildPageMetadata(locale: Locale, key: PageMetadataKey): Metadata {
  return pageMetadata[locale][key];
}

export function buildEntryAnalyticsMetadata(locale: Locale, entryName: string): Metadata {
  if (locale === "zh-Hant") {
    return {
      title: `${entryName}｜入口分析 | Naviora`,
      description: `查看 ${entryName} 的掃碼趨勢、地區、裝置、語言分布與路由表現。`,
    };
  }

  if (locale === "zh-Hans") {
    return {
      title: `${entryName}｜入口分析 | Naviora`,
      description: `查看 ${entryName} 的扫码趋势、地区、设备、语言分布与路由表现。`,
    };
  }

  return {
    title: `${entryName} | Entry Analytics | Naviora`,
    description: `Review scan trends, region, device, language breakdowns, and routing performance for ${entryName}.`,
  };
}
