"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader, EmptyState } from "@/components/ui";
import { TransactionRow } from "@/components/TransactionRow";
import { ChevronIcon, SearchIcon } from "@/components/icons";
import { useTransactions } from "@/lib/hooks";
import { formatDate } from "@/lib/format";
import type { TransactionType, TransactionWithRefs } from "@/lib/types";

const TYPES: { value: TransactionType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

function monthRangeOffset(offset: number) {
  const now = new Date();
  const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    start: iso(start),
    end: iso(end),
    label: ref.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  };
}

export default function TransactionsPage() {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [type, setType] = useState<TransactionType | "all">("all");
  const [search, setSearch] = useState("");

  const month = useMemo(() => monthRangeOffset(offset), [offset]);
  const { data, isLoading } = useTransactions({
    start: month.start,
    end: month.end,
    type: type === "all" ? undefined : type,
    search: search.trim() || undefined,
  });

  // Group transactions by date for readable sections.
  const groups = useMemo(() => {
    const map = new Map<string, TransactionWithRefs[]>();
    for (const t of data ?? []) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <div>
      <PageHeader title="Activity" />

      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          className="rounded-lg p-2 text-muted active:bg-surface-2"
          onClick={() => setOffset((o) => o - 1)}
          aria-label="Previous month"
        >
          <ChevronIcon className="h-5 w-5 rotate-180" />
        </button>
        <span className="text-sm font-medium text-text">{month.label}</span>
        <button
          className="rounded-lg p-2 text-muted active:bg-surface-2 disabled:opacity-30"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          aria-label="Next month"
        >
          <ChevronIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Search notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Type filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`chip whitespace-nowrap ${type === t.value ? "chip-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader />
      ) : groups.length === 0 ? (
        <EmptyState title="Nothing here" subtitle="No transactions match this view." />
      ) : (
        <div className="space-y-5">
          {groups.map(([date, items]) => (
            <div key={date}>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                {formatDate(date)}
              </p>
              <div className="card divide-y divide-border py-0">
                {items.map((t) => (
                  <TransactionRow
                    key={t.id}
                    tx={t}
                    onClick={() => router.push(`/transaction/${t.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
