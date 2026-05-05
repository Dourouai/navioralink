"use client";

import QRCode from "qrcode";
import { Download, ImagePlus, LoaderCircle, Sparkles, WandSparkles, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";

import { getFreeToolsCopy } from "./free-tools-copy";

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const OUTPUT_SIZE = 1400;
const QUIET_ZONE_MODULES = 4;
const DEFAULT_ACCENT_COLOR = "#ef4444";
const DEFAULT_DOT_SCALE = 78;
const DEFAULT_OVERLAY_SCALE = 36;
const LIGHT_BACKGROUND = { b: 255, g: 255, r: 255 };
const SUPPORTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]);

function isSupportedImageFile(file: File) {
  if (SUPPORTED_MIME_TYPES.has(file.type)) {
    return true;
  }

  return /\.(png|jpe?g|webp|svg)$/i.test(file.name);
}

type UploadedImage = {
  dataUrl: string;
  name: string;
};

type RgbColor = {
  b: number;
  g: number;
  r: number;
};

type PreparedOverlayImage = {
  backgroundColor: RgbColor;
  imageData: ImageData;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rgbToCss(color: RgbColor) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function hexToRgb(value: string): RgbColor {
  const normalized = value.replace("#", "");
  const safeHex = normalized.length === 3 ? normalized.split("").map((char) => char.repeat(2)).join("") : normalized;
  return {
    r: Number.parseInt(safeHex.slice(0, 2), 16),
    g: Number.parseInt(safeHex.slice(2, 4), 16),
    b: Number.parseInt(safeHex.slice(4, 6), 16),
  };
}

function rgbToHex(color: RgbColor) {
  return `#${[color.r, color.g, color.b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function colorDistance(left: RgbColor, right: RgbColor) {
  const red = left.r - right.r;
  const green = left.g - right.g;
  const blue = left.b - right.b;
  return Math.sqrt(red * red + green * green + blue * blue);
}

function isBackgroundLike(color: RgbColor, backgroundColor: RgbColor) {
  const distance = colorDistance(color, backgroundColor);
  const luminanceGap = Math.abs(relativeLuminance(color) - relativeLuminance(backgroundColor));
  return distance < 26 && luminanceGap < 0.08;
}

function isForegroundSample(sample: { alpha: number; color: RgbColor }, backgroundColor: RgbColor) {
  if (sample.alpha < 0.18) {
    return false;
  }

  if (isBackgroundLike(sample.color, backgroundColor)) {
    return false;
  }

  if (isNearlyWhite(sample.color) && relativeLuminance(backgroundColor) > 0.92) {
    return false;
  }

  return true;
}

function blendColors(left: RgbColor, right: RgbColor, ratio: number): RgbColor {
  return {
    r: Math.round(left.r * (1 - ratio) + right.r * ratio),
    g: Math.round(left.g * (1 - ratio) + right.g * ratio),
    b: Math.round(left.b * (1 - ratio) + right.b * ratio),
  };
}

function relativeLuminance(color: RgbColor) {
  const normalizedChannels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return normalizedChannels[0] * 0.2126 + normalizedChannels[1] * 0.7152 + normalizedChannels[2] * 0.0722;
}

function contrastRatio(left: RgbColor, right: RgbColor) {
  const lighter = Math.max(relativeLuminance(left), relativeLuminance(right));
  const darker = Math.min(relativeLuminance(left), relativeLuminance(right));
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureReadableColor(color: RgbColor, minimumContrast = 4.2) {
  let next = color;

  for (let step = 0; step < 8; step += 1) {
    if (contrastRatio(next, LIGHT_BACKGROUND) >= minimumContrast) {
      return next;
    }

    next = blendColors(next, { b: 15, g: 23, r: 15 }, 0.18);
  }

  return next;
}

function isNearlyWhite(color: RgbColor) {
  return color.r >= 245 && color.g >= 245 && color.b >= 245;
}

function buildDownloadName(url: string) {
  try {
    const parsed = new URL(url);
    const safeHost = parsed.hostname.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    return `${safeHost || "logo"}-qr`;
  } catch {
    return "logo-qr";
  }
}

function looksLikeDomain(value: string) {
  return (
    /^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(value) ||
    /^localhost(?::\d+)?(?:[/?#]|$)/i.test(value)
  );
}

function normalizeWebsiteUrl(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(normalized)
    ? normalized
    : looksLikeDomain(normalized)
      ? `https://${normalized}`
      : normalized;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read file"));
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function getPixelSample(imageData: ImageData, row: number, col: number) {
  const index = (row * imageData.width + col) * 4;
  return {
    alpha: imageData.data[index + 3] / 255,
    color: {
      r: imageData.data[index],
      g: imageData.data[index + 1],
      b: imageData.data[index + 2],
    } satisfies RgbColor,
  };
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = source;
  });
}

