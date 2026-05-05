"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Copy, Download, ExternalLink, PauseCircle, PlayCircle, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { getEntryUrl } from "@/lib/entry-url";
import { buildQrDataUri, buildQrSvg, downloadQrAssetBundle } from "@/lib/qr-download";
import { getEntryPreviewLink, refreshEntryPreviewLink } from "@/lib/supabase/entries-browser";
import type { QRCodeItem } from "@/types/qr";

interface QrDetailClientProps {
  locale: Locale;
  item: QRCodeItem;
}

export function QrDetailClient({ locale, item }: QrDetailClientProps) {
  const t = getMessages(locale);
  const router = useRouter();
  const publishedEntryUrl = getEntryUrl(item);
  const isDraft = item.status === "draft";
  const [isPaused, setIsPaused] = useState(item.status === "paused");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const entryUrl = isDraft ? previewUrl : publishedEntryUrl;

  useEffect(() => {
    let cancelled = false;

    async function loadPreviewLink() {
      if (!isDraft) {
        setPreviewUrl(null);
        setPreviewError(null);
        setPreviewBusy(false);
        return;
      }

      setPreviewBusy(true);
      setPreviewError(null);

      try {
        const existingPreview = await getEntryPreviewLink(item.id);
        const result = existingPreview.previewUrl ? existingPreview : await refreshEntryPreviewLink(item.id);
        if (!cancelled) {
          setPreviewUrl(result.previewUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : null);
        }
      } finally {
        if (!cancelled) {
          setPreviewBusy(false);
        }
      }
    }

    void loadPreviewLink();

    return () => {
      cancelled = true;
    };
  }, [isDraft, item.id]);

  const qrSvg = useMemo(() => {
    if (!entryUrl) {
      return null;
    }

    try {
      return buildQrSvg(item, entryUrl);
    } catch {
      return null;
    }
  }, [entryUrl, item]);
  const qrDataUri = useMemo(() => (qrSvg ? buildQrDataUri(qrSvg) : null), [qrSvg]);
  const targetTypeLabel =
    item.targetType === "whatsapp"
      ? t.create.targetTypeWhatsapp
      : item.targetType === "vcard"
        ? t.create.targetTypeVcard
        : item.targetType === "openapp"
          ? t.create.targetTypeOpenApp
          : t.create.targetTypeWeb;
  const ruleModeLabel =
    item.ruleMode === "language"
      ? locale === "zh-Hant"
        ? "語言模式"
        : locale === "zh-Hans"
          ? "语言模式"
          : "Language"
      : item.ruleMode === "region"
        ? locale === "zh-Hant"
          ? "國家或地區模式"
          : locale === "zh-Hans"
            ? "国家或地区模式"
            : "Region"
        : item.ruleMode === "device"
          ? locale === "zh-Hant"
            ? "設備系統模式"
            : locale === "zh-Hans"
              ? "设备系统模式"
              : "Device OS"
          : item.ruleMode === "param"
            ? locale === "zh-Hant"
              ? "參數模式"
              : locale === "zh-Hans"
                ? "参数模式"
                : "Param"
            : item.ruleMode === "ab"
              ? "A/B Test"
              : locale === "zh-Hant"
                ? "無規則"
                : locale === "zh-Hans"
                  ? "无规则"
                  : "No rule";

  const pauseLabel = isPaused
    ? locale === "zh-Hant"
      ? "恢復"
      : locale === "zh-Hans"
      ? "恢复"
      : "Resume"
    : locale === "zh-Hant"
    ? "暫停"
    : locale === "zh-Hans"
    ? "暂停"
    : "Pause";

  const statusText = isPaused
    ? locale === "zh-Hant"
      ? "Paused"
      : locale === "zh-Hans"
        ? "Paused"
        : "Paused"
    : isDraft
      ? locale === "zh-Hant"
        ? "Draft"
        : locale === "zh-Hans"
          ? "Draft"
          : "Draft"
      : locale === "zh-Hant"
        ? "Active"
        : locale === "zh-Hans"
          ? "Active"
          : "Active";

  async function copyLink() {
    if (!entryUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(entryUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = entryUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  async function downloadQrZip() {
    if (!entryUrl) {
      return;
    }

    await downloadQrAssetBundle(item, entryUrl, qrSvg);
  }

  function editEntry() {
    router.push(withLocale(locale, `/qrs/new?edit=${encodeURIComponent(item.id)}`));
  }

  function togglePause() {
    setIsPaused((current) => !current);
  }

  function viewAnalytics() {
    router.push(withLocale(locale, `/qrs/${encodeURIComponent(item.id)}/analytics`));
  }

  async function regeneratePreviewLink() {
    setPreviewBusy(true);
    setPreviewError(null);

    try {
      const result = await refreshEntryPreviewLink(item.id);
      setPreviewUrl(result.previewUrl);
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : locale === "zh-Hant"
            ? "無法生成草稿預覽連結。"
            : locale === "zh-Hans"
              ? "无法生成草稿预览链接。"
              : "Unable to generate a draft preview link.",
      );
    } finally {
      setPreviewBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200">
            <span className={`h-2 w-2 rounded-full ${isDraft ? "bg-sky-500" : isPaused ? "bg-amber-500" : "bg-emerald-500"}`} />
            {statusText}
          </div>
          <div className="flex flex-wrap gap-2">
            {!isDraft ? (
              <Button type="button" variant="secondary" onClick={togglePause}>
                {isPaused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                {pauseLabel}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={downloadQrZip} disabled={!entryUrl}>
              <Download size={14} />
              {t.common.download}
            </Button>
            <Button type="button" variant="secondary" onClick={viewAnalytics}>
              <BarChart3 size={14} />
              {locale === "zh-Hant" ? "查看分析" : locale === "zh-Hans" ? "查看分析" : "View analytics"}
            </Button>
            <Button type="button" onClick={editEntry}>
              <Pencil size={14} />
              {t.common.edit}
            </Button>
          </div>
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] bg-slate-50/80 px-4 py-3 ring-1 ring-slate-100">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{t.common.type}</div>
              <div className="mt-2 text-sm font-medium text-slate-800">{targetTypeLabel}</div>
            </div>
            <div className="rounded-[18px] bg-slate-50/80 px-4 py-3 ring-1 ring-slate-100">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                {locale === "zh-Hant" ? "規則模式" : locale === "zh-Hans" ? "规则模式" : "Rule mode"}
              </div>
              <div className="mt-2 text-sm font-medium text-slate-800">{ruleModeLabel}</div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isDraft
              ? locale === "zh-Hant"
                ? "草稿預覽連結"
                : locale === "zh-Hans"
                  ? "草稿预览链接"
                  : "Draft preview link"
              : locale === "zh-Hant"
                ? "正式連結"
                : locale === "zh-Hans"
                  ? "正式链接"
                  : "Published link"}
          </h2>
          <p className="mt-2 break-all text-sm text-slate-600">
            {entryUrl ||
              (isDraft
                ? locale === "zh-Hant"
                  ? "這個草稿目前還沒有可分享的 preview link。"
                  : locale === "zh-Hans"
                    ? "这个草稿目前还没有可分享的 preview link。"
                    : "This draft does not have a shareable preview link yet."
                : publishedEntryUrl)}
          </p>
          {previewError ? <p className="mt-2 text-sm text-rose-600">{previewError}</p> : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {entryUrl ? (
            <a href={entryUrl} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary">
                <ExternalLink size={14} />
                {t.common.preview}
              </Button>
            </a>
          ) : null}
          <Button type="button" variant="secondary" onClick={copyLink} disabled={!entryUrl}>
            <Copy size={14} />
            {t.common.copy}
          </Button>
          {isDraft ? (
            <Button type="button" variant="secondary" onClick={regeneratePreviewLink} disabled={previewBusy}>
              <ExternalLink size={14} />
              {previewBusy
                ? t.common.loading
                : previewUrl
                  ? locale === "zh-Hant"
                    ? "重新生成"
                    : locale === "zh-Hans"
                      ? "重新生成"
                      : "Regenerate"
                  : locale === "zh-Hant"
                    ? "生成預覽"
                    : locale === "zh-Hans"
                      ? "生成预览"
                      : "Generate preview"}
            </Button>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-slate-900">{locale === "zh-Hant" ? "預覽二維碼" : locale === "zh-Hans" ? "预览二维码" : "Preview QR code"}</h2>
        <div className="mt-5 rounded-[24px] bg-[linear-gradient(135deg,#f7fbff_0%,#edf6ff_48%,#f4f2ff_100%)] p-5">
          {qrDataUri ? (
            <Image
              key={qrDataUri}
              src={qrDataUri}
              alt={item.name}
              width={300}
              height={300}
              unoptimized
              className="mx-auto h-auto w-full max-w-[300px] rounded-[16px] bg-white p-3 shadow-sm"
            />
          ) : (
            <div className="mx-auto flex min-h-[300px] w-full max-w-[300px] items-center justify-center rounded-[16px] border border-dashed border-slate-200 bg-white p-6 text-center text-sm leading-6 text-slate-500">
              {previewBusy
                ? locale === "zh-Hant"
                  ? "正在準備草稿預覽連結…"
                  : locale === "zh-Hans"
                    ? "正在准备草稿预览链接…"
                    : "Preparing the draft preview link..."
                : previewError ||
                  (locale === "zh-Hant"
                    ? "目前還沒有可掃描的預覽連結。"
                    : locale === "zh-Hans"
                      ? "目前还没有可扫描的预览链接。"
                      : "There is no scannable preview link yet.")}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
