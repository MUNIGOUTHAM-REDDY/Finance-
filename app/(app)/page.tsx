"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { PageLoader, EmptyState } from "@/components/ui";
import { TransactionRow } from "@/components/TransactionRow";
import { StackedBar } from "@/components/StackedBar";
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

interface Cat {
  name: string;
  icon: string | null;
  color: string;
  amount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { open } = useQuickAdd();
  const { open: openDrawer } = useDrawer();
  const month = useMemo(() => monthRange(), []);

  const { data: accounts, isLoading: la } = useAccounts();
  const { data: monthTx, isLoading: lt } = useTransactions({
    start: month.start,
    end: month.end,
  });
  const { data: recent } = useTransactions({ limit: 6 });
  const { data: budgets } = useBudgets();
  const { data: categories } = useCategories();
  const { data: profile } = useProfile();

  const totalBalance = useMemo(
    () => (accounts ?? []).filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0),
    [accounts]
  );

  const { spent, income, cats } = useMemo(() => {
    let income = 0;
    const byCat = new Map<string, Cat>();
    for (const t of monthTx ?? []) {
      if (t.type === "income") income += t.amount;
      if (t.type === "expense") {
        const name = t.category?.name ?? "Uncategorised";
        const color = t.category?.color ?? "#8A8A94";
        const cur = byCat.get(name);
        if (cur) cur.amount += t.amount;
        else byCat.set(name, { name, icon: t.category?.icon ?? null, color, amount: t.amount });
      }
    }
    const cats = [...byCat.values()].sort((a, b) => b.amount - a.amount);
    const spent = cats.reduce((s, c) => s + c.amount, 0);
    return { spent, income, cats };
  }, [monthTx]);

  const overall = (budgets ?? []).find((b) => b.category_id === null)?.amount;
  const budgetPct = overall ? spent / overall : 0;
  const budgetColor =
    budgetPct >= 1 ? "bg-negative" : budgetPct >= 0.8 ? "bg-warn" : "bg-positive";

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
        const s = b.category_id === null ? total : spentById.get(b.category_id) ?? 0;
        return { label: b.category_id === null ? "Overall" : catName(b.category_id), pct: s / b.amount };
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
      <div className="mb-7 flex items-center justify-between">
        <button
          onClick={openDrawer}
          aria-label="Menu"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted active:bg-surface"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <Link
          href="/profile"
          aria-label="Profile"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted active:bg-surface"
        >
          <ProfileIcon className="h-7 w-7" />
        </Link>
      </div>

      {/* Balance hero */}
      <div className="mb-7">
        <p className="text-xs uppercase tracking-widest text-muted">Balance</p>
        <p className="mt-1 text-[2.75rem] font-semibold leading-none tracking-tight text-text">
          {formatCurrency(totalBalance)}
        </p>
        <p className="mt-2.5 text-sm text-muted">
          Spent <span className="text-text">{formatCurrency(spent)}</span> · Income{" "}
          <span className="text-positive">{formatCurrency(income)}</span>
          <span className="text-muted/70"> · this month</span>
        </p>
      </div>

      {/* Budget progress (only if an overall budget is set) */}
      {overall ? (
        <Link href="/budgets" className="card mb-4 block">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium text-text">This month</p>
            <p className="text-sm text-muted">
              {formatCurrency(spent)} / {formatCurrency(overall)}
            </p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full ${budgetColor}`}
              style={{ width: `${Math.min(100, budgetPct * 100)}%` }}
            />
          </div>
          <p className={`mt-2 text-xs ${budgetPct >= 1 ? "text-negative" : "text-muted"}`}>
            {budgetPct >= 1
              ? `Over by ${formatCurrency(spent - overall)}`
              : `${formatCurrency(overall - spent)} left`}
          </p>
        </Link>
      ) : budgetAlerts.length > 0 ? (
        <Link
          href="/budgets"
          className={`card mb-4 block ${budgetAlerts[0].pct >= 1 ? "border-negative/40" : "border-warn/40"}`}
        >
          <p className="text-sm font-medium text-text">
            {budgetAlerts[0].pct >= 1 ? "Over budget" : "Heads up on budget"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {budgetAlerts.slice(0, 3).map((a) => `${a.label} ${Math.round(a.pct * 100)}%`).join(" · ")}
          </p>
        </Link>
      ) : null}

      {/* Where it went */}
      {cats.length > 0 && (
        <Link href="/insights" className="card mb-4 block">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-text">Where it went</p>
            <span className="text-xs text-accent">Insights →</span>
          </div>
          <StackedBar segs={cats.map((c) => ({ color: c.color, value: c.amount }))} />
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {cats.slice(0, 6).map((c) => (
              <div key={c.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1 truncate text-muted">{c.name}</span>
                <span className="shrink-0 text-text">{formatCurrency(c.amount)}</span>
              </div>
            ))}
          </div>
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
              <TransactionRow key={t.id} tx={t} onClick={() => router.push(`/transaction/${t.id}`)} />
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
