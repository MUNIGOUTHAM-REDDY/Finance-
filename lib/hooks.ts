"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addMonthsISO, todayISO } from "@/lib/format";
import type {
  Account,
  AccountWithBalance,
  Category,
  Loan,
  LoanWithOutstanding,
  Recurring,
  TransactionType,
  TransactionWithRefs,
} from "@/lib/types";

// Lazily construct a single browser client. Avoids running createClient at
// module load (which would throw during prerender when env vars are absent).
let _client: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_client) _client = createClient();
  return _client;
}

async function getUserId(): Promise<string> {
  const { data } = await sb().auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

// Invalidate everything that can change when money moves.
function useInvalidateMoney() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["loans"] });
    qc.invalidateQueries({ queryKey: ["recurring"] });
  };
}

// ---------------------------------------------------------------- auth/user

export function useUser() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    sb().auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = sb().auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { userId, email, loading: userId === undefined };
}

// ---------------------------------------------------------------- accounts

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async (): Promise<AccountWithBalance[]> => {
      const [accountsRes, balancesRes] = await Promise.all([
        sb().from("accounts").select("*").order("created_at"),
        sb().from("account_balances").select("account_id,balance"),
      ]);
      if (accountsRes.error) throw accountsRes.error;
      if (balancesRes.error) throw balancesRes.error;
      const balances = new Map<string, number>(
        (balancesRes.data ?? []).map((b) => [b.account_id, Number(b.balance)])
      );
      return (accountsRes.data as Account[]).map((a) => ({
        ...a,
        opening_balance: Number(a.opening_balance),
        balance: balances.get(a.id) ?? Number(a.opening_balance),
      }));
    },
  });
}

