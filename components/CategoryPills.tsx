"use client";

import { formatCurrency } from "@/lib/format";

export interface PillItem {
  name: string;
  icon: string | null;
  color: string;
  amount: number;
}

// Horizontal, colour-coded category spend pills (à la Costify).
export function CategoryPills({ items }: { items: PillItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {items.map((c) => (
        <div
          key={c.name}
          className="flex shrink-0 items-center gap-2.5 rounded-2xl px-3 py-2"
          style={{ background: `${c.color}22`, border: `1px solid ${c.color}33` }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-base"
            style={{ background: `${c.color}33` }}
          >
            {c.icon ?? "•"}
          </span>
          <div className="pr-1">
            <p className="text-[13px] font-medium leading-tight text-text">{c.name}</p>
            <p className="text-xs leading-tight text-muted">{formatCurrency(c.amount)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
