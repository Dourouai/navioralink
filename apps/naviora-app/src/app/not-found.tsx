import Link from "next/link";
import { cookies, headers } from "next/headers";
import { Compass, Sparkles } from "lucide-react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { localePreferenceCookieName, resolveLocalePreference, withLocale, type Locale } from "@/i18n/config";

const qrDots = Array.from({ length: 49 }, (_, index) => index);

type NotFoundCopy = {
  subtitle: string;
  badge: string;
  title: string;
  description: string;
  supporting: string;
  homeLabel: string;
  maybeLabel: string;
  maybeOneTitle: string;
  maybeOneBody: string;
  maybeTwoTitle: string;
  maybeTwoBody: string;
  maybeThreeTitle: string;
  maybeThreeBody: string;
  panelEyebrow: string;
  panelSignal: string;
  panelTitle: string;
  panelMode: string;
  panelOneTitle: string;
  panelOneBody: string;
  panelTwoTitle: string;
  panelTwoBody: string;
  panelThreeTitle: string;
  panelThreeBody: string;
};

function getCopy(locale: Locale): NotFoundCopy {
  if (locale === "zh-Hant") {
    return {
      subtitle: "路徑走失了，但節奏還在",
      badge: "404 · 這條路徑跑去支線任務了",
      title: "這條入口把我們送到了平行宇宙。",
      description: "你打開的頁面可能已經搬家、暫停發布，或正好躲起來喝一杯咖啡。",
      supporting: "別擔心，我們還是能把你優雅地帶回主流程。",
      homeLabel: "回到首頁",
      maybeLabel: "可能原因",
      maybeOneTitle: "網址可能有點手滑",
      maybeOneBody: "請再檢查一次路徑，也看看是不是少了某個必要段落。",
      maybeTwoTitle: "內容可能還沒上線",
      maybeTwoBody: "有些頁面要等內容發布或資料建立後，才會真的出現。",
      maybeThreeTitle: "也可能是它剛好去旅行了",
      maybeThreeBody: "先回首頁繼續逛，我們之後再把它抓回來。",
      panelEyebrow: "迷路，但很有型",
      panelSignal: "Signal scan",
      panelTitle: "沒有找到可抵達的路徑",
      panelMode: "Fallback mode",
      panelOneTitle: "Route check",
      panelOneBody: "目前沒有任何頁面回應這個地址。",
      panelTwoTitle: "Recovery tip",
      panelTwoBody: "回首頁、切換語言，或重新回到你的主要流程。",
      panelThreeTitle: "Mood",
      panelThreeBody: "冷靜迷路中，優雅重新導向。",
    };
  }

  if (locale === "zh-Hans") {
    return {
      subtitle: "路径走丢了，但节奏还在",
      badge: "404 · 这条路径跑去支线任务了",
      title: "这条入口把我们送到了平行宇宙。",
      description: "你打开的页面可能已经搬家、暂停发布，或者正好躲起来喝了杯咖啡。",
      supporting: "别担心，我们还是能把你优雅地带回主流程。",
      homeLabel: "回到首页",
      maybeLabel: "可能原因",
      maybeOneTitle: "网址可能输错了一点",
      maybeOneBody: "可以再检查一下路径，也看看是不是少了某个必要段落。",
      maybeTwoTitle: "内容可能还没上线",
      maybeTwoBody: "有些页面要等内容发布或记录创建后，才会真正出现。",
      maybeThreeTitle: "也可能它刚好去旅行了",
      maybeThreeBody: "先回首页继续逛，我们之后再把它抓回来。",
      panelEyebrow: "迷路，但很好看",
      panelSignal: "Signal scan",
      panelTitle: "没有找到可抵达的路径",
      panelMode: "Fallback mode",
      panelOneTitle: "Route check",
      panelOneBody: "当前没有任何页面响应这个地址。",
      panelTwoTitle: "Recovery tip",
      panelTwoBody: "回首页、切换语言，或者重新进入你的主流程。",
      panelThreeTitle: "Mood",
      panelThreeBody: "冷静迷路中，优雅重新导航。",
    };
  }

  return {
    subtitle: "Route lost, vibes intact",
    badge: "404 · This route drifted into a side quest",
    title: "This route wandered into a parallel universe.",
    description: "The page you opened may have moved, paused, or stepped out for a dramatic coffee break.",
    supporting: "No stress. We can still guide you back into the main flow.",
    homeLabel: "Back to home",
    maybeLabel: "Maybe",
    maybeOneTitle: "The URL took a wrong turn",
    maybeOneBody: "Check the address again and make sure no important segment went missing.",
    maybeTwoTitle: "The content might not be live yet",
    maybeTwoBody: "Some routes only exist after the page is published or the record is created.",
    maybeThreeTitle: "Or it simply escaped for a moment",
    maybeThreeBody: "Head back home for now and we will catch it later.",
    panelEyebrow: "Lost but stylish",
    panelSignal: "Signal scan",
    panelTitle: "No route found",
    panelMode: "Fallback mode",
    panelOneTitle: "Route check",
    panelOneBody: "The destination did not answer our ping.",
    panelTwoTitle: "Recovery tip",
    panelTwoBody: "Try the homepage, switch language, or head back into your main flow.",
    panelThreeTitle: "Mood",
    panelThreeBody: "Confidently lost. Elegantly rerouting.",
  };
}

