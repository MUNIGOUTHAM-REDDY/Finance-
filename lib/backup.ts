import { createClient } from "@/lib/supabase/client";
import type {
  Account,
  Category,
  Loan,
  Recurring,
  Transaction,
} from "@/lib/types";

export interface Backup {
  app: "spendtrack";
  version: 1;
  exportedAt: string;
  accounts: Account[];
  categories: Category[];
  loans: Loan[];
  recurring: Recurring[];
  transactions: Transaction[];
}

let _client: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_client) _client = createClient();
  return _client;
}

// Pull every row the user can see into a single JSON object.
export async function buildBackup(): Promise<Backup> {
  const [accounts, categories, loans, recurring, transactions] = await Promise.all([
    sb().from("accounts").select("*"),
    sb().from("categories").select("*"),
    sb().from("loans").select("*"),
    sb().from("recurring").select("*"),
    sb().from("transactions").select("*"),
  ]);
  for (const r of [accounts, categories, loans, recurring, transactions]) {
    if (r.error) throw r.error;
  }
  return {
    app: "spendtrack",
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts: (accounts.data ?? []) as Account[],
    categories: (categories.data ?? []) as Category[],
    loans: (loans.data ?? []) as Loan[],
    recurring: (recurring.data ?? []) as Recurring[],
    transactions: (transactions.data ?? []) as Transaction[],
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

// Restore a backup into the current user's account, remapping all IDs so the
// data belongs to this user and foreign keys stay consistent.
export async function restoreBackup(b: Backup): Promise<void> {
  const { data: userData } = await sb().auth.getUser();
  const user_id = userData.user?.id;
  if (!user_id) throw new Error("Not signed in");

  const remap = new Map<string, string>();
  const strip = <T extends { id: string; user_id: string; created_at: string }>(
    row: T
  ) => {
    const { id, user_id: _u, created_at: _c, ...rest } = row;
    return rest;
  };

  async function insertAll<T extends { id: string; user_id: string; created_at: string }>(
    table: string,
    rows: T[],
    patch: (row: Omit<T, "id" | "user_id" | "created_at">) => Record<string, unknown>
  ) {
    for (const row of rows) {
      const { data, error } = await sb()
        .from(table)
        .insert({ ...patch(strip(row)), user_id })
        .select("id")
        .single();
      if (error) throw error;
      remap.set(row.id, data.id);
    }
  }

  // Order matters: accounts + categories first, then loans, recurring, txns.
  await insertAll("accounts", b.accounts, (r) => ({ ...r }));
  await insertAll("categories", b.categories, (r) => ({ ...r }));
  await insertAll("loans", b.loans, (r) => ({
    ...r,
    account_id: r.account_id ? remap.get(r.account_id) ?? null : null,
  }));
  await insertAll("recurring", b.recurring, (r) => ({
    ...r,
    account_id: remap.get(r.account_id),
    category_id: r.category_id ? remap.get(r.category_id) ?? null : null,
  }));
  await insertAll("transactions", b.transactions, (r) => ({
    ...r,
    account_id: remap.get(r.account_id),
    category_id: r.category_id ? remap.get(r.category_id) ?? null : null,
    to_account_id: r.to_account_id ? remap.get(r.to_account_id) ?? null : null,
    loan_id: r.loan_id ? remap.get(r.loan_id) ?? null : null,
    recurring_id: r.recurring_id ? remap.get(r.recurring_id) ?? null : null,
  }));
}
