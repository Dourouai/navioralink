"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { formatDate, formatNumber } from "@/lib/utils";
import type { QRCodeItem, QRStatus } from "@/types/qr";

interface QrListClientProps {
  locale: Locale;
  initialItems: QRCodeItem[];
}

export function QrListClient({ locale, initialItems }: QrListClientProps) {
  const t = getMessages(locale);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | QRStatus>("all");
  const [items, setItems] = useState(initialItems);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery = query
        ? `${item.name} ${item.defaultUrl}`.toLowerCase().includes(query.toLowerCase())
        : true;
      const matchesStatus = status === "all" ? true : item.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, status]);

  async function copyLink(item: QRCodeItem) {
    await navigator.clipboard.writeText(item.defaultUrl);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 1200);
  }

  function removeItem(id: string) {
    const confirmed = window.confirm(locale === "zh-Hant" ? "確定要刪除這個 QR 嗎？" : "Delete this QR?");
    if (!confirmed) return;
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <Card className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Input label={t.common.search} placeholder={t.qrs.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="flex flex-wrap items-end gap-2">
          {(["all", "draft", "active", "expired"] as const).map((item) => (
            <Button
              key={item}
              variant={status === item ? "primary" : "secondary"}
              className="mt-7"
              onClick={() => setStatus(item)}
            >
              {item === "all" ? t.common.all : t.common[item]}
            </Button>
          ))}
        </div>
      </div>
      {filteredItems.length ? (
        <div className="overflow-hidden rounded-[22px] border border-slate-100">
          <div className="hidden grid-cols-[1.2fr_1fr_120px_120px_190px] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 lg:grid">
            <div>Name</div>
            <div>Default URL</div>
            <div>{t.common.type}</div>
            <div>{t.common.scans}</div>
            <div>{t.common.updatedAt}</div>
          </div>
          {filteredItems.map((item) => (
            <div key={item.id} className="grid gap-4 border-t border-slate-100 bg-white px-5 py-4 lg:grid-cols-[1.2fr_1fr_120px_120px_190px] lg:items-center">
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                <div className="mt-1 text-xs text-slate-500">{item.ruleMode}</div>
              </div>
              <div className="text-sm text-slate-600">{item.defaultUrl}</div>
              <div className="text-sm text-slate-600">{item.type.toUpperCase()}</div>
              <div className="text-sm text-slate-600">{formatNumber(item.scans)}</div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600">{formatDate(item.updatedAt)}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" className="px-2 py-2 text-xs">
                    {t.common.edit}
                  </Button>
                  <Button variant="ghost" className="px-2 py-2 text-xs" onClick={() => copyLink(item)}>
                    {copiedId === item.id ? t.common.copied : t.common.copy}
                  </Button>
                  <Button variant="ghost" className="px-2 py-2 text-xs text-rose-600" onClick={() => removeItem(item.id)}>
                    {t.common.delete}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title={t.qrs.emptyTitle} body={t.qrs.emptyBody} href={withLocale(locale, "/qrs/new")} actionLabel={t.nav.create} />
      )}
    </Card>
  );
}
