import Link from "next/link";
import { ArrowRight, BarChart3, Download, FileText, Globe2, Link2, Megaphone, MessageCircleMore, QrCode, SlidersHorizontal, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

type HomeSectionCard = {
  title: string;
  body: string;
};

type HomeScenarioCard = HomeSectionCard & {
  icon: "card" | "website" | "campaign" | "qr" | "download" | "chat" | "docs" | "distribution";
};

type HomeMetricCard = {
  value: string;
  label: string;
  body: string;
};

type HomeCopy = {
  badge: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  pills: string[];
  heroPanelTitle: string;
  heroPanelBody: string;
  heroPanelMetrics: HomeMetricCard[];
  scenariosTitle: string;
  scenariosBody: string;
  scenarios: HomeScenarioCard[];
  resultsTitle: string;
  resultsBody: string;
  results: HomeSectionCard[];
  workflowTitle: string;
  workflowBody: string;
  workflowSteps: HomeSectionCard[];
  capabilitiesTitle: string;
  capabilitiesBody: string;
  capabilities: HomeSectionCard[];
  footerTitle: string;
};

function getHomeCopy(locale: Locale): HomeCopy {
  if (locale === "zh-Hant") {
    return {
      badge: "Smart entry workspace",
      eyebrow: "適合品牌官網、活動頁、線下二維碼與跨市場導流",
      title: "用動態二維碼與動態連結，串起轉化與數據。",
      subtitle:
        "Naviora 把官網、活動頁、電子名片與線下二維碼收進同一套動態二維碼與動態連結系統，再按語言、地區、設備或測試策略，把訪客帶到更合適的頁面，也把轉化結果與後續數據留在同一個工作台。",
      pills: ["品牌官網", "活動推廣", "線下物料 QR", "多語系市場", "展會名片", "下載導流"],
      heroPanelTitle: "入口系統，一眼看懂",
      heroPanelBody: "不是再多一個短連結工具，而是把入口、分流與後續優化都收進同一套業務面板。",
      heroPanelMetrics: [
        {
          value: "1 套入口",
          label: "官網、活動頁與 QR 共用",
          body: "海報、官網、社群貼文與展會名片可以共用同一套公開入口策略。",
        },
        {
          value: "4 類分流",
          label: "語言、地區、設備、測試",
          body: "依訪客上下文自動打開對應頁面，而不是讓所有人都進同一個網址。",
        },
        {
          value: "持續可改",
          label: "目標頁與規則隨時更新",
          body: "不必每次活動都重印 QR 或重發連結，入口可以持續沿用。",
        },
        {
          value: "有數據回看",
          label: "後續優化更有依據",
          body: "入口發出去之後，仍然能根據訪問結果繼續調整內容與策略。",
        },
      ],
      scenariosTitle: "常見業務場景",
      scenariosBody: "把場景拆得更細一點，你會更容易看出 Naviora 適合放在哪些實際業務流程裡。",
      scenarios: [
        {
          icon: "card",
          title: "電子名片與展會名片",
          body: "把個人介紹、官網、微信、WhatsApp 與聯絡方式收進同一個入口，適合展會、BD 與銷售跟進。",
        },
        {
          icon: "website",
          title: "多語系品牌官網",
          body: "同一個入口，讓不同國家與語言的訪客打開對應版本，不必手動選站點。",
        },
        {
          icon: "campaign",
          title: "活動與廣告投放",
          body: "讓不同渠道、裝置或測試組流量打開不同落地頁，方便持續優化成效。",
        },
        {
          icon: "qr",
          title: "線下海報與包裝 QR",
          body: "同一個 QR 可隨活動、檔期或市場更新目標內容，不用重印全部物料。",
        },
        {
          icon: "download",
          title: "App 下載與裝置導流",
          body: "iPhone、Android 與桌面使用者可以打開不同下載頁或說明頁，減少跳錯頁面的情況。",
        },
        {
          icon: "chat",
          title: "WhatsApp 與聯絡入口",
          body: "把客服、銷售與線索聯絡收在同一個入口裡，掃碼後直接進入對話或聯絡頁。",
        },
        {
          icon: "docs",
          title: "菜單、手冊與產品資料",
          body: "門店菜單、產品說明、型錄 PDF 或操作指南，都可以透過同一個公開入口承接。",
        },
        {
          icon: "distribution",
          title: "多市場與渠道分發",
          body: "依地區、語言或合作渠道把流量送往不同頁面，讓海外市場與代理分發更順手。",
        },
      ],
      resultsTitle: "你會得到的不是只有功能",
      resultsBody: "真正的價值，是讓入口不再零散，讓流量更容易管理，也讓後續優化更有依據。",
      results: [
        {
          title: "減少重複建連結與重做 QR",
          body: "入口建立一次就能持續沿用，不必每次改頁面就整批替換素材。",
        },
        {
          title: "讓市場與內容團隊更好協作",
          body: "同一個工作台裡就能看入口、規則、目標頁與公開網址，不需要四處對照。",
        },
        {
          title: "更容易看懂每個入口的效果",
          body: "流量從哪裡來、去了哪裡、用什麼設備打開，後續優化會更有方向。",
        },
      ],
      workflowTitle: "怎麼開始使用",
      workflowBody: "先選入口內容，再配置短連結、分流規則與 QR 樣式；發佈後會同時拿到動態短連結與動態二維碼，後面還能繼續編輯。",
      workflowSteps: [
        {
          title: "選擇你的入口內容",
          body: "先決定這是官網入口、活動頁、下載頁、WhatsApp、vCard 名片或其他公開內容頁。",
        },
        {
          title: "設定短連結、規則與樣式",
          body: "配置預設頁、語言/地區/設備規則，並同步調整短連結與二維碼外觀。",
        },
        {
          title: "發佈並下載動態 QR",
          body: "發佈後立即取得動態短連結與二維碼素材，後續仍可持續替換目標頁與分流策略。",
        },
      ],
      capabilitiesTitle: "核心能力",
      capabilitiesBody: "底層能力依然很完整，但我們更希望它們是為了業務結果服務。",
      capabilities: [
        {
          title: "Smart Link 與 QR 共用同一套入口策略",
          body: "不需要分兩套系統維護，線上與線下入口可以一起管理。",
        },
        {
          title: "支援多語言、多地區與多設備分流",
          body: "把同一批流量帶到更合適的內容頁，而不是只停在單一靜態網址。",
        },
        {
          title: "可延伸到電子名片與聯絡入口",
          body: "不只導網站，也能導到名片頁、WhatsApp、聯絡方式與內容載體。",
        },
        {
          title: "保留分析資料，方便後續成長",
          body: "入口不只是發出去就結束，而是可以持續觀察、調整與優化。",
        },
      ],
      footerTitle: "準備好把你的入口整理成一套可以長期使用的系統了嗎？",
    };
  }

  if (locale === "zh-Hans") {
    return {
      badge: "Smart entry workspace",
      eyebrow: "适合品牌官网、活动页、线下二维码和跨市场导流",
      title: "用动态二维码和动态链接，串起转化与数据。",
      subtitle:
        "Naviora 把官网、活动页、电子名片和线下二维码收进同一套动态二维码与动态链接系统，再按语言、地区、设备或测试策略，把访客带到更合适的页面，也把转化结果和后续数据留在同一个工作台。",
      pills: ["品牌官网", "活动推广", "线下物料 QR", "多语言市场", "展会名片", "下载导流"],
      heroPanelTitle: "入口系统，一眼看懂",
      heroPanelBody: "不是再多一个短链接工具，而是把入口、分流和后续优化都收进同一套业务面板。",
      heroPanelMetrics: [
        {
          value: "1 套入口",
          label: "官网、活动页与 QR 共用",
          body: "海报、官网、社媒贴文和展会名片可以共用同一套公开入口策略。",
        },
        {
          value: "4 类分流",
          label: "语言、地区、设备、测试",
          body: "按访客上下文自动打开对应页面，而不是让所有人都进同一个网址。",
        },
        {
          value: "持续可改",
          label: "目标页与规则随时更新",
          body: "不必每次活动都重印 QR 或重发链接，入口可以持续沿用。",
        },
        {
          value: "有数据回看",
          label: "后续优化更有依据",
          body: "入口发出去之后，仍然能根据访问结果继续调整内容与策略。",
        },
      ],
      scenariosTitle: "常见业务场景",
      scenariosBody: "把场景拆得更细一点，你会更容易看出 Naviora 适合放在哪些真实业务流程里。",
      scenarios: [
        {
          icon: "card",
          title: "电子名片与展会名片",
          body: "把个人介绍、官网、微信、WhatsApp 和联系方式收进同一个入口，适合展会、BD 和销售跟进。",
        },
        {
          icon: "website",
          title: "多语言品牌官网",
          body: "同一个入口，让不同国家和语言的访客打开对应版本，不必手动选站点。",
        },
        {
          icon: "campaign",
          title: "活动与广告投放",
          body: "让不同渠道、设备或测试组流量打开不同落地页，方便持续优化效果。",
        },
        {
          icon: "qr",
          title: "线下海报与包装 QR",
          body: "同一个 QR 可随活动、档期或市场更新目标内容，不用重印全部物料。",
        },
        {
          icon: "download",
          title: "App 下载与设备导流",
          body: "iPhone、Android 和桌面用户可以打开不同下载页或说明页，减少跳错页面的情况。",
        },
        {
          icon: "chat",
          title: "WhatsApp 与联系入口",
          body: "把客服、销售和线索联系收在同一个入口里，扫码后直接进入对话或联系页。",
        },
        {
          icon: "docs",
          title: "菜单、手册与产品资料",
          body: "门店菜单、产品说明、型录 PDF 或操作指南，都可以通过同一个公开入口承接。",
        },
        {
          icon: "distribution",
          title: "多市场与渠道分发",
          body: "按地区、语言或合作渠道把流量送往不同页面，让海外市场与代理分发更顺手。",
        },
      ],
      resultsTitle: "你得到的不只是功能",
      resultsBody: "真正的价值，是让入口不再零散，让流量更容易管理，也让后续优化更有依据。",
      results: [
        {
          title: "减少重复建链接和重做 QR",
          body: "入口建立一次就能持续沿用，不必每次改页面就整批替换素材。",
        },
        {
          title: "让市场与内容团队更好协作",
          body: "同一个工作台里就能看入口、规则、目标页和公开网址，不需要四处对照。",
        },
        {
          title: "更容易看懂每个入口的效果",
          body: "流量从哪里来、去了哪里、用什么设备打开，后续优化会更有方向。",
        },
      ],
      workflowTitle: "怎么开始使用",
      workflowBody: "先选入口内容，再配置短链接、分流规则和 QR 样式；发布后会同时拿到动态短链接与动态二维码，后面还能继续编辑。",
      workflowSteps: [
        {
          title: "选择你的入口内容",
          body: "先决定这是官网入口、活动页、下载页、WhatsApp、vCard 名片或其他公开内容页。",
        },
        {
          title: "设置短链接、规则和样式",
          body: "配置默认页、语言/地区/设备规则，并同步调整短链接与二维码外观。",
        },
        {
          title: "发布并下载动态 QR",
          body: "发布后立即拿到动态短链接与二维码素材，后续仍可持续替换目标页与分流策略。",
        },
      ],
      capabilitiesTitle: "核心能力",
      capabilitiesBody: "底层能力依然完整，但我们更希望它们是为业务结果服务。",
      capabilities: [
        {
          title: "Smart Link 与 QR 共用同一套入口策略",
          body: "不需要分两套系统维护，线上与线下入口可以一起管理。",
        },
        {
          title: "支持多语言、多地区与多设备分流",
          body: "把同一批流量带到更合适的内容页，而不是只停在单一静态网址。",
        },
        {
          title: "可延伸到电子名片与联系入口",
          body: "不只导网站，也能导到名片页、WhatsApp、联系方式与内容载体。",
        },
        {
          title: "保留分析数据，方便后续增长",
          body: "入口不只是发出去就结束，而是可以持续观察、调整和优化。",
        },
      ],
      footerTitle: "准备好把你的入口整理成一套可以长期使用的系统了吗？",
    };
  }

  return {
    badge: "Smart entry workspace",
    eyebrow: "Built for brand sites, campaign pages, offline QR, and multi-market traffic",
    title: "Use dynamic QR codes and dynamic links to connect conversion and analytics.",
    subtitle:
      "Naviora brings websites, campaign pages, digital cards, and offline QR into one dynamic QR and dynamic link system, then keeps routing, conversion, and analytics in the same workspace.",
    pills: ["Brand websites", "Campaign launches", "Offline QR", "Multilingual markets", "Event contacts", "App downloads"],
    heroPanelTitle: "The entry system at a glance",
    heroPanelBody: "This is not just another short-link tool. It brings entry management, routing, and iteration into one business-facing panel.",
    heroPanelMetrics: [
      {
        value: "One entry layer",
        label: "Shared across websites, campaigns, and QR",
        body: "Posters, websites, social posts, and event cards can all run on the same public entry strategy.",
      },
      {
        value: "4 routing dimensions",
        label: "Language, region, device, and tests",
        body: "Send visitors to the right page based on context instead of dropping everyone onto one static URL.",
      },
      {
        value: "Always editable",
        label: "Targets and rules stay flexible",
        body: "Keep the same public entry in circulation while you update targets, campaigns, and routing logic.",
      },
      {
        value: "Measured over time",
        label: "Optimization does not stop at launch",
        body: "Once the entry is live, visit data keeps giving you signal for the next iteration.",
      },
    ],
    scenariosTitle: "Business scenarios it fits well",
    scenariosBody: "Here are the more concrete scenarios where the product tends to make sense in day-to-day business operations.",
    scenarios: [
      {
        icon: "card",
        title: "Digital business cards",
        body: "Bundle profile, website, WeChat, WhatsApp, and contact details into one cleaner follow-up flow for events, BD, and sales.",
      },
      {
        icon: "website",
        title: "Multilingual brand websites",
        body: "Use one public entry and send visitors to the right language or market version automatically.",
      },
      {
        icon: "campaign",
        title: "Campaigns and ad traffic",
        body: "Split visitors by device, region, or experiment logic so you can optimize landing performance over time.",
      },
      {
        icon: "qr",
        title: "Offline posters and packaging QR",
        body: "Keep the same QR in the wild while updating destinations for new campaigns, launches, or markets.",
      },
      {
        icon: "download",
        title: "App downloads and device routing",
        body: "Send iPhone, Android, and desktop visitors to different download or instruction pages without splitting the public entry.",
      },
      {
        icon: "chat",
        title: "WhatsApp and contact handoff",
        body: "Turn one public entry into a direct support, sales, or lead handoff path instead of scattering contact links everywhere.",
      },
      {
        icon: "docs",
        title: "Menus, manuals, and product sheets",
        body: "Use one public entry for menus, PDFs, product guides, and documentation that may need to change over time.",
      },
      {
        icon: "distribution",
        title: "Multi-market channel distribution",
        body: "Route visitors by market, language, or partner channel so regional launches and distributor flows stay easier to manage.",
      },
    ],
    resultsTitle: "The value is bigger than the feature list",
    resultsBody: "The real benefit is a cleaner entry layer, easier traffic management, and better visibility into what is working.",
    results: [
      {
        title: "Less duplicated link and QR work",
        body: "Create the entry once and keep using it instead of replacing every asset when a page changes.",
      },
      {
        title: "Better coordination across teams",
        body: "Marketing, content, and operations can all look at entries, rules, targets, and public URLs in one workspace.",
      },
      {
        title: "A clearer read on entry performance",
        body: "See how people arrive, where they go, and which devices or regions shape the traffic pattern.",
      },
    ],
    workflowTitle: "How it works",
    workflowBody:
      "Start by choosing the content behind the entry, then configure the short link, routing rules, and QR look. Once published, you get both the dynamic link and the dynamic QR, and you can keep editing them later.",
    workflowSteps: [
      {
        title: "Choose what the entry should open",
        body: "Start with the real destination: a website, campaign page, download flow, WhatsApp, vCard, or other public content page.",
      },
      {
        title: "Set the short link, rules, and QR style",
        body: "Configure the default page, add language, region, device, or test rules, and shape the QR and short-link presentation.",
      },
      {
        title: "Publish and download the dynamic QR",
        body: "Launch once and get both the dynamic short link and the QR asset. Keep editing the target pages and routing logic later.",
      },
    ],
    capabilitiesTitle: "Core capabilities",
    capabilitiesBody: "The technical layer is still there, but it is shaped around business use instead of technical jargon.",
    capabilities: [
      {
        title: "One strategy across smart links and QR",
        body: "Manage online and offline entry points together instead of splitting them into separate systems.",
      },
      {
        title: "Routing by language, region, and device",
        body: "Turn one public entry into a context-aware experience without creating a maze of separate URLs.",
      },
      {
        title: "Extend into digital business cards and contact pages",
        body: "The entry layer does not need to stop at websites. It can also serve profile, contact, and messaging flows.",
      },
      {
        title: "Analytics that support the next decision",
        body: "Entries stay measurable, editable, and reusable instead of becoming dead links once they are published.",
      },
    ],
    footerTitle: "Ready to turn your entry points into a system that keeps working over time?",
  };
}

function isHeroQrCellFilled(row: number, col: number) {
  const inFinder =
    (row <= 3 && col <= 3) ||
    (row <= 3 && col >= 9) ||
    (row >= 9 && col <= 3);

  if (inFinder) {
    const localRow = row <= 3 ? row : row - 9;
    const localCol = col <= 3 ? col : col - 9;
    return localRow === 0 || localRow === 3 || localCol === 0 || localCol === 3 || (localRow >= 1 && localRow <= 2 && localCol >= 1 && localCol <= 2);
  }

  if (row >= 5 && row <= 7 && col >= 5 && col <= 7) {
    return false;
  }

  return ((row * 5 + col * 3 + row * col) % 7 < 3) || ((row + col) % 5 === 0);
}

function HeroQrDashboardGraphic() {
  const qrCells = Array.from({ length: 13 * 13 }, (_, index) => {
    const row = Math.floor(index / 13);
    const col = index % 13;
    const filled = isHeroQrCellFilled(row, col);

    return (
      <span
        key={`${row}-${col}`}
        className={filled ? "rounded-[2px] bg-slate-900" : "rounded-[2px] bg-sky-100/55"}
      />
    );
  });

  return (
    <div className="mx-auto w-full max-w-[272px] sm:max-w-[320px] lg:max-w-[336px]">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#edf6ff_100%)] p-4 ring-1 ring-[rgba(190,206,226,0.52)] shadow-[0_18px_36px_rgba(31,55,92,0.08)]">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400/85" />
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-300/85" />
              <span className="h-2.5 w-2.5 rounded-full bg-violet-300/85" />
            </div>
            <div className="h-2.5 w-10 rounded-full bg-slate-200" />
          </div>
          <div className="relative mt-4 rounded-[20px] bg-white p-3 shadow-[inset_0_0_0_1px_rgba(213,222,239,0.9)]">
            <div className="grid aspect-square grid-cols-[repeat(13,minmax(0,1fr))] gap-[4px]">
              {qrCells}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#28c7f5_0%,#8b7cfb_100%)] shadow-[0_12px_24px_rgba(84,129,255,0.18)] ring-4 ring-white">
                <QrCode size={18} className="text-white" />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-8 rounded-[12px] bg-sky-100 ring-1 ring-sky-100" />
            <div className="h-8 rounded-[12px] bg-white ring-1 ring-slate-100" />
          </div>
        </div>

        <div className="translate-y-4 rounded-[28px] bg-[linear-gradient(180deg,#fbfdff_0%,#f2f6ff_100%)] p-4 ring-1 ring-[rgba(190,206,226,0.52)] shadow-[0_18px_36px_rgba(31,55,92,0.08)] sm:translate-y-5">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_6px_16px_rgba(31,55,92,0.08)] ring-1 ring-slate-100">
              <BarChart3 size={14} className="text-sky-500" />
            </div>
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="mt-4">
            <svg viewBox="0 0 220 90" className="h-16 w-full">
              <defs>
                <linearGradient id="hero-soft-line" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#54d5f8" />
                  <stop offset="100%" stopColor="#9a85ff" />
                </linearGradient>
              </defs>
              <path d="M10 70 C36 58, 58 24, 88 34 S142 78, 170 56 S198 36, 210 42" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="10" strokeLinecap="round" />
              <path d="M10 70 C36 58, 58 24, 88 34 S142 78, 170 56 S198 36, 210 42" fill="none" stroke="url(#hero-soft-line)" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="h-8 w-4 rounded-full bg-sky-300/70" />
            <span className="h-12 w-4 rounded-full bg-cyan-300/85" />
            <span className="h-6 w-4 rounded-full bg-slate-300/85" />
            <span className="h-11 w-4 rounded-full bg-violet-300/78" />
          </div>
        </div>

        <div className="rounded-[26px] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-4 ring-1 ring-[rgba(190,206,226,0.52)] shadow-[0_16px_32px_rgba(31,55,92,0.07)]">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#eef7ff_0%,#f4f1ff_100%)] ring-1 ring-[rgba(190,206,226,0.45)]">
              <Link2 size={14} className="text-slate-600" />
            </div>
            <span className="h-2.5 w-12 rounded-full bg-slate-200" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="rounded-[14px] bg-white px-3 py-3 ring-1 ring-slate-100">
              <div className="h-2.5 w-16 rounded-full bg-slate-200" />
              <div className="mt-3 flex gap-2">
                <span className="h-7 flex-1 rounded-full bg-sky-50 ring-1 ring-sky-100" />
                <span className="h-7 flex-1 rounded-full bg-violet-50 ring-1 ring-violet-100" />
              </div>
            </div>
            <div className="rounded-[14px] bg-white px-3 py-3 ring-1 ring-slate-100">
              <div className="h-2.5 w-20 rounded-full bg-slate-200" />
              <div className="mt-3 h-8 rounded-[12px] bg-[linear-gradient(135deg,#eef7ff_0%,#f3efff_100%)] ring-1 ring-[rgba(190,206,226,0.35)]" />
            </div>
          </div>
        </div>

        <div className="-translate-y-4 rounded-[26px] bg-[linear-gradient(180deg,#fdfdff_0%,#f3f7ff_100%)] p-4 ring-1 ring-[rgba(190,206,226,0.52)] shadow-[0_16px_32px_rgba(31,55,92,0.07)] sm:-translate-y-5">
          <div className="flex items-center justify-between">
            <span className="h-2.5 w-16 rounded-full bg-slate-200" />
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400/75" />
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-300/75" />
              <span className="h-2.5 w-2.5 rounded-full bg-violet-300/75" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[16px] bg-white p-3 ring-1 ring-slate-100">
              <div className="mx-auto h-12 w-12 rounded-full border-[6px] border-sky-100 border-t-sky-400 border-r-violet-300" />
              <div className="mt-3 h-2.5 w-3/4 rounded-full bg-slate-100" />
            </div>
            <div className="rounded-[16px] bg-white p-3 ring-1 ring-slate-100">
              <div className="grid grid-cols-3 gap-1.5">
                <span className="h-10 rounded-[12px] bg-sky-100" />
                <span className="h-10 rounded-[12px] bg-cyan-100" />
                <span className="h-10 rounded-[12px] bg-violet-100" />
              </div>
              <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <div className="h-2.5 w-20 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeScenarioIcon({ icon }: { icon: HomeScenarioCard["icon"] }) {
  const common = "h-4 w-4";

  switch (icon) {
    case "card":
      return <Users className={`${common} text-sky-600`} />;
    case "website":
      return <Globe2 className={`${common} text-cyan-600`} />;
    case "campaign":
      return <Megaphone className={`${common} text-violet-600`} />;
    case "qr":
      return <QrCode className={`${common} text-slate-700`} />;
    case "download":
      return <Download className={`${common} text-emerald-600`} />;
    case "chat":
      return <MessageCircleMore className={`${common} text-sky-600`} />;
    case "docs":
      return <FileText className={`${common} text-violet-600`} />;
    case "distribution":
      return <BarChart3 className={`${common} text-cyan-600`} />;
    default:
      return <Link2 className={`${common} text-slate-600`} />;
  }
}

export function HomePageContent({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const copy = getHomeCopy(locale);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 md:px-8 md:pb-28">
      <section className="grid gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
        <div className="fade-up">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge tone="info">{copy.badge}</Badge>
            <span className="rounded-full bg-white/78 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-white/75">{copy.eyebrow}</span>
          </div>

          <h1 className="max-w-5xl text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-slate-900 md:text-7xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">{copy.subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href={withLocale(locale, "/register")}>
              <Button icon={<ArrowRight size={16} />}>{t.home.ctaPrimary}</Button>
            </Link>
            <Link href={withLocale(locale, "/login")}>
              <Button variant="secondary">{t.home.ctaSecondary}</Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
            {copy.pills.map((item) => (
              <span key={item} className="rounded-full bg-white/82 px-3 py-1.5 ring-1 ring-[rgba(190,206,226,0.45)]">
                {item}
              </span>
            ))}
          </div>

        </div>

        <HeroQrDashboardGraphic />
      </section>

      <section id="why-naviora" className="mt-16 space-y-6">
        <Card className="p-7">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Megaphone size={16} className="text-sky-600" />
            {copy.scenariosTitle}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">{copy.scenariosBody}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {copy.scenarios.map((item) => (
              <div
                key={item.title}
                className="rounded-[22px] bg-white/86 px-5 py-5 ring-1 ring-[rgba(190,206,226,0.45)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#eef7ff_0%,#f5f1ff_100%)] ring-1 ring-[rgba(190,206,226,0.45)]">
                  <HomeScenarioIcon icon={item.icon} />
                </div>
                <div className="mt-4 text-base font-semibold text-slate-900">{item.title}</div>
                <div className="mt-2 text-sm leading-7 text-slate-500">{item.body}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-7">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BarChart3 size={16} className="text-violet-600" />
            {copy.resultsTitle}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">{copy.resultsBody}</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {copy.results.map((item) => (
              <div key={item.title} className="rounded-[20px] bg-white/84 px-4 py-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="mt-2 text-sm leading-7 text-slate-500">{item.body}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="capabilities" className="mt-16 space-y-6">
        <Card className="p-7 md:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#eef7ff_0%,#f5f1ff_100%)] px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-[rgba(190,206,226,0.45)]">
              <Link2 size={15} className="text-sky-600" />
              {copy.workflowTitle}
            </div>
            <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-slate-500 md:text-base">{copy.workflowBody}</p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {copy.workflowSteps.map((step, index) => (
              <div key={step.title} className="group">
                <div className="relative rounded-[26px] bg-[linear-gradient(180deg,rgba(241,246,255,0.95),rgba(248,243,255,0.96))] p-5 ring-1 ring-[rgba(190,206,226,0.45)]">
                  <div className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#241129_0%,#2e1838_100%)] text-lg font-semibold text-white shadow-[0_14px_28px_rgba(36,17,41,0.18)]">
                    {index + 1}
                  </div>
                  <div className="pl-16">
                    <WorkflowMock index={index} />
                  </div>
                </div>
                <div className="mt-5 px-1">
                  <div className="text-lg font-semibold text-slate-900">{step.title}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-500">{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Link href={withLocale(locale, "/register")}>
              <Button>{t.home.ctaPrimary}</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-7">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Globe2 size={16} className="text-teal-600" />
            {copy.capabilitiesTitle}
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">{copy.capabilitiesBody}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {copy.capabilities.map((item) => (
              <div key={item.title} className="rounded-[20px] bg-white/84 px-4 py-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <QrCode size={15} className="text-violet-500" />
                  {item.title}
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-500">{item.body}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="mt-16 overflow-hidden p-8 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#eaf7ff_0%,#f3efff_100%)] px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-[rgba(190,206,226,0.45)]">
            <Users size={16} className="text-sky-600" />
            {locale === "zh-Hant" ? "為品牌、活動與內容團隊設計" : locale === "zh-Hans" ? "为品牌、活动与内容团队设计" : "Designed for brand, campaign, and content teams"}
          </div>
          <h2 className="text-3xl font-semibold text-slate-900">{copy.footerTitle}</h2>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={withLocale(locale, "/login")}>
              <Button variant="secondary">{t.nav.login}</Button>
            </Link>
            <Link href={withLocale(locale, "/register")}>
              <Button>{t.home.ctaPrimary}</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

function WorkflowMock({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="relative h-40 rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(234,240,255,0.92))] p-4 ring-1 ring-white/85">
        <div className="absolute inset-x-4 bottom-0 h-16 rounded-t-[18px] bg-[linear-gradient(180deg,rgba(223,232,255,0.7),rgba(227,222,255,0.4))]" />
        <div className="relative z-10 flex h-full items-center gap-4">
          <div className="w-[58%] rounded-[18px] bg-white/92 p-3 shadow-[0_18px_28px_rgba(61,87,134,0.08)] ring-1 ring-[rgba(213,222,239,0.9)]">
            <div className="mb-3 flex items-center gap-1.5">
              <div className="h-1.5 w-8 rounded-full bg-slate-300" />
              <div className="h-1.5 w-12 rounded-full bg-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="h-3 rounded-full bg-slate-200" />
              <div className="h-7 rounded-lg bg-blue-600/90" />
              <div className="h-3 rounded-full bg-slate-300/80" />
              <div className="h-9 rounded-lg bg-slate-100" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-2.5 rounded-full bg-slate-300" />
                <div className="h-2.5 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>
          <div className="flex-1 rounded-[16px] bg-white/88 p-3 shadow-[0_18px_28px_rgba(61,87,134,0.06)] ring-1 ring-[rgba(213,222,239,0.9)]">
            <div className="space-y-2">
              <div className="h-14 rounded-xl bg-slate-100" />
              <div className="h-3 rounded-full bg-slate-200" />
              <div className="h-3 rounded-full bg-slate-300/70" />
              <div className="h-8 rounded-lg bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="relative h-40 rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(234,240,255,0.92))] p-4 ring-1 ring-white/85">
        <div className="absolute inset-x-4 bottom-0 h-16 rounded-t-[18px] bg-[linear-gradient(180deg,rgba(223,232,255,0.7),rgba(227,222,255,0.4))]" />
        <div className="relative z-10 flex h-full items-center justify-center gap-4">
          <div className="rounded-[16px] bg-white/92 p-3 shadow-[0_18px_28px_rgba(61,87,134,0.08)] ring-1 ring-[rgba(213,222,239,0.9)]">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-1.5 w-7 rounded-full bg-slate-300" />
              <div className="h-1.5 w-10 rounded-full bg-blue-500" />
            </div>
            <div className="rounded-[14px] bg-slate-100 p-3">
              <QrCode size={56} className="text-slate-600" />
            </div>
            <div className="mt-2 h-1.5 w-8 rounded-full bg-slate-300" />
          </div>

          <div className="space-y-3">
            <div className="rounded-[14px] bg-white/92 px-3 py-2 shadow-[0_14px_24px_rgba(61,87,134,0.08)] ring-1 ring-[rgba(213,222,239,0.9)]">
              <div className="flex gap-2">
                <div className="h-5 w-5 rounded bg-emerald-400" />
                <div className="h-5 w-5 rounded bg-rose-300" />
              </div>
            </div>
            <div className="rounded-[14px] bg-blue-600 px-3 py-2 text-white shadow-[0_14px_24px_rgba(59,130,246,0.18)]">
              <SlidersHorizontal size={20} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-40 rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(234,240,255,0.92))] p-4 ring-1 ring-white/85">
      <div className="absolute inset-x-4 bottom-0 h-16 rounded-t-[18px] bg-[linear-gradient(180deg,rgba(223,232,255,0.7),rgba(227,222,255,0.4))]" />
      <div className="relative z-10 flex h-full items-center justify-center gap-4">
        <div className="rounded-[18px] bg-white/92 px-6 py-5 shadow-[0_18px_28px_rgba(61,87,134,0.08)] ring-1 ring-[rgba(213,222,239,0.9)]">
          <div className="flex items-center gap-3">
            <FileText size={44} className="text-slate-300" />
            <div>
              <div className="rounded-lg bg-slate-100 px-3 py-1 text-lg font-semibold text-slate-500">JPG</div>
              <div className="mt-2 h-1.5 w-10 rounded-full bg-slate-300" />
              <div className="mt-2 h-1.5 w-7 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-[14px] bg-white/92 px-3 py-2 shadow-[0_14px_24px_rgba(61,87,134,0.08)] ring-1 ring-[rgba(213,222,239,0.9)]">
            <span className="text-sm font-semibold text-slate-600">PNG</span>
          </div>
          <div className="rounded-[14px] bg-blue-600 px-3 py-2 text-white shadow-[0_14px_24px_rgba(59,130,246,0.18)]">
            <Download size={20} />
          </div>
          <div className="rounded-[14px] bg-white/92 px-3 py-2 shadow-[0_14px_24px_rgba(61,87,134,0.08)] ring-1 ring-[rgba(213,222,239,0.9)]">
            <span className="text-sm font-semibold text-slate-600">SVG</span>
          </div>
        </div>
      </div>
    </div>
  );
}
