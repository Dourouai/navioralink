import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ className, label, hint, error, id, ...props }: InputProps) {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <input
        id={id}
        className={cn(
          "w-full rounded-[16px] border border-slate-200 bg-white/92 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]",
          error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
    </label>
  );
}
