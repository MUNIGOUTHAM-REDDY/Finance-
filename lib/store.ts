// Local-storage data layer. Everything lives on the device — no backend.
// (Cloud sync via Supabase/Google can be layered on later; the hook API in
// lib/hooks.ts stays the same so the UI never needs to change.)

import { todayISO } from "@/lib/format";
import type {
  Account,
  AccountWithBalance,
  Budget,
  Category,
  Loan,
  LoanWithOutstanding,
  Profile,
  Recurring,
  Transaction,
  TransactionType,
  TransactionWithRefs,
} from "@/lib/types";

const KEY = "spendtrack:v1";

export interface DB {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurring: Recurring[];
  loans: Loan[];
  budgets: Budget[];
  profile: Profile;
}

export function defaultProfile(): Profile {
  return { name: "", email: "", currency: "INR", last_backup_at: null };
}

function emptyDB(): DB {
  return {
    accounts: [],
    categories: [],
    transactions: [],
    recurring: [],
    loans: [],
    budgets: [],
    profile: defaultProfile(),
  };
}

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.abs(hash(String(performance.now()) + ":" + counter++)).toString(36);
}
let counter = 0;
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

function nowISO(): string {
  // Avoid Date.now in shared utils; fine in browser runtime.
  return new Date().toISOString();
}

const DEFAULT_CATEGORIES: Omit<Category, "id" | "user_id" | "created_at">[] = [
  { name: "Food", kind: "expense", icon: "🍔", color: "#f59e0b" },
  { name: "Groceries", kind: "expense", icon: "🛒", color: "#84cc16" },
  { name: "Transport", kind: "expense", icon: "🚕", color: "#22d3ee" },
  { name: "Rent", kind: "expense", icon: "🏠", color: "#f97316" },
  { name: "Bills", kind: "expense", icon: "🧾", color: "#eab308" },
  { name: "Subscriptions", kind: "expense", icon: "📺", color: "#a78bfa" },
  { name: "Shopping", kind: "expense", icon: "🛍️", color: "#ec4899" },
  { name: "Health", kind: "expense", icon: "💊", color: "#ef4444" },
  { name: "Gym", kind: "expense", icon: "🏋️", color: "#10b981" },
  { name: "Entertainment", kind: "expense", icon: "🎬", color: "#8b5cf6" },
  { name: "Travel", kind: "expense", icon: "✈️", color: "#06b6d4" },
  { name: "Education", kind: "expense", icon: "📚", color: "#3b82f6" },
  { name: "Other", kind: "expense", icon: "💸", color: "#94a3b8" },
  { name: "Salary", kind: "income", icon: "💼", color: "#34d399" },
  { name: "Freelance", kind: "income", icon: "🧑‍💻", color: "#22c55e" },
  { name: "Interest", kind: "income", icon: "🏦", color: "#10b981" },
  { name: "Refund", kind: "income", icon: "↩️", color: "#14b8a6" },
  { name: "Other Income", kind: "income", icon: "➕", color: "#4ade80" },
];

const DEFAULT_ACCOUNTS: Omit<Account, "id" | "user_id" | "created_at" | "balance">[] = [
  { name: "Cash", type: "cash", opening_balance: 0, currency: "INR", icon: "💵", color: "#22c55e", archived: false },
  { name: "UPI", type: "upi", opening_balance: 0, currency: "INR", icon: "📱", color: "#5b8cff", archived: false },
];

function seed(db: DB): DB {
  const created_at = nowISO();
  db.categories = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    id: uid(),
    user_id: "local",
    created_at,
  }));
  db.accounts = DEFAULT_ACCOUNTS.map((a) => ({
    ...a,
    id: uid(),
    user_id: "local",
    created_at,
  }));
  return db;
}

export function getDB(): DB {
  if (typeof window === "undefined") return emptyDB();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    const db = seed(emptyDB());
    window.localStorage.setItem(KEY, JSON.stringify(db));
    return db;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DB>;
    return {
      accounts: parsed.accounts ?? [],
      categories: parsed.categories ?? [],
      transactions: parsed.transactions ?? [],
      recurring: parsed.recurring ?? [],
      loans: parsed.loans ?? [],
      budgets: parsed.budgets ?? [],
      profile: { ...defaultProfile(), ...(parsed.profile ?? {}) },
    };
  } catch {
    return seed(emptyDB());
  }
}

export function setDB(db: DB): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

function mutate(fn: (db: DB) => void): void {
  const db = getDB();
  fn(db);
  setDB(db);
}

// ----------------------------------------------------------------- balances

function balanceMap(db: DB): Map<string, number> {
  const m = new Map<string, number>(db.accounts.map((a) => [a.id, Number(a.opening_balance)]));
  for (const t of db.transactions) {
    if (t.type === "transfer") {
      m.set(t.account_id, (m.get(t.account_id) ?? 0) - t.amount);
      if (t.to_account_id) m.set(t.to_account_id, (m.get(t.to_account_id) ?? 0) + t.amount);
      continue;
    }
    const sign =
      t.type === "income" || t.type === "loan_repaid_to_me" || t.type === "loan_taken" ? 1 : -1;
    m.set(t.account_id, (m.get(t.account_id) ?? 0) + sign * t.amount);
  }
  return m;
}

