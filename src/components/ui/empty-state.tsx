import Link from "next/link";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  body: string;
  href?: string;
  actionLabel?: string;
}

export function EmptyState({ title, body, href, actionLabel }: EmptyStateProps) {
  return (
    <div className="surface-panel rounded-[24px] px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(18,119,255,0.12),rgba(8,184,164,0.12))] text-lg font-semibold text-sky-700">
        QR
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{body}</p>
      {href && actionLabel ? (
        <div className="mt-5">
          <Link href={href}>
            <Button>{actionLabel}</Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
