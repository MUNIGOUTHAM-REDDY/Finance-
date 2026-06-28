"use client";

import { formatCurrency } from "@/lib/format";

export interface Slice {
  name: string;
  value: number;
  color: string;
}

// Hero spend ring, hand-drawn as an SVG donut (reliable full circle + rounded
// segment ends) with total + budget in the centre.
export function BudgetRing({
  slices,
  total,
  budget,
  rangeLabel,
}: {
  slices: Slice[];
  total: number;
  budget?: number;
  rangeLabel: string;
}) {
  const R = 42;
  const C = 2 * Math.PI * R;
  const GAP = slices.length > 1 ? 6 : 0; // px-ish gap between segments
  const remaining = budget != null ? budget - total : null;

  let offset = 0;
  const segs =
    total > 0
      ? slices.map((s) => {
          const len = (s.value / total) * C;
          const seg = { color: s.color, dash: Math.max(len - GAP, 0.5), start: offset };
          offset += len;
          return seg;
        })
      : [];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {/* track */}
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="#1c1c20"
          strokeWidth="11"
        />
        {segs.map((s, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={`${s.dash} ${C - s.dash}`}
            strokeDashoffset={-s.start}
          />
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-muted">{rangeLabel}</span>
        <span className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">Total</span>
        <span className="text-3xl font-semibold tracking-tight text-text">
          {formatCurrency(total)}
        </span>
        {remaining != null && (
          <span className="mt-1 text-xs text-muted">
            <span className={remaining < 0 ? "text-negative" : "text-positive"}>
              {formatCurrency(Math.max(remaining, 0))}
            </span>{" "}
            left / {formatCurrency(budget!)}
          </span>
        )}
      </div>
    </div>
  );
}