export function useCreateAccount() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      type: Account["type"];
      opening_balance: number;
      icon?: string;
      color?: string;
    }) => {
      const user_id = await getUserId();
      const { error } = await sb().from("accounts").insert({ ...input, user_id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Account> & { id: string }) => {
      const { error } = await sb().from("accounts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------- categories

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await sb()
        .from("categories")
        .select("*")
        .order("kind")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      kind: Category["kind"];
      icon?: string;
      color?: string;
    }) => {
      const user_id = await getUserId();
      const { error } = await sb().from("categories").insert({ ...input, user_id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// ---------------------------------------------------------------- transactions

export interface TxFilters {
  start?: string;
  end?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  search?: string;
  limit?: number;
}

const TX_SELECT =
  "*, category:categories(id,name,icon,color), account:accounts(id,name,color)";

export function useTransactions(filters: TxFilters = {}) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async (): Promise<TransactionWithRefs[]> => {
      let q = sb()
        .from("transactions")
        .select(TX_SELECT)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (filters.start) q = q.gte("date", filters.start);
      if (filters.end) q = q.lte("date", filters.end);
      if (filters.accountId) q = q.eq("account_id", filters.accountId);
      if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
      if (filters.type) q = q.eq("type", filters.type);
      if (filters.search) q = q.ilike("note", `%${filters.search}%`);
      if (filters.limit) q = q.limit(filters.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as TransactionWithRefs[]).map((t) => ({
        ...t,
        amount: Number(t.amount),
      }));
    },
  });
}

export interface NewTransaction {
  type: TransactionType;
  amount: number;
  account_id: string;
  category_id?: string | null;
  to_account_id?: string | null;
  loan_id?: string | null;
  date: string;
  note?: string | null;
}

export function useCreateTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (input: NewTransaction) => {
      const user_id = await getUserId();
      const { error } = await sb().from("transactions").insert({ ...input, user_id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: Partial<NewTransaction> & { id: string }) => {
      const { error } = await sb().from("transactions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------- recurring

export function useRecurring() {
  return useQuery({
    queryKey: ["recurring"],
    queryFn: async (): Promise<Recurring[]> => {
      const { data, error } = await sb()
        .from("recurring")
        .select("*")
        .order("next_due_date");
      if (error) throw error;
      return (data as Recurring[]).map((r) => ({ ...r, amount: Number(r.amount) }));
    },
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<Recurring, "id" | "user_id" | "created_at" | "active"> & {
        active?: boolean;
      }
    ) => {
      const user_id = await getUserId();
      const { error } = await sb().from("recurring").insert({ ...input, user_id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Recurring> & { id: string }) => {
      const { error } = await sb().from("recurring").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("recurring").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}

// Posts a transaction for a due recurring item and advances its next due date.
export function useMarkRecurringPaid() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (r: Recurring) => {
      const user_id = await getUserId();
      const { error: txError } = await sb().from("transactions").insert({
        user_id,
        account_id: r.account_id,
        type: "expense",
        amount: r.amount,
        category_id: r.category_id,
        recurring_id: r.id,
        date: todayISO(),
        note: r.name,
      });
      if (txError) throw txError;

      const step = r.frequency === "weekly" ? 0 : r.frequency === "yearly" ? 12 : 1;
      const nextDue =
        r.frequency === "weekly"
          ? advanceDays(r.next_due_date, 7)
          : addMonthsISO(r.next_due_date, step);

      const remaining =
        r.installments_total != null ? r.installments_total - 1 : null;
      const stillActive =
        remaining == null || remaining > 0
          ? !(r.end_date && nextDue > r.end_date)
          : false;

      const { error: upError } = await sb()
        .from("recurring")
        .update({
          next_due_date: nextDue,
          installments_total: remaining,
          active: stillActive,
        })
        .eq("id", r.id);
      if (upError) throw upError;
    },
    onSuccess: invalidate,
  });
}

function advanceDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- loans

export function useLoans() {
  return useQuery({
    queryKey: ["loans"],
    queryFn: async (): Promise<LoanWithOutstanding[]> => {
      const [loansRes, balancesRes] = await Promise.all([
        sb().from("loans").select("*").order("created_at", { ascending: false }),
        sb().from("loan_balances").select("loan_id,outstanding"),
      ]);
      if (loansRes.error) throw loansRes.error;
      if (balancesRes.error) throw balancesRes.error;
      const out = new Map<string, number>(
        (balancesRes.data ?? []).map((b) => [b.loan_id, Number(b.outstanding)])
      );
      return (loansRes.data as Loan[]).map((l) => ({
        ...l,
        principal: Number(l.principal),
        outstanding: out.get(l.id) ?? Number(l.principal),
      }));
    },
  });
}

// Creates a loan and the matching cash-movement transaction.
export function useCreateLoan() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (input: {
      person_name: string;
      direction: Loan["direction"];
      principal: number;
      account_id: string | null;
      date: string;
      note?: string | null;
    }) => {
      const user_id = await getUserId();
      const { data: loan, error } = await sb()
        .from("loans")
        .insert({ ...input, user_id })
        .select()
        .single();
      if (error) throw error;

      if (input.account_id) {
        const { error: txError } = await sb().from("transactions").insert({
          user_id,
          account_id: input.account_id,
          type: input.direction === "lent" ? "loan_given" : "loan_taken",
          amount: input.principal,
          loan_id: loan.id,
          date: input.date,
          note: `${input.direction === "lent" ? "Lent to" : "Borrowed from"} ${input.person_name}`,
        });
        if (txError) throw txError;
      }
    },
    onSuccess: invalidate,
  });
}

// Records a repayment against a loan (cash moves the opposite way).
export function useRecordRepayment() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (input: {
      loan: Loan;
      amount: number;
      account_id: string;
      date: string;
    }) => {
      const user_id = await getUserId();
      const { error } = await sb().from("transactions").insert({
        user_id,
        account_id: input.account_id,
        type:
          input.loan.direction === "lent" ? "loan_repaid_to_me" : "loan_repaid_by_me",
        amount: input.amount,
        loan_id: input.loan.id,
        date: input.date,
        note: `Repayment · ${input.loan.person_name}`,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSetLoanStatus() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Loan["status"] }) => {
      const { error } = await sb().from("loans").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteLoan() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from("loans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
