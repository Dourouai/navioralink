import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "info" | "success" | "danger";
}

const toneClassName = {
  default: "bg-white/92 text-slate-700 ring-1 ring-[rgba(190,206,226,0.55)]",
  info: "bg-[linear-gradient(135deg,rgba(86,190,244,0.14),rgba(141,121,255,0.12))] text-sky-700 ring-1 ring-[rgba(130,178,245,0.22)]",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  danger: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium", toneClassName[tone], className)}
      {...props}
    />
  );
}
