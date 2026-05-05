import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoQrGenerator } from "@/features/free-tools/logo-qr-generator";
import { getFreeToolsCopy } from "@/features/free-tools/free-tools-copy";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const copy = getFreeToolsCopy(locale);

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
  };
}

export default async function FreeToolsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = getFreeToolsCopy(locale);

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-8 md:px-8 md:pb-24">
      <div className="pointer-events-none absolute left-8 top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(42,157,244,0.18),transparent_72%)]" />
      <div className="pointer-events-none absolute bottom-24 right-6 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(244,96,54,0.14),transparent_72%)]" />

      <section className="mx-auto max-w-4xl text-center">
        <Badge tone="info" className="px-4 py-1.5 text-[11px] uppercase tracking-[0.16em]">
          {copy.page.badge}
        </Badge>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">{copy.page.title}</h1>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">{copy.page.subtitle}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Badge tone="default" className="px-4 py-2 text-sm">
            {copy.page.localFirst}
          </Badge>
          <Badge tone="success" className="px-4 py-2 text-sm">
            {copy.page.noSignup}
          </Badge>
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <article className="rounded-[30px] bg-[linear-gradient(160deg,#10213b_0%,#19314f_58%,#16365c_100%)] p-6 text-white shadow-[0_24px_56px_rgba(15,23,42,0.16)] ring-1 ring-[rgba(118,164,255,0.35)]">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">{copy.page.entranceEyebrow}</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">{copy.page.entranceTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">{copy.page.entranceBody}</p>
          <div className="mt-6">
            <Link href="#logo-qr">
              <Button variant="secondary" className="!bg-white !text-slate-900 hover:!bg-white/95">
                {copy.page.entranceAction}
              </Button>
            </Link>
          </div>
        </article>

        <article className="rounded-[30px] bg-white/92 p-6 shadow-[0_20px_42px_rgba(15,23,42,0.08)] ring-1 ring-[rgba(190,206,226,0.55)]">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.page.stepsEyebrow}</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{copy.page.stepsTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{copy.page.stepsBody}</p>
          <div className="mt-5 grid gap-3">
            {copy.page.steps.map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-[20px] border border-[rgba(190,206,226,0.46)] bg-[linear-gradient(180deg,rgba(248,251,255,0.92),rgba(255,255,255,0.96))] px-4 py-3"
              >
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div className="text-sm font-medium text-slate-700">{item}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <div id="logo-qr" className="mt-10 scroll-mt-28">
        <LogoQrGenerator locale={locale} />
      </div>
    </div>
  );
}
