import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy, Mail, MessageCircleMore, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";

type ContactCopy = {
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

function getCopy(locale: Locale): ContactCopy {
  if (locale === "zh-Hant") {
    return {
      badge: "聯絡我們",
      title: "直接聯絡，簡單一點就很好。",
      description: "這一頁不做太複雜的客服流程。你如果想問產品、談合作、確認方案，或只是想找人一起看你的入口場景，直接聯絡我們就可以。",
      supporting: "目前可透過 Email、微信與 X 聯絡。我會盡快回覆，把問題收斂成可執行的下一步。",
      quickTopics: ["產品使用", "合作洽談", "入口配置", "多語系與路由", "方案與上線建議", "一般問題"],
      emailTitle: "Email",
      emailBody: "適合整理完整需求、合作提案，或需要稍微正式一點的溝通方式。",
      wechatTitle: "微信",
      wechatBody: "如果你偏好即時溝通，也可以直接加微信，我通常也會更快回應。",
      xTitle: "X",
      xBody: "如果你想先公開互動、快速打個招呼，或透過社群方式聯絡，也可以直接在 X 上找到我。",
      noteTitle: "我們通常可以幫上什麼",
      noteBody: "從路由策略、方案選擇、品牌入口設計，到目前版本適不適合你的使用情境，我們都可以一起快速看一輪。",
      aboutLabel: "關於我們",
      homeLabel: "返回首頁",
    };
  }

  if (locale === "zh-Hans") {
    return {
      badge: "联系我们",
      title: "直接联系，简单一点就很好。",
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
    badge: "Contact Us",
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
  return buildPageMetadata(locale, "contact");
}

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const copy = getCopy(locale);

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-8 md:pb-24">
      <div className="pointer-events-none absolute left-8 top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(120,191,255,0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-16 right-8 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(143,124,255,0.16),transparent_70%)]" />

      <section className="mx-auto max-w-4xl text-center">
        <Badge tone="info" className="px-4 py-1.5 text-[11px] uppercase tracking-[0.14em]">
          {copy.badge}
        </Badge>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">{copy.title}</h1>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">{copy.description}</p>
        <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-slate-500">{copy.supporting}</p>
      </section>

      <section className="mt-9 grid gap-6 lg:grid-cols-3">
        <article className="rounded-[30px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.09)] ring-1 ring-[rgba(190,206,226,0.55)] bg-white/90">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Mail size={16} className="text-sky-600" />
            {copy.emailTitle}
          </div>
          <a href="mailto:huters@qq.com" className="mt-4 inline-block text-xl font-semibold text-sky-700 hover:underline">
            huters@qq.com
          </a>
          <p className="mt-3 text-sm leading-7 text-slate-500">{copy.emailBody}</p>
        </article>

        <article className="rounded-[30px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.09)] ring-1 ring-[rgba(190,206,226,0.55)] bg-white/90">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageCircleMore size={16} className="text-emerald-600" />
            {copy.wechatTitle}
          </div>
          <div className="mt-4 text-xl font-semibold text-slate-900">WeChat ID: naviora</div>
          <p className="mt-3 text-sm leading-7 text-slate-500">{copy.wechatBody}</p>
        </article>

        <article className="rounded-[30px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.09)] ring-1 ring-[rgba(190,206,226,0.55)] bg-white/90">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles size={16} className="text-purple-600" />
            {copy.xTitle}
          </div>
          <a href="https://x.com/naviora" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xl font-semibold text-slate-900 hover:underline">
            @naviora
          </a>
          <p className="mt-3 text-sm leading-7 text-slate-500">{copy.xBody}</p>
        </article>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className="rounded-[30px] p-7 bg-white/90 ring-1 ring-[rgba(190,206,226,0.55)] shadow-[0_20px_40px_rgba(15,23,42,0.09)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <LifeBuoy size={16} className="text-sky-600" />
            {copy.noteTitle}
          </div>
          <p className="mt-4 text-base leading-8 text-slate-600">{copy.noteBody}</p>
          
          <div className="mt-6 flex flex-wrap gap-3">
            {copy.quickTopics.map((item) => (
              <span key={item} className="rounded-full bg-white px-3 py-1.5 text-sm text-slate-600 ring-1 ring-[rgba(190,206,226,0.45)]">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] p-7 bg-white/90 ring-1 ring-[rgba(190,206,226,0.55)] shadow-[0_20px_40px_rgba(15,23,42,0.09)]">
          <h3 className="text-lg font-semibold text-slate-900">其他頁面</h3>
          <div className="mt-4 space-y-4">
            <Link href={withLocale(locale, "/about")}>
              <Button variant="secondary" className="w-full justify-start">
                {copy.aboutLabel}
              </Button>
            </Link>
            <Link href={withLocale(locale, "/")}>
              <Button variant="secondary" className="w-full justify-start">
                {copy.homeLabel}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}