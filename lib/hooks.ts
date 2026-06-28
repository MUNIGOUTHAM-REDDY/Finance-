"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as store from "@/lib/store";
import type { TxFilters, NewTransaction } from "@/lib/store";
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
  TransactionWithRefs,
} from "@/lib/types";

export type { TxFilters, NewTransaction };

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

// ---------------------------------------------------------------- accounts

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async (): Promise<AccountWithBalance[]> => store.listAccounts(),
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
    }) => store.createAccount(input),
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Account> & { id: string }) =>
      store.updateAccount(id, patch),
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------- categories

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => store.listCategories(),
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
    }) => store.createCategory(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => store.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// ---------------------------------------------------------------- transactions

export function useTransactions(filters: TxFilters = {}) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async (): Promise<TransactionWithRefs[]> => store.listTransactions(filters),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["transactions", "one", id],
    queryFn: async (): Promise<TransactionWithRefs | null> => store.getTransaction(id),
  });
}

export function useCreateTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (input: NewTransaction) => store.createTransaction(input),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Transaction> & { id: string }) =>
      store.updateTransaction(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (id: string) => store.deleteTransaction(id),
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------- recurring

export function useRecurring() {
  return useQuery({
    queryKey: ["recurring"],
    queryFn: async (): Promise<Recurring[]> => store.listRecurring(),
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Recurring, "id" | "user_id" | "created_at">) =>
      store.createRecurring(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Recurring> & { id: string }) =>
      store.updateRecurring(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => store.deleteRecurring(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}

export function useMarkRecurringPaid() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (r: Recurring) => store.markRecurringPaid(r),
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------- loans

export function useLoans() {
  return useQuery({
    queryKey: ["loans"],
    queryFn: async (): Promise<LoanWithOutstanding[]> => store.listLoans(),
  });
}

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
    }) => store.createLoan(input),
    onSuccess: invalidate,
  });
}

export function useRecordRepayment() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (input: {
      loan: Loan;
      amount: number;
      account_id: string;
      date: string;
    }) => store.recordRepayment(input),
    onSuccess: invalidate,
  });
}

export function useSetLoanStatus() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Loan["status"] }) =>
      store.setLoanStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteLoan() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: async (id: string) => store.deleteLoan(id),
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------- budgets

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async (): Promise<Budget[]> => store.listBudgets(),
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      amount,
    }: {
      categoryId: string | null;
      amount: number;
    }) => store.upsertBudget(categoryId, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

// ---------------------------------------------------------------- profile

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile> => store.getProfile(),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => store.updateProfile(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
