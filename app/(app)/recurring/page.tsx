"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader, EmptyState } from "@/components/ui";
import { RecurringEditor } from "@/components/RecurringEditor";
import { PlusIcon } from "@/components/icons";
import { useRecurring, useMarkRecurringPaid } from "@/lib/hooks";
import { formatCurrency, relativeDueLabel } from "@/lib/format";
import type { Recurring } from "@/lib/types";

const monthlyFactor: Record<Recurring["frequency"], number> = {
  monthly: 1,
  weekly: 52 / 12,
  yearly: 1 / 12,
};

export default function RecurringPage() {
  const { data, isLoading } = useRecurring();
  const markPaid = useMarkRecurringPaid();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const active = useMemo(() => (data ?? []).filter((r) => r.active), [data]);
  const inactive = useMemo(() => (data ?? []).filter((r) => !r.active), [data]);

  const monthlyTotal = useMemo(
    () => active.reduce((s, r) => s + r.amount * monthlyFactor[r.frequency], 0),
    [active]
  );

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  async function pay(r: Recurring) {
    setPayingId(r.id);
    try {
      await markPaid.mutateAsync(r);
    } finally {
      setPayingId(null);
    }
  }

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Recurring"
        action={
          <button onClick={openNew} className="btn-ghost px-3 py-2" aria-label="Add recurring">
            <PlusIcon className="h-5 w-5" />
          </button>
        }
      />

      <div className="card mb-4">
        <p className="text-sm text-muted">Monthly commitments</p>
        <p className="mt-1 text-2xl font-semibold text-text">
          {formatCurrency(Math.round(monthlyTotal))}
        </p>
        <p className="mt-1 text-xs text-muted">
          {active.length} active · EMIs, rent &amp; subscriptions
        </p>
      </div>

      {active.length === 0 ? (
        <EmptyState
          title="No recurring items"
          subtitle="Add your EMIs, rent and subscriptions to see them here."
          action={
            <button className="btn-primary" onClick={openNew}>
              Add recurring
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {active.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  <p className="truncate font-medium text-text">{r.name}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted">
                    {r.kind} · {relativeDueLabel(r.next_due_date)}
                    {r.installments_total != null && ` · ${r.installments_total} left`}
                  </p>
                </button>
                <p className="shrink-0 font-semibold text-text">
                  {formatCurrency(r.amount)}
                </p>
              </div>
              <button
                onClick={() => pay(r)}
                disabled={payingId === r.id}
                className="btn-ghost mt-3 w-full text-sm"
              >
                {payingId === r.id ? "Posting…" : "Mark paid"}
              </button>
            </div>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Finished
          </p>
          <div className="card divide-y divide-border py-0">
            {inactive.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setEditing(r);
                  setOpen(true);
                }}
                className="flex w-full items-center justify-between py-3 text-left opacity-60"
              >
                <span className="truncate text-sm text-text">{r.name}</span>
                <span className="text-sm text-muted">{formatCurrency(r.amount)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <RecurringEditor item={editing} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
