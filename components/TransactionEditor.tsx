"use client";

import { useState } from "react";
import { Sheet, Field, Spinner } from "@/components/ui";
import {
  useAccounts,
  useCategories,
  useDeleteTransaction,
  useUpdateTransaction,
} from "@/lib/hooks";
import { txTypeLabel } from "@/lib/tx";
import type { TransactionWithRefs } from "@/lib/types";

// Edit or delete an existing transaction. Type is fixed once created.
export function TransactionEditor({
  tx,
  onClose,
}: {
  tx: TransactionWithRefs | null;
  onClose: () => void;
}) {
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const update = useUpdateTransaction();
  const del = useDeleteTransaction();

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [hydrated, setHydrated] = useState<string | null>(null);

  // Re-seed local state whenever a different transaction is opened.
  if (tx && hydrated !== tx.id) {
    setHydrated(tx.id);
    setAmount(String(tx.amount));
    setCategoryId(tx.category_id);
    setAccountId(tx.account_id);
    setDate(tx.date);
    setNote(tx.note ?? "");
  }

  if (!tx) return null;

  const isTransfer = tx.type === "transfer";
  const kind = tx.type === "income" ? "income" : "expense";
  const cats = (categories ?? []).filter((c) => c.kind === kind);
  const live = (accounts ?? []).filter((a) => !a.archived);

  async function save() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    await update.mutateAsync({
      id: tx!.id,
      amount: value,
      category_id: isTransfer ? null : categoryId,
      account_id: accountId,
      date,
      note: note.trim() || null,
    });
    onClose();
  }

  async function remove() {
    await del.mutateAsync(tx!.id);
    onClose();
  }

  return (
    <Sheet open={!!tx} onClose={onClose} title={`Edit ${txTypeLabel(tx.type).toLowerCase()}`}>
      <Field label="Amount">
        <input
          type="number"
          inputMode="decimal"
          className="input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      {!isTransfer && (
        <Field label="Category">
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`chip ${categoryId === c.id ? "chip-active" : ""}`}
              >
                {c.icon && <span>{c.icon}</span>}
                {c.name}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label={isTransfer ? "From account" : "Account"}>
        <div className="flex flex-wrap gap-2">
          {live.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccountId(a.id)}
              className={`chip ${accountId === a.id ? "chip-active" : ""}`}
            >
              {a.icon && <span>{a.icon}</span>}
              {a.name}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex gap-3">
        <Field label="Date">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Note">
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
          />
        </Field>
      </div>

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={remove}
          disabled={del.isPending}
          className="btn-ghost text-negative"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={save}
          disabled={update.isPending}
          className="btn-primary flex-1"
        >
          {update.isPending ? <Spinner className="h-4 w-4 border-white/40" /> : "Save changes"}
        </button>
      </div>
    </Sheet>
  );
}
