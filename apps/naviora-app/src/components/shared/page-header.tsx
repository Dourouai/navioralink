import type { ReactNode } from "react";

interface PageHeaderProps {
  badge?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ badge, title, description, actions }: PageHeaderProps) {
  return (
    <div className="glass-panel fade-up relative overflow-hidden rounded-[30px] p-5 sm:rounded-[34px] sm:p-7">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-64 bg-[radial-gradient(circle_at_center,rgba(141,121,255,0.12)_0%,transparent_68%)]" />
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          {badge ? <span className="pill-gradient inline-flex rounded-full px-3 py-1 text-xs font-medium text-sky-700">{badge}</span> : null}
          <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
