"use client";

import JSZip from "jszip";
import QRCode from "qrcode";

import { getEntryUrl } from "@/lib/entry-url";
import type { QRCodeItem } from "@/types/qr";

const DEFAULT_FOREGROUND = "#0f172a";
const DEFAULT_BACKGROUND = "#ffffff";
const DEFAULT_CORRECTION_LEVEL = "H";
const QUIET_ZONE_MODULES = 4;
const MODULE_SIZE = 20;
const PRESET_LOGO_DATA_URIS = {
  link: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#693ACB"/><path stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6" d="m24.7 21.7 2.7-2.7a4.9 4.9 0 0 0 0-6.9 4.9 4.9 0 0 0-6.9 0l-2.7 2.7m2.9 10.7-2.7 2.7a4.9 4.9 0 0 1-6.9 0 4.9 4.9 0 0 1 0-6.9l2.7-2.7m3.2 3.5 5.3-5.3"/></svg>`,
  )}`,
  email: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#C9B032"/><rect x="9.5" y="12.5" width="21" height="15" rx="3" stroke="#fff" stroke-width="2"/><path d="m11.5 15 8.5 6 8.5-6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  )}`,
  location: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#EB4146"/><path d="M20 29s6-5.6 6-10.3C26 15 23.3 12.5 20 12.5S14 15 14 18.7C14 23.4 20 29 20 29Z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><circle cx="20" cy="18.5" r="2.4" stroke="#fff" stroke-width="2"/></svg>`,
  )}`,
  scan: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#37AEAE"/><path d="M13 15v-2.5A1.5 1.5 0 0 1 14.5 11H17m10 4v-2.5A1.5 1.5 0 0 0 25.5 11H23m4 14v2.5a1.5 1.5 0 0 1-1.5 1.5H23m-10-4v2.5a1.5 1.5 0 0 0 1.5 1.5H17" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M12 20h16" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  )}`,
  whatsapp: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#46CB48"/><path fill="#fff" d="M28.4 24.9c-.4-.2-2.3-1.1-2.6-1.2-.4-.1-.6-.2-.9.2l-.9 1c-.2.2-.4.2-.7.1-.4-.2-1.5-.6-2.8-1.8-1.1-1-1.9-2.1-2.1-2.4-.2-.4 0-.6.1-.8l.2-.3c.1-.1.2-.3.3-.4.1-.2 0-.4 0-.6s-.8-2.1-1.1-2.8c-.3-.8-.6-.7-.9-.7h-.8c-.2 0-.6.1-.9.4s-1.1 1.1-1.1 2.7 1.1 3.1 1.2 3.4c.2.2 2.2 3.4 5.4 4.7.8.4 1.5.6 2 .8.8.3 1.5.3 2 .2.6-.1 2.1-.9 2.4-1.8s.3-1.7.2-1.8c-.1-.2-.3-.2-.7-.4Z"/><path fill="#fff" d="m11.3 30.5 1.3-4.7a8.5 8.5 0 1 1 3 2.9l-4.3 1.8Z"/></svg>`,
  )}`,
} as const;

type DataModuleStyle =
  | "square"
  | "rounded"
  | "classy"
  | "classy-rounded"
  | "extra-rounded"
  | "diamond"
  | "star"
  | "heart";
type FinderBorderStyle = "square" | "rounded" | "thick" | "dot";
type FinderCenterStyle = "square" | "dot" | "diamond" | "star";

type RgbaColor = {
  a: number;
  b: number;
  g: number;
  r: number;
};

export function sanitizeQrFileName(raw: string) {
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

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDataModuleStyle(value?: string): DataModuleStyle {
  switch (value) {
    case "square":
    case "rounded":
    case "classy":
    case "classy-rounded":
    case "extra-rounded":
    case "diamond":
    case "star":
    case "heart":
      return value;
    default:
      return "rounded";
  }
}

function normalizeFinderBorderStyle(value?: string): FinderBorderStyle {
  switch (value) {
    case "square":
    case "rounded":
    case "thick":
    case "dot":
      return value;
    default:
      return "rounded";
  }
}

function normalizeFinderCenterStyle(value?: string): FinderCenterStyle {
  switch (value) {
    case "square":
    case "dot":
    case "diamond":
    case "star":
      return value;
    default:
      return "dot";
  }
}

function normalizeCorrectionLevel(value?: string): NonNullable<QRCodeItem["design"]>["correctionLevel"] {
  switch (value) {
    case "L":
    case "M":
    case "Q":
    case "H":
      return value;
    default:
      return DEFAULT_CORRECTION_LEVEL;
  }
}

function splitFunctionArgs(value: string) {
  return value
    .trim()
    .replaceAll("/", ",")
    .split(/[\s,]+/)
    .filter(Boolean);
}

function parseRgbChannel(value: string) {
  if (value.endsWith("%")) {
    return clamp(Math.round((Number.parseFloat(value) / 100) * 255), 0, 255);
  }

  return clamp(Math.round(Number.parseFloat(value)), 0, 255);
}

function parseAlphaChannel(value: string) {
  if (value.endsWith("%")) {
    return clamp(Number.parseFloat(value) / 100, 0, 1);
  }

  return clamp(Number.parseFloat(value), 0, 1);
}

function normalizeHue(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const normalized = parsed % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function parsePercentage(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return clamp(parsed / 100, 0, 1);
}

function hslToRgb(hue: number, saturation: number, lightness: number): RgbaColor {
  if (saturation === 0) {
    const channel = Math.round(lightness * 255);
    return { a: 1, b: channel, g: channel, r: channel };
  }

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const offset = lightness - chroma / 2;
  return {
    a: 1,
    b: Math.round((blue + offset) * 255),
    g: Math.round((green + offset) * 255),
    r: Math.round((red + offset) * 255),
  };
}

function parseCssColor(value?: string): RgbaColor | null {
  const text = value?.trim();
  if (!text) {
    return null;
  }

  const hex = text.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
  if (hex) {
    const raw = hex[1];
    const expanded = raw.length <= 4 ? raw.split("").map((char) => char.repeat(2)).join("") : raw;
    const hasAlpha = expanded.length === 8;
    return {
      a: hasAlpha ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
      b: Number.parseInt(expanded.slice(4, 6), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      r: Number.parseInt(expanded.slice(0, 2), 16),
    };
  }

  const rgb = text.match(/^rgba?\((.+)\)$/i);
  if (rgb) {
    const parts = splitFunctionArgs(rgb[1]);
    if (parts.length >= 3) {
      return {
        a: parts[3] ? parseAlphaChannel(parts[3]) : 1,
        b: parseRgbChannel(parts[2]),
        g: parseRgbChannel(parts[1]),
        r: parseRgbChannel(parts[0]),
      };
    }
  }

  const hsl = text.match(/^hsla?\((.+)\)$/i);
  if (hsl) {
    const parts = splitFunctionArgs(hsl[1]);
    if (parts.length >= 3) {
      const base = hslToRgb(normalizeHue(parts[0]), parsePercentage(parts[1]), parsePercentage(parts[2]));
      return {
        ...base,
        a: parts[3] ? parseAlphaChannel(parts[3]) : 1,
      };
    }
  }

  return null;
}

function compositeOnto(color: RgbaColor, backdrop: RgbaColor): RgbaColor {
  const alpha = clamp(color.a + backdrop.a * (1 - color.a), 0, 1) || 1;
  return {
    a: 1,
    b: Math.round((color.b * color.a + backdrop.b * backdrop.a * (1 - color.a)) / alpha),
    g: Math.round((color.g * color.a + backdrop.g * backdrop.a * (1 - color.a)) / alpha),
    r: Math.round((color.r * color.a + backdrop.r * backdrop.a * (1 - color.a)) / alpha),
  };
}

function relativeLuminance(color: RgbaColor) {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(left: RgbaColor, right: RgbaColor) {
  const lighter = Math.max(relativeLuminance(left), relativeLuminance(right));
  const darker = Math.min(relativeLuminance(left), relativeLuminance(right));
  return (lighter + 0.05) / (darker + 0.05);
}

function toRgbColor(color: RgbaColor) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function resolveSafeColors(design?: QRCodeItem["design"]) {
  const defaultForeground = parseCssColor(DEFAULT_FOREGROUND)!;
  const defaultBackground = parseCssColor(DEFAULT_BACKGROUND)!;
  const background = compositeOnto(parseCssColor(design?.backgroundColor) ?? defaultBackground, defaultBackground);
  const foreground = compositeOnto(parseCssColor(design?.borderColor) ?? defaultForeground, background);

  if (foreground.a < 1 || background.a < 1) {
    return {
      background: DEFAULT_BACKGROUND,
      foreground: DEFAULT_FOREGROUND,
    };
  }

  if (relativeLuminance(foreground) >= relativeLuminance(background) || contrastRatio(foreground, background) < 4.5) {
    return {
      background: DEFAULT_BACKGROUND,
      foreground: DEFAULT_FOREGROUND,
    };
  }

  return {
    background: toRgbColor(background),
    foreground: toRgbColor(foreground),
  };
}

function getFinderCellType(row: number, col: number, size: number) {
  const origins = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ] as const;

  for (const [originRow, originCol] of origins) {
    const rowOffset = row - originRow;
    const colOffset = col - originCol;
    const inZone = rowOffset >= 0 && rowOffset < 7 && colOffset >= 0 && colOffset < 7;
    if (!inZone) {
      continue;
    }

    if (rowOffset === 0 || rowOffset === 6 || colOffset === 0 || colOffset === 6) {
      return "outer" as const;
    }

    if (rowOffset >= 2 && rowOffset <= 4 && colOffset >= 2 && colOffset <= 4) {
      return "center" as const;
    }

    return "gap" as const;
  }

  return undefined;
}

function buildRect(x: number, y: number, size: number, fill: string, radius = 0) {
  const safeRadius = clamp(radius, 0, size / 2);
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}"${safeRadius > 0 ? ` rx="${safeRadius}"` : ""} fill="${fill}" />`;
}

