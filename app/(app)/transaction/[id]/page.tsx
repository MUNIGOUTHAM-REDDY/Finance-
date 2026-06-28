"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoader, EmptyState } from "@/components/ui";
import { TransactionEditor } from "@/components/TransactionEditor";
import { ChevronIcon, TrashIcon } from "@/components/icons";
import { PencilSimple } from "@phosphor-icons/react";
import { useTransaction, useDeleteTransaction } from "@/lib/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import { txDirection, txIcon, txTitle, txTypeLabel } from "@/lib/tx";

export default function TransactionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: tx, isLoading } = useTransaction(params.id);
  const del = useDeleteTransaction();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <PageLoader />;
  if (!tx) {
    return (
      <div>
        <BackBar onBack={() => router.push("/transactions")} />
        <EmptyState title="Transaction not found" />
      </div>
    );
  }

  const dir = txDirection(tx.type);
  const amountColor = dir > 0 ? "text-positive" : dir < 0 ? "text-text" : "text-muted";
  const prefix = dir > 0 ? "+" : dir < 0 ? "−" : "";

  async function remove() {
    if (!confirm("Delete this transaction?")) return;
    await del.mutateAsync(tx!.id);
    router.push("/transactions");
  }

  return (
    <div>
      <BackBar onBack={() => router.back()} title="Detail" />

      {/* Summary */}
      <div className="card mb-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-2xl">
            {txIcon(tx)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-text">{txTitle(tx)}</p>
            <p className="text-xs text-muted">{txTypeLabel(tx.type)}</p>
          </div>
        </div>
        <p className={`text-3xl font-semibold tracking-tight ${amountColor}`}>
          {prefix}
          {formatCurrency(tx.amount)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tx.category && (
            <span
              className="rounded-full px-2.5 py-1 text-xs"
              style={{
                background: `${tx.category.color ?? "#3b82f6"}22`,
                color: tx.category.color ?? "#cbd5e1",
              }}
            >
              {tx.category.icon} {tx.category.name}
            </span>
          )}
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
            {tx.account?.name ?? "—"}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">
            {formatDate(tx.date)}
          </span>
        </div>
      </div>

      {/* Note */}
      <div className="card mb-4">
        <p className="mb-1 text-xs uppercase tracking-wide text-muted">Note</p>
        <p className="text-[15px] text-text">{tx.note?.trim() || "—"}</p>
      </div>

      {/* Actions */}
      <button onClick={() => setEditing(true)} className="btn-primary mb-3 w-full">
        <PencilSimple className="h-5 w-5" /> Edit
      </button>
      <button
        onClick={remove}
        disabled={del.isPending}
        className="btn w-full bg-negative/15 text-negative"
      >
        <TrashIcon className="h-5 w-5" /> Delete
      </button>

      <TransactionEditor tx={editing ? tx : null} onClose={() => setEditing(false)} />
    </div>
  );
}

function BackBar({ onBack, title }: { onBack: () => void; title?: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <button onClick={onBack} className="rounded-lg p-1 text-muted active:bg-surface-2" aria-label="Back">
        <ChevronIcon className="h-5 w-5 rotate-180" />
      </button>
      {title && <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>}
    </div>
  );
}
