"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

interface AnalyticsChartProps {
  data: Array<{ day: string; scans: number }>;
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1277ff" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#1277ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" dataKey="scans" stroke="#1277ff" fill="url(#scanFill)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