function createSquareImageData(image: HTMLImageElement, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context is unavailable");
  }

  const sourceSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const sourceX = Math.max(0, Math.round(((image.naturalWidth || image.width) - sourceSize) / 2));
  const sourceY = Math.max(0, Math.round(((image.naturalHeight || image.height) - sourceSize) / 2));

  context.clearRect(0, 0, size, size);
  context.imageSmoothingEnabled = true;
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

  return context.getImageData(0, 0, size, size);
}

function sampleBackgroundColor(imageData: ImageData) {
  const samples: RgbColor[] = [];
  const rowStep = Math.max(1, Math.floor(imageData.height / 8));
  const colStep = Math.max(1, Math.floor(imageData.width / 8));

  for (let col = 0; col < imageData.width; col += colStep) {
    const top = getPixelSample(imageData, 0, col);
    const bottom = getPixelSample(imageData, imageData.height - 1, col);
    if (top.alpha >= 0.14) samples.push(top.color);
    if (bottom.alpha >= 0.14) samples.push(bottom.color);
  }

  for (let row = 0; row < imageData.height; row += rowStep) {
    const left = getPixelSample(imageData, row, 0);
    const right = getPixelSample(imageData, row, imageData.width - 1);
    if (left.alpha >= 0.14) samples.push(left.color);
    if (right.alpha >= 0.14) samples.push(right.color);
  }

  if (!samples.length) {
    return LIGHT_BACKGROUND;
  }

  const totals = samples.reduce(
    (result, sample) => ({
      b: result.b + sample.b,
      g: result.g + sample.g,
      r: result.r + sample.r,
    }),
    { b: 0, g: 0, r: 0 },
  );

  return {
    r: totals.r / samples.length,
    g: totals.g / samples.length,
    b: totals.b / samples.length,
  };
}

function detectForegroundBounds(imageData: ImageData, backgroundColor: RgbColor) {
  let minRow = imageData.height;
  let minCol = imageData.width;
  let maxRow = -1;
  let maxCol = -1;

  for (let row = 0; row < imageData.height; row += 1) {
    for (let col = 0; col < imageData.width; col += 1) {
      const sample = getPixelSample(imageData, row, col);
      if (!isForegroundSample(sample, backgroundColor)) {
        continue;
      }

      minRow = Math.min(minRow, row);
      minCol = Math.min(minCol, col);
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
    }
  }

  if (maxRow < minRow || maxCol < minCol) {
    return null;
  }

  return {
    height: maxRow - minRow + 1,
    maxCol,
    maxRow,
    minCol,
    minRow,
    width: maxCol - minCol + 1,
  };
}

