// Shared TypeScript types mirroring the Supabase Postgres schema.

export type AccountType = "bank" | "upi" | "cash" | "credit_card" | "wallet";

export type CategoryKind = "expense" | "income";

export type TransactionType =
  | "expense"
  | "income"
  | "transfer"
  | "loan_given" // money you lent to a friend (cash leaves an account)
  | "loan_repaid_to_me" // friend paid you back (cash enters an account)
  | "loan_taken" // you borrowed money (cash enters an account)
  | "loan_repaid_by_me"; // you paid a loan back (cash leaves an account)

export type RecurringKind = "emi" | "rent" | "subscription" | "other";

export type Frequency = "monthly" | "weekly" | "yearly";

export type LoanDirection = "lent" | "borrowed";

export type LoanStatus = "open" | "settled";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  currency: string;
  color: string | null;
  icon: string | null;
  archived: boolean;
  created_at: string;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  color: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  to_account_id: string | null;
  loan_id: string | null;
  recurring_id: string | null;
  date: string; // yyyy-mm-dd
  note: string | null;
  created_at: string;
}

export interface Recurring {
  id: string;
  user_id: string;
  name: string;
  kind: RecurringKind;
  amount: number;
  account_id: string;
  category_id: string | null;
  frequency: Frequency;
  due_day: number;
  start_date: string;
  end_date: string | null;
  installments_total: number | null;
  next_due_date: string;
  auto_post: boolean;
  active: boolean;
  created_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  person_name: string;
  direction: LoanDirection;
  principal: number;
  account_id: string | null;
  date: string;
  note: string | null;
  status: LoanStatus;
  created_at: string;
}

export interface LoanWithOutstanding extends Loan {
  outstanding: number;
}

export interface Budget {
  id: string;
  category_id: string | null; // null = overall monthly budget
  amount: number;
}

export interface Profile {
  name: string;
  email: string;
  currency: string; // ISO code, default INR
  last_backup_at: string | null; // ISO timestamp of last export
}

// ---- Joined / display helpers ----

export interface TransactionWithRefs extends Transaction {
  category: Pick<Category, "id" | "name" | "icon" | "color"> | null;
  account: Pick<Account, "id" | "name" | "color"> | null;
}
