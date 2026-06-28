"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader, EmptyState } from "@/components/ui";
import { TransactionRow } from "@/components/TransactionRow";
import { SpendDonut, type Slice } from "@/components/SpendDonut";
import { useQuickAdd } from "@/components/QuickAdd";
import { ProfileIcon } from "@/components/icons";
import {
  useAccounts,
  useBudgets,
  useCategories,
  useLoans,
  useProfile,
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
  const { data: budgets } = useBudgets();
  const { data: categories } = useCategories();
  const { data: profile } = useProfile();

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

  // Budgets at/over 80% of their monthly limit.
  const budgetAlerts = useMemo(() => {
    if (!budgets || budgets.length === 0) return [];
    const spentById = new Map<string, number>();
    let total = 0;
    for (const t of monthTx ?? []) {
      if (t.type !== "expense") continue;
      total += t.amount;
      if (t.category_id)
        spentById.set(t.category_id, (spentById.get(t.category_id) ?? 0) + t.amount);
    }
    const catName = (id: string) => categories?.find((c) => c.id === id)?.name ?? "Budget";
    return budgets
      .map((b) => {
        const spent = b.category_id === null ? total : spentById.get(b.category_id) ?? 0;
        return {
          label: b.category_id === null ? "Overall" : catName(b.category_id),
          pct: spent / b.amount,
        };
      })
      .filter((a) => a.pct >= 0.8)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, monthTx, categories]);

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

  // Nudge to back up if there's data and no export in the last 7 days.
  const backupStale = useMemo(() => {
    if (!recent || recent.length === 0) return false;
    const last = profile?.last_backup_at;
    if (!last) return true;
    return new Date().getTime() - new Date(last).getTime() > 7 * 86_400_000;
  }, [recent, profile]);

  if (la || lt) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle={month.label}
        action={
          <Link
            href="/profile"
            className="btn-ghost px-3 py-2 text-muted"
            aria-label="Profile"
          >
            <ProfileIcon className="h-6 w-6" />
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

      {/* Budget alerts */}
      {budgetAlerts.length > 0 && (
        <Link
          href="/budgets"
          className={`card mb-4 block ${
            budgetAlerts[0].pct >= 1 ? "border-negative/40" : "border-warn/40"
          }`}
        >
          <p className="text-sm font-medium text-text">
            {budgetAlerts[0].pct >= 1 ? "⚠️ Over budget" : "Heads up on budget"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {budgetAlerts
              .slice(0, 3)
              .map((a) => `${a.label} ${Math.round(a.pct * 100)}%`)
              .join(" · ")}
            {budgetAlerts.length > 3 ? " · …" : ""}
          </p>
        </Link>
      )}

      {/* Spend by category */}
      {slices.length > 0 && (
        <Link href="/insights" className="card mb-4 block">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-text">Where it went</p>
            <span className="text-xs text-accent">Insights →</span>
          </div>
          <SpendDonut data={slices} total={spent} />
        </Link>
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

      {/* Backup nudge */}
      {backupStale && (
        <Link
          href="/settings"
          className="mt-4 block rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted"
        >
          💾 Back up your data — it lives only on this device. Tap to export.
        </Link>
      )}
    </div>
  );
}
