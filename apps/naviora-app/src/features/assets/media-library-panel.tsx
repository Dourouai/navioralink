"use client";

import Image from "next/image";
import { Check, FileText, LayoutGrid, List, Loader2, Pencil, Search, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";
import { listManagedAssets, renameManagedAsset, uploadManagedAsset } from "@/lib/assets-client";
import {
  isManagedAssetImageMimeType,
  isManagedAssetPdfMimeType,
  MANAGED_IMAGE_MIME_TYPES,
  MANAGED_MEDIA_ALLOWED_MIME_TYPES,
  type ManagedAssetRecord,
} from "@/lib/managed-assets";
import { formatAssetSize } from "@/lib/vcard";

type AssetAcceptKind = "all" | "image";
type AssetSelectionMode = "manage" | "avatar" | "logo";
type AssetViewMode = "grid" | "list";

interface MediaLibraryPanelProps {
  locale: Locale;
  initialAssets?: ManagedAssetRecord[];
  acceptKind?: AssetAcceptKind;
  selectionMode?: AssetSelectionMode;
  onSelectAsset?: (asset: ManagedAssetRecord) => Promise<void> | void;
  helperText?: string | null;
}

function buildAcceptAttribute(acceptKind: AssetAcceptKind) {
  if (acceptKind === "image") {
    return ".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp";
  }

  return ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/jpg,image/png,image/webp,application/pdf";
}

function getSelectionLabel(locale: Locale, selectionMode: AssetSelectionMode) {
  if (selectionMode === "avatar") {
    if (locale === "zh-Hant") return "設為頭像";
    if (locale === "zh-Hans") return "设为头像";
    return "Use as avatar";
  }

  if (selectionMode === "logo") {
    if (locale === "zh-Hant") return "設為 Logo";
    if (locale === "zh-Hans") return "设为 Logo";
    return "Use as logo";
  }

  if (locale === "zh-Hant") return "選擇檔案";
  if (locale === "zh-Hans") return "选择文件";
  return "Choose file";
}

function getUploadTitle(locale: Locale, acceptKind: AssetAcceptKind) {
  if (acceptKind === "image") {
    if (locale === "zh-Hant") return "上傳圖片";
    if (locale === "zh-Hans") return "上传图片";
    return "Upload image";
  }

  if (locale === "zh-Hant") return "上傳圖片或 PDF";
  if (locale === "zh-Hans") return "上传图片或 PDF";
  return "Upload image or PDF";
}

function getUploadHint(locale: Locale, acceptKind: AssetAcceptKind) {
  if (acceptKind === "image") {
    if (locale === "zh-Hant") return "這裡只接受圖片，適合頭像與 Logo。";
    if (locale === "zh-Hans") return "这里仅接受图片，适合头像与 Logo。";
    return "This picker only accepts images for avatars and logos.";
  }

  if (locale === "zh-Hant") return "目前先支援 JPG、PNG、WEBP 與 PDF。";
  if (locale === "zh-Hans") return "当前先支持 JPG、PNG、WEBP 与 PDF。";
  return "For now this library supports JPG, PNG, WEBP, and PDF.";
}

function getUploadError(locale: Locale, acceptKind: AssetAcceptKind) {
  if (acceptKind === "image") {
    if (locale === "zh-Hant") return "目前這裡只能上傳圖片檔。";
    if (locale === "zh-Hans") return "这里目前只能上传图片文件。";
    return "Only image files are supported here right now.";
  }

  if (locale === "zh-Hant") return "目前只支援圖片與 PDF。";
  if (locale === "zh-Hans") return "当前仅支持图片与 PDF。";
  return "Only image files and PDF are supported right now.";
}

function getEmptyState(locale: Locale, acceptKind: AssetAcceptKind) {
  if (acceptKind === "image") {
    if (locale === "zh-Hant") return "還沒有可用圖片，先上傳一張頭像或品牌圖吧。";
    if (locale === "zh-Hans") return "还没有可用图片，先上传一张头像或品牌图吧。";
    return "No images yet. Start by uploading an avatar or brand visual.";
  }

  if (locale === "zh-Hant") return "還沒有任何媒體檔案，先上傳圖片或 PDF 吧。";
  if (locale === "zh-Hans") return "还没有任何媒体文件，先上传图片或 PDF 吧。";
  return "No media files yet. Upload an image or PDF to get started.";
}

function getNoResultsState(locale: Locale) {
  if (locale === "zh-Hant") return "沒有符合這個檔名的結果。";
  if (locale === "zh-Hans") return "没有符合这个文件名的结果。";
  return "No files match that name.";
}

function getSearchPlaceholder(locale: Locale) {
  if (locale === "zh-Hant") return "搜尋檔名";
  if (locale === "zh-Hans") return "搜索文件名";
  return "Search files by name";
}

function getTypeBadge(locale: Locale, asset: ManagedAssetRecord) {
  if (isManagedAssetPdfMimeType(asset.mimeType)) {
    return "PDF";
  }

  if (locale === "zh-Hant") return "圖片";
  if (locale === "zh-Hans") return "图片";
  return "Image";
}

function formatCreatedAt(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "zh-Hant" ? "zh-TW" : "zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDisplayFileName(name: string, maxLength = 28) {
  if (name.length <= maxLength) {
    return name;
  }

  const extensionIndex = name.lastIndexOf(".");
  const hasExtension = extensionIndex > 0 && extensionIndex < name.length - 1;
  const extension = hasExtension ? name.slice(extensionIndex) : "";
  const baseName = hasExtension ? name.slice(0, extensionIndex) : name;
  const reservedLength = extension.length + 3;
  const visibleBaseLength = Math.max(8, maxLength - reservedLength);

  return `${baseName.slice(0, visibleBaseLength)}...${extension}`;
}

export function MediaLibraryPanel({
  locale,
  initialAssets,
  acceptKind = "all",
  selectionMode = "manage",
  onSelectAsset,
  helperText,
}: MediaLibraryPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<ManagedAssetRecord[]>(initialAssets ?? []);
  const [loading, setLoading] = useState(initialAssets === undefined);
  const [uploading, setUploading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectingAssetId, setSelectingAssetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<AssetViewMode>(selectionMode === "manage" ? "grid" : "list");
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, setRenamePending] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAssets !== undefined) {
      setAssets(initialAssets);
      setLoading(false);
    }
  }, [initialAssets]);

  useEffect(() => {
    if (initialAssets !== undefined) {
      return;
    }

    let active = true;

    async function loadAssets() {
      try {
        const response = await listManagedAssets();
        if (!active) return;
        setAssets(response.assets);
        setLoadingError(null);
      } catch (error) {
        if (!active) return;
        setLoadingError(error instanceof Error ? error.message : "Failed to load files.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      active = false;
    };
  }, [initialAssets]);

  const visibleAssets = useMemo(() => {
    const scopeFiltered = acceptKind === "image" ? assets.filter((asset) => isManagedAssetImageMimeType(asset.mimeType)) : assets;
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return scopeFiltered;
    }

    return scopeFiltered.filter((asset) => asset.name.toLowerCase().includes(normalizedQuery));
  }, [acceptKind, assets, searchQuery]);

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const allowedMimeTypes = acceptKind === "image" ? MANAGED_IMAGE_MIME_TYPES : MANAGED_MEDIA_ALLOWED_MIME_TYPES;
    if (!allowedMimeTypes.has(file.type)) {
      setUploadError(getUploadError(locale, acceptKind));
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      const asset = await uploadManagedAsset({
        file,
        scope: "media",
      });

      setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);

      if (onSelectAsset && acceptKind === "image" && isManagedAssetImageMimeType(asset.mimeType)) {
        setSelectingAssetId(asset.id);
        await onSelectAsset(asset);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Failed to upload the file.");
    } finally {
      setUploading(false);
      setSelectingAssetId(null);
    }
  }

  async function handleSelect(asset: ManagedAssetRecord) {
    if (!onSelectAsset) {
      return;
    }

    try {
      setSelectingAssetId(asset.id);
      await onSelectAsset(asset);
    } finally {
      setSelectingAssetId(null);
    }
  }

  function startRename(asset: ManagedAssetRecord) {
    setEditingAssetId(asset.id);
    setRenameValue(asset.name);
    setRenameError(null);
  }

  function cancelRename() {
    setEditingAssetId(null);
    setRenameValue("");
    setRenameError(null);
  }

  async function submitRename(asset: ManagedAssetRecord) {
    const nextName = renameValue.trim();
    if (!nextName) {
      setRenameError(locale === "zh-Hant" ? "請先輸入顯示名稱。" : locale === "zh-Hans" ? "请先输入显示名称。" : "Please enter a display name.");
      return;
    }

    if (nextName === asset.name) {
      cancelRename();
      return;
    }

    try {
      setRenamePending(true);
      setRenameError(null);
      const response = await renameManagedAsset(asset.id, nextName);
      setAssets((current) => current.map((item) => (item.id === asset.id ? response.asset : item)));
      cancelRename();
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : "Failed to rename the file.");
    } finally {
      setRenamePending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-[rgba(190,206,226,0.5)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,250,255,0.92))] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <input ref={inputRef} type="file" accept={buildAcceptAttribute(acceptKind)} className="hidden" disabled={uploading || Boolean(selectingAssetId)} onChange={handleUploadChange} />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">{getUploadTitle(locale, acceptKind)}</div>
            <div className="mt-1 text-sm leading-6 text-slate-500">{getUploadHint(locale, acceptKind)}</div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-11 rounded-[16px] px-5"
            icon={uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            disabled={uploading || Boolean(selectingAssetId)}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (locale === "zh-Hant" ? "上傳中" : locale === "zh-Hans" ? "上传中" : "Uploading") : getUploadTitle(locale, acceptKind)}
          </Button>
        </div>
        {uploadError ? <div className="mt-3 text-sm text-rose-600">{uploadError}</div> : null}
        {helperText ? <div className="mt-3 text-xs leading-5 text-slate-500">{helperText}</div> : null}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:max-w-[360px]">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={getSearchPlaceholder(locale)}
            className="h-11 rounded-[16px] pl-11"
          />
          <Search size={16} className="pointer-events-none relative -mt-[30px] ml-4 block text-slate-400" />
        </div>

        <div className="inline-flex items-center rounded-[16px] border border-[rgba(190,206,226,0.55)] bg-white/92 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`inline-flex h-10 items-center gap-2 rounded-[12px] px-4 text-sm font-medium transition ${
              viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <List size={15} />
            {locale === "zh-Hant" ? "列表" : locale === "zh-Hans" ? "列表" : "List"}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`inline-flex h-10 items-center gap-2 rounded-[12px] px-4 text-sm font-medium transition ${
              viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <LayoutGrid size={15} />
            {locale === "zh-Hant" ? "網格" : locale === "zh-Hans" ? "网格" : "Grid"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white/75 text-sm text-slate-500">
          <Loader2 size={16} className="mr-2 animate-spin" />
          {locale === "zh-Hant" ? "正在載入檔案…" : locale === "zh-Hans" ? "正在加载文件…" : "Loading files..."}
        </div>
      ) : loadingError ? (
        <div className="rounded-[24px] border border-rose-100 bg-rose-50/80 px-4 py-4 text-sm text-rose-600">{loadingError}</div>
      ) : visibleAssets.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/78 px-5 py-12 text-center text-sm leading-6 text-slate-500">
          {searchQuery.trim() ? getNoResultsState(locale) : getEmptyState(locale, acceptKind)}
        </div>
      ) : (
        <div className={viewMode === "list" ? "space-y-3" : "grid gap-3 md:grid-cols-2 2xl:grid-cols-3"}>
          {visibleAssets.map((asset) => {
            const isImage = isManagedAssetImageMimeType(asset.mimeType);
            const selecting = selectingAssetId === asset.id;

            if (viewMode === "list") {
              return (
                <div
                  key={asset.id}
                  className="flex flex-col gap-3 rounded-[20px] border border-[rgba(190,206,226,0.48)] bg-white px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] md:flex-row md:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,rgba(239,248,255,0.96),rgba(245,243,255,0.96))] ring-1 ring-[rgba(190,206,226,0.42)]">
                      {isImage && asset.url ? (
                        <Image src={asset.url} alt={asset.name} fill sizes="58px" className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white text-rose-500 shadow-[0_8px_20px_rgba(15,23,42,0.08)] ring-1 ring-white/80">
                            <FileText size={18} />
                          </div>
                        </div>
                      )}
                    </div>

                  <div className="min-w-0 flex-1">
                      {selectionMode === "manage" && editingAssetId === asset.id ? (
                        <div className="space-y-2">
                          <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="h-10 rounded-[12px] px-3 py-2" />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => submitRename(asset)}
                              disabled={renamePending}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-60"
                            >
                              {renamePending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button
                              type="button"
                              onClick={cancelRename}
                              disabled={renamePending}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          {renameError ? <div className="text-xs text-rose-600">{renameError}</div> : null}
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div title={asset.name} className="min-w-0 truncate text-sm font-semibold text-slate-900">
                            {formatDisplayFileName(asset.name, 30)}
                          </div>
                          {selectionMode === "manage" ? (
                            <button
                              type="button"
                              onClick={() => startRename(asset)}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                              aria-label={locale === "zh-Hant" ? "重新命名檔案" : locale === "zh-Hans" ? "重命名文件" : "Rename file"}
                            >
                              <Pencil size={13} />
                            </button>
                          ) : null}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{getTypeBadge(locale, asset)}</span>
                        <span>{formatAssetSize(asset.size)}</span>
                        <span>{formatCreatedAt(asset.createdAt, locale)}</span>
                      </div>
                    </div>
                  </div>

                  {onSelectAsset ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-10 shrink-0 rounded-[14px] px-4 md:min-w-[140px]"
                      onClick={() => handleSelect(asset)}
                      disabled={Boolean(selectingAssetId)}
                    >
                      {selecting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {locale === "zh-Hant" ? "處理中…" : locale === "zh-Hans" ? "处理中…" : "Working..."}
                        </>
                      ) : (
                        getSelectionLabel(locale, selectionMode)
                      )}
                    </Button>
                  ) : null}
                </div>
              );
            }

            return (
              <div
                key={asset.id}
                className="rounded-[20px] border border-[rgba(190,206,226,0.48)] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,rgba(239,248,255,0.96),rgba(245,243,255,0.96))] ring-1 ring-[rgba(190,206,226,0.42)]">
                    {isImage && asset.url ? (
                      <Image src={asset.url} alt={asset.name} fill sizes="72px" className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-rose-500 shadow-[0_8px_20px_rgba(15,23,42,0.08)] ring-1 ring-white/80">
                          <FileText size={19} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-slate-100/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        {getTypeBadge(locale, asset)}
                      </div>
                    </div>

                    {selectionMode === "manage" && editingAssetId === asset.id ? (
                      <div className="mt-2 space-y-2">
                        <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="h-10 rounded-[12px] px-3 py-2" />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => submitRename(asset)}
                            disabled={renamePending}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-60"
                          >
                            {renamePending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={cancelRename}
                            disabled={renamePending}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {renameError ? <div className="text-xs text-rose-600">{renameError}</div> : null}
                      </div>
                    ) : (
                      <div className="mt-2 flex items-start justify-between gap-2">
                        <div title={asset.name} className="min-w-0 truncate text-sm font-semibold text-slate-900">
                          {formatDisplayFileName(asset.name, 26)}
                        </div>
                        {selectionMode === "manage" ? (
                          <button
                            type="button"
                            onClick={() => startRename(asset)}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                            aria-label={locale === "zh-Hant" ? "重新命名檔案" : locale === "zh-Hans" ? "重命名文件" : "Rename file"}
                          >
                            <Pencil size={13} />
                          </button>
                        ) : null}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{formatAssetSize(asset.size)}</span>
                      <span>{formatCreatedAt(asset.createdAt, locale)}</span>
                    </div>

                    {onSelectAsset ? (
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-10 rounded-[14px] px-4"
                          onClick={() => handleSelect(asset)}
                          disabled={Boolean(selectingAssetId)}
                        >
                          {selecting ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              {locale === "zh-Hant" ? "處理中…" : locale === "zh-Hans" ? "处理中…" : "Working..."}
                            </>
                          ) : (
                            getSelectionLabel(locale, selectionMode)
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
