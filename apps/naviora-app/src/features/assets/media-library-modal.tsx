"use client";

import { X } from "lucide-react";

import type { Locale } from "@/i18n/config";
import type { ManagedAssetRecord } from "@/lib/managed-assets";

import { MediaLibraryPanel } from "./media-library-panel";

interface MediaLibraryModalProps {
  open: boolean;
  locale: Locale;
  title: string;
  description: string;
  acceptKind?: "all" | "image";
  selectionMode?: "manage" | "avatar" | "logo";
  helperText?: string | null;
  onClose: () => void;
  onSelectAsset?: (asset: ManagedAssetRecord) => Promise<void> | void;
}

export function MediaLibraryModal({
  open,
  locale,
  title,
  description,
  acceptKind = "all",
  selectionMode = "manage",
  helperText,
  onClose,
  onSelectAsset,
}: MediaLibraryModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(15,23,42,0.44)] px-4 py-6 backdrop-blur-sm">
      <div className="relative flex max-h-[88vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.96))] shadow-[0_30px_80px_rgba(15,23,42,0.24)] ring-1 ring-[rgba(187,203,225,0.55)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={locale === "zh-Hant" ? "關閉媒體庫" : locale === "zh-Hans" ? "关闭媒体库" : "Close media library"}
        >
          <X size={18} />
        </button>

        <div className="border-b border-slate-100 px-6 pb-5 pt-6">
          <h3 className="pr-10 text-xl font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <MediaLibraryPanel
            locale={locale}
            acceptKind={acceptKind}
            selectionMode={selectionMode}
            helperText={helperText}
            onSelectAsset={onSelectAsset}
          />
        </div>
      </div>
    </div>
  );
}
