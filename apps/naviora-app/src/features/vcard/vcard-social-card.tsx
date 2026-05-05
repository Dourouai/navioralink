"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import type { Locale } from "@/i18n/config";
import type { VCardSocialPlatform } from "@/types/qr";

import { getVCardSocialBrandAppearance } from "./vcard-social-brand";

interface VCardSocialCardProps {
  displayValue: string;
  href: string | null;
  label: string;
  locale: Locale;
  platform: VCardSocialPlatform;
  value: string;
}

function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  if (typeof document === "undefined") {
    return Promise.reject(new Error("Clipboard unavailable"));
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "absolute";
  input.style.left = "-9999px";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
  return Promise.resolve();
}

function getCopyLabels(locale: Locale) {
  if (locale === "zh-Hant") {
    return {
      copied: "Account ID 已複製",
      idle: "點擊複製 Account ID",
    };
  }

  if (locale === "zh-Hans") {
    return {
      copied: "Account ID 已复制",
      idle: "点击复制 Account ID",
    };
  }

  return {
    copied: "Account ID copied",
    idle: "Click to copy Account ID",
  };
}

export function VCardSocialCard({ displayValue, href, label, locale, platform, value }: VCardSocialCardProps) {
  const brand = getVCardSocialBrandAppearance(platform);
  const Icon = brand.icon;
  const isCopyOnly = platform === "wechat" || platform === "wechatofficial" || !href;
  const [copied, setCopied] = useState(false);
  const copyLabels = getCopyLabels(locale);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  const cardInner = (
    <>
      <div
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]"
        style={{
          background: brand.badgeBackground,
          boxShadow: `inset 0 0 0 1px ${brand.badgeBorderColor}`,
          color: brand.badgeColor,
        }}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</div>
        <div className="mt-2 break-words text-base font-medium text-slate-900">{displayValue}</div>
      </div>
      {isCopyOnly ? (
        <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgba(190,206,226,0.72)] bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? copyLabels.copied : copyLabels.idle}</span>
        </div>
      ) : (
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(190,206,226,0.72)] bg-white text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
          <ExternalLink size={15} />
        </div>
      )}
    </>
  );

  if (isCopyOnly) {
    return (
      <button
        type="button"
        onClick={() => {
          void copyText(value.trim()).then(() => {
            setCopied(true);
          });
        }}
        className="flex w-full items-start gap-4 rounded-[28px] border border-[rgba(190,206,226,0.55)] bg-white/94 px-5 py-5 text-left shadow-[0_18px_44px_rgba(15,23,42,0.06)] transition hover:border-[rgba(148,77,169,0.24)] hover:translate-y-[-1px] sm:px-6"
        aria-label={copyLabels.idle}
      >
        {cardInner}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex items-start gap-4 rounded-[28px] border border-[rgba(190,206,226,0.55)] bg-white/94 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] transition hover:border-[rgba(148,77,169,0.24)] hover:translate-y-[-1px] sm:px-6"
    >
      {cardInner}
    </a>
  );
}
