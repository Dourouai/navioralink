import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleMore, Orbit, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "about");
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const isZh = locale === "zh-Hant";

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-8">
      <div className="pointer-events-none absolute left-0 top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(72,186,255,0.18),transparent_72%)]" />
      <div className="pointer-events-none absolute right-6 top-24 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(141,121,255,0.14),transparent_70%)]" />

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative overflow-hidden bg-[linear-gradient(155deg,#101d34_0%,#162947_58%,#0f1b31_100%)] px-7 py-8 text-white md:px-10 md:py-10">
            <div className="pointer-events-none absolute left-[-8%] top-[-5%] h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(32,194,241,0.22),transparent_72%)]" />
            <div className="pointer-events-none absolute bottom-[-10%] right-[-8%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(141,121,255,0.22),transparent_72%)]" />

            <div className="relative z-10 space-y-6">
              <Badge tone="info" className="px-4 py-1.5 text-[11px] uppercase tracking-[0.14em]">
                {isZh ? "About Naviora" : "About Naviora"}
              </Badge>

              <div className="space-y-4">
                <h1 className="max-w-[12ch] text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
                  {isZh ? "我們在做一個讓流量找到方向的入口。" : "We are building an entry point that helps traffic find its direction."}
                </h1>
                <p className="max-w-[58ch] text-sm leading-7 text-slate-200 md:text-base">
                  {isZh
                    ? "Naviora 並不是從一份完美規格書開始的。它更像是一個反覆出現的念頭: 為什麼每一次活動、每一個市場、每一種語言，都要重新把入口再做一遍？"
                    : "Naviora did not begin with a perfect spec document. It started as a recurring thought: why should every campaign, market, and language require rebuilding the same entry flow from scratch?"}
                </p>
                <p className="max-w-[58ch] text-sm leading-7 text-slate-300">
                  {isZh
                    ? "於是我們開始把那些分散的連結、跳轉、語言版本與 QR 使用場景，想像成同一個系統裡不同方向的風。入口不該只是靜態地址，它應該會思考，會判斷，也會隨著場景改變。"
                    : "So we began to imagine scattered links, redirects, language versions, and QR moments as different winds inside one system. An entry should not be a static address. It should think, adapt, and shift with context."}
                </p>
              </div>

              <div className="grid gap-3">
                <div className="flex items-start gap-3 rounded-[18px] border border-white/12 bg-white/7 px-4 py-3 text-sm text-slate-100">
                  <Orbit size={16} className="mt-0.5 text-sky-200" />
                  <span>
                    {isZh
                      ? "我們相信一個好產品，不是把功能堆滿，而是讓複雜度消失在使用者視線之外。"
                      : "We believe a good product is not the one with the most features, but the one that hides complexity from the user’s line of sight."}
                  </span>
                </div>
                <div className="flex items-start gap-3 rounded-[18px] border border-white/12 bg-white/7 px-4 py-3 text-sm text-slate-100">
                  <Sparkles size={16} className="mt-0.5 text-sky-200" />
                  <span>
                    {isZh
                      ? "我們也喜歡帶一點抽象感去做工具，因為流量、連結與選擇，本來就不只是數字，它們是每一次被看見的機會。"
                      : "We also like building tools with a little abstraction, because traffic, links, and choices are not only numbers. They are moments when something gets seen."}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 px-7 py-8 md:px-10 md:py-10">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-slate-900">{isZh ? "我們是誰" : "Who we are"}</h2>
              <p className="text-sm leading-7 text-slate-600">
                {isZh
                  ? "我們是 ZAPS Lab，一個在上海青浦持續做產品實驗的小團隊。偏愛快速迭代、真實場景與 Vibe Coding，也偏愛那些還沒有被說得太清楚、但已經值得被做出來的想法。"
                  : "We are ZAPS Lab, a small product studio in Qingpu, Shanghai. We like fast iteration, real-world scenarios, and vibe coding, and we are drawn to ideas that are not fully articulated yet but already worth building."}
              </p>
              <p className="text-sm leading-7 text-slate-600">
                {isZh
                  ? "Naviora 是我們對入口系統的一次回答。它還在成長，但方向很清楚: 讓 Smart Link、QR routing、語言與地區分流，變成一件自然的事。"
                  : "Naviora is our current answer to the problem of entry systems. It is still growing, but its direction is clear: make smart links, QR routing, and language or region-based delivery feel natural."}
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[24px] border border-[rgba(190,206,226,0.5)] bg-white/92 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{isZh ? "Email" : "Email"}</div>
                <a href="mailto:huters@qq.com" className="mt-3 inline-block text-base font-semibold text-sky-700 hover:underline">
                  huters@qq.com
                </a>
              </div>

              <div className="rounded-[24px] border border-[rgba(190,206,226,0.5)] bg-white/92 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  <MessageCircleMore size={14} />
                  <span>{isZh ? "微信" : "WeChat"}</span>
                </div>
                <div className="mt-3 text-base font-semibold text-slate-900">CloudCollect</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {isZh
                    ? "如果你想聊產品、合作，或只是對這個有點抽象的方向感到好奇，歡迎直接加我微信。"
                    : "If you want to talk product, collaboration, or just this slightly abstract direction, feel free to reach out on WeChat."}
                </p>
              </div>
            </div>

            <Link href={withLocale(locale, "/")}>
              <Button variant="secondary">{isZh ? "返回首頁" : "Back to home"}</Button>
            </Link>
          </section>
        </div>
      </Card>
    </div>
  );
}