function buildDiamond(x: number, y: number, size: number, fill: string) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  return `<polygon points="${centerX},${y} ${x + size},${centerY} ${centerX},${y + size} ${x},${centerY}" fill="${fill}" />`;
}

function buildPolygon(
  x: number,
  y: number,
  size: number,
  fill: string,
  points: ReadonlyArray<readonly [number, number]>,
) {
  const scaled = points.map(([pointX, pointY]) => `${x + pointX * size},${y + pointY * size}`).join(" ");
  return `<polygon points="${scaled}" fill="${fill}" />`;
}

function buildStar(x: number, y: number, size: number, fill: string) {
  return buildPolygon(x, y, size, fill, [
    [0.5, 0],
    [0.61, 0.35],
    [0.98, 0.35],
    [0.68, 0.57],
    [0.79, 0.91],
    [0.5, 0.7],
    [0.21, 0.91],
    [0.32, 0.57],
    [0.02, 0.35],
    [0.39, 0.35],
  ]);
}

function buildHeart(x: number, y: number, size: number, fill: string) {
  return buildPolygon(x, y, size, fill, [
    [0.5, 0.92],
    [0.95, 0.45],
    [0.82, 0.2],
    [0.62, 0.14],
    [0.5, 0.28],
    [0.38, 0.14],
    [0.18, 0.2],
    [0.05, 0.45],
  ]);
}

