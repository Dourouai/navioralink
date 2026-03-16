import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  accent?: ReactNode;
  note?: string;
}

export function StatCard({ label, value, accent, note }: StatCardProps) {
  return (
    <div className="glass-panel fade-up relative overflow-hidden rounded-[26px] p-5">
      <div className="absolute inset-x-5 top-0 h-1 rounded-full bg-[linear-gradient(90deg,#2dc2f2_0%,#4e8dff_52%,#8c7cff_100%)] opacity-70" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
          {note ? <p className="mt-2 text-sm text-slate-500">{note}</p> : null}
        </div>
        {accent ? <div>{accent}</div> : null}
      </div>
    </div>
  );
}
