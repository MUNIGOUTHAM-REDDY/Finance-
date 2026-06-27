import type { TransactionType, TransactionWithRefs } from "@/lib/types";

// +1 money in, -1 money out, 0 neutral (transfer).
export function txDirection(type: TransactionType): 1 | -1 | 0 {
  switch (type) {
    case "income":
    case "loan_repaid_to_me":
    case "loan_taken":
      return 1;
    case "expense":
    case "loan_given":
    case "loan_repaid_by_me":
      return -1;
    case "transfer":
      return 0;
  }
}

export function txTypeLabel(type: TransactionType): string {
  const map: Record<TransactionType, string> = {
    expense: "Expense",
    income: "Income",
    transfer: "Transfer",
    loan_given: "Lent",
    loan_repaid_to_me: "Repaid to me",
    loan_taken: "Borrowed",
    loan_repaid_by_me: "Repaid by me",
  };
  return map[type];
}

export function txTitle(t: TransactionWithRefs): string {
  if (t.note) return t.note;
  if (t.category?.name) return t.category.name;
  return txTypeLabel(t.type);
}

export function txIcon(t: TransactionWithRefs): string {
  if (t.category?.icon) return t.category.icon;
  switch (t.type) {
    case "transfer":
      return "↔";
    case "income":
      return "↓";
    case "expense":
      return "↑";
    default:
      return "•";
  }
}
