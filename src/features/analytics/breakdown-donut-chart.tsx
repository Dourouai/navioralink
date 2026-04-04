"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface BreakdownDonutChartProps {
  data: Array<{ label: string; scans: number }>;
}

const colors = ["#1abef3", "#4d8eff", "#8d79ff", "#18b47c", "#f59e0b", "#f97316"];

export function BreakdownDonutChart({ data }: BreakdownDonutChartProps) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip />
          <Pie data={data} dataKey="scans" nameKey="label" innerRadius={55} outerRadius={88} paddingAngle={3} strokeWidth={0}>
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
