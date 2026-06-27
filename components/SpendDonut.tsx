"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/format";

export interface Slice {
  name: string;
  value: number;
  color: string;
}

// Compact donut + legend for spend-by-category.
export function SpendDonut({ data, total }: { data: Slice[]; total: number }) {
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={44}
              outerRadius={62}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
            >
              {data.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted">Spent</span>
          <span className="text-sm font-semibold text-text">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.slice(0, 5).map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="min-w-0 flex-1 truncate text-muted">{s.name}</span>
            <span className="shrink-0 font-medium text-text">
              {formatCurrency(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
