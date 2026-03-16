import Link from "next/link";

import { cn } from "@/lib/utils";

interface AppLogoProps {
  href: string;
  subtitle?: string;
  className?: string;
}

export function AppLogo({ href, subtitle, className }: AppLogoProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#1abef3_0%,#3f8cff_62%,#8b7cfb_100%)] text-white shadow-[0_18px_36px_rgba(79,140,255,0.24)]">
        <div className="grid grid-cols-2 gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        </div>
      </div>
      <div>
        <div className="text-base font-semibold text-slate-900">Zaps Smart QR</div>
        {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
      </div>
    </Link>
  );
}
