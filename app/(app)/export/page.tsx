"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageLoader } from "@/components/ui";
import { TimeRangeControl } from "@/components/TimeRangeControl";
import { ChevronIcon } from "@/components/icons";
import {
  useAccounts,
  useCategories,
  useTransactions,
  useUpdateProfile,
} from "@/lib/hooks";
import { rangeFor, type RangeKey } from "@/lib/range";
import {
  buildBackup,
  download,
  transactionsToCsv,
  type Backup,
} from "@/lib/backup";

export default function ExportPage() {
  const [rangeKey, setRangeKey] = useState<RangeKey>("1Y");
  const [csv, setCsv] = useState(true);
  const [json, setJson] = useState(true);
  const updateProfile = useUpdateProfile();

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);
  const { data: accounts, isLoading: la } = useAccounts();
  const { data: categories } = useCategories();
  const { data: rangeTx, isLoading: lt } = useTransactions({
    start: range.start,
    end: range.end,
  });

  if (la || lt) return <PageLoader />;

  function doExport() {
    const full = buildBackup();
    const stamp = full.exportedAt.slice(0, 10);
    if (json) {
      download(`spendtrack-backup-${stamp}.json`, JSON.stringify(full, null, 2), "application/json");
    }
    if (csv) {
      const scoped: Backup = {
        ...full,
        transactions: full.transactions.filter(
          (t) => t.date >= range.start && t.date <= range.end
        ),
      };
      download(`spendtrack-transactions-${stamp}.csv`, transactionsToCsv(scoped), "text/csv");
    }
    updateProfile.mutate({ last_backup_at: new Date().toISOString() });
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Link href="/" className="rounded-lg p-1 text-muted active:bg-surface-2">
          <ChevronIcon className="h-5 w-5 rotate-180" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Export</h1>
      </div>

      {/* Summary */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-text">You will export</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat n={(accounts ?? []).length} label="Accounts" />
          <Stat n={(rangeTx ?? []).length} label="Transactions" />
          <Stat n={(categories ?? []).length} label="Categories" />
        </div>
        <p className="mt-3 text-xs text-muted">
          JSON is a full backup of everything. CSV covers the selected range.
        </p>
      </div>

      {/* Time range */}
      <div className="card mb-4">
        <p className="mb-3 text-sm font-medium text-text">Time range (CSV)</p>
        <TimeRangeControl value={rangeKey} onChange={setRangeKey} />
        <p className="mt-2 text-center text-xs text-muted">{range.label}</p>
      </div>

      {/* Include */}
      <div className="card mb-4">
        <p className="mb-1 text-sm font-medium text-text">Include</p>
        <Toggle label="JSON (full backup)" on={json} onToggle={() => setJson((v) => !v)} />
        <Toggle label="CSV (Excel compatible)" on={csv} onToggle={() => setCsv((v) => !v)} />
      </div>

      <button
        onClick={doExport}
        disabled={!csv && !json}
        className="btn-primary w-full"
      >
        Export
      </button>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 py-3">
      <p className="text-xl font-semibold text-text">{n}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

function Toggle({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between py-2.5 text-left"
    >
      <span className="text-[15px] text-text">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${on ? "bg-positive" : "bg-surface-2"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            on ? "left-[1.4rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
