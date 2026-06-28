"use client";

export interface BarSeg {
  color: string;
  value: number;
}

// A calm, full-width stacked proportion bar (replaces the loud donut on home).
export function StackedBar({ segs, className = "" }: { segs: BarSeg[]; className?: string }) {
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className={`flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-2 ${className}`}>
      {segs.map((s, i) => (
        <div
          key={i}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
        />
      ))}
    </div>
  );
}
