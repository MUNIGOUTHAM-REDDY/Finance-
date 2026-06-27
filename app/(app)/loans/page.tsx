"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader, EmptyState } from "@/components/ui";
import { NewLoanSheet, RepaymentSheet } from "@/components/LoanSheets";
import { PlusIcon } from "@/components/icons";
import { useLoans, useSetLoanStatus, useDeleteLoan } from "@/lib/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LoanWithOutstanding } from "@/lib/types";

export default function LoansPage() {
  const { data, isLoading } = useLoans();
  const setStatus = useSetLoanStatus();
  const del = useDeleteLoan();
  const [open, setOpen] = useState(false);
  const [repaying, setRepaying] = useState<LoanWithOutstanding | null>(null);

  const openLoans = useMemo(
    () => (data ?? []).filter((l) => l.status === "open"),
    [data]
  );
  const settled = useMemo(
    () => (data ?? []).filter((l) => l.status === "settled"),
    [data]
  );

  const owedToMe = openLoans
    .filter((l) => l.direction === "lent")
    .reduce((s, l) => s + l.outstanding, 0);
  const iOwe = openLoans
    .filter((l) => l.direction === "borrowed")
    .reduce((s, l) => s + l.outstanding, 0);

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Loans"
        action={
          <button
            onClick={() => setOpen(true)}
            className="btn-ghost px-3 py-2"
            aria-label="Add loan"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-muted">Owed to you</p>
          <p className="mt-1 text-xl font-semibold text-positive">
            {formatCurrency(owedToMe)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-muted">You owe</p>
          <p className="mt-1 text-xl font-semibold text-negative">
            {formatCurrency(iOwe)}
          </p>
        </div>
      </div>

      {openLoans.length === 0 ? (
        <EmptyState
          title="No open loans"
          subtitle="Track money you lend to or borrow from friends."
          action={
            <button className="btn-primary" onClick={() => setOpen(true)}>
              Add loan
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {openLoans.map((l) => (
            <div key={l.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">{l.person_name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {l.direction === "lent" ? "You lent" : "You borrowed"} ·{" "}
                    {formatDate(l.date)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`font-semibold ${
                      l.direction === "lent" ? "text-positive" : "text-negative"
                    }`}
                  >
                    {formatCurrency(l.outstanding)}
                  </p>
                  {l.outstanding !== l.principal && (
                    <p className="text-[11px] text-muted">
                      of {formatCurrency(l.principal)}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setRepaying(l)}
                  className="btn-ghost flex-1 text-sm"
                >
                  Repayment
                </button>
                <button
                  onClick={() => setStatus.mutate({ id: l.id, status: "settled" })}
                  className="btn-ghost flex-1 text-sm text-accent"
                >
                  Settle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {settled.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Settled
          </p>
          <div className="card divide-y divide-border py-0">
            {settled.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-2 py-3 opacity-70"
              >
                <span className="min-w-0 truncate text-sm text-text">
                  {l.person_name}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStatus.mutate({ id: l.id, status: "open" })}
                    className="text-xs text-muted"
                  >
                    Reopen
                  </button>
                  <button
                    onClick={() => del.mutate(l.id)}
                    className="text-xs text-negative"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <NewLoanSheet open={open} onClose={() => setOpen(false)} />
      <RepaymentSheet loan={repaying} onClose={() => setRepaying(null)} />
    </div>
  );
}
