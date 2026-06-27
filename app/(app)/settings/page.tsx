"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/ui";
import { CategorySheet } from "@/components/CategorySheet";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { useCategories, useDeleteCategory, useUser } from "@/lib/hooks";
import {
  buildBackup,
  download,
  restoreBackup,
  transactionsToCsv,
  type Backup,
} from "@/lib/backup";

export default function SettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { email } = useUser();
  const { data: categories, isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();
  const fileRef = useRef<HTMLInputElement>(null);

  const [catOpen, setCatOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  async function exportJson() {
    setBusy("json");
    try {
      const b = await buildBackup();
      download(
        `spendtrack-backup-${b.exportedAt.slice(0, 10)}.json`,
        JSON.stringify(b, null, 2),
        "application/json"
      );
    } finally {
      setBusy(null);
    }
  }

  async function exportCsv() {
    setBusy("csv");
    try {
      const b = await buildBackup();
      download(
        `spendtrack-transactions-${b.exportedAt.slice(0, 10)}.csv`,
        transactionsToCsv(b),
        "text/csv"
      );
    } finally {
      setBusy(null);
    }
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!confirm("Import will add the backup's data to this account. Continue?")) return;
    setBusy("import");
    setMessage(null);
    try {
      const parsed = JSON.parse(await file.text()) as Backup;
      if (parsed.app !== "spendtrack") throw new Error("Not a SpendTrack backup");
      await restoreBackup(parsed);
      qc.invalidateQueries();
      setMessage("Backup imported.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <PageLoader />;

  const expense = (categories ?? []).filter((c) => c.kind === "expense");
  const income = (categories ?? []).filter((c) => c.kind === "income");

  return (
    <div>
      <PageHeader title="Settings" />

      {/* Account */}
      <section className="card mb-4">
        <p className="text-xs uppercase tracking-wide text-muted">Account</p>
        <p className="mt-1 truncate text-sm text-text">{email ?? "—"}</p>
        <button onClick={signOut} className="btn-ghost mt-3 w-full text-negative">
          Sign out
        </button>
      </section>

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
          Your data lives in the cloud. Export a copy any time.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button onClick={exportJson} disabled={!!busy} className="btn-ghost text-sm">
            {busy === "json" ? "Exporting…" : "Export JSON"}
          </button>
          <button onClick={exportCsv} disabled={!!busy} className="btn-ghost text-sm">
            {busy === "csv" ? "Exporting…" : "Export CSV"}
          </button>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!!busy}
          className="btn-ghost mt-3 w-full text-sm"
        >
          {busy === "import" ? "Importing…" : "Import JSON backup"}
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

      <p className="px-1 text-center text-xs text-muted">
        SpendTrack · amounts in INR (₹)
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
