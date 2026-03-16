import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const variantClassName: Record<Variant, string> = {
  primary:
    "soft-shimmer bg-[linear-gradient(135deg,#1ac0f3_0%,#3f8cff_56%,#8d79ff_100%)] text-white shadow-[0_18px_36px_rgba(79,140,255,0.24)] hover:translate-y-[-1px]",
  secondary:
    "bg-white/92 text-slate-800 ring-1 ring-[rgba(190,206,226,0.55)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:bg-white",
  ghost: "bg-transparent text-slate-700 hover:bg-[rgba(255,255,255,0.72)]",
};

export function Button({ className, children, variant = "primary", icon, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[16px] px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variantClassName[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
