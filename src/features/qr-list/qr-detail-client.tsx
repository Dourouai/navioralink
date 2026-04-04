"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { BarChart3, Copy, Download, ExternalLink, PauseCircle, PlayCircle, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { getEntryUrl } from "@/lib/entry-url";
import type { QRCodeItem } from "@/types/qr";

interface QrDetailClientProps {
  locale: Locale;
  item: QRCodeItem;
}

function sanitizeFileName(raw: string) {
  const safe = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || "qr";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function renderSvgToPng(svg: string, size: number) {
  const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to render QR SVG to PNG."));
    image.src = svgDataUri;
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context is not available.");
  }

  context.clearRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);

  const pngBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });

  if (!pngBlob) {
    throw new Error("Failed to export PNG file.");
  }

  return pngBlob;
}

function hashSeed(value: string) {
  return Array.from(value).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function buildQrSvg(item: QRCodeItem) {
  const size = 29;
  const cell = 10;
  const padding = 24;
  const canvasSize = size * cell + padding * 2;
  const foreground = item.design?.borderColor ?? "#0f172a";
  const background = item.design?.backgroundColor ?? "#ffffff";
  const seed = hashSeed(`${item.id}-${getEntryUrl(item)}`);

  function isFinder(x: number, y: number) {
    const topLeft = x <= 6 && y <= 6;
    const topRight = x >= size - 7 && y <= 6;
    const bottomLeft = x <= 6 && y >= size - 7;
    return topLeft || topRight || bottomLeft;
  }

  function finderRect(x: number, y: number) {
    const startX = x <= 6 ? 0 : size - 7;
    const startY = y <= 6 ? 0 : size - 7;
    if (x === startX || x === startX + 6 || y === startY || y === startY + 6) return true;
    if (x >= startX + 2 && x <= startX + 4 && y >= startY + 2 && y <= startY + 4) return true;
    return false;
  }

  let rects = "";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const shouldFill = isFinder(x, y) ? finderRect(x, y) : (x * 17 + y * 31 + seed) % 7 < 3;
      if (!shouldFill) continue;
      rects += `<rect x="${padding + x * cell}" y="${padding + y * cell}" width="${cell - 1}" height="${cell - 1}" rx="2" fill="${foreground}" />`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" role="img" aria-label="${item.name}">\n  <rect width="${canvasSize}" height="${canvasSize}" rx="36" fill="${background}" />\n  ${rects}\n</svg>`;
}

export function QrDetailClient({ locale, item }: QrDetailClientProps) {
  const t = getMessages(locale);
  const router = useRouter();
  const entryUrl = getEntryUrl(item);
  const [isPaused, setIsPaused] = useState(item.status !== "active");

  const qrSvg = useMemo(() => buildQrSvg(item), [item]);
  const qrDataUri = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`, [qrSvg]);

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
    : locale === "zh-Hant"
    ? "Active"
    : locale === "zh-Hans"
    ? "Active"
    : "Active";

  async function copyLink() {
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
    const fileBase = `${sanitizeFileName(item.name)}-qr`;
    const svgBlob = new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" });
    const pngBlob = await renderSvgToPng(qrSvg, 1000);

    const zip = new JSZip();
    zip.file(`${fileBase}.svg`, svgBlob);
    zip.file(`${fileBase}-1000x1000.png`, pngBlob);

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `${fileBase}.zip`);
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

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200">
            <span className={`h-2 w-2 rounded-full ${isPaused ? "bg-amber-500" : "bg-emerald-500"}`} />
            {statusText}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={togglePause}>
              {isPaused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
              {pauseLabel}
            </Button>
            <Button type="button" variant="secondary" onClick={downloadQrZip}>
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
          <h2 className="text-xl font-semibold text-slate-900">{locale === "zh-Hant" ? "預覽連結" : locale === "zh-Hans" ? "预览链接" : "Preview link"}</h2>
          <p className="mt-2 break-all text-sm text-slate-600">{entryUrl}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href={entryUrl} target="_blank" rel="noreferrer">
            <Button type="button" variant="secondary">
              <ExternalLink size={14} />
              {t.common.preview}
            </Button>
          </a>
          <Button type="button" variant="secondary" onClick={copyLink}>
            <Copy size={14} />
            {t.common.copy}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-slate-900">{locale === "zh-Hant" ? "預覽二維碼" : locale === "zh-Hans" ? "预览二维码" : "Preview QR code"}</h2>
        <div className="mt-5 rounded-[24px] bg-[linear-gradient(135deg,#f7fbff_0%,#edf6ff_48%,#f4f2ff_100%)] p-5">
          <img src={qrDataUri} alt={item.name} className="mx-auto h-auto w-full max-w-[300px] rounded-[16px] bg-white p-3 shadow-sm" />
        </div>
      </Card>
    </div>
  );
}
