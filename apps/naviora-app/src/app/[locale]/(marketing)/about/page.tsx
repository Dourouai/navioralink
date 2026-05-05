import type { Metadata } from "next";
import Link from "next/link";
import { MapPinned, MessageCircleMore, Sparkles, UserRound, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";

type AboutCopy = {
  badge: string;
  title: string;
  description: string;
  supporting: string;
  stats: Array<{ label: string; value: string }>;
  storyTitle: string;
  storyBody: string[];
  approachTitle: string;
  approachItems: Array<{ title: string; body: string }>;
  contactTitle: string;
  contactBody: string;
  emailLabel: string;
  wechatLabel: string;
  supportLabel: string;
  homeLabel: string;
};

function getCopy(locale: Locale): AboutCopy {
  if (locale === "zh-Hant") {
    return {
      badge: "ABOUT",
      title: "我是在上海持續打磨 Naviora 的獨立開發者。",
      description:
        "Naviora 背後是我持續在做的一個產品計畫。我專注在把複雜的入口、路由與 QR 場景整理成真正好用、可以長期維護的產品體驗。",
      supporting:
        "我更相信真實場景的反饋，也相信先把問題做對，比先把規格寫滿更重要。產品不是一次定型，而是在使用中慢慢長出輪廓。",
      stats: [
        { label: "Base", value: "Shanghai" },
        { label: "Role", value: "Independent developer" },
        { label: "Focus", value: "Smart entry systems" },
      ],
      storyTitle: "我在做什麼",
      storyBody: [
        "很多品牌、活動頁與跨語系網站，其實都在面對同一個問題：流量先進來了，但入口太靜態，後面的分流邏輯卻越來越複雜。",
        "所以我把這件事重新定義成一個產品問題。Naviora 想做的，不只是短連結或二維碼工具，而是一個能讓入口自己具備判斷力的系統。",
      ],
      approachTitle: "我是怎麼工作的",
      approachItems: [
        {
          title: "獨立開發，快速迭代",
          body: "產品方向、設計、代碼與體驗調整都能快速串起來，很多想法可以在短時間內直接驗證。",
        },
        {
          title: "從真實場景出發",
          body: "我優先關注品牌官網、活動頁、多市場導流、線下 QR 這些會真正發生的場景，而不是只停在功能清單。",
        },
        {
          title: "讓複雜度藏起來",
          body: "規則、語言、設備、參數與追蹤都可以很複雜，但使用者看到的應該依然是清楚、簡潔、可控的界面。",
        },
      ],
      contactTitle: "想聊產品、合作或想法？",
      contactBody: "如果你也在做品牌、內容、流量入口或智能路由，歡迎直接來找我。我很樂意聽你的場景，也很願意一起把問題拆開。",
      emailLabel: "Email",
      wechatLabel: "微信",
      supportLabel: "聯繫我",
      homeLabel: "返回首頁",
    };
  }

  if (locale === "zh-Hans") {
    return {
      badge: "ABOUT",
      title: "我是一个在上海持续打磨 Naviora 的独立开发者。",
      description:
        "Naviora 背后是我持续在做的一个产品项目。我专注把复杂的入口、路由和 QR 场景整理成真正好用、可以长期维护的产品体验。",
      supporting:
        "我更相信真实场景的反馈，也相信先把问题做对，比先把规格写满更重要。产品不是一次定型，而是在使用中慢慢长出轮廓。",
      stats: [
        { label: "Base", value: "Shanghai" },
        { label: "Role", value: "Independent developer" },
        { label: "Focus", value: "Smart entry systems" },
      ],
      storyTitle: "我在做什么",
      storyBody: [
        "很多品牌、活动页和跨语系网站，其实都在面对同一个问题：流量先进来了，但入口太静态，后面的分流逻辑却越来越复杂。",
        "所以我把这件事重新定义成一个产品问题。Naviora 想做的，不只是短链接或二维码工具，而是一个能让入口自己具备判断力的系统。",
      ],
      approachTitle: "我是怎么工作的",
      approachItems: [
        {
          title: "独立开发，快速迭代",
          body: "产品方向、设计、代码与体验调整都能快速串起来，很多想法可以在短时间内直接验证。",
        },
        {
          title: "从真实场景出发",
          body: "我优先关注品牌官网、活动页、多市场导流、线下 QR 这些会真正发生的场景，而不是只停在功能清单。",
        },
        {
          title: "让复杂度藏起来",
          body: "规则、语言、设备、参数和追踪都可以很复杂，但用户看到的仍然应该是清晰、简洁、可控的界面。",
        },
      ],
      contactTitle: "想聊产品、合作或想法？",
      contactBody: "如果你也在做品牌、内容、流量入口或智能路由，欢迎直接来找我。我很乐意听你的场景，也很愿意一起把问题拆开。",
      emailLabel: "Email",
      wechatLabel: "微信",
      supportLabel: "联系我",
      homeLabel: "返回首页",
    };
  }

  return {
    badge: "ABOUT",
    title: "I am an independent developer building Naviora from Shanghai.",
    description:
      "Naviora is a product I keep building and refining from Shanghai. The goal is to turn messy entry, routing, and QR scenarios into something that actually feels usable and maintainable over time.",
    supporting:
      "I trust real-world feedback and fast iteration more than heavy specs. For me, the shape of the product becomes clearer while people are actually using it.",
    stats: [
      { label: "Base", value: "Shanghai" },
      { label: "Role", value: "Independent developer" },
      { label: "Focus", value: "Smart entry systems" },
    ],
    storyTitle: "What I am building",
    storyBody: [
      "Many brands, campaign pages, and multilingual sites face the same issue: traffic arrives first, but the entry layer stays static while the routing logic behind it keeps getting more complex.",
      "That is why I treat the problem as a product system. Naviora is not only a short link or QR tool. It is my attempt to make the entry itself smarter and more adaptable.",
    ],
    approachTitle: "How I work",
    approachItems: [
      {
        title: "Independent build, fast iteration",
        body: "Product decisions, design, code, and UX changes can stay tightly connected, which makes it easier to test ideas quickly.",
      },
      {
        title: "Built from real scenarios",
        body: "I care about brand sites, campaign pages, multi-market routing, and offline QR flows because those are the situations where the product actually has to hold up.",
      },
      {
        title: "Hide the complexity",
        body: "Languages, devices, params, tracking, and routing rules can be complicated behind the scenes. The surface should still feel calm and clear.",
      },
    ],
    contactTitle: "Want to talk product, collaboration, or ideas?",
    contactBody:
      "If you are working on brand growth, content delivery, traffic entry points, or smart routing, I would love to hear about the scenario and think through it with you.",
    emailLabel: "Email",
    wechatLabel: "WeChat",
    supportLabel: "Contact me",
    homeLabel: "Back to home",
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "about");
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const copy = getCopy(locale);

  return (
    <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8">
      <div className="pointer-events-none absolute left-2 top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(72,186,255,0.2),transparent_72%)]" />
      <div className="pointer-events-none absolute right-0 top-24 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(141,121,255,0.14),transparent_72%)]" />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <Card className="relative overflow-hidden p-7 md:p-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(130,180,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(42,203,185,0.1),transparent_32%)]" />
          <div className="relative z-10">
            <Badge tone="info" className="px-4 py-1.5 text-[11px] uppercase tracking-[0.14em]">
              {copy.badge}
            </Badge>
            <h1 className="mt-6 max-w-[12ch] text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-slate-950 md:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">{copy.description}</p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500 md:text-base">{copy.supporting}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {copy.stats.map((item) => (
                <div key={item.label} className="rounded-[22px] bg-white/86 px-5 py-4 ring-1 ring-[rgba(190,206,226,0.45)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MapPinned size={16} className="text-sky-600" />
              <span>{locale === "zh-Hant" ? "所在位置" : locale === "zh-Hans" ? "所在位置" : "Location"}</span>
            </div>
            <div className="mt-4 text-2xl font-semibold text-slate-950">Shanghai</div>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {locale === "zh-Hant"
                ? "我在上海持續打磨產品、做實驗，也把很多決策放在真實使用場景裡快速驗證。"
                : locale === "zh-Hans"
                  ? "我在上海持续打磨产品、做实验，也把很多决策放在真实使用场景里快速验证。"
                  : "I work from Shanghai and prefer validating product decisions in real usage instead of waiting for perfect certainty."}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserRound size={16} className="text-violet-600" />
              <span>{locale === "zh-Hant" ? "身份定位" : locale === "zh-Hans" ? "身份定位" : "Role"}</span>
            </div>
            <div className="mt-4 text-2xl font-semibold text-slate-950">
              {locale === "zh-Hant" ? "獨立開發者" : locale === "zh-Hans" ? "独立开发者" : "Independent developer"}
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {locale === "zh-Hant"
                ? "產品方向、設計、前端、後端與整體體驗會更緊密地連在一起，很多想法可以很快做出來再回頭修正。"
                : locale === "zh-Hans"
                  ? "产品方向、设计、前端、后端和整体体验会更紧密地连在一起，很多想法可以很快做出来再回头修正。"
                  : "Product direction, design, frontend, backend, and UX stay closely connected, which makes it easier to try ideas quickly and refine them fast."}
            </p>
          </Card>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
        <Card className="p-7 md:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles size={16} className="text-sky-600" />
            {copy.storyTitle}
          </div>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600 md:text-base">
            {copy.storyBody.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Card>

        <Card className="p-7 md:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Wand2 size={16} className="text-violet-600" />
            {copy.approachTitle}
          </div>
          <div className="mt-5 grid gap-4">
            {copy.approachItems.map((item, index) => (
              <div key={item.title} className="rounded-[22px] bg-slate-50/85 px-5 py-5 ring-1 ring-[rgba(190,206,226,0.38)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1abef3_0%,#8b7cfb_100%)] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-500">{item.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="mt-8 overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="bg-[linear-gradient(145deg,#f4fbff_0%,#fbf8ff_100%)] px-7 py-8 md:px-8 md:py-9">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{copy.contactTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">{copy.contactBody}</p>
            </div>
          </section>

          <section className="grid gap-4 px-7 py-8 md:px-8 md:py-9">
            <div className="rounded-[24px] border border-[rgba(190,206,226,0.5)] bg-white/92 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{copy.emailLabel}</div>
              <a href="mailto:huters@qq.com" className="mt-3 inline-block text-base font-semibold text-sky-700 hover:underline">
                huters@qq.com
              </a>
            </div>

            <div className="rounded-[24px] border border-[rgba(190,206,226,0.5)] bg-white/92 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                <MessageCircleMore size={14} />
                <span>{copy.wechatLabel}</span>
              </div>
              <div className="mt-3 text-base font-semibold text-slate-900">CloudCollect</div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={withLocale(locale, "/support")}>
                <Button>{copy.supportLabel}</Button>
              </Link>
              <Link href={withLocale(locale, "/")}>
                <Button variant="secondary">{copy.homeLabel}</Button>
              </Link>
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}
