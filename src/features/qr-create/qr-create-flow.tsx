"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Palette, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { chatWithQwen } from "@/lib/services";
import { COUNTRIES } from "@/lib/countries";
import { LANGUAGES } from "@/lib/languages";
import { useQrCreateStore } from "@/store/qr-create-store";
import type { QRRuleMode } from "@/types/qr";

interface QrCreateFlowProps {
  locale: Locale;
}

const qrStyles = [
  { id: "classic", label: "Classic", symbol: "▦" },
  { id: "rounded", label: "Rounded", symbol: "◼︎" },
  { id: "dots", label: "Dots", symbol: "⋮" },
  { id: "pixel", label: "Pixel", symbol: "▣" },
  { id: "line", label: "Line", symbol: "≣" },
  { id: "star", label: "Spark", symbol: "✦" },
];

const borderCornerStyles = [
  { id: "square", label: "Square", symbol: "□" },
  { id: "rounded", label: "Rounded", symbol: "◯" },
  { id: "thick", label: "Thick", symbol: "▣" },
  { id: "dot", label: "Dot", symbol: "◉" },
];

const centerCornerStyles = [
  { id: "square", label: "Square", symbol: "■" },
  { id: "dot", label: "Dot", symbol: "●" },
  { id: "diamond", label: "Diamond", symbol: "◆" },
  { id: "star", label: "Star", symbol: "★" },
];

const correctionLevels = [
  { id: "Q", label: "Level Q", note: "25%" },
  { id: "H", label: "Level H", note: "30%" },
  { id: "M", label: "Level M", note: "15%" },
  { id: "L", label: "Level L", note: "7%" },
] as const;

const logoOptions = [
  { id: "none", label: "None", icon: "⊘" },
  { id: "spark", label: "Spark", icon: "✦" },
  { id: "link", label: "Link", icon: "🔗" },
  { id: "pin", label: "Pin", icon: "📍" },
];

