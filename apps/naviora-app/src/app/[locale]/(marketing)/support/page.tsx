import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy, Mail, MessageCircleMore, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";

type SupportCopy = {
  badge: string;
  title: string;
  description: string;
  supporting: string;
  quickTopics: string[];
  emailTitle: string;
  emailBody: string;
  wechatTitle: string;
  wechatBody: string;
  xTitle: string;
  xBody: string;
  noteTitle: string;
  noteBody: string;
  aboutLabel: string;
  homeLabel: string;
};

function getCopy(locale: Locale): SupportCopy {
  if (locale === "zh-Hant") {
    return {
      badge: "Contact Naviora",
      title: "聯繫我們，直接一點就很好。",
      description: "這一頁不做太複雜的客服流程。你如果想問產品、談合作、確認方案，或只是想找人一起看你的入口場景，直接聯繫我們就可以。",
      supporting: "目前可透過 Email、微信與 X 聯繫。我會盡快回覆，把問題收斂成可執行的下一步。",
      quickTopics: ["產品使用", "合作洽談", "入口配置", "多語系與路由", "方案與上線建議", "一般問題"],
      emailTitle: "Email",
      emailBody: "適合整理完整需求、合作提案，或需要稍微正式一點的溝通方式。",
      wechatTitle: "微信",
      wechatBody: "如果你偏好即時溝通，也可以直接加微信，我通常也會更快回應。",
      xTitle: "X",
      xBody: "如果你想先公開互動、快速打個招呼，或透過社群方式聯繫，也可以直接在 X 上找到我。",
      noteTitle: "我們通常可以幫上什麼",
      noteBody: "從路由策略、方案選擇、品牌入口設計，到目前版本適不適合你的使用情境，我們都可以一起快速看一輪。",
      aboutLabel: "關於我們",
      homeLabel: "返回首頁",
    };
  }

  if (locale === "zh-Hans") {
    return {
      badge: "Contact Naviora",
      title: "联系我们，直接一点就很好。",
      description: "这一页不做太复杂的客服流程。你如果想问产品、谈合作、确认方案，或者只是想找人一起看你的入口场景，直接联系我们就可以。",
      supporting: "目前可通过 Email、微信和 X 联系。我会尽快回复，把问题收敛成可执行的下一步。",
      quickTopics: ["产品使用", "合作洽谈", "入口配置", "多语言与路由", "方案与上线建议", "一般问题"],
      emailTitle: "Email",
      emailBody: "适合整理完整需求、合作提案，或者需要稍微正式一点的沟通方式。",
      wechatTitle: "微信",
      wechatBody: "如果你更偏好即时沟通，也可以直接加微信，我通常也会更快回复。",
      xTitle: "X",
      xBody: "如果你想先公开互动、快速打个招呼，或者通过社交方式联系，也可以直接在 X 上找到我。",
      noteTitle: "我们通常可以帮什么",
      noteBody: "从路由策略、方案选择、品牌入口设计，到当前版本适不适合你的使用场景，我们都可以一起快速看一轮。",
      aboutLabel: "关于我们",
      homeLabel: "返回首页",
    };
  }

  return {
    badge: "Contact Naviora",
    title: "Reach out directly.",
    description:
      "This page is intentionally simple. If you want to ask about the product, talk about collaboration, review pricing, or walk through your routing scenario, just contact us.",
    supporting:
      "You can currently reach me by email, WeChat, or X. I will reply as quickly as I can and help turn the question into a clear next step.",
    quickTopics: ["Product questions", "Partnerships", "Entry setup", "Multilingual routing", "Plan guidance", "General support"],
    emailTitle: "Email",
    emailBody: "Best when you want to share more context, outline a collaboration idea, or keep the conversation a little more structured.",
    wechatTitle: "WeChat",
    wechatBody: "If you prefer a faster and more direct chat rhythm, WeChat is usually the easiest option.",
    xTitle: "X",
    xBody: "If you want to say hi publicly, follow product updates, or start a lighter conversation first, you can also reach me on X.",
    noteTitle: "What we can usually help with",
    noteBody:
      "Routing strategy, plan selection, brand entry design, and whether the current version of Naviora fits the scenario you have in mind.",
    aboutLabel: "About us",
    homeLabel: "Back to home",
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "support");
}

export default async function SupportPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const copy = getCopy(locale);

  return (
    <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8">
      <div className="pointer-events-none absolute left-4 top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(72,186,255,0.2),transparent_72%)]" />
      <div className="pointer-events-none absolute right-0 top-20 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(141,121,255,0.14),transparent_72%)]" />

      <Card className="relative overflow-hidden p-7 md:p-9">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(130,180,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(42,203,185,0.1),transparent_32%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <section>
            <Badge tone="info" className="px-4 py-1.5 text-[11px] uppercase tracking-[0.14em]">
              {copy.badge}
            </Badge>
            <h1 className="mt-6 max-w-[12ch] text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-slate-950 md:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">{copy.description}</p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500 md:text-base">{copy.supporting}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              {copy.quickTopics.map((item) => (
                <span key={item} className="rounded-full bg-white/86 px-3 py-1.5 text-sm text-slate-600 ring-1 ring-[rgba(190,206,226,0.45)]">
                  {item}
                </span>
              ))}
            </div>
          </section>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <LifeBuoy size={16} className="text-sky-600" />
              {copy.noteTitle}
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-500">{copy.noteBody}</p>
          </Card>
        </div>
      </Card>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-7 md:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mail size={16} className="text-sky-600" />
            {copy.emailTitle}
          </div>
          <a href="mailto:huters@qq.com" className="mt-5 inline-block text-xl font-semibold text-sky-700 hover:underline">
            huters@qq.com
          </a>
          <p className="mt-4 text-sm leading-7 text-slate-500">{copy.emailBody}</p>
        </Card>

        <Card className="p-7 md:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageCircleMore size={16} className="text-violet-600" />
            {copy.wechatTitle}
          </div>
          <div className="mt-5 text-xl font-semibold text-slate-950">CloudCollect</div>
          <p className="mt-4 text-sm leading-7 text-slate-500">{copy.wechatBody}</p>
        </Card>

        <Card className="p-7 md:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles size={16} className="text-slate-900" />
            {copy.xTitle}
          </div>
          <a
            href="https://x.com/tapionspark"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block text-xl font-semibold text-slate-950 hover:text-sky-700 hover:underline"
          >
            @tapionspark
          </a>
          <p className="mt-4 text-sm leading-7 text-slate-500">{copy.xBody}</p>
        </Card>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={withLocale(locale, "/about")}>
          <Button>{copy.aboutLabel}</Button>
        </Link>
        <Link href={withLocale(locale, "/")}>
          <Button variant="secondary">{copy.homeLabel}</Button>
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
        <Sparkles size={15} className="text-sky-500" />
        <span>
          {locale === "zh-Hant"
            ? "如果你已經有明確場景，直接把網址、目標國家、語言或裝置條件一起發給我們，回覆會更快。"
            : locale === "zh-Hans"
              ? "如果你已经有明确场景，直接把网址、目标国家、语言或设备条件一起发给我们，回复会更快。"
              : "If you already know the scenario, send the URL, target markets, languages, or device rules with your message. That helps us respond faster."}
        </span>
      </div>
    </div>
  );
}
