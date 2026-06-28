"use client";

import { CreditCard } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/format";
import type { AccountWithBalance } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  bank: "Bank",
  upi: "UPI",
  cash: "Cash",
  credit_card: "Credit card",
  wallet: "Wallet",
};

// Premium bank-card-style tile. The account colour drives the gradient.
export function AccountCard({
  account,
  onClick,
}: {
  account: AccountWithBalance;
  onClick?: () => void;
}) {
  const color = account.color || "#2a2a30";
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative block w-full overflow-hidden rounded-2xl border border-white/10 p-4 text-left text-white shadow-lg"
      style={{ background: `linear-gradient(135deg, ${color} 0%, #0a0a0c 130%)` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{account.icon ?? "💳"}</span>
          <span className="font-semibold">{account.name}</span>
        </div>
        <CreditCard className="h-6 w-6 opacity-70" weight="fill" />
      </div>

      <div className="mt-2">
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]">
          {TYPE_LABEL[account.type] ?? account.type}
        </span>
      </div>

      <p className="mt-6 text-[11px] uppercase tracking-wide text-white/60">Balance</p>
      <p className="text-2xl font-semibold tracking-tight">
        {formatCurrency(account.balance)}
      </p>
    </button>
  );
}
