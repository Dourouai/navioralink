"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import type { Locale } from "@/i18n/config";

interface VCardCopyButtonProps {
  value: string;
  locale: Locale;
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

export function VCardCopyButton({ value, locale }: VCardCopyButtonProps) {
  const [copied, setCopied] = useState(false);

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

  const label =
    locale === "zh-Hant"
      ? copied
        ? "已複製"
        : "複製"
      : locale === "zh-Hans"
        ? copied
          ? "已复制"
          : "复制"
        : copied
          ? "Copied"
          : "Copy";

  return (
    <button
      type="button"
      onClick={() => {
        void copyText(value.trim()).then(() => {
          setCopied(true);
        });
      }}
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[rgba(190,206,226,0.72)] bg-white px-3 text-xs font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:border-[rgba(148,77,169,0.24)] hover:text-slate-900"
      aria-label={label}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{label}</span>
    </button>
  );
}
