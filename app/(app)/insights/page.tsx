"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader, EmptyState } from "@/components/ui";
import { useTransactions } from "@/lib/hooks";
import { formatCurrency, monthRange } from "@/lib/format";

export default function InsightsPage() {
  const now = useMemo(() => new Date(), []);
  const thisM = useMemo(() => monthRange(now), [now]);
  const prevM = useMemo(
    () => monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    [now]
  );

  const { data: thisTx, isLoading: l1 } = useTransactions({
    start: thisM.start,
    end: thisM.end,
  });
  const { data: prevTx, isLoading: l2 } = useTransactions({
    start: prevM.start,
    end: prevM.end,
  });

  const stats = useMemo(() => {
    const expenses = (thisTx ?? []).filter((t) => t.type === "expense");
    const total = expenses.reduce((s, t) => s + t.amount, 0);
    const prevTotal = (prevTx ?? [])
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const avgPerDay = total / dayOfMonth;
    const projected = avgPerDay * daysInMonth;
    const momPct = prevTotal > 0 ? (total - prevTotal) / prevTotal : null;

    // Daily spend bars for the whole month.
    const daily = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: 0 }));
    for (const t of expenses) {
      const d = Number(t.date.slice(8, 10));
      if (d >= 1 && d <= daysInMonth) daily[d - 1].amount += t.amount;
    }

    // Biggest categories this month.
    const byCat = new Map<
      string,
      { name: string; icon: string | null; color: string; amount: number }
    >();
    for (const t of expenses) {
      const name = t.category?.name ?? "Uncategorised";
      const cur = byCat.get(name);
      if (cur) cur.amount += t.amount;
      else
        byCat.set(name, {
          name,
          icon: t.category?.icon ?? null,
          color: t.category?.color ?? "#3b82f6",
          amount: t.amount,
        });
    }
    const top = [...byCat.values()].sort((a, b) => b.amount - a.amount).slice(0, 6);
    const maxCat = top[0]?.amount ?? 1;

    return { total, prevTotal, avgPerDay, projected, momPct, daily, top, maxCat, dayOfMonth };
  }, [thisTx, prevTx, now]);

  if (l1 || l2) return <PageLoader />;

  const hasData = stats.total > 0 || stats.prevTotal > 0;

  return (
    <div>
      <PageHeader title="Insights" subtitle={thisM.label} />

      {!hasData ? (
        <EmptyState
          title="No spending yet"
          subtitle="Log a few transactions and your trends will show up here."
        />
      ) : (
        <>
          {/* Headline stats */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="card">
              <p className="text-xs text-muted">Spent this month</p>
              <p className="mt-1 text-xl font-semibold text-text">
                {formatCurrency(stats.total)}
              </p>
              {stats.momPct !== null && (
                <p
                  className={`mt-1 text-xs ${
                    stats.momPct > 0 ? "text-negative" : "text-positive"
                  }`}
                >
                  {stats.momPct > 0 ? "▲" : "▼"} {Math.abs(Math.round(stats.momPct * 100))}% vs last month
                </p>
              )}
            </div>
            <div className="card">
              <p className="text-xs text-muted">Avg / day</p>
              <p className="mt-1 text-xl font-semibold text-text">
                {formatCurrency(Math.round(stats.avgPerDay))}
              </p>
              <p className="mt-1 text-xs text-muted">
                ~{formatCurrency(Math.round(stats.projected))} projected
              </p>
            </div>
          </div>

          {/* Daily spend */}
          <div className="card mb-4">
            <p className="mb-3 text-sm font-medium text-text">Daily spend</p>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.daily} barCategoryGap={1}>
                  <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
                    {stats.daily.map((d, i) => (
                      <Cell
                        key={i}
                        fill={i + 1 === stats.dayOfMonth ? "#3b82f6" : "#3a3a42"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted">
              <span>1</span>
              <span>{thisM.label.split(" ")[0]}</span>
              <span>{stats.daily.length}</span>
            </div>
          </div>

          {/* This vs last month */}
          <div className="card mb-4">
            <p className="mb-3 text-sm font-medium text-text">This month vs last</p>
            <CompareRow label={thisM.label} value={stats.total} max={Math.max(stats.total, stats.prevTotal)} accent />
            <CompareRow label={prevM.label} value={stats.prevTotal} max={Math.max(stats.total, stats.prevTotal)} />
          </div>

          {/* Biggest categories */}
          {stats.top.length > 0 && (
            <div className="card">
              <p className="mb-3 text-sm font-medium text-text">Biggest categories</p>
              <div className="space-y-2.5">
                {stats.top.map((c) => (
                  <div key={c.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-text">
                        {c.icon && <span>{c.icon}</span>}
                        {c.name}
                      </span>
                      <span className="text-muted">{formatCurrency(c.amount)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(c.amount / stats.maxCat) * 100}%`,
                          background: c.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CompareRow({
  label,
  value,
  max,
  accent,
}: {
  label: string;
  value: number;
  max: number;
  accent?: boolean;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="text-text">{formatCurrency(value)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full ${accent ? "bg-accent" : "bg-muted/50"}`}
          style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