export default async function NotFoundPage() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveLocalePreference({
    cookieLocale: cookieStore.get(localePreferenceCookieName)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
  const copy = getCopy(locale);
  const homeHref = withLocale(locale, "/");

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 md:px-8 md:py-10">
      <div className="pointer-events-none absolute left-[-60px] top-8 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(87,192,247,0.28),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-40px] right-[-20px] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(140,124,255,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-[18%] mx-auto h-40 max-w-3xl rounded-full bg-[radial-gradient(circle,rgba(65,209,194,0.12),transparent_70%)] blur-3xl" />

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center gap-4">
          <AppLogo href={homeHref} subtitle={copy.subtitle} />
        </header>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/78 px-4 py-2 text-sm font-medium text-sky-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <Sparkles size={16} />
              {copy.badge}
            </div>

            <div className="space-y-4">
              <div className="text-[92px] font-semibold leading-none tracking-[-0.08em] text-slate-900 md:text-[128px]">404</div>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight text-slate-900 md:text-6xl">{copy.title}</h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">{copy.description}</p>
              <p className="max-w-2xl text-base leading-7 text-slate-500">{copy.supporting}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href={homeHref}>
                <Button icon={<Compass size={16} />}>{copy.homeLabel}</Button>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-[24px] p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{copy.maybeLabel}</div>
                <div className="mt-3 text-base font-semibold text-slate-900">{copy.maybeOneTitle}</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">{copy.maybeOneBody}</div>
              </Card>
              <Card className="rounded-[24px] p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{copy.maybeLabel}</div>
                <div className="mt-3 text-base font-semibold text-slate-900">{copy.maybeTwoTitle}</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">{copy.maybeTwoBody}</div>
              </Card>
              <Card className="rounded-[24px] p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{copy.maybeLabel}</div>
                <div className="mt-3 text-base font-semibold text-slate-900">{copy.maybeThreeTitle}</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">{copy.maybeThreeBody}</div>
              </Card>
            </div>
          </div>

          <Card className="relative overflow-hidden rounded-[36px] p-6 md:p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(141,121,255,0.22),transparent_70%)]" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(26,190,243,0.18),transparent_70%)]" />

            <div className="relative z-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-[rgba(190,206,226,0.45)]">
                {copy.panelEyebrow}
              </div>

              <div className="rounded-[30px] bg-[linear-gradient(145deg,#13233a_0%,#1d3150_58%,#12213a_100%)] p-6 text-white shadow-[0_24px_48px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-sky-200">{copy.panelSignal}</div>
                    <div className="mt-2 text-2xl font-semibold">{copy.panelTitle}</div>
                  </div>
                  <div className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-sky-100 ring-1 ring-white/20">{copy.panelMode}</div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                  <div className="mx-auto grid h-[180px] w-[180px] grid-cols-7 gap-1 rounded-[28px] bg-white/95 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]">
                    {qrDots.map((dot) => {
                      const active = [0, 1, 2, 4, 6, 7, 9, 12, 14, 18, 20, 21, 24, 27, 28, 30, 32, 35, 36, 39, 41, 42, 44, 47, 48].includes(dot);
                      return <span key={dot} className={`rounded-[4px] ${active ? "bg-slate-900" : "bg-slate-200"}`} />;
                    })}
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[20px] bg-white/10 px-4 py-3 ring-1 ring-white/14">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-300">{copy.panelOneTitle}</div>
                      <div className="mt-1 text-sm text-slate-100">{copy.panelOneBody}</div>
                    </div>
                    <div className="rounded-[20px] bg-white/10 px-4 py-3 ring-1 ring-white/14">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-300">{copy.panelTwoTitle}</div>
                      <div className="mt-1 text-sm text-slate-100">{copy.panelTwoBody}</div>
                    </div>
                    <div className="rounded-[20px] bg-white/10 px-4 py-3 ring-1 ring-white/14">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-300">{copy.panelThreeTitle}</div>
                      <div className="mt-1 text-sm text-slate-100">{copy.panelThreeBody}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <footer className="flex justify-center pb-2 pt-2">
          <div className="flex flex-col items-center justify-center gap-2 text-[11px] font-medium tracking-[0.04em] text-slate-400">
            <LanguageSwitcher locale={locale} tone="minimal" />
            <div>Powered by Naviora</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
