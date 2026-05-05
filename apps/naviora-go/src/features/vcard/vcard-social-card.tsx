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
        style={{
          display: "inline-flex",
          height: "48px",
          width: "48px",
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "16px",
          background: brand.badgeBackground,
          boxShadow: `inset 0 0 0 1px ${brand.badgeBorderColor}`,
          color: brand.badgeColor,
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
        <div style={{ fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8" }}>{label}</div>
        <div style={{ marginTop: "8px", overflowWrap: "anywhere", fontSize: "16px", fontWeight: 600, color: "#0f172a" }}>{displayValue}</div>
      </div>
      {isCopyOnly ? (
        <div
          style={{
            display: "inline-flex",
            flexShrink: 0,
            alignItems: "center",
            gap: "4px",
            borderRadius: "999px",
            border: "1px solid rgba(190,206,226,0.72)",
            background: "#fff",
            padding: "6px 12px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#475569",
            boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? copyLabels.copied : copyLabels.idle}</span>
        </div>
      ) : (
        <div
          style={{
            display: "inline-flex",
            height: "40px",
            width: "40px",
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            border: "1px solid rgba(190,206,226,0.72)",
            background: "#fff",
            color: "#64748b",
            boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
          }}
        >
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
        aria-label={copyLabels.idle}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "flex-start",
          gap: "16px",
          borderRadius: "28px",
          border: "1px solid rgba(190,206,226,0.55)",
          background: "rgba(255,255,255,0.94)",
          padding: "20px",
          boxShadow: "0 18px 44px rgba(15,23,42,0.06)",
          textAlign: "left",
          cursor: "pointer",
        }}
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
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "16px",
        borderRadius: "28px",
        border: "1px solid rgba(190,206,226,0.55)",
        background: "rgba(255,255,255,0.94)",
        padding: "20px",
        boxShadow: "0 18px 44px rgba(15,23,42,0.06)",
        textDecoration: "none",
      }}
    >
      {cardInner}
    </a>
  );
}