function prepareOverlayImage(image: HTMLImageElement, size: number): PreparedOverlayImage {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = size;
  sourceCanvas.height = size;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas context is unavailable");
  }

  const initialImageData = createSquareImageData(image, size);
  const sourceBackground = sampleBackgroundColor(initialImageData);
  const bounds = detectForegroundBounds(initialImageData, sourceBackground);

  if (!bounds) {
    return {
      backgroundColor: sourceBackground,
      imageData: initialImageData,
    };
  }

  sourceContext.putImageData(initialImageData, 0, 0);

  const padding = Math.max(2, Math.round(Math.max(bounds.width, bounds.height) * 0.12));
  const cropX = Math.max(0, bounds.minCol - padding);
  const cropY = Math.max(0, bounds.minRow - padding);
  const cropWidth = Math.min(size - cropX, bounds.width + padding * 2);
  const cropHeight = Math.min(size - cropY, bounds.height + padding * 2);

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = size;
  outputCanvas.height = size;
  const outputContext = outputCanvas.getContext("2d");

  if (!outputContext) {
    throw new Error("Canvas context is unavailable");
  }

  outputContext.clearRect(0, 0, size, size);
  const destinationMax = size * 0.84;
  const scale = Math.min(destinationMax / cropWidth, destinationMax / cropHeight);
  const drawWidth = cropWidth * scale;
  const drawHeight = cropHeight * scale;
  const drawX = (size - drawWidth) / 2;
  const drawY = (size - drawHeight) / 2;

  outputContext.drawImage(sourceCanvas, cropX, cropY, cropWidth, cropHeight, drawX, drawY, drawWidth, drawHeight);

  return {
    backgroundColor: sourceBackground,
    imageData: outputContext.getImageData(0, 0, size, size),
  };
}

