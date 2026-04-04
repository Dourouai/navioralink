import Link from "next/link";
import { Compass, Home, Orbit, Sparkles } from "lucide-react";

import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { withLocale } from "@/i18n/config";

const qrDots = Array.from({ length: 49 }, (_, index) => index);

export default function NotFoundPage() {
  // Use the prefixless English route (root)
  const homeHref = withLocale("en", "");

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 md:px-8 md:py-10">
      <div className="pointer-events-none absolute left-[-60px] top-8 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(87,192,247,0.28),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-40px] right-[-20px] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(140,124,255,0.2),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-[18%] mx-auto h-40 max-w-3xl rounded-full bg-[radial-gradient(circle,rgba(65,209,194,0.12),transparent_70%)] blur-3xl" />

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-between">
        <header className="flex items-center justify-between gap-4">
          <AppLogo href={homeHref} subtitle="Route lost, vibes intact" />
          <Link href={homeHref}>
            <Button variant="ghost" icon={<Home size={16} />}>
              Back to Home
            </Button>
          </Link>
        </header>

        <section className="grid gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/78 px-4 py-2 text-sm font-medium text-sky-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <Sparkles size={16} />
              404 · This route drifted into a side quest
            </div>

            <div className="space-y-4">
              <div className="text-[92px] font-semibold leading-none tracking-[-0.08em] text-slate-900 md:text-[128px]">404</div>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight text-slate-900 md:text-6xl">
                这条入口把我们送到了平行宇宙。
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                你访问的页面可能已经移动、还没发布，或者只是暂时去喝了杯咖啡。
              </p>
              <p className="max-w-2xl text-base leading-7 text-slate-500">
                The page you are looking for may have moved, expired, or taken a very creative detour.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href={homeHref}>
                <Button icon={<Compass size={16} />}>回到首页</Button>
              </Link>
              <Link href="/">
                <Button variant="secondary" icon={<Orbit size={16} />}>
                  Go to English Home
                </Button>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-[24px] p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Maybe</div>
                <div className="mt-3 text-base font-semibold text-slate-900">页面地址拼错了</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">Check the URL for a typo or a missing locale prefix.</div>
              </Card>
              <Card className="rounded-[24px] p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Maybe</div>
                <div className="mt-3 text-base font-semibold text-slate-900">入口还没发布</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">Some routes exist only after a feature is shipped or a record is created.</div>
              </Card>
              <Card className="rounded-[24px] p-5">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Maybe</div>
                <div className="mt-3 text-base font-semibold text-slate-900">我们迷路了，但不慌</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">Use the buttons above and we will get you back to the main flow.</div>
              </Card>
            </div>
          </div>

          <Card className="relative overflow-hidden rounded-[36px] p-6 md:p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(141,121,255,0.22),transparent_70%)]" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(26,190,243,0.18),transparent_70%)]" />

            <div className="relative z-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-[rgba(190,206,226,0.45)]">
                Lost but stylish
              </div>

              <div className="rounded-[30px] bg-[linear-gradient(145deg,#13233a_0%,#1d3150_58%,#12213a_100%)] p-6 text-white shadow-[0_24px_48px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-sky-200">Signal scan</div>
                    <div className="mt-2 text-2xl font-semibold">No route found</div>
                  </div>
                  <div className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-sky-100 ring-1 ring-white/20">Fallback mode</div>
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
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-300">Route check</div>
                      <div className="mt-1 text-sm text-slate-100">The destination did not answer our ping.</div>
                    </div>
                    <div className="rounded-[20px] bg-white/10 px-4 py-3 ring-1 ring-white/14">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-300">Recovery tip</div>
                      <div className="mt-1 text-sm text-slate-100">Try the homepage, switch language, or head back into the dashboard flow.</div>
                    </div>
                    <div className="rounded-[20px] bg-white/10 px-4 py-3 ring-1 ring-white/14">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-300">Mood</div>
                      <div className="mt-1 text-sm text-slate-100">Confidently lost. Elegantly rerouting.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
