"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/ui";
import { CategorySheet } from "@/components/CategorySheet";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { useCategories, useDeleteCategory } from "@/lib/hooks";
import { clearDB } from "@/lib/store";
import {
  buildBackup,
  download,
  restoreBackup,
  transactionsToCsv,
  type Backup,
} from "@/lib/backup";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: categories, isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();
  const fileRef = useRef<HTMLInputElement>(null);

  const [catOpen, setCatOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function exportJson() {
    const b = buildBackup();
    download(
      `spendtrack-backup-${b.exportedAt.slice(0, 10)}.json`,
      JSON.stringify(b, null, 2),
      "application/json"
    );
  }

  function exportCsv() {
    const b = buildBackup();
    download(
      `spendtrack-transactions-${b.exportedAt.slice(0, 10)}.csv`,
      transactionsToCsv(b),
      "text/csv"
    );
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!confirm("Importing will replace all current data on this device. Continue?")) return;
    setMessage(null);
    try {
      const parsed = JSON.parse(await file.text()) as Backup;
      if (parsed.app !== "spendtrack") throw new Error("Not a SpendTrack backup");
      restoreBackup(parsed);
      qc.invalidateQueries();
      setMessage("Backup restored.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    }
  }

  function clearAll() {
    if (!confirm("Delete ALL data on this device? Export a backup first if unsure.")) return;
    clearDB();
    qc.invalidateQueries();
    setMessage("All data cleared.");
  }

  if (isLoading) return <PageLoader />;

  const expense = (categories ?? []).filter((c) => c.kind === "expense");
  const income = (categories ?? []).filter((c) => c.kind === "income");

  return (
    <div>
      <PageHeader title="Settings" />

      {/* Categories */}
      <section className="card mb-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted">Categories</p>
          <button onClick={() => setCatOpen(true)} className="text-accent" aria-label="Add category">
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
        <CategoryGroup
          title="Expense"
          items={expense}
          onDelete={(id) => deleteCategory.mutate(id)}
        />
        <CategoryGroup
          title="Income"
          items={income}
          onDelete={(id) => deleteCategory.mutate(id)}
        />
      </section>

      {/* Backup */}
      <section className="card mb-4">
        <p className="text-xs uppercase tracking-wide text-muted">Backup</p>
        <p className="mt-1 text-sm text-muted">
          Your data is stored on this device. Export a copy regularly so you never
          lose it.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button onClick={exportJson} className="btn-ghost text-sm">
            Export JSON
          </button>
          <button onClick={exportCsv} className="btn-ghost text-sm">
            Export CSV
          </button>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="btn-ghost mt-3 w-full text-sm"
        >
          Import JSON backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={onImportFile}
        />
        {message && <p className="mt-2 text-sm text-accent">{message}</p>}
      </section>

      {/* Danger zone */}
      <section className="card mb-4">
        <p className="text-xs uppercase tracking-wide text-muted">Data</p>
        <button onClick={clearAll} className="btn-ghost mt-2 w-full text-negative">
          Clear all data
        </button>
      </section>

      <p className="px-1 text-center text-xs text-muted">
        SpendTrack · stored on this device · amounts in INR (₹)
      </p>

      <CategorySheet open={catOpen} onClose={() => setCatOpen(false)} />
    </div>
  );
}

function CategoryGroup({
  title,
  items,
  onDelete,
}: {
  title: string;
  items: { id: string; name: string; icon: string | null }[];
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((c) => (
          <span key={c.id} className="chip">
            {c.icon && <span>{c.icon}</span>}
            {c.name}
            <button
              onClick={() => onDelete(c.id)}
              className="ml-1 text-muted"
              aria-label={`Delete ${c.name}`}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
