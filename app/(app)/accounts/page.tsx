"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader, EmptyState } from "@/components/ui";
import { AccountEditor } from "@/components/AccountEditor";
import { AccountCard } from "@/components/AccountCard";
import { PlusIcon } from "@/components/icons";
import { useAccounts } from "@/lib/hooks";
import { formatCurrency } from "@/lib/format";
import type { AccountWithBalance } from "@/lib/types";

export default function AccountsPage() {
  const { data, isLoading } = useAccounts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountWithBalance | null>(null);

  const live = useMemo(() => (data ?? []).filter((a) => !a.archived), [data]);
  const archived = useMemo(() => (data ?? []).filter((a) => a.archived), [data]);
  const total = useMemo(() => live.reduce((s, a) => s + a.balance, 0), [live]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(a: AccountWithBalance) {
    setEditing(a);
    setOpen(true);
  }

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Accounts"
        action={
          <button onClick={openNew} className="btn-ghost px-3 py-2" aria-label="Add account">
            <PlusIcon className="h-5 w-5" />
          </button>
        }
      />

      <div className="card mb-4">
        <p className="text-sm text-muted">Net worth</p>
        <p className="mt-1 text-2xl font-semibold text-text">{formatCurrency(total)}</p>
      </div>

      {live.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          subtitle="Add your bank, UPI apps, or cash to start tracking balances."
          action={
            <button className="btn-primary" onClick={openNew}>
              Add account
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {live.map((a) => (
            <AccountCard key={a.id} account={a} onClick={() => openEdit(a)} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Archived
          </p>
          <div className="card divide-y divide-border py-0">
            {archived.map((a) => (
              <button
                key={a.id}
                onClick={() => openEdit(a)}
                className="flex w-full items-center gap-3 py-3 text-left opacity-60"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2">
                  {a.icon ?? "💼"}
                </div>
                <p className="flex-1 truncate text-sm text-text">{a.name}</p>
                <p className="text-sm text-muted">{formatCurrency(a.balance)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <AccountEditor account={editing} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
