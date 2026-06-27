"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader, EmptyState } from "@/components/ui";
import { TransactionRow } from "@/components/TransactionRow";
import { SpendDonut, type Slice } from "@/components/SpendDonut";
import { useQuickAdd } from "@/components/QuickAdd";
import { SettingsIcon } from "@/components/icons";
import {
  useAccounts,
  useLoans,
  useRecurring,
  useTransactions,
} from "@/lib/hooks";
import { formatCurrency, monthRange, relativeDueLabel } from "@/lib/format";

export default function DashboardPage() {
  const month = useMemo(() => monthRange(), []);
  const { open } = useQuickAdd();
  const { data: accounts, isLoading: la } = useAccounts();
  const { data: monthTx, isLoading: lt } = useTransactions({
    start: month.start,
    end: month.end,
  });
  const { data: recent } = useTransactions({ limit: 6 });
  const { data: loans } = useLoans();
  const { data: recurring } = useRecurring();

  const totalBalance = useMemo(
    () => (accounts ?? []).filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0),
    [accounts]
  );

  const { spent, income, slices } = useMemo(() => {
    const tx = monthTx ?? [];
    let income = 0;
    const byCat = new Map<string, Slice>();
    for (const t of tx) {
      if (t.type === "income") income += t.amount;
      if (t.type === "expense") {
        const name = t.category?.name ?? "Uncategorised";
        const color = t.category?.color ?? "#5b8cff";
        const cur = byCat.get(name);
        if (cur) cur.value += t.amount;
        else byCat.set(name, { name, value: t.amount, color });
      }
    }
    const slices = [...byCat.values()].sort((a, b) => b.value - a.value);
    const spent = slices.reduce((s, x) => s + x.value, 0);
    return { spent, income, slices };
  }, [monthTx]);

  const upcoming = useMemo(
    () =>
      (recurring ?? [])
        .filter((r) => r.active)
        .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
        .slice(0, 3),
    [recurring]
  );

  const owedToMe = useMemo(
    () =>
      (loans ?? [])
        .filter((l) => l.direction === "lent" && l.status === "open")
        .reduce((s, l) => s + l.outstanding, 0),
    [loans]
  );
  const iOwe = useMemo(
    () =>
      (loans ?? [])
        .filter((l) => l.direction === "borrowed" && l.status === "open")
        .reduce((s, l) => s + l.outstanding, 0),
    [loans]
  );

  if (la || lt) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle={month.label}
        action={
          <Link
            href="/settings"
            className="btn-ghost px-3 py-2 text-muted"
            aria-label="Settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </Link>
        }
      />

      {/* Total balance */}
      <div className="card mb-4">
        <p className="text-sm text-muted">Total balance</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-text">
          {formatCurrency(totalBalance)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-xs text-muted">Spent</p>
            <p className="mt-0.5 text-lg font-semibold text-text">
              {formatCurrency(spent)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-xs text-muted">Income</p>
            <p className="mt-0.5 text-lg font-semibold text-positive">
              {formatCurrency(income)}
            </p>
          </div>
        </div>
      </div>

      {/* Spend by category */}
      {slices.length > 0 && (
        <div className="card mb-4">
          <p className="mb-3 text-sm font-medium text-text">Where it went</p>
          <SpendDonut data={slices} total={spent} />
        </div>
      )}

      {/* Upcoming + loans */}
      {(upcoming.length > 0 || owedToMe > 0 || iOwe > 0) && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {upcoming.length > 0 && (
            <Link href="/recurring" className="card">
              <p className="text-sm font-medium text-text">Upcoming</p>
              <p className="mt-1 truncate text-xs text-muted">
                {upcoming[0].name} · {relativeDueLabel(upcoming[0].next_due_date)}
              </p>
              <p className="mt-2 text-lg font-semibold text-text">
                {formatCurrency(upcoming.reduce((s, r) => s + r.amount, 0))}
              </p>
            </Link>
          )}
          {(owedToMe > 0 || iOwe > 0) && (
            <Link href="/loans" className="card">
              <p className="text-sm font-medium text-text">Loans</p>
              <p className="mt-1 text-xs text-positive">
                Owed to you {formatCurrency(owedToMe)}
              </p>
              <p className="text-xs text-negative">You owe {formatCurrency(iOwe)}</p>
            </Link>
          )}
        </div>
      )}

      {/* Recent activity */}
      <div className="card">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium text-text">Recent</p>
          <Link href="/transactions" className="text-sm text-accent">
            See all
          </Link>
        </div>
        {recent && recent.length > 0 ? (
          <div className="divide-y divide-border">
            {recent.map((t) => (
              <TransactionRow key={t.id} tx={t} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No transactions yet"
            subtitle="Tap the + button to log your first spend."
            action={
              <button className="btn-primary" onClick={open}>
                Add transaction
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