function extractAccentColor(imageData: ImageData, backgroundColor: RgbColor) {
  const { data, width, height } = imageData;
  let weightedRed = 0;
  let weightedGreen = 0;
  let weightedBlue = 0;
  let totalWeight = 0;

  for (let row = 0; row < height; row += 2) {
    for (let col = 0; col < width; col += 2) {
      const index = (row * width + col) * 4;
      const alpha = data[index + 3] / 255;

      if (alpha < 0.18) {
        continue;
      }

      const candidate = {
        r: data[index],
        g: data[index + 1],
        b: data[index + 2],
      };

      if (!isForegroundSample({ alpha, color: candidate }, backgroundColor)) {
        continue;
      }

      const channelMax = Math.max(candidate.r, candidate.g, candidate.b);
      const channelMin = Math.min(candidate.r, candidate.g, candidate.b);
      const spread = channelMax - channelMin;
      const depth = 255 - (candidate.r + candidate.g + candidate.b) / 3;
      const weight = Math.max(0.2, (spread + depth) / 255) * alpha;

      weightedRed += candidate.r * weight;
      weightedGreen += candidate.g * weight;
      weightedBlue += candidate.b * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight <= 0) {
    return null;
  }

  return ensureReadableColor({
    r: weightedRed / totalWeight,
    g: weightedGreen / totalWeight,
    b: weightedBlue / totalWeight,
  });
}

function sampleOverlayColor(imageData: ImageData, backgroundColor: RgbColor, row: number, col: number) {
  const sample = getPixelSample(imageData, row, col);
  if (!isForegroundSample(sample, backgroundColor)) {
    return null;
  }

  return ensureReadableColor(sample.color, 4.3);
}

function drawPixelLogoOverlay(params: {
  accentColor: RgbColor;
  backgroundColor: RgbColor;
  boxSize: number;
  context: CanvasRenderingContext2D;
  imageData: ImageData;
  x: number;
  y: number;
}) {
  const padding = params.boxSize * 0.1;
  const innerX = params.x + padding;
  const innerY = params.y + padding;
  const innerSize = params.boxSize - padding * 2;
  const pixelCellSize = innerSize / params.imageData.width;

  params.context.save();
  params.context.fillStyle = "#ffffff";
  params.context.fillRect(params.x, params.y, params.boxSize, params.boxSize);

  for (let row = 0; row < params.imageData.height; row += 1) {
    for (let col = 0; col < params.imageData.width; col += 1) {
      const sampledColor = sampleOverlayColor(params.imageData, params.backgroundColor, row, col);
      if (!sampledColor) {
        continue;
      }

      const mixedColor = blendColors(sampledColor, params.accentColor, 0.12);
      const radius = pixelCellSize * 0.42;
      const centerX = innerX + col * pixelCellSize + pixelCellSize / 2;
      const centerY = innerY + row * pixelCellSize + pixelCellSize / 2;

      params.context.beginPath();
      params.context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      params.context.fillStyle = rgbToCss(ensureReadableColor(mixedColor, 4.3));
      params.context.fill();
    }
  }

  params.context.restore();
}

function drawDot(context: CanvasRenderingContext2D, x: number, y: number, cellSize: number, dotScale: number, color: RgbColor) {
  const radius = (cellSize * dotScale) / 2;

  context.beginPath();
  context.arc(x + cellSize / 2, y + cellSize / 2, radius, 0, Math.PI * 2);
  context.fillStyle = rgbToCss(color);
  context.fill();
}

async function renderLogoQrToCanvas(params: {
  accentColor: string;
  autoAccent: boolean;
  canvas: HTMLCanvasElement;
  dotScale: number;
  imageDataUrl: string;
  overlayScale: number;
  url: string;
}) {
  const qr = QRCode.create(params.url, {
    errorCorrectionLevel: "H",
  });
  const matrixSize = qr.modules.size;
  const canvas = params.canvas;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context is unavailable");
  }

  const cellSize = OUTPUT_SIZE / (matrixSize + QUIET_ZONE_MODULES * 2);
  const offset = QUIET_ZONE_MODULES * cellSize;
  const image = await loadImage(params.imageDataUrl);
  const overlayModules = clamp(Math.round(matrixSize * (params.overlayScale / 100)), 9, matrixSize - 8);
  const overlayStart = Math.floor((matrixSize - overlayModules) / 2);
  const overlayResolution = clamp(Math.round(overlayModules * 2.5), 28, 64);
  const preparedOverlayImage = prepareOverlayImage(image, overlayResolution);
  const sampledAccent = extractAccentColor(preparedOverlayImage.imageData, preparedOverlayImage.backgroundColor);
  const baseColor = ensureReadableColor(params.autoAccent && sampledAccent ? sampledAccent : hexToRgb(params.accentColor));

  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  for (let row = 0; row < matrixSize; row += 1) {
    for (let col = 0; col < matrixSize; col += 1) {
      if (qr.modules.get(row, col) !== 1) {
        continue;
      }

      drawDot(
        context,
        offset + col * cellSize,
        offset + row * cellSize,
        cellSize,
        clamp(params.dotScale / 100, 0.52, 0.94),
        baseColor,
      );
    }
  }

  drawPixelLogoOverlay({
    accentColor: baseColor,
    backgroundColor: preparedOverlayImage.backgroundColor,
    boxSize: overlayModules * cellSize,
    context,
    imageData: preparedOverlayImage.imageData,
    x: offset + overlayStart * cellSize,
    y: offset + overlayStart * cellSize,
  });

  return {
    accentColor: rgbToHex(baseColor),
    downloadName: buildDownloadName(params.url),
    normalizedUrl: params.url,
  };
}

function downloadCanvas(canvas: HTMLCanvasElement, fileName: string) {
  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }

    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `${fileName}.png`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  }, "image/png");
}