// ----------------------------------------------------------------- accounts

export function listAccounts(): AccountWithBalance[] {
  const db = getDB();
  const bal = balanceMap(db);
  return [...db.accounts]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((a) => ({ ...a, balance: bal.get(a.id) ?? Number(a.opening_balance) }));
}

export function createAccount(input: {
  name: string;
  type: Account["type"];
  opening_balance: number;
  icon?: string;
  color?: string;
}): void {
  mutate((db) => {
    db.accounts.push({
      id: uid(),
      user_id: "local",
      created_at: nowISO(),
      currency: "INR",
      archived: false,
      color: input.color ?? null,
      icon: input.icon ?? null,
      name: input.name,
      type: input.type,
      opening_balance: input.opening_balance,
    });
  });
}

export function updateAccount(id: string, patch: Partial<Account>): void {
  mutate((db) => {
    const a = db.accounts.find((x) => x.id === id);
    if (a) Object.assign(a, patch);
  });
}

// ----------------------------------------------------------------- categories

export function listCategories(): Category[] {
  return [...getDB().categories].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)
  );
}

export function createCategory(input: {
  name: string;
  kind: Category["kind"];
  icon?: string;
  color?: string;
}): void {
  mutate((db) => {
    db.categories.push({
      id: uid(),
      user_id: "local",
      created_at: nowISO(),
      icon: input.icon ?? null,
      color: input.color ?? null,
      name: input.name,
      kind: input.kind,
    });
  });
}

export function deleteCategory(id: string): void {
  mutate((db) => {
    db.categories = db.categories.filter((c) => c.id !== id);
    for (const t of db.transactions) if (t.category_id === id) t.category_id = null;
  });
}

// ----------------------------------------------------------------- transactions

export interface TxFilters {
  start?: string;
  end?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  search?: string;
  limit?: number;
}

export function listTransactions(filters: TxFilters = {}): TransactionWithRefs[] {
  const db = getDB();
  const accById = new Map(db.accounts.map((a) => [a.id, a]));
  const catById = new Map(db.categories.map((c) => [c.id, c]));

  let rows = db.transactions.slice();
  if (filters.start) rows = rows.filter((t) => t.date >= filters.start!);
  if (filters.end) rows = rows.filter((t) => t.date <= filters.end!);
  if (filters.accountId) rows = rows.filter((t) => t.account_id === filters.accountId);
  if (filters.categoryId) rows = rows.filter((t) => t.category_id === filters.categoryId);
  if (filters.type) rows = rows.filter((t) => t.type === filters.type);
  if (filters.search) {
    const s = filters.search.toLowerCase();
    rows = rows.filter((t) => (t.note ?? "").toLowerCase().includes(s));
  }
  rows.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  if (filters.limit) rows = rows.slice(0, filters.limit);

  return rows.map((t) => {
    const c = t.category_id ? catById.get(t.category_id) : null;
    const a = accById.get(t.account_id);
    return {
      ...t,
      category: c ? { id: c.id, name: c.name, icon: c.icon, color: c.color } : null,
      account: a ? { id: a.id, name: a.name, color: a.color } : null,
    };
  });
}

export interface NewTransaction {
  type: TransactionType;
  amount: number;
  account_id: string;
  category_id?: string | null;
  to_account_id?: string | null;
  loan_id?: string | null;
  recurring_id?: string | null;
  date: string;
  note?: string | null;
}

export function createTransaction(input: NewTransaction): void {
  mutate((db) => {
    db.transactions.push({
      id: uid(),
      user_id: "local",
      created_at: nowISO(),
      category_id: input.category_id ?? null,
      to_account_id: input.to_account_id ?? null,
      loan_id: input.loan_id ?? null,
      recurring_id: input.recurring_id ?? null,
      note: input.note ?? null,
      type: input.type,
      amount: input.amount,
      account_id: input.account_id,
      date: input.date,
    });
  });
}

export function updateTransaction(id: string, patch: Partial<Transaction>): void {
  mutate((db) => {
    const t = db.transactions.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
  });
}

export function deleteTransaction(id: string): void {
  mutate((db) => {
    db.transactions = db.transactions.filter((t) => t.id !== id);
  });
}

// ----------------------------------------------------------------- recurring

export function listRecurring(): Recurring[] {
  return [...getDB().recurring].sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
}

export function createRecurring(input: Omit<Recurring, "id" | "user_id" | "created_at">): void {
  mutate((db) => {
    db.recurring.push({ ...input, id: uid(), user_id: "local", created_at: nowISO() });
  });
}

export function updateRecurring(id: string, patch: Partial<Recurring>): void {
  mutate((db) => {
    const r = db.recurring.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
  });
}

export function deleteRecurring(id: string): void {
  mutate((db) => {
    db.recurring = db.recurring.filter((r) => r.id !== id);
  });
}

// ----------------------------------------------------------------- loans

