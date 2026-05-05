import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { buildPageMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "beta");
}

export default async function BetaApplicationPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getMessages(locale);

  return (
    <div className="min-h-screen bg-[#f8fbff]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 md:px-6 md:py-14">
        <Card className="w-full rounded-[28px] border border-[rgba(190,206,226,0.45)] bg-white p-6 shadow-[0_18px_36px_rgba(31,55,92,0.06)] md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">{t.beta.formTitle}</h1>
          </div>

          <form
            action="https://forms.zohopublic.com/infolo1/form/BetaApplicationForm/formperma/0H7rWBgrn4yo-qSFqowfJc26b6DHhAJdRizcupTpJq4/htmlRecords/submit"
            name="form"
            id="form"
            method="POST"
            acceptCharset="UTF-8"
            encType="multipart/form-data"
            className="space-y-6"
          >
            <input type="hidden" name="zf_referrer_name" value="Naviora Website" />
            <input type="hidden" name="zf_redirect_url" value="" />
            <input type="hidden" name="zc_gad" value="" />

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">
                {t.beta.fullName} <span className="text-rose-500">*</span>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">{t.beta.firstName}</span>
                  <input
                    type="text"
                    maxLength={255}
                    name="Name_First"
                    required
                    placeholder={locale === "zh-Hant" ? "例如：Yancy" : "e.g. Jane"}
                    className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">{t.beta.lastName}</span>
                  <input
                    type="text"
                    maxLength={255}
                    name="Name_Last"
                    required
                    placeholder={locale === "zh-Hant" ? "例如：Chen" : "e.g. Chen"}
                    className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {t.beta.email} <span className="text-rose-500">*</span>
                </span>
                <input
                  type="email"
                  maxLength={255}
                  name="Email"
                  required
                  placeholder="name@company.com"
                  className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {t.beta.website} <span className="text-rose-500">*</span>
                </span>
                <input
                  type="url"
                  maxLength={2083}
                  name="Website"
                  required
                  placeholder="https://yourbrand.com"
                  className="w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]"
                />
              </label>
            </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {t.beta.primaryGoal} <span className="text-rose-500">*</span>
                </span>
                <textarea
                  name="MultiLine"
                  maxLength={65535}
                  required
                  placeholder={locale === "zh-Hant" ? "例如：做多語系導流、海外活動 QR、包裝入口等" : "e.g. multilingual routing, campaign QR codes, packaging entry flows"}
                  className="min-h-[120px] w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  {t.beta.useCase} <span className="text-rose-500">*</span>
                </span>
                <textarea
                  name="MultiLine1"
                  maxLength={65535}
                  required
                  placeholder={
                    locale === "zh-Hant"
                      ? "告訴我們你的流量來源、目標地區、需要分流的語言或裝置，以及你最在意的功能。"
                      : "Tell us about your traffic source, target regions, languages or devices to route, and the feature you care about most."
                  }
                  className="min-h-[140px] w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]"
                />
              </label>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-slate-700">
                  {t.beta.feedback} <span className="text-rose-500">*</span>
                </legend>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 transition hover:border-sky-200">
                    <input type="radio" id="Radio_1" name="Radio" value="Yes" required className="h-4 w-4 border-slate-300 text-sky-600" />
                    <span>{t.beta.yes}</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 transition hover:border-sky-200">
                    <input type="radio" id="Radio_2" name="Radio" value="No" required className="h-4 w-4 border-slate-300 text-sky-600" />
                    <span>{t.beta.no}</span>
                  </label>
                </div>
              </fieldset>

            <Button type="submit" className="h-12 w-full rounded-[16px] text-base">
              {t.beta.submit}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
