"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageLoader, EmptyState } from "@/components/ui";
import { TransactionRow } from "@/components/TransactionRow";
import { BudgetRing, type Slice } from "@/components/BudgetRing";
import { CategoryPills, type PillItem } from "@/components/CategoryPills";
import { TimeRangeControl } from "@/components/TimeRangeControl";
import { useQuickAdd } from "@/components/QuickAdd";
import { useDrawer } from "@/components/Drawer";
import { MenuIcon, ProfileIcon } from "@/components/icons";
import {
  useAccounts,
  useBudgets,
  useCategories,
  useProfile,
  useTransactions,
} from "@/lib/hooks";
import { formatCurrency, monthRange } from "@/lib/format";
import { rangeFor, type RangeKey } from "@/lib/range";

export default function DashboardPage() {
  const router = useRouter();
  const { open } = useQuickAdd();
  const { open: openDrawer } = useDrawer();

  const [rangeKey, setRangeKey] = useState<RangeKey>("1M");
  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);
  const month = useMemo(() => monthRange(), []);

  const { data: accounts, isLoading: la } = useAccounts();
  const { data: rangeTx, isLoading: lt } = useTransactions({
    start: range.start,
    end: range.end,
  });
  const { data: monthTx } = useTransactions({ start: month.start, end: month.end });
  const { data: recent } = useTransactions({ limit: 6 });
  const { data: budgets } = useBudgets();
  const { data: categories } = useCategories();
  const { data: profile } = useProfile();

  const totalBalance = useMemo(
    () => (accounts ?? []).filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0),
    [accounts]
  );

  // Spend-by-category for the selected range.
  const { total, slices, pills } = useMemo(() => {
    const byCat = new Map<string, PillItem>();
    for (const t of rangeTx ?? []) {
      if (t.type !== "expense") continue;
      const name = t.category?.name ?? "Uncategorised";
      const color = t.category?.color ?? "#3b82f6";
      const cur = byCat.get(name);
      if (cur) cur.amount += t.amount;
      else byCat.set(name, { name, icon: t.category?.icon ?? null, color, amount: t.amount });
    }
    const pills = [...byCat.values()].sort((a, b) => b.amount - a.amount);
    const slices: Slice[] = pills.map((p) => ({ name: p.name, value: p.amount, color: p.color }));
    const total = pills.reduce((s, p) => s + p.amount, 0);
    return { total, slices, pills };
  }, [rangeTx]);

  const overallBudget = (budgets ?? []).find((b) => b.category_id === null)?.amount;

  // Budget alerts use the calendar month regardless of the ring range.
  const budgetAlerts = useMemo(() => {
    if (!budgets || budgets.length === 0) return [];
    const spentById = new Map<string, number>();
    let total = 0;
    for (const t of monthTx ?? []) {
      if (t.type !== "expense") continue;
      total += t.amount;
      if (t.category_id) spentById.set(t.category_id, (spentById.get(t.category_id) ?? 0) + t.amount);
    }
    const catName = (id: string) => categories?.find((c) => c.id === id)?.name ?? "Budget";
    return budgets
      .map((b) => {
        const spent = b.category_id === null ? total : spentById.get(b.category_id) ?? 0;
        return { label: b.category_id === null ? "Overall" : catName(b.category_id), pct: spent / b.amount };
      })
      .filter((a) => a.pct >= 0.8)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, monthTx, categories]);

  const backupStale = useMemo(() => {
    if (!recent || recent.length === 0) return false;
    const last = profile?.last_backup_at;
    if (!last) return true;
    return new Date().getTime() - new Date(last).getTime() > 7 * 86_400_000;
  }, [recent, profile]);

  if (la || lt) return <PageLoader />;

  return (
    <div>
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={openDrawer}
          aria-label="Menu"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text active:bg-surface-2"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wide text-muted">Balance</p>
          <p className="text-sm font-semibold text-text">{formatCurrency(totalBalance)}</p>
        </div>
        <Link
          href="/profile"
          aria-label="Profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text active:bg-surface-2"
        >
          <ProfileIcon className="h-6 w-6" />
        </Link>
      </div>

      {/* Hero ring */}
      <div className="mb-4 mt-2">
        <BudgetRing
          slices={slices}
          total={total}
          budget={rangeKey === "1M" ? overallBudget : undefined}
          rangeLabel={range.label}
        />
      </div>

      {/* Category pills */}
      <div className="mb-3">
        <CategoryPills items={pills} />
      </div>

      {/* Time range */}
      <div className="mb-4">
        <TimeRangeControl value={rangeKey} onChange={setRangeKey} />
      </div>

      {/* Budget alert */}
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
            {budgetAlerts.slice(0, 3).map((a) => `${a.label} ${Math.round(a.pct * 100)}%`).join(" · ")}
            {budgetAlerts.length > 3 ? " · …" : ""}
          </p>
        </Link>
      )}

      {/* Recent */}
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
              <TransactionRow
                key={t.id}
                tx={t}
                onClick={() => router.push(`/transaction/${t.id}`)}
              />
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

      {backupStale && (
        <Link
          href="/export"
          className="mt-4 block rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted"
        >
          💾 Back up your data — it lives only on this device. Tap to export.
        </Link>
      )}
    </div>
  );
}
