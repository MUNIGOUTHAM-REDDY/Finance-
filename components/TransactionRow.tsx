"use client";

import { formatCurrency, formatDayMonth } from "@/lib/format";
import { txDirection, txIcon, txTitle } from "@/lib/tx";
import type { TransactionWithRefs } from "@/lib/types";

export function TransactionRow({
  tx,
  onClick,
}: {
  tx: TransactionWithRefs;
  onClick?: () => void;
}) {
  const dir = txDirection(tx.type);
  const amountColor =
    dir > 0 ? "text-positive" : dir < 0 ? "text-text" : "text-muted";
  const prefix = dir > 0 ? "+" : dir < 0 ? "−" : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg">
        {txIcon(tx)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-text">{txTitle(tx)}</p>
        <p className="truncate text-xs text-muted">
          {tx.account?.name ?? "—"} · {formatDayMonth(tx.date)}
        </p>
      </div>
      <div className={`shrink-0 text-[15px] font-semibold ${amountColor}`}>
        {prefix}
        {formatCurrency(tx.amount)}
      </div>
    </button>
  );
}