function renderFinderOuterModule(x: number, y: number, size: number, fill: string, borderStyle: FinderBorderStyle) {
  if (borderStyle === "dot") {
    return buildRect(x, y, size, fill, size / 2);
  }

  if (borderStyle === "rounded") {
    return buildRect(x, y, size, fill, size * 0.28);
  }

  if (borderStyle === "thick") {
    return buildRect(x, y, size, fill, size * 0.12);
  }

  return buildRect(x, y, size, fill);
}

function renderFinderCenterModule(x: number, y: number, size: number, fill: string, centerStyle: FinderCenterStyle) {
  if (centerStyle === "diamond") {
    return buildDiamond(x, y, size, fill);
  }

  if (centerStyle === "star") {
    return buildStar(x, y, size, fill);
  }

  if (centerStyle === "dot") {
    return buildRect(x, y, size, fill, size / 2);
  }

  return buildRect(x, y, size, fill);
}

function renderDataModule(x: number, y: number, size: number, fill: string, style: DataModuleStyle, row: number, col: number) {
  if (style === "diamond") {
    return buildDiamond(x, y, size, fill);
  }

  if (style === "star") {
    return buildStar(x, y, size, fill);
  }

  if (style === "heart") {
    return buildHeart(x, y, size, fill);
  }

  if (style === "square") {
    return buildRect(x, y, size, fill);
  }

  if (style === "rounded") {
    return buildRect(x, y, size, fill, size * 0.24);
  }

  if (style === "classy") {
    return buildRect(x, y, size, fill, (row + col) % 2 === 0 ? size * 0.18 : size * 0.36);
  }

  if (style === "classy-rounded") {
    return buildRect(x, y, size, fill, (row + col) % 3 === 0 ? size * 0.5 : size * 0.3);
  }

  return buildRect(x, y, size, fill, size * 0.5);
}

