import Image from "next/image";
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
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-white shadow-[0_18px_36px_rgba(79,140,255,0.16)] ring-1 ring-[rgba(190,206,226,0.48)]">
        <Image
          src="/assets/logo.webp"
          alt="Naviora logo"
          width={48}
          height={48}
          unoptimized
          priority
          className="h-full w-full object-contain p-1.5"
        />
      </div>
      <div className="min-w-0">
        <div className="text-base font-semibold text-slate-900">Naviora</div>
        {subtitle ? <div className="truncate text-[11px] leading-4 text-slate-500">{subtitle}</div> : null}
      </div>
    </Link>
  );
}
