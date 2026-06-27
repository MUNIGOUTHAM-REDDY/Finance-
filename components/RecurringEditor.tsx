"use client";

import { useEffect, useState } from "react";
import { Sheet, Field, Segmented, Spinner } from "@/components/ui";
import {
  useAccounts,
  useCategories,
  useCreateRecurring,
  useDeleteRecurring,
  useUpdateRecurring,
} from "@/lib/hooks";
import { todayISO } from "@/lib/format";
import type { Frequency, Recurring, RecurringKind } from "@/lib/types";

const KINDS: { value: RecurringKind; label: string }[] = [
  { value: "emi", label: "EMI" },
  { value: "rent", label: "Rent" },
  { value: "subscription", label: "Subscription" },
  { value: "other", label: "Other" },
];

// Next due date from a due-day + frequency, never in the past.
function computeNextDue(frequency: Frequency, dueDay: number, start: string): string {
  if (frequency !== "monthly") return start;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let d = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  return d.toISOString().slice(0, 10);
}

export function RecurringEditor({
  item,
  open,
  onClose,
}: {
  item: Recurring | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const create = useCreateRecurring();
  const update = useUpdateRecurring();
  const del = useDeleteRecurring();
  const editing = !!item;

  const [name, setName] = useState("");
  const [kind, setKind] = useState<RecurringKind>("subscription");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [dueDay, setDueDay] = useState("1");
  const [installments, setInstallments] = useState("");

  const live = (accounts ?? []).filter((a) => !a.archived);
  const expenseCats = (categories ?? []).filter((c) => c.kind === "expense");

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setKind(item?.kind ?? "subscription");
    setAmount(item ? String(item.amount) : "");
    setAccountId(item?.account_id ?? live[0]?.id ?? "");
    setCategoryId(item?.category_id ?? null);
    setFrequency(item?.frequency ?? "monthly");
    setDueDay(item ? String(item.due_day) : "1");
    setInstallments(item?.installments_total != null ? String(item.installments_total) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  async function save() {
    const value = Number(amount);
    if (!name.trim() || !value || value <= 0 || !accountId) return;
    const day = Math.min(31, Math.max(1, Number(dueDay) || 1));
    const start = todayISO();
    const nextDue = editing ? item!.next_due_date : computeNextDue(frequency, day, start);

    const payload = {
      name: name.trim(),
      kind,
      amount: value,
      account_id: accountId,
      category_id: categoryId,
      frequency,
      due_day: day,
      start_date: editing ? item!.start_date : start,
      end_date: editing ? item!.end_date : null,
      installments_total: installments ? Number(installments) : null,
      next_due_date: nextDue,
      auto_post: false,
      active: editing ? item!.active : true,
    };

    if (editing) await update.mutateAsync({ id: item!.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  }

  const pending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit recurring" : "New recurring"}>
      <Field label="Name">
        <input
          className="input"
          placeholder="e.g. Netflix, Home loan, Rent"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Type">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`chip ${kind === k.value ? "chip-active" : ""}`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex gap-3">
        <Field label="Amount">
          <input
            type="number"
            inputMode="decimal"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Due day">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            className="input"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Frequency">
        <Segmented
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "weekly", label: "Weekly" },
            { value: "yearly", label: "Yearly" },
          ]}
          value={frequency}
          onChange={setFrequency}
        />
      </Field>

      {kind === "emi" && (
        <Field label="Total installments (optional)">
          <input
            type="number"
            inputMode="numeric"
            className="input"
            placeholder="e.g. 24"
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
          />
        </Field>
      )}

      <Field label="Account">
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

      <Field label="Category (optional)">
        <div className="flex flex-wrap gap-2">
          {expenseCats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
              className={`chip ${categoryId === c.id ? "chip-active" : ""}`}
            >
              {c.icon && <span>{c.icon}</span>}
              {c.name}
            </button>
          ))}
        </div>
      </Field>

      <div className="mt-2 flex gap-3">
        {editing && (
          <button
            type="button"
            onClick={async () => {
              await del.mutateAsync(item!.id);
              onClose();
            }}
            className="btn-ghost text-negative"
          >
            Delete
          </button>
        )}
        <button onClick={save} disabled={pending} className="btn-primary flex-1">
          {pending ? <Spinner className="h-4 w-4 border-white/40" /> : "Save"}
        </button>
      </div>
    </Sheet>
  );
}
