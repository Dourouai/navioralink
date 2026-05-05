import type { Metadata } from "next";

import type { Locale } from "@/i18n/config";

type PageMetadataKey =
  | "home"
  | "pricing"
  | "support"
  | "contact"
  | "about"
  | "privacy"
  | "refundPolicy"
  | "terms"
  | "beta"
  | "login"
  | "register"
  | "verifyEmail"
  | "forgotPassword"
  | "resetPassword"
  | "dashboard"
  | "qrs"
  | "qrsArchived"
  | "qrsNew"
  | "files"
  | "analytics"
  | "settings"
  | "upgrade";

const pageMetadata: Record<Locale, Record<PageMetadataKey, { title: string; description: string }>> = {
  "zh-Hant": {
    home: {
      title: "Naviora | 智能入口與 QR Routing 平台",
      description: "用一個智能入口統一管理官網、活動頁、線下 QR 與多市場流量，並按語言、地區與設備自動分流。",
    },
    pricing: {
      title: "方案價格 | Naviora",
      description: "查看 Naviora 的 Free、Starter 與 Plus 方案，了解價格、連結數量、AI 對話與訪問額度差異。",
    },
    support: {
      title: "幫助支持 | Naviora",
      description: "透過 Email 或微信聯繫 Naviora，取得產品、合作與使用上的幫助支持。",
    },
    contact: {
      title: "聯絡我們 | Naviora",
      description: "直接透過 Email、微信或 X 聯絡 Naviora，討論產品、合作、方案與入口場景。",
    },
    about: {
      title: "關於我們 | Naviora",
      description: "認識來自 Shanghai 的獨立開發者，看看 Naviora 如何把 Rule-based Links 與 QR Routing 做成更好用的入口產品。",
    },
    privacy: {
      title: "隱私政策 | Naviora",
      description: "查看 Naviora 的隱私政策，了解我們如何依 GDPR、Google Analytics、騰訊雲 COS 與後續 Creem 付款流程處理與保護資料。",
    },
    refundPolicy: {
      title: "退款政策 | Naviora",
      description: "查看 Naviora 的 SaaS 退款政策，了解 14 天內重大服務故障或不可用情況下的退款申請條件與流程。",
    },
    terms: {
      title: "服務條款 | Naviora",
      description: "閱讀 Naviora 的服務條款，了解產品範圍、使用者責任、付款合作方流程與 GDPR 或 DPA 支援相關規範。",
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
    verifyEmail: {
      title: "確認信箱 | Naviora",
      description: "請先完成信箱驗證，再返回 Naviora 登入並開始使用工作台。",
    },
    forgotPassword: {
      title: "重設密碼 | Naviora",
      description: "輸入你的登入信箱，取得 Naviora 的密碼重設連結。",
    },
    resetPassword: {
      title: "設定新密碼 | Naviora",
      description: "透過電子郵件驗證後，為你的 Naviora 帳號設定一組新密碼。",
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
    files: {
      title: "文件中心 | Naviora",
      description: "集中管理圖片與 PDF，讓頭像、Logo 與後續公開素材都能從同一個媒體庫選取。",
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
      description: "用一个智能入口统一管理官网、活动页、线下 QR 和多市场流量，并按语言、地区与设备自动分流。",
    },
    pricing: {
      title: "方案价格 | Naviora",
      description: "查看 Naviora 的 Free、Starter 与 Plus 方案，了解价格、链接数量、AI 对话与访问额度差异。",
    },
    support: {
      title: "帮助支持 | Naviora",
      description: "通过 Email 或微信联系 Naviora，获取产品、合作与使用上的帮助支持。",
    },
    contact: {
      title: "联系我们 | Naviora",
      description: "直接通过 Email、微信或 X 联系 Naviora，讨论产品、合作、方案与入口场景。",
    },
    about: {
      title: "关于我们 | Naviora",
      description: "认识来自 Shanghai 的独立开发者，看看 Naviora 如何把 Rule-based Links 与 QR Routing 做成更好用的入口产品。",
    },
    privacy: {
      title: "隐私政策 | Naviora",
      description: "查看 Naviora 的隐私政策，了解我们如何按 GDPR、Google Analytics、腾讯云 COS 与后续支付合作方流程处理与保护数据。",
    },
    refundPolicy: {
      title: "退款政策 | Naviora",
      description: "查看 Naviora 的 SaaS 退款政策，了解 14 天内重大服务故障或不可用情况下的退款申请条件与流程。",
    },
    terms: {
      title: "服务条款 | Naviora",
      description: "阅读 Naviora 的服务条款，了解产品范围、用户责任、支付合作方流程与 GDPR 或 DPA 支持相关规范。",
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
    verifyEmail: {
      title: "确认邮箱 | Naviora",
      description: "请先完成邮箱验证，再返回 Naviora 登录并开始使用工作台。",
    },
    forgotPassword: {
      title: "重置密码 | Naviora",
      description: "输入你的登录邮箱，获取 Naviora 的密码重置链接。",
    },
    resetPassword: {
      title: "设置新密码 | Naviora",
      description: "通过邮件验证后，为你的 Naviora 账号设置一组新密码。",
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
    files: {
      title: "文件中心 | Naviora",
      description: "集中管理图片与 PDF，让头像、Logo 与后续公开素材都能从同一个媒体库选取。",
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
      description: "Use one smart entry layer to manage websites, campaigns, offline QR, and multi-market traffic, then route visitors by language, region, and device.",
    },
    pricing: {
      title: "Pricing | Naviora",
      description: "Compare Free, Starter, and Plus plans in Naviora, including pricing, link limits, AI conversations, and visit capacity.",
    },
    support: {
      title: "Help & Support | Naviora",
      description: "Contact Naviora for product questions, collaboration requests, and onboarding support via email or WeChat.",
    },
    contact: {
      title: "Contact | Naviora",
      description: "Reach out directly via email, WeChat, or X to discuss product, collaboration, plans, and entry scenarios with Naviora.",
    },
    about: {
      title: "About | Naviora",
      description: "Meet the independent developer building Naviora from Shanghai and see how it turns rule-based links and QR routing into a more usable entry product.",
    },
    privacy: {
      title: "Privacy Policy | Naviora",
      description: "Read the Naviora privacy policy to understand how account, analytics, Tencent Cloud COS assets, Google Analytics data, and future billing partner data are handled and protected.",
    },
    refundPolicy: {
      title: "Refund Policy | Naviora",
      description: "Read the Naviora SaaS refund policy, including the 14-day refund window for material service issues that impact core use.",
    },
    terms: {
      title: "Terms of Service | Naviora",
      description: "Review the Naviora terms of service for product scope, user responsibilities, payment partner flows, and GDPR or DPA-related obligations.",
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
    verifyEmail: {
      title: "Verify Email | Naviora",
      description: "Verify your email address first, then return to Naviora and sign in to continue.",
    },
    forgotPassword: {
      title: "Reset Password | Naviora",
      description: "Enter your sign-in email to receive a password reset link from Naviora.",
    },
    resetPassword: {
      title: "Set a New Password | Naviora",
      description: "Choose a new password for your Naviora account after email verification.",
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
    files: {
      title: "Files | Naviora",
      description: "Manage uploaded images and PDFs in one shared media library for avatars, logos, and future public assets.",
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