export function listLoans(): LoanWithOutstanding[] {
  const db = getDB();
  const repaid = new Map<string, number>();
  for (const t of db.transactions) {
    if (t.loan_id && (t.type === "loan_repaid_to_me" || t.type === "loan_repaid_by_me")) {
      repaid.set(t.loan_id, (repaid.get(t.loan_id) ?? 0) + t.amount);
    }
  }
  return [...db.loans]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((l) => ({ ...l, outstanding: Number(l.principal) - (repaid.get(l.id) ?? 0) }));
}

export function createLoan(input: {
  person_name: string;
  direction: Loan["direction"];
  principal: number;
  account_id: string | null;
  date: string;
  note?: string | null;
}): void {
  mutate((db) => {
    const loanId = uid();
    db.loans.push({
      id: loanId,
      user_id: "local",
      created_at: nowISO(),
      status: "open",
      note: input.note ?? null,
      person_name: input.person_name,
      direction: input.direction,
      principal: input.principal,
      account_id: input.account_id,
      date: input.date,
    });
    if (input.account_id) {
      db.transactions.push({
        id: uid(),
        user_id: "local",
        created_at: nowISO(),
        account_id: input.account_id,
        type: input.direction === "lent" ? "loan_given" : "loan_taken",
        amount: input.principal,
        category_id: null,
        to_account_id: null,
        loan_id: loanId,
        recurring_id: null,
        date: input.date,
        note: `${input.direction === "lent" ? "Lent to" : "Borrowed from"} ${input.person_name}`,
      });
    }
  });
}

export function recordRepayment(input: {
  loan: Loan;
  amount: number;
  account_id: string;
  date: string;
}): void {
  mutate((db) => {
    db.transactions.push({
      id: uid(),
      user_id: "local",
      created_at: nowISO(),
      account_id: input.account_id,
      type: input.loan.direction === "lent" ? "loan_repaid_to_me" : "loan_repaid_by_me",
      amount: input.amount,
      category_id: null,
      to_account_id: null,
      loan_id: input.loan.id,
      recurring_id: null,
      date: input.date,
      note: `Repayment · ${input.loan.person_name}`,
    });
  });
}

export function setLoanStatus(id: string, status: Loan["status"]): void {
  mutate((db) => {
    const l = db.loans.find((x) => x.id === id);
    if (l) l.status = status;
  });
}

export function deleteLoan(id: string): void {
  mutate((db) => {
    db.loans = db.loans.filter((l) => l.id !== id);
  });
}

// ----------------------------------------------------------------- recurring mark-paid

export function markRecurringPaid(r: Recurring): void {
  const next =
    r.frequency === "weekly"
      ? advanceDays(r.next_due_date, 7)
      : addMonths(r.next_due_date, r.frequency === "yearly" ? 12 : 1);
  const remaining = r.installments_total != null ? r.installments_total - 1 : null;
  const stillActive =
    remaining == null || remaining > 0 ? !(r.end_date && next > r.end_date) : false;

  mutate((db) => {
    db.transactions.push({
      id: uid(),
      user_id: "local",
      created_at: nowISO(),
      account_id: r.account_id,
      type: "expense",
      amount: r.amount,
      category_id: r.category_id,
      to_account_id: null,
      loan_id: null,
      recurring_id: r.id,
      date: todayISO(),
      note: r.name,
    });
    const item = db.recurring.find((x) => x.id === r.id);
    if (item) {
      item.next_due_date = next;
      item.installments_total = remaining;
      item.active = stillActive;
    }
  });
}

function advanceDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function addMonths(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

// ----------------------------------------------------------------- budgets

export function listBudgets(): Budget[] {
  return [...getDB().budgets];
}

// Set (or clear) the monthly budget for a category, or overall (categoryId=null).
export function upsertBudget(categoryId: string | null, amount: number): void {
  mutate((db) => {
    const existing = db.budgets.find((b) => b.category_id === categoryId);
    if (amount <= 0) {
      db.budgets = db.budgets.filter((b) => b.category_id !== categoryId);
      return;
    }
    if (existing) existing.amount = amount;
    else db.budgets.push({ id: uid(), category_id: categoryId, amount });
  });
}

export function deleteBudget(id: string): void {
  mutate((db) => {
    db.budgets = db.budgets.filter((b) => b.id !== id);
  });
}

// ----------------------------------------------------------------- profile

export function getProfile(): Profile {
  return getDB().profile;
}

export function updateProfile(patch: Partial<Profile>): void {
  mutate((db) => {
    db.profile = { ...db.profile, ...patch };
  });
}

// ----------------------------------------------------------------- backup

export function exportDB(): DB {
  return getDB();
}

export function replaceDB(db: DB): void {
  setDB({
    accounts: db.accounts ?? [],
    categories: db.categories ?? [],
    transactions: db.transactions ?? [],
    recurring: db.recurring ?? [],
    loans: db.loans ?? [],
    budgets: db.budgets ?? [],
    profile: { ...defaultProfile(), ...(db.profile ?? {}) },
  });
}

export function clearDB(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}