function resolveLogoHref(design?: QRCodeItem["design"]) {
  if (!design || design.logoType === "none") {
    return null;
  }

  if (design.logoType === "whatsapp") {
    return PRESET_LOGO_DATA_URIS.whatsapp;
  }

  if (design.logoType === "link") {
    return PRESET_LOGO_DATA_URIS.link;
  }

  if (design.logoType === "email") {
    return PRESET_LOGO_DATA_URIS.email;
  }

  if (design.logoType === "location") {
    return PRESET_LOGO_DATA_URIS.location;
  }

  if (design.logoType === "scan") {
    return PRESET_LOGO_DATA_URIS.scan;
  }

  return design.logoUrl?.trim() || null;
}

function getLogoBoxSize(canvasSize: number, correctionLevel: NonNullable<QRCodeItem["design"]>["correctionLevel"]) {
  const sizeRatio =
    correctionLevel === "H" ? 0.19 : correctionLevel === "Q" ? 0.17 : correctionLevel === "M" ? 0.15 : 0.13;
  return Math.round(canvasSize * sizeRatio);
}

function buildLogoOverlay(params: {
  background: string;
  canvasSize: number;
  correctionLevel: NonNullable<QRCodeItem["design"]>["correctionLevel"];
  design?: QRCodeItem["design"];
}) {
  const logoHref = resolveLogoHref(params.design);
  if (!logoHref) {
    return { defs: "", overlay: "" };
  }

  const logoBoxSize = getLogoBoxSize(params.canvasSize, params.correctionLevel);
  const logoPadding = Math.round(logoBoxSize * 0.18);
  const logoSize = logoBoxSize - logoPadding * 2;
  const logoBoxX = Math.round((params.canvasSize - logoBoxSize) / 2);
  const logoBoxY = Math.round((params.canvasSize - logoBoxSize) / 2);
  const logoX = logoBoxX + logoPadding;
  const logoY = logoBoxY + logoPadding;
  const boxRadius = Math.round(logoBoxSize * 0.26);
  const logoRadius = Math.round(logoSize * 0.22);
  const clipId = "qr-logo-clip";

  return {
    defs: `<clipPath id="${clipId}"><rect x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" rx="${logoRadius}" /></clipPath>`,
    overlay: `<g aria-hidden="true"><rect x="${logoBoxX}" y="${logoBoxY}" width="${logoBoxSize}" height="${logoBoxSize}" rx="${boxRadius}" fill="${params.background}" /><image href="${escapeXml(logoHref)}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${clipId})" /></g>`,
  };
}

