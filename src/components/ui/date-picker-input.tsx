"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

interface DatePickerInputProps {
  locale: Locale;
  label?: string;
  hint?: string;
  error?: string;
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

interface FloatingPanelPosition {
  top: number;
  left: number;
  width: number;
}

function parseLocalDate(value?: string) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatMonthLabel(month: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh-Hant" ? "zh-Hant" : "en-US", {
    year: "numeric",
    month: "long",
  }).format(month);
}

function formatSelectedLabel(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh-Hant" ? "zh-Hant" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function getWeekdayLabels(locale: Locale) {
  return locale === "zh-Hant" ? ["日", "一", "二", "三", "四", "五", "六"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

export function DatePickerInput({ locale, label, hint, error, value, placeholder, onChange }: DatePickerInputProps) {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(parseLocalDate(value) ?? new Date()));
  const [position, setPosition] = useState<FloatingPanelPosition | null>(null);

  const selectedDate = useMemo(() => parseLocalDate(value), [value]);
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);

  const copy =
    locale === "zh-Hant"
      ? {
          placeholder: placeholder ?? "點擊選擇日期",
          clear: "清除",
          today: "今天",
          pickerTitle: "選擇日期",
        }
      : {
          placeholder: placeholder ?? "Choose a date",
          clear: "Clear",
          today: "Today",
          pickerTitle: "Pick a date",
        };

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (!anchorRef.current) return;

      const rect = anchorRef.current.getBoundingClientRect();
      const maxWidth = Math.min(360, window.innerWidth - 24);
      const minWidth = Math.min(300, maxWidth);
      const width = Math.min(maxWidth, Math.max(rect.width, minWidth));
      const panelHeight = 380;
      const openAbove = window.innerHeight - rect.bottom < panelHeight + 16 && rect.top > panelHeight + 16;
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      const top = openAbove ? Math.max(12, rect.top - panelHeight - 12) : Math.min(window.innerHeight - panelHeight - 12, rect.bottom + 12);

      setPosition({ top, left, width });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectDate(date: Date) {
    onChange(formatLocalDate(date));
    setOpen(false);
  }

  function clearDate() {
    onChange("");
    setOpen(false);
  }

  function selectToday() {
    const today = new Date();
    setMonth(startOfMonth(today));
    selectDate(today);
  }

  return (
    <div className="space-y-2">
      {label ? <div className="text-sm font-medium text-slate-700">{label}</div> : null}
      <button
        ref={anchorRef}
        type="button"
        onClick={() => {
          setMonth(startOfMonth(selectedDate ?? new Date()));
          setOpen((current) => !current);
        }}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white/92 px-4 py-3 text-left text-sm outline-none transition focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]",
          error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "hover:border-[rgba(145,180,247,0.5)] hover:bg-white",
          open ? "border-[rgba(18,119,255,0.5)] ring-4 ring-[rgba(18,119,255,0.12)]" : "",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className={cn("text-sm", selectedDate ? "font-medium text-slate-900" : "text-slate-400")}>
            {selectedDate ? formatSelectedLabel(selectedDate, locale) : copy.placeholder}
          </div>
          {selectedDate ? <div className="mt-1 text-xs text-slate-400">{formatLocalDate(selectedDate)}</div> : null}
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(244,248,255,0.92)] text-slate-500 ring-1 ring-[rgba(190,206,226,0.55)]">
          <CalendarDays size={18} />
        </span>
      </button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : hint ? <p className="text-sm text-slate-500">{hint}</p> : null}

      {typeof document !== "undefined" && open && position
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: position.top, left: position.left, width: position.width }}
              className="fixed z-[110] overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(246,250,255,0.97))] p-4 shadow-[0_26px_70px_rgba(15,23,42,0.18)] ring-1 ring-[rgba(190,206,226,0.6)] backdrop-blur-xl"
              role="dialog"
              aria-label={copy.pickerTitle}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">{copy.pickerTitle}</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{formatMonthLabel(month, locale)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMonth((current) => addMonths(current, -1))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-[rgba(190,206,226,0.55)] transition hover:bg-slate-50"
                    aria-label={locale === "zh-Hant" ? "上一個月" : "Previous month"}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonth((current) => addMonths(current, 1))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-[rgba(190,206,226,0.55)] transition hover:bg-slate-50"
                    aria-label={locale === "zh-Hant" ? "下一個月" : "Next month"}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                {weekdayLabels.map((item) => (
                  <div key={item} className="py-2">
                    {item}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {days.map((date) => {
                  const inMonth = date.getMonth() === month.getMonth();
                  const isSelected = selectedDate ? isSameDate(date, selectedDate) : false;
                  const isToday = isSameDate(date, new Date());

                  return (
                    <button
                      key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                      type="button"
                      onClick={() => selectDate(date)}
                      className={cn(
                        "flex h-10 items-center justify-center rounded-[14px] text-sm font-medium transition",
                        isSelected
                          ? "bg-[linear-gradient(135deg,#1ac0f3_0%,#3f8cff_56%,#8d79ff_100%)] text-white shadow-[0_12px_24px_rgba(79,140,255,0.22)]"
                          : inMonth
                            ? "text-slate-700 hover:bg-[rgba(240,247,255,0.95)]"
                            : "text-slate-300 hover:bg-[rgba(248,250,252,0.92)]",
                        isToday && !isSelected ? "ring-1 ring-[rgba(63,140,255,0.35)]" : "",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[rgba(190,206,226,0.45)] pt-4">
                <button
                  type="button"
                  onClick={clearDate}
                  className={cn(
                    "text-sm font-medium text-slate-500 transition hover:text-slate-800",
                    !selectedDate ? "pointer-events-none opacity-40" : "",
                  )}
                >
                  {copy.clear}
                </button>
                <button
                  type="button"
                  onClick={selectToday}
                  className="rounded-full bg-[rgba(240,247,255,0.95)] px-3 py-1.5 text-sm font-medium text-sky-700 ring-1 ring-[rgba(145,180,247,0.3)] transition hover:bg-[rgba(232,243,255,0.98)]"
                >
                  {copy.today}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
