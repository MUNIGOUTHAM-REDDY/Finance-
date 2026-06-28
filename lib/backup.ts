import { defaultProfile, exportDB, replaceDB, type DB } from "@/lib/store";
import type {
  Account,
  Budget,
  Category,
  Loan,
  Profile,
  Recurring,
  Transaction,
} from "@/lib/types";

export interface Backup extends DB {
  app: "spendtrack";
  version: 1;
  exportedAt: string;
  accounts: Account[];
  categories: Category[];
  loans: Loan[];
  recurring: Recurring[];
  transactions: Transaction[];
  budgets: Budget[];
  profile: Profile;
}

export function buildBackup(): Backup {
  const db = exportDB();
  return {
    app: "spendtrack",
    version: 1,
    exportedAt: new Date().toISOString(),
    ...db,
  };
}

export function transactionsToCsv(b: Backup): string {
  const accById = new Map(b.accounts.map((a) => [a.id, a.name]));
  const catById = new Map(b.categories.map((c) => [c.id, c.name]));
  const header = ["date", "type", "amount", "category", "account", "note"];
  const rows = b.transactions
    .slice()
    .sort((a, z) => z.date.localeCompare(a.date))
    .map((t) =>
      [
        t.date,
        t.type,
        String(t.amount),
        catById.get(t.category_id ?? "") ?? "",
        accById.get(t.account_id) ?? "",
        (t.note ?? "").replace(/"/g, '""'),
      ]
        .map((v) => `"${v}"`)
        .join(",")
    );
  return [header.join(","), ...rows].join("\n");
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Replace all local data with the contents of a backup file.
export function restoreBackup(b: Backup): void {
  replaceDB({
    accounts: b.accounts ?? [],
    categories: b.categories ?? [],
    transactions: b.transactions ?? [],
    recurring: b.recurring ?? [],
    loans: b.loans ?? [],
    budgets: b.budgets ?? [],
    profile: b.profile ?? defaultProfile(),
  });
}