export function buildQrDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildQrSvgFromContent(params: {
  content: string;
  design?: QRCodeItem["design"];
  name: string;
}) {
  const content = params.content.trim();
  if (!content) {
    throw new Error("QR content is required.");
  }

  const correctionLevel = normalizeCorrectionLevel(params.design?.correctionLevel);
  const qr = QRCode.create(content, { errorCorrectionLevel: correctionLevel });
  const { background, foreground } = resolveSafeColors(params.design);
  const dataStyle = normalizeDataModuleStyle(params.design?.qrStyle);
  const finderBorderStyle = normalizeFinderBorderStyle(params.design?.cornerBorderStyle);
  const finderCenterStyle = normalizeFinderCenterStyle(params.design?.cornerCenterStyle);
  const size = qr.modules.size;
  const canvasSize = (size + QUIET_ZONE_MODULES * 2) * MODULE_SIZE;
  const offset = QUIET_ZONE_MODULES * MODULE_SIZE;
  const { defs: logoDefs, overlay: logoOverlay } = buildLogoOverlay({
    background,
    canvasSize,
    correctionLevel,
    design: params.design,
  });

  let modules = "";

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (qr.modules.get(row, col) !== 1) {
        continue;
      }

      const x = offset + col * MODULE_SIZE;
      const y = offset + row * MODULE_SIZE;
      const finderType = getFinderCellType(row, col, size);

      if (finderType === "outer") {
        modules += renderFinderOuterModule(x, y, MODULE_SIZE, foreground, finderBorderStyle);
        continue;
      }

      if (finderType === "center") {
        modules += renderFinderCenterModule(x, y, MODULE_SIZE, foreground, finderCenterStyle);
        continue;
      }

      if (qr.modules.isReserved(row, col)) {
        modules += buildRect(x, y, MODULE_SIZE, foreground);
        continue;
      }

      modules += renderDataModule(x, y, MODULE_SIZE, foreground, dataStyle, row, col);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" role="img" aria-label="${escapeXml(params.name)}">\n  ${logoDefs ? `<defs>${logoDefs}</defs>` : ""}\n  <rect width="${canvasSize}" height="${canvasSize}" rx="${MODULE_SIZE * 1.8}" fill="${background}" />\n  ${modules}\n  ${logoOverlay}\n</svg>`;
}

export function buildQrSvg(item: QRCodeItem, urlOverride?: string) {
  return buildQrSvgFromContent({
    content: urlOverride?.trim() || getEntryUrl(item),
    design: item.design,
    name: item.name,
  });
}

async function renderSvgToRaster(svg: string, size: number, mimeType: "image/png" | "image/jpeg") {
  const svgDataUri = buildQrDataUri(svg);
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to render QR SVG to ${mimeType}.`));
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
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), mimeType, mimeType === "image/jpeg" ? 0.96 : undefined);
  });

  if (!blob) {
    throw new Error(`Failed to export ${mimeType} file.`);
  }

  return blob;
}

export async function downloadQrAssetBundle(item: QRCodeItem, urlOverride?: string, svgOverride?: string | null) {
  const fileBase = `${sanitizeQrFileName(item.name)}-qr`;
  const qrSvg = svgOverride?.trim() || buildQrSvg(item, urlOverride);
  const svgBlob = new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" });
  const [pngBlob, jpgBlob] = await Promise.all([
    renderSvgToRaster(qrSvg, 1000, "image/png"),
    renderSvgToRaster(qrSvg, 1000, "image/jpeg"),
  ]);

  const zip = new JSZip();
  zip.file(`${fileBase}.svg`, svgBlob);
  zip.file(`${fileBase}-1000x1000.png`, pngBlob);
  zip.file(`${fileBase}-1000x1000.jpg`, jpgBlob);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `${fileBase}.zip`);
}
