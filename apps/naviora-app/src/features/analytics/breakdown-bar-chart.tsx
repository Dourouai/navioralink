"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface BreakdownBarChartProps {
  data: Array<{ label: string; scans: number }>;
}

export function BreakdownBarChart({ data }: BreakdownBarChartProps) {
  const crowded = data.length > 6;

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.18)" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval={0}
            tick={{ fill: "#64748b", fontSize: crowded ? 11 : 12 }}
            angle={crowded ? -18 : 0}
            textAnchor={crowded ? "end" : "middle"}
            height={crowded ? 48 : 30}
            tickMargin={crowded ? 10 : 6}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} width={32} />
          <Tooltip cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey="scans" fill="url(#breakdownBarFill)" radius={[10, 10, 0, 0]} />
          <defs>
            <linearGradient id="breakdownBarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#21bdf1" />
              <stop offset="100%" stopColor="#4d8eff" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