export function LogoQrGenerator({ locale }: { locale: Locale }) {
  const copy = getFreeToolsCopy(locale);
  const fileInputId = useId();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [autoAccent, setAutoAccent] = useState(true);
  const [overlayScale, setOverlayScale] = useState(DEFAULT_OVERLAY_SCALE);
  const [dotScale, setDotScale] = useState(DEFAULT_DOT_SCALE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [hasPreview, setHasPreview] = useState(false);
  const [downloadName, setDownloadName] = useState("logo-qr");
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  async function handleImageSelect(file: File) {
    if (!isSupportedImageFile(file)) {
      setErrorMessage(copy.generator.unsupportedFile);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(copy.generator.fileTooLarge);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setUploadedImage({ dataUrl, name: file.name });
      setErrorMessage(null);
      setHasPreview(false);
    } catch {
      setErrorMessage(copy.generator.renderFailed);
    }
  }

  async function handleGenerate() {
    const normalizedUrl = normalizeWebsiteUrl(urlInput);

    if (!normalizedUrl) {
      setErrorMessage(copy.generator.invalidUrl);
      return;
    }

    if (!uploadedImage) {
      setErrorMessage(copy.generator.missingImage);
      return;
    }

    if (!canvasRef.current) {
      setErrorMessage(copy.generator.renderFailed);
      return;
    }

    setErrorMessage(null);
    setIsRendering(true);

    try {
      const result = await renderLogoQrToCanvas({
        accentColor,
        autoAccent,
        canvas: canvasRef.current,
        dotScale,
        imageDataUrl: uploadedImage.dataUrl,
        overlayScale,
        url: normalizedUrl,
      });

      setAccentColor(result.accentColor);
      setDownloadName(result.downloadName);
      setResolvedUrl(result.normalizedUrl);
      setHasPreview(true);
    } catch {
      setErrorMessage(copy.generator.renderFailed);
      setHasPreview(false);
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <section className="rounded-[36px] bg-white/90 p-5 shadow-[0_24px_56px_rgba(15,23,42,0.08)] ring-1 ring-[rgba(190,206,226,0.52)] md:p-7">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div>
            <Badge tone="info" className="px-4 py-1.5 text-[11px] uppercase tracking-[0.16em]">
              {copy.generator.sectionBadge}
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-[2.2rem]">{copy.generator.sectionTitle}</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{copy.generator.sectionBody}</p>
          </div>

          <div className="grid gap-4 rounded-[28px] border border-[rgba(190,206,226,0.5)] bg-[linear-gradient(180deg,rgba(248,251,255,0.95),rgba(255,255,255,0.92))] p-5">
            <Input
              label={copy.generator.urlLabel}
              value={urlInput}
              onChange={(event) => {
                setUrlInput(event.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              placeholder={copy.generator.urlPlaceholder}
              hint={copy.generator.urlHint}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-700">{copy.generator.imageLabel}</div>
                  <p className="mt-1 text-sm text-slate-500">{copy.generator.imageHint}</p>
                </div>
                <Badge tone="default" className="shrink-0">
                  {copy.generator.localOnlyNote}
                </Badge>
              </div>

              <div className="rounded-[24px] border border-dashed border-[rgba(118,164,255,0.42)] bg-[linear-gradient(180deg,rgba(239,247,255,0.72),rgba(255,255,255,0.92))] p-4">
                <input
                  id={fileInputId}
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={async (event) => {
                    const input = event.currentTarget;
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    await handleImageSelect(file);
                    input.value = "";
                  }}
                />

                {uploadedImage ? (
                  <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
                    <div
                      className="aspect-square rounded-[22px] border border-[rgba(190,206,226,0.5)] bg-white shadow-[0_12px_24px_rgba(15,23,42,0.04)]"
                      style={{
                        backgroundImage: `url(${uploadedImage.dataUrl})`,
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "cover",
                      }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{uploadedImage.name}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{copy.generator.formatHint}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          icon={<ImagePlus size={16} />}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {copy.generator.replaceImage}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          icon={<X size={16} />}
                          onClick={() => {
                            setUploadedImage(null);
                            setHasPreview(false);
                            setErrorMessage(null);
                          }}
                        >
                          {copy.generator.removeImage}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(26,192,243,0.14),rgba(63,140,255,0.16),rgba(141,121,255,0.14))] text-sky-700">
                      <ImagePlus size={20} />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      icon={<ImagePlus size={16} />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {copy.generator.uploadAction}
                    </Button>
                    <p className="text-sm leading-6 text-slate-500">{copy.generator.formatHint}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">{copy.generator.accentLabel}</span>
                <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white/92 px-3 py-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(event) => setAccentColor(event.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-[12px] border-0 bg-transparent p-0"
                  />
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-slate-700">{accentColor.toUpperCase()}</div>
                    <div className="mt-1 text-xs text-slate-500">{copy.generator.accentHint}</div>
                  </div>
                </div>
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">{copy.generator.dotScaleLabel}</span>
                <div className="rounded-[18px] border border-slate-200 bg-white/92 px-4 py-3">
                  <input
                    type="range"
                    min="58"
                    max="90"
                    step="1"
                    value={dotScale}
                    onChange={(event) => setDotScale(Number(event.target.value))}
                    className="w-full accent-sky-500"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{copy.generator.dotScaleHint}</span>
                    <span>{dotScale}%</span>
                  </div>
                </div>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
              <label className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">{copy.generator.overlayScaleLabel}</span>
                <div className="rounded-[18px] border border-slate-200 bg-white/92 px-4 py-3">
                  <input
                    type="range"
                    min="26"
                    max="42"
                    step="1"
                    value={overlayScale}
                    onChange={(event) => setOverlayScale(Number(event.target.value))}
                    className="w-full accent-sky-500"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{copy.generator.overlayScaleHint}</span>
                    <span>{overlayScale}%</span>
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white/92 px-4 py-4 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={autoAccent}
                  onChange={(event) => setAutoAccent(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>{copy.generator.autoAccent}</span>
              </label>
            </div>

            {errorMessage ? <p className="text-sm font-medium text-rose-600">{errorMessage}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => {
                  void handleGenerate();
                }}
                disabled={isRendering}
                icon={isRendering ? <LoaderCircle size={16} className="animate-spin" /> : <WandSparkles size={16} />}
              >
                {hasPreview ? copy.generator.regenerateAction : copy.generator.generateAction}
              </Button>

              <Button
                type="button"
                variant="secondary"
                disabled={!hasPreview || isRendering || !canvasRef.current}
                icon={<Download size={16} />}
                onClick={() => {
                  if (canvasRef.current) {
                    downloadCanvas(canvasRef.current, downloadName);
                  }
                }}
              >
                {copy.generator.downloadAction}
              </Button>
            </div>

            <p className="text-sm leading-6 text-slate-500">{copy.generator.helper}</p>
          </div>
        </div>

        <div className="rounded-[30px] border border-[rgba(190,206,226,0.52)] bg-[linear-gradient(180deg,rgba(245,250,255,0.95),rgba(255,255,255,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{copy.generator.previewLabel}</div>
              <p className="mt-1 text-sm text-slate-500">{copy.generator.downloadHint}</p>
            </div>
            <Badge tone={hasPreview ? "success" : "default"}>{hasPreview ? copy.generator.localOnlyNote : copy.generator.sectionBadge}</Badge>
          </div>

          <div className="mt-5 rounded-[28px] border border-[rgba(190,206,226,0.46)] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="relative overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(210,231,255,0.42),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4">
              <canvas ref={canvasRef} className={`aspect-square w-full rounded-[22px] ${hasPreview ? "block" : "hidden"}`} />

              {!hasPreview ? (
                <div className="flex aspect-square flex-col items-center justify-center rounded-[22px] border border-dashed border-[rgba(190,206,226,0.62)] bg-white/78 px-6 text-center">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(26,192,243,0.12),rgba(141,121,255,0.14))] text-sky-700">
                    {isRendering ? <LoaderCircle size={22} className="animate-spin" /> : <Sparkles size={22} />}
                  </div>
                  <div className="mt-4 text-lg font-semibold text-slate-900">
                    {isRendering ? copy.generator.processing : copy.generator.idleTitle}
                  </div>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    {isRendering ? copy.generator.sectionBody : copy.generator.idleBody}
                  </p>
                </div>
              ) : null}
            </div>

            {resolvedUrl ? (
              <div className="mt-4 rounded-[20px] border border-[rgba(190,206,226,0.45)] bg-slate-50/90 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.generator.urlLabel}</div>
                <div className="mt-2 break-all text-sm font-medium text-slate-700">{resolvedUrl}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
