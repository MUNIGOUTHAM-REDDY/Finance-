"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader, EmptyState } from "@/components/ui";
import { BudgetSheet, type BudgetTarget } from "@/components/BudgetSheet";
import { useBudgets, useCategories, useTransactions } from "@/lib/hooks";
import { formatCurrency, monthRange } from "@/lib/format";

function barColor(pct: number) {
  if (pct >= 1) return "bg-negative";
  if (pct >= 0.8) return "bg-warn";
  return "bg-accent";
}

export default function BudgetsPage() {
  const month = useMemo(() => monthRange(), []);
  const { data: budgets, isLoading: lb } = useBudgets();
  const { data: categories, isLoading: lc } = useCategories();
  const { data: tx, isLoading: lt } = useTransactions({
    start: month.start,
    end: month.end,
  });
  const [target, setTarget] = useState<BudgetTarget | null>(null);

  const spentByCat = useMemo(() => {
    const m = new Map<string, number>();
    let total = 0;
    for (const t of tx ?? []) {
      if (t.type !== "expense") continue;
      total += t.amount;
      if (t.category_id) m.set(t.category_id, (m.get(t.category_id) ?? 0) + t.amount);
    }
    return { m, total };
  }, [tx]);

  const overall = (budgets ?? []).find((b) => b.category_id === null);
  const expenseCats = (categories ?? []).filter((c) => c.kind === "expense");
  const budgetByCat = new Map((budgets ?? []).filter((b) => b.category_id).map((b) => [b.category_id!, b.amount]));

  // Categories with a budget first (highest usage), then the rest.
  const withBudget = expenseCats
    .filter((c) => budgetByCat.has(c.id))
    .sort(
      (a, b) =>
        (spentByCat.m.get(b.id) ?? 0) / (budgetByCat.get(b.id) || 1) -
        (spentByCat.m.get(a.id) ?? 0) / (budgetByCat.get(a.id) || 1)
    );
  const withoutBudget = expenseCats.filter((c) => !budgetByCat.has(c.id));

  if (lb || lc || lt) return <PageLoader />;

  const overPct = overall ? spentByCat.total / overall.amount : 0;

  return (
    <div>
      <PageHeader title="Budgets" subtitle={month.label} />

      {/* Overall */}
      <button
        onClick={() =>
          setTarget({ categoryId: null, label: "Overall", current: overall?.amount ?? 0 })
        }
        className="card mb-4 block w-full text-left"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Overall this month</p>
          <p className="text-sm text-muted">
            {overall ? `${formatCurrency(spentByCat.total)} / ${formatCurrency(overall.amount)}` : "Tap to set"}
          </p>
        </div>
        {overall && (
          <>
            <Bar pct={overPct} />
            <p className={`mt-1.5 text-xs ${overPct >= 1 ? "text-negative" : "text-muted"}`}>
              {overPct >= 1
                ? `Over by ${formatCurrency(spentByCat.total - overall.amount)}`
                : `${formatCurrency(overall.amount - spentByCat.total)} left`}
            </p>
          </>
        )}
      </button>

      {/* Per-category */}
      {withBudget.length > 0 && (
        <div className="mb-4 space-y-2">
          {withBudget.map((c) => {
            const limit = budgetByCat.get(c.id)!;
            const spent = spentByCat.m.get(c.id) ?? 0;
            const pct = spent / limit;
            return (
              <button
                key={c.id}
                onClick={() => setTarget({ categoryId: c.id, label: c.name, current: limit })}
                className="card block w-full text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-text">
                    {c.icon && <span>{c.icon}</span>}
                    {c.name}
                  </span>
                  <span className={`text-sm ${pct >= 1 ? "text-negative" : "text-muted"}`}>
                    {formatCurrency(spent)} / {formatCurrency(limit)}
                  </span>
                </div>
                <Bar pct={pct} />
              </button>
            );
          })}
        </div>
      )}

      {/* Add a budget to a category */}
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        {withBudget.length ? "Other categories" : "Set a budget"}
      </p>
      {withoutBudget.length === 0 ? (
        <EmptyState title="Every category has a budget" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {withoutBudget.map((c) => (
            <button
              key={c.id}
              onClick={() => setTarget({ categoryId: c.id, label: c.name, current: 0 })}
              className="chip"
            >
              {c.icon && <span>{c.icon}</span>}
              {c.name}
            </button>
          ))}
        </div>
      )}

      <BudgetSheet target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  const w = Math.min(100, Math.max(0, pct * 100));
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${w}%` }} />
    </div>
  );
}
