"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, BarChart3, Clock3, Copy, CopyPlus, Download, EllipsisVertical, Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { getEntryUrl } from "@/lib/entry-url";
import { duplicateEntry as duplicateEntryInDb, archiveEntry as archiveEntryInDb, deleteEntry as deleteEntryInDb, restoreEntry as restoreEntryInDb } from "@/lib/supabase/entries-browser";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { useQrListStore } from "@/store/qr-list-store";
import { formatDate, formatNumber } from "@/lib/utils";
import type { QRCodeItem, QRStatus } from "@/types/qr";

interface QrListClientProps {
  locale: Locale;
  initialItems: QRCodeItem[];
  archiveOnly?: boolean;
}

interface OpenMenuState {
  id: string;
  top: number;
  left: number;
  openUp: boolean;
}

function getStatusClassName(status: QRStatus) {
  if (status === "active") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  if (status === "draft") return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  if (status === "paused") return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  if (status === "expired") return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
  return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
}

export function QrListClient({ locale, initialItems, archiveOnly = false }: QrListClientProps) {
  const t = getMessages(locale);
  const router = useRouter();
  const items = useQrListStore((state) => (state.initialized ? state.items : initialItems));
  const initialize = useQrListStore((state) => state.initialize);
  const archiveStoredItem = useQrListStore((state) => state.archiveItem);
  const restoreStoredItem = useQrListStore((state) => state.restoreItem);
  const deleteStoredItem = useQrListStore((state) => state.deleteItem);
  const addStoredItem = useQrListStore((state) => state.addItem);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | QRStatus>("all");
  const [openMenu, setOpenMenu] = useState<OpenMenuState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QRCodeItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement | null>(null);
  const openMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const duplicateSeedRef = useRef(1);
  const ruleModeLabel =
    locale === "zh-Hant"
      ? { none: "無規則", language: "語言模式", region: "國家或地區模式", device: "設備系統模式", param: "參數模式", ab: "A/B Test" }
      : locale === "zh-Hans"
        ? { none: "无规则", language: "语言模式", region: "国家或地区模式", device: "设备系统模式", param: "参数模式", ab: "A/B Test" }
        : { none: "No rule", language: "Language", region: "Region", device: "Device OS", param: "Param", ab: "A/B Test" };
  const archivedCount = items.filter((item) => item.status === "archived").length;
  const statusLabelMap: Record<QRStatus, string> = {
    active: t.common.active,
    draft: t.common.draft,
    paused: t.common.paused,
    expired: t.common.expired,
    archived: t.common.archived,
  };

  useEffect(() => {
    initialize(initialItems);
  }, [initialize, initialItems]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesArchiveState = archiveOnly ? item.status === "archived" : item.status !== "archived";
      const matchesQuery = query
        ? `${item.name} ${item.defaultUrl} ${getEntryUrl(item)}`.toLowerCase().includes(query.toLowerCase())
        : true;
      const matchesStatus = archiveOnly ? true : status === "all" ? true : item.status === status;
      return matchesArchiveState && matchesQuery && matchesStatus;
    });
  }, [archiveOnly, items, query, status]);

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 1800);
  }

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (openMenuRef.current?.contains(target) || openMenuButtonRef.current?.contains(target)) {
        return;
      }

      setOpenMenu(null);
    }

    function closeFloatingMenu() {
      setOpenMenu(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", closeFloatingMenu);
    window.addEventListener("scroll", closeFloatingMenu, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", closeFloatingMenu);
      window.removeEventListener("scroll", closeFloatingMenu, true);
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  function sanitizeFileName(raw: string) {
    const safe = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return safe || "qr";
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
        const shouldFill = isFinder(x, y) ? finderRect(x, y) : ((x * 17 + y * 31 + seed) % 7 < 3);
        if (!shouldFill) continue;
        rects += `<rect x="${padding + x * cell}" y="${padding + y * cell}" width="${cell - 1}" height="${cell - 1}" rx="2" fill="${foreground}" />`;
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" role="img" aria-label="${item.name}">
  <rect width="${canvasSize}" height="${canvasSize}" rx="36" fill="${background}" />
  ${rects}
</svg>`;
  }

  function downloadItem(item: QRCodeItem) {
    const blob = new Blob([buildQrSvg(item)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sanitizeFileName(item.name)}-qr.svg`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setOpenMenu(null);
    showNotice(locale === "zh-Hant" ? "已開始下載二維碼。" : "QR code download started.");
  }

  async function copyUrl(item: QRCodeItem) {
    const entryUrl = getEntryUrl(item);

    try {
      await navigator.clipboard.writeText(entryUrl);
      showNotice(locale === "zh-Hant" ? "已複製網址。" : "URL copied.");
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
      showNotice(locale === "zh-Hant" ? "已複製網址。" : "URL copied.");
    }
  }

  function editItem(item: QRCodeItem) {
    setOpenMenu(null);
    router.push(withLocale(locale, `/qrs/new?edit=${encodeURIComponent(item.id)}`));
  }

  function viewAnalytics(item: QRCodeItem) {
    setOpenMenu(null);
    router.push(withLocale(locale, `/qrs/${encodeURIComponent(item.id)}/analytics`));
  }

  function viewVisitLog(item: QRCodeItem) {
    setOpenMenu(null);
    router.push(withLocale(locale, `/qrs/${encodeURIComponent(item.id)}/visits`));
  }

  function viewDetails(item: QRCodeItem) {
    setOpenMenu(null);
    router.push(withLocale(locale, `/qrs/${encodeURIComponent(item.id)}`));
  }

  async function duplicateItem(item: QRCodeItem) {
    try {
      if (hasSupabaseEnv()) {
        const duplicated = await duplicateEntryInDb(item);
        if (duplicated) {
          addStoredItem(duplicated);
        }
      } else {
        const now = new Date().toISOString();
        const duplicateId = `${item.id}_copy_${duplicateSeedRef.current}`;
        duplicateSeedRef.current += 1;
        const duplicated: QRCodeItem = {
          ...item,
          id: duplicateId,
          name: locale === "zh-Hant" ? `${item.name}（副本）` : locale === "zh-Hans" ? `${item.name}（副本）` : `${item.name} (Copy)`,
          status: "draft",
          scans: 0,
          createdAt: now,
          updatedAt: now,
          languageRules: item.languageRules?.map((rule) => ({ ...rule })),
          regionRules: item.regionRules?.map((rule) => ({ ...rule })),
          deviceRules: item.deviceRules?.map((rule) => ({ ...rule })),
          paramRules: item.paramRules?.map((rule) => ({ ...rule })),
          abRules: item.abRules?.map((rule) => ({ ...rule })),
          tracking: item.tracking ? { ...item.tracking } : undefined,
          design: item.design ? { ...item.design } : undefined,
        };
        addStoredItem(duplicated);
      }

      setOpenMenu(null);
      showNotice(locale === "zh-Hant" ? "已建立副本。" : locale === "zh-Hans" ? "已创建副本。" : "Duplicate created.");
    } catch (error) {
      setOpenMenu(null);
      showNotice(error instanceof Error ? error.message : locale === "zh-Hant" ? "建立副本失敗。" : locale === "zh-Hans" ? "创建副本失败。" : "Failed to duplicate entry.");
    }
  }

  async function archiveItem(id: string) {
    try {
      if (hasSupabaseEnv()) {
        await archiveEntryInDb(id);
      }

      archiveStoredItem(id);
      setOpenMenu(null);
      showNotice(t.qrs.archiveNotice);
    } catch (error) {
      setOpenMenu(null);
      showNotice(error instanceof Error ? error.message : locale === "zh-Hant" ? "歸檔失敗。" : locale === "zh-Hans" ? "归档失败。" : "Failed to archive entry.");
    }
  }

  async function restoreItem(id: string) {
    try {
      if (hasSupabaseEnv()) {
        await restoreEntryInDb(id);
      }

      restoreStoredItem(id);
      setOpenMenu(null);
      showNotice(t.qrs.restoreNotice);
    } catch (error) {
      setOpenMenu(null);
      showNotice(error instanceof Error ? error.message : locale === "zh-Hant" ? "恢復失敗。" : locale === "zh-Hans" ? "恢复失败。" : "Failed to restore entry.");
    }
  }

  function requestDelete(item: QRCodeItem) {
    setOpenMenu(null);
    setDeleteTarget(item);
  }

  function closeDeleteDialog() {
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      if (hasSupabaseEnv()) {
        await deleteEntryInDb(deleteTarget.id);
      }

      deleteStoredItem(deleteTarget.id);
      showNotice(t.qrs.deleteNotice);
      setDeleteTarget(null);
    } catch (error) {
      setDeleteTarget(null);
      showNotice(error instanceof Error ? error.message : locale === "zh-Hant" ? "刪除失敗。" : locale === "zh-Hans" ? "删除失败。" : "Failed to delete entry.");
    }
  }

  function toggleActionMenu(itemId: string, button: HTMLButtonElement) {
    if (openMenu?.id === itemId) {
      setOpenMenu(null);
      return;
    }

    const rect = button.getBoundingClientRect();
    const menuHeight = 228;
    const openUp = window.innerHeight - rect.bottom < menuHeight + 20 && rect.top > menuHeight + 20;

    openMenuButtonRef.current = button;
    setOpenMenu({
      id: itemId,
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: rect.right,
      openUp,
    });
  }

  return (
    <Card className="space-y-5">
      {notice ? (
        <div className="rounded-[16px] bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-100">
          {notice}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Input label={t.common.search} placeholder={t.qrs.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="flex flex-wrap items-end gap-2">
          {!archiveOnly
            ? (["all", "draft", "active", "paused", "expired"] as const).map((item) => (
                <Button
                  key={item}
                  variant={status === item ? "primary" : "secondary"}
                  className="mt-7"
                  onClick={() => setStatus(item)}
                >
                  {item === "all" ? t.common.all : t.common[item]}
                </Button>
              ))
            : (
              <div className="mt-7 inline-flex items-center rounded-full bg-[linear-gradient(135deg,rgba(99,188,248,0.14),rgba(141,121,255,0.12))] px-4 py-2 text-sm font-medium text-sky-700 ring-1 ring-[rgba(145,180,247,0.22)]">
                {`${t.qrs.archivedBadge} · ${archivedCount}`}
              </div>
            )}
        </div>
      </div>
      {filteredItems.length ? (
        <div className="overflow-hidden rounded-[22px] border border-slate-100">
          <div className="hidden grid-cols-[1.2fr_1.1fr_120px_120px_120px_120px_80px] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 lg:grid">
            <div>Name</div>
            <div>Default URL</div>
            <div>{t.common.type}</div>
            <div>{t.common.status}</div>
            <div>{t.common.scans}</div>
            <div>{t.common.updatedAt}</div>
            <div className="text-right">{t.common.actions}</div>
          </div>
          {filteredItems.map((item) => (
            <div key={item.id} className="grid gap-4 border-t border-slate-100 bg-white px-5 py-4 lg:grid-cols-[1.2fr_1.1fr_120px_120px_120px_120px_80px] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusClassName(item.status)} lg:hidden`}>
                    {statusLabelMap[item.status]}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{ruleModeLabel[item.ruleMode]}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="min-w-0 truncate text-sm text-slate-600">{getEntryUrl(item)}</div>
                <button
                  type="button"
                  onClick={() => copyUrl(item)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[rgba(190,206,226,0.6)] transition hover:bg-slate-50"
                  aria-label={t.common.copy}
                  title={t.common.copy}
                >
                  <Copy size={14} className="text-slate-500" />
                </button>
              </div>
                <div className="text-sm text-slate-600">{item.type.toUpperCase()}</div>
                <div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(item.status)}`}>
                    {statusLabelMap[item.status]}
                  </span>
                </div>
                <div className="text-sm text-slate-600">{formatNumber(item.scans)}</div>
                <div className="text-sm text-slate-600">{formatDate(item.updatedAt)}</div>
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={(event) => toggleActionMenu(item.id, event.currentTarget)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-[rgba(190,206,226,0.6)] transition hover:bg-slate-50"
                    aria-label={t.common.actions}
                  >
                    <EllipsisVertical size={16} className="text-slate-600" />
                  </button>

                  {openMenu?.id === item.id && typeof document !== "undefined"
                    ? createPortal(
                        <div
                          ref={openMenuRef}
                          style={{ top: openMenu.top, left: openMenu.left }}
                          className={`fixed z-[110] w-48 overflow-hidden rounded-[18px] bg-white py-1.5 shadow-[0_18px_36px_rgba(15,23,42,0.12)] ring-1 ring-[rgba(190,206,226,0.55)] ${openMenu.openUp ? "-translate-x-full -translate-y-full" : "-translate-x-full"}`}
                        >
                          <button
                            type="button"
                            onClick={() => viewDetails(item)}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye size={15} />
                            {locale === "zh-Hant" ? "查看詳情" : locale === "zh-Hans" ? "查看详情" : "View details"}
                          </button>
                          <button
                            type="button"
                            onClick={() => viewAnalytics(item)}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <BarChart3 size={15} />
                            {t.analytics.viewEntry}
                          </button>
                          <button
                            type="button"
                            onClick={() => viewVisitLog(item)}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <Clock3 size={15} />
                            {t.analytics.viewVisitLog}
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadItem(item)}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <Download size={15} />
                            {t.common.download}
                          </button>
                          <button
                            type="button"
                            onClick={() => editItem(item)}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <Pencil size={15} />
                            {t.common.edit}
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateItem(item)}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <CopyPlus size={15} />
                            {t.common.duplicate}
                          </button>
                          <button
                            type="button"
                            onClick={() => (item.status === "archived" ? restoreItem(item.id) : archiveItem(item.id))}
                            className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition ${
                              item.status === "archived" ? "text-sky-700 hover:bg-sky-50" : "text-amber-700 hover:bg-amber-50"
                            }`}
                          >
                            {item.status === "archived" ? <RotateCcw size={15} /> : <Archive size={15} />}
                            {item.status === "archived" ? t.qrs.restoreAction : t.qrs.archiveAction}
                          </button>
                          {archiveOnly ? (
                            <button
                              type="button"
                              onClick={() => requestDelete(item)}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
                            >
                              <Trash2 size={15} />
                              {t.qrs.deleteAction}
                            </button>
                          ) : null}
                        </div>,
                        document.body,
                      )
                    : null}
                </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={archiveOnly ? t.qrs.archiveEmptyTitle : t.qrs.emptyTitle}
          body={archiveOnly ? t.qrs.archiveEmptyBody : t.qrs.emptyBody}
          href={archiveOnly ? undefined : withLocale(locale, "/qrs/new")}
          actionLabel={archiveOnly ? undefined : t.nav.create}
        />
      )}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[rgba(15,23,42,0.44)] px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[480px] rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.96))] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.24)] ring-1 ring-[rgba(187,203,225,0.55)]">
            <div className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-rose-600">
              {t.qrs.deleteAction}
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-950">{t.qrs.deleteDialogTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t.qrs.deleteDialogBody} <span className="font-semibold text-slate-700">{deleteTarget.name}</span>
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" className="!bg-rose-500 !text-white hover:!bg-rose-600" onClick={confirmDelete}>
                {t.qrs.deleteConfirm}
              </Button>
              <Button type="button" variant="secondary" onClick={closeDeleteDialog}>
                {t.common.back}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
