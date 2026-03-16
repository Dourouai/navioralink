"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label?: string;
  value: string;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  onChange: (value: string) => void;
}

export function SearchableSelect({
  label,
  value,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(val: string) {
    onChange(val);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="block space-y-2" ref={ref}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-[16px] border border-slate-200 bg-white/92 px-4 py-3 text-left text-sm outline-none transition focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]"
        >
          <span className={selected ? "text-slate-900" : "text-slate-400"}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open ? (
          <div className="absolute z-50 mt-1 w-full rounded-[18px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.1)]">
            <div className="p-2">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-300"
              />
            </div>
            <ul className="max-h-52 overflow-y-auto pb-2">
              {filtered.length === 0 ? (
                <li className="px-4 py-2 text-sm text-slate-400">No results</li>
              ) : (
                filtered.map((o) => (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => select(o.value)}
                      className={`w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${
                        o.value === value ? "font-medium text-sky-600" : "text-slate-700"
                      }`}
                    >
                      {o.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