export function QrCreateFlow({ locale }: QrCreateFlowProps) {
  const t = getMessages(locale);
  const {
    step,
    messages,
    draft,
    design,
    setStep,
    addMessage,
    updateDraft,
    updateDesign,
    updateLanguageRule,
    addLanguageRule,
    removeLanguageRule,
    updateRegionRule,
    addRegionRule,
    removeRegionRule,
  } = useQrCreateStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [expiresOpen, setExpiresOpen] = useState(false);

  // Auto-open sections when AI fills them in
  useEffect(() => {
    if (draft.ruleMode && draft.ruleMode !== "none") setRuleOpen(true);
  }, [draft.ruleMode]);
  useEffect(() => {
    if (draft.tracking?.enabled) setTrackingOpen(true);
  }, [draft.tracking?.enabled]);
  useEffect(() => {
    if (draft.password) setPasswordOpen(true);
  }, [draft.password]);
  useEffect(() => {
    if (draft.expiresAt) setExpiresOpen(true);
  }, [draft.expiresAt]);

  const recognizedCount = useMemo(() => {
    const fields = [
      draft.name,
      draft.defaultUrl,
      draft.ruleMode,
      draft.languageRules?.length ? "language" : undefined,
      draft.regionRules?.length ? "region" : undefined,
      draft.tracking?.enabled ? "tracking" : undefined,
      draft.password,
      draft.expiresAt,
    ];
    return fields.filter(Boolean).length;
  }, [draft]);

  async function submitMessage() {
    if (!input.trim()) return;

    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content: input };
    addMessage(userMsg);
    setInput("");
    setLoading(true);

    const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
    const result = await chatWithQwen(history, locale);

    addMessage({ id: crypto.randomUUID(), role: "assistant", content: result.reply });
    if (Object.keys(result.draft).length > 0) {
      updateDraft(result.draft);
    }
    setLoading(false);
  }

  function setRuleMode(mode: QRRuleMode) {
    if (mode === "language") {
      updateDraft({ ruleMode: mode, regionRules: [] });
      return;
    }
    if (mode === "region") {
      updateDraft({ ruleMode: mode, languageRules: [] });
      return;
    }
    updateDraft({ ruleMode: mode, languageRules: [], regionRules: [] });
  }

  const canEnterReview = Boolean(draft.defaultUrl);

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-white/70 bg-white/75 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <div className="grid gap-3 md:grid-cols-3">
          {t.create.steps.map((item, index) => {
            const active = step === index + 1;
            const done = step > index + 1;
            return (
              <button
                key={item}
                onClick={() => setStep(index + 1)}
                className={`rounded-[24px] px-5 py-5 text-left transition ${
                  active
                    ? "bg-[linear-gradient(135deg,rgba(99,188,248,0.16),rgba(141,121,255,0.1))] ring-1 ring-[rgba(145,180,247,0.3)]"
                    : done
                    ? "bg-emerald-50 ring-1 ring-emerald-100"
                    : "bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(250,252,255,0.86))] ring-1 ring-[rgba(190,206,226,0.4)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                        ? "bg-[linear-gradient(135deg,#26bdf0_0%,#8b7cfb_100%)] text-white"
                        : "bg-white text-slate-500 ring-1 ring-slate-200"
                    }`}
                  >
                    {done ? <Check size={16} /> : index + 1}
                  </span>
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    {index === 0 ? "Describe" : index === 1 ? "Review" : "Design"}
                  </span>
                </div>
                <div className="mt-4 text-base font-medium text-slate-800">{item}</div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card className="space-y-5">
          {step === 1 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{t.create.step1Title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {locale === "zh-Hant"
                      ? "先透過多輪對話梳理名稱、預設連結和規則模式。"
                      : "Use multi-turn conversation to shape name, default URL, and routing mode."}
                  </p>
                </div>
                <Badge tone="info">{messages.length} msgs</Badge>
              </div>

              <div className="space-y-3">
                <div className="max-w-[86%] ml-auto rounded-[24px] px-4 py-4 text-sm leading-7 shadow-[0_10px_24px_rgba(31,55,92,0.04)] bg-[linear-gradient(135deg,rgba(99,188,248,0.12),rgba(141,121,255,0.08))] ring-1 ring-[rgba(145,180,247,0.28)]">
                  <div className="mb-1 text-xs uppercase tracking-[0.16em] text-slate-400">AI</div>
                  {locale === "zh-Hant"
                    ? "告訴我你的二維碼要跳轉到哪個網址，我幫你生成。"
                    : "Tell me the URL you want this QR code to redirect to and I'll set it up for you."}
                </div>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[86%] rounded-[24px] px-4 py-4 text-sm leading-7 shadow-[0_10px_24px_rgba(31,55,92,0.04)] ${
                      message.role === "user"
                        ? "bg-white ring-1 ring-[rgba(190,206,226,0.42)]"
                        : "ml-auto bg-[linear-gradient(135deg,rgba(99,188,248,0.12),rgba(141,121,255,0.08))] ring-1 ring-[rgba(145,180,247,0.28)]"
                    }`}
                  >
                    <div className="mb-1 text-xs uppercase tracking-[0.16em] text-slate-400">{message.role === "user" ? "You" : "AI"}</div>
                    {message.content}
                  </div>
                ))}
              </div>

              <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(245,249,255,0.95),rgba(248,244,255,0.92))] p-4 shadow-inner">
                <div className="rounded-[24px] border border-slate-100 bg-white/95 p-4">
                  <textarea
                    className="min-h-[120px] w-full resize-none rounded-[20px] border border-[rgba(190,206,226,0.42)] bg-white px-4 py-3 text-sm outline-none focus:border-sky-300"
                    placeholder={
                      locale === "zh-Hant"
                        ? "繼續補充你的需求，例如：預設網址、語言或國家規則、是否啟用 Tracking。"
                        : "Keep describing your requirements: default URL, language/region rules, and tracking settings."
                    }
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (!loading) submitMessage();
                      }
                    }}
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-500">
                      {t.create.recognized}: {recognizedCount}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="secondary" onClick={() => setStep(2)} disabled={!canEnterReview}>
                        {t.create.enterReview}
                      </Button>
                      <Button onClick={submitMessage} disabled={loading}>
                        {loading ? t.common.loading : t.create.send}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{t.create.step2Title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {locale === "zh-Hant" ? "確認必填資訊，其他選項可按需展開。" : "Fill in the required fields. Expand optional settings as needed."}
                </p>
              </div>

              {/* Required: Basic info */}
              <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-base font-semibold text-slate-900">
                    {locale === "zh-Hant" ? "基本資訊" : "Basic information"}
                  </div>
                  <Badge tone="info">{t.common.required}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label={t.create.qrName} value={draft.name ?? ""} onChange={(event) => updateDraft({ name: event.target.value })} />
                  <Input label={t.common.defaultUrl} value={draft.defaultUrl ?? ""} onChange={(event) => updateDraft({ defaultUrl: event.target.value })} />
                </div>
              </section>

              {/* Collapsible: Rule mode */}
              <section className="rounded-[24px] border border-white/80 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRuleOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-900">
                      {locale === "zh-Hant" ? "訪問規則" : "Routing rules"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {draft.ruleMode && draft.ruleMode !== "none"
                        ? draft.ruleMode === "language"
                          ? locale === "zh-Hant" ? "語言模式已啟用" : "Language mode on"
                          : locale === "zh-Hant" ? "地區模式已啟用" : "Region mode on"
                        : locale === "zh-Hant" ? "預設關閉，所有訪客使用同一連結" : "Off by default — all visitors use the same URL"}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${ruleOpen ? "rotate-180" : ""}`} />
                </button>
                {ruleOpen ? (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      {(["none", "language", "region"] as const).map((mode) => (
                        <button
                          key={mode}
                          className={`rounded-[20px] px-4 py-4 text-left ring-1 transition ${
                            (draft.ruleMode ?? "none") === mode
                              ? "bg-[linear-gradient(135deg,rgba(18,119,255,0.12),rgba(8,184,164,0.1))] ring-sky-100"
                              : "bg-white ring-slate-100"
                          }`}
                          onClick={() => setRuleMode(mode)}
                        >
                          <div className="text-sm font-semibold text-slate-900">
                            {mode === "none" ? (locale === "zh-Hant" ? "關閉" : "Off") : null}
                            {mode === "language" ? (locale === "zh-Hant" ? "語言" : "Language") : null}
                            {mode === "region" ? (locale === "zh-Hant" ? "國家/地區" : "Region") : null}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {mode === "none"
                              ? locale === "zh-Hant" ? "統一跳轉" : "Single URL"
                              : locale === "zh-Hant" ? "與其他模式互斥" : "Mutually exclusive"}
                          </div>
                        </button>
                      ))}
                    </div>

                    {draft.ruleMode === "language" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-700">
                            {locale === "zh-Hant" ? "語言規則" : "Language rules"}
                          </div>
                          <Button variant="secondary" icon={<Plus size={14} />} onClick={addLanguageRule}>
                            {t.create.addLanguage}
                          </Button>
                        </div>
                        {draft.languageRules?.map((rule, index) => (
                          <div key={`lang-${index}`} className="grid gap-3 rounded-[20px] bg-slate-50/85 p-4 ring-1 ring-slate-100 md:grid-cols-[220px_1fr_auto]">
                            <SearchableSelect
                              label={t.create.language}
                              value={rule.language}
                              options={LANGUAGES.map((l) => ({ value: l.code, label: locale === "zh-Hant" ? l["zh-Hant"] : l.en }))}
                              placeholder={locale === "zh-Hant" ? "選擇語言" : "Select language"}
                              searchPlaceholder={locale === "zh-Hant" ? "搜索語言…" : "Search language…"}
                              onChange={(val) => updateLanguageRule(index, { language: val })}
                            />
                            <Input label="URL" value={rule.url} onChange={(e) => updateLanguageRule(index, { url: e.target.value })} />
                            <Button variant="ghost" className="mt-7 text-rose-600" onClick={() => removeLanguageRule(index)} icon={<Trash2 size={14} />}>
                              {t.common.remove}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {draft.ruleMode === "region" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-700">
                            {locale === "zh-Hant" ? "國家/地區規則" : "Region rules"}
                          </div>
                          <Button variant="secondary" icon={<Plus size={14} />} onClick={addRegionRule}>
                            {t.create.addRegion}
                          </Button>
                        </div>
                        {draft.regionRules?.map((rule, index) => (
                          <div key={`region-${index}`} className="grid gap-3 rounded-[20px] bg-slate-50/85 p-4 ring-1 ring-slate-100 md:grid-cols-[220px_1fr_auto]">
                            <SearchableSelect
                              label={t.create.region}
                              value={rule.region}
                              options={COUNTRIES.map((c) => ({ value: c.code, label: locale === "zh-Hant" ? c["zh-Hant"] : c.en }))}
                              placeholder={locale === "zh-Hant" ? "選擇國家/地區" : "Select country / region"}
                              searchPlaceholder={locale === "zh-Hant" ? "搜索國家/地區…" : "Search country / region…"}
                              onChange={(val) => updateRegionRule(index, { region: val })}
                            />
                            <Input label="URL" value={rule.url} onChange={(e) => updateRegionRule(index, { url: e.target.value })} />
                            <Button variant="ghost" className="mt-7 text-rose-600" onClick={() => removeRegionRule(index)} icon={<Trash2 size={14} />}>
                              {t.common.remove}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>

              {/* Collapsible: Tracking */}
              <section className="rounded-[24px] border border-white/80 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTrackingOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-900">{t.create.tracking}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {draft.tracking?.enabled
                        ? locale === "zh-Hant" ? "已啟用" : "Enabled"
                        : locale === "zh-Hant" ? "預設關閉" : "Off by default"}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${trackingOpen ? "rotate-180" : ""}`} />
                </button>
                {trackingOpen ? (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 grid gap-4 md:grid-cols-2">
                    <Input
                      label="GA4 Measurement ID"
                      value={draft.tracking?.ga4Id ?? ""}
                      onChange={(e) => updateDraft({ tracking: { ...draft.tracking, enabled: true, ga4Id: e.target.value } })}
                    />
                    <Input
                      label="Meta Pixel ID"
                      value={draft.tracking?.metaPixelId ?? ""}
                      onChange={(e) => updateDraft({ tracking: { ...draft.tracking, enabled: true, metaPixelId: e.target.value } })}
                    />
                  </div>
                ) : null}
              </section>

              {/* Toggle: Password */}
              <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{t.create.password}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {locale === "zh-Hant" ? "訪客掃碼前需輸入密碼" : "Require a password before redirecting"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordOpen((v) => {
                        if (v) updateDraft({ password: undefined });
                        return !v;
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${passwordOpen ? "bg-sky-500" : "bg-slate-200"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${passwordOpen ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {passwordOpen ? (
                  <div className="mt-4">
                    <Input
                      label={t.create.password}
                      value={draft.password ?? ""}
                      onChange={(e) => updateDraft({ password: e.target.value })}
                    />
                  </div>
                ) : null}
              </section>

              {/* Toggle: Expiration */}
              <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{t.create.expirationDate}</div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {locale === "zh-Hant" ? "到期後二維碼自動失效" : "QR code expires and stops redirecting"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExpiresOpen((v) => {
                        if (v) updateDraft({ expiresAt: undefined });
                        return !v;
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${expiresOpen ? "bg-sky-500" : "bg-slate-200"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${expiresOpen ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {expiresOpen ? (
                  <div className="mt-4">
                    <Input
                      type="date"
                      label={t.create.expirationDate}
                      value={draft.expiresAt ?? ""}
                      onChange={(e) => updateDraft({ expiresAt: e.target.value })}
                    />
                  </div>
                ) : null}
              </section>

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  {t.common.back}
                </Button>
                <Button onClick={() => setStep(3)}>{t.common.continue}</Button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{t.create.step3Title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {locale === "zh-Hant"
                    ? "第一版聚焦 QR style、Corners、Correction level 和 Logo。"
                    : "V1 keeps the design surface focused on style, corners, correction level, and logo."}
                </p>
              </div>

              <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                    <Palette size={18} />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-900">{t.create.qrStyle}</div>
                    <div className="text-sm text-slate-500">{locale === "zh-Hant" ? "选择缩略图样式并设置基础颜色。" : "Choose a style thumbnail and basic colors."}</div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {qrStyles.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => updateDesign({ qrStyle: item.id })}
                      className={`rounded-[18px] p-3 ring-1 transition ${
                        design.qrStyle === item.id
                          ? "bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(245,243,255,0.95))] ring-sky-100"
                          : "bg-slate-50 ring-slate-100"
                      }`}
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl ring-1 ring-slate-100">
                        {item.symbol}
                      </div>
                      <div className="mt-2 text-center text-sm text-slate-700">{item.label}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Input label="Border colour" value={design.borderColor ?? ""} onChange={(event) => updateDesign({ borderColor: event.target.value })} />
                  <Input label="Background colour" value={design.backgroundColor ?? ""} onChange={(event) => updateDesign({ backgroundColor: event.target.value })} />
                </div>
              </section>

              <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                    <Wand2 size={18} />
                  </div>
                  <div className="text-base font-semibold text-slate-900">{t.create.corners}</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Border style</div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      {borderCornerStyles.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => updateDesign({ cornerBorderStyle: item.id })}
                          className={`rounded-[16px] p-3 ring-1 transition ${
                            design.cornerBorderStyle === item.id ? "bg-sky-50 ring-sky-100 text-sky-700" : "bg-white ring-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-white text-base ring-1 ring-slate-100">
                            {item.symbol}
                          </div>
                          <div className="mt-2 text-sm">{item.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Center style</div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      {centerCornerStyles.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => updateDesign({ cornerCenterStyle: item.id })}
                          className={`rounded-[16px] p-3 ring-1 transition ${
                            design.cornerCenterStyle === item.id ? "bg-sky-50 ring-sky-100 text-sky-700" : "bg-white ring-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-white text-base ring-1 ring-slate-100">
                            {item.symbol}
                          </div>
                          <div className="mt-2 text-sm">{item.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="mb-4 text-base font-semibold text-slate-900">{t.create.correctionLevel}</div>
                <div className="grid gap-3 sm:grid-cols-4">
                  {correctionLevels.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => updateDesign({ correctionLevel: level.id })}
                      className={`rounded-[18px] p-4 text-center ring-1 transition ${
                        design.correctionLevel === level.id
                          ? "bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(245,243,255,0.95))] ring-sky-100"
                          : "bg-slate-50 ring-slate-100"
                      }`}
                    >
                      <div className="mx-auto mb-2 h-10 w-10 rounded-xl bg-white ring-1 ring-slate-100" />
                      <div className="text-sm font-medium text-slate-800">{level.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{level.note}</div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="mb-4 text-base font-semibold text-slate-900">Add logo</div>
                <div className="grid gap-3 sm:grid-cols-4">
                  {logoOptions.map((logo) => (
                    <button
                      key={logo.id}
                      onClick={() => updateDesign({ logoType: logo.id })}
                      className={`rounded-[18px] p-3 ring-1 transition ${
                        design.logoType === logo.id
                          ? "bg-[linear-gradient(135deg,rgba(240,249,255,1),rgba(245,243,255,0.95))] ring-sky-100"
                          : "bg-slate-50 ring-slate-100"
                      }`}
                    >
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-base ring-1 ring-slate-100">
                        {logo.icon}
                      </div>
                      <div className="mt-2 text-sm text-slate-700">{logo.label}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  {locale === "zh-Hant" ? "上傳 Logo（JPG / PNG / SVG，2MB 內）" : "Upload logo (JPG / PNG / SVG, up to 2MB)."}
                </div>
              </section>

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  {t.common.back}
                </Button>
                <Button>{t.common.generate}</Button>
              </div>
            </>
          ) : null}
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles size={16} className="text-sky-600" />
              {t.create.hintTitle}
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
              {t.create.hints.map((hint) => (
                <div key={hint} className="rounded-[18px] bg-white/82 px-4 py-3 ring-1 ring-[rgba(190,206,226,0.4)]">
                  {hint}
                </div>
              ))}
            </div>
          </Card>

          {step >= 2 ? (
            <Card>
              <div className="text-sm font-semibold text-slate-900">{t.create.designPreview}</div>
              <div className="mt-4 rounded-[26px] bg-[linear-gradient(135deg,#f7fbff_0%,#edf6ff_48%,#f4f2ff_100%)] p-5">
                <div className="mx-auto grid h-48 w-48 grid-cols-5 gap-1 rounded-[24px] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                  {Array.from({ length: 25 }).map((_, index) => (
                    <div key={index} className={index % 2 === 0 ? "rounded-[6px] bg-slate-900" : "rounded-[6px] bg-slate-200"} />
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>QR style</span>
                  <strong>{design.qrStyle ?? "classic"}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Correction</span>
                  <strong>{design.correctionLevel ?? "H"}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rule mode</span>
                  <strong>{draft.ruleMode ?? "none"}</strong>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
