"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Sheet, Segmented, Spinner } from "@/components/ui";
import { AmountKeypad } from "@/components/AmountKeypad";
import { useAccounts, useCategories, useCreateTransaction } from "@/lib/hooks";
import { todayISO } from "@/lib/format";
import type { TransactionType } from "@/lib/types";

type QuickType = "expense" | "income" | "transfer";

const QuickAddContext = createContext<{ open: () => void }>({ open: () => {} });
export const useQuickAdd = () => useContext(QuickAddContext);

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <QuickAddContext.Provider value={{ open: () => setIsOpen(true) }}>
      {children}
      <QuickAddSheet open={isOpen} onClose={() => setIsOpen(false)} />
    </QuickAddContext.Provider>
  );
}

function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const createTx = useCreateTransaction();

  const [type, setType] = useState<QuickType>("expense");
  const [amount, setAmount] = useState("0");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  const liveAccounts = useMemo(
    () => (accounts ?? []).filter((a) => !a.archived),
    [accounts]
  );

  const visibleCategories = useMemo(
    () => (categories ?? []).filter((c) => c.kind === (type === "income" ? "income" : "expense")),
    [categories, type]
  );

  // Default the source account once data is available.
  useEffect(() => {
    if (!accountId && liveAccounts.length) setAccountId(liveAccounts[0].id);
    if (!toAccountId && liveAccounts.length > 1) setToAccountId(liveAccounts[1].id);
  }, [liveAccounts, accountId, toAccountId]);

  function reset() {
    setAmount("0");
    setCategoryId(null);
    setNote("");
    setDate(todayISO());
    setError(null);
  }

  async function save() {
    const value = Number(amount);
    if (!value || value <= 0) return setError("Enter an amount");
    if (!accountId) return setError("Pick an account");
    if (type === "transfer" && accountId === toAccountId)
      return setError("Pick two different accounts");

    const txType: TransactionType = type;
    try {
      await createTx.mutateAsync({
        type: txType,
        amount: value,
        account_id: accountId,
        category_id: type === "transfer" ? null : categoryId,
        to_account_id: type === "transfer" ? toAccountId : null,
        date,
        note: note.trim() || null,
      });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
  }

  const noAccounts = accounts && liveAccounts.length === 0;

  return (
    <Sheet open={open} onClose={onClose} title="Add transaction">
      <Segmented
        options={[
          { value: "expense", label: "Expense" },
          { value: "income", label: "Income" },
          { value: "transfer", label: "Transfer" },
        ]}
        value={type}
        onChange={(v) => {
          setType(v);
          setCategoryId(null);
        }}
      />

      <div className="my-5 text-center">
        <div className="text-4xl font-semibold tracking-tight text-text">
          <span className="text-muted">₹</span>
          {amount}
        </div>
      </div>

      <AmountKeypad value={amount} onChange={setAmount} />

      {noAccounts ? (
        <p className="mt-4 text-center text-sm text-muted">
          Add an account first from the Accounts tab.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {type !== "transfer" && (
            <div>
              <p className="label">Category</p>
              <div className="flex flex-wrap gap-2">
                {visibleCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={`chip ${categoryId === c.id ? "chip-active" : ""}`}
                  >
                    {c.icon && <span>{c.icon}</span>}
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="label">{type === "transfer" ? "From" : "Account"}</p>
            <AccountChips
              accounts={liveAccounts}
              value={accountId}
              onChange={setAccountId}
            />
          </div>

          {type === "transfer" && (
            <div>
              <p className="label">To</p>
              <AccountChips
                accounts={liveAccounts}
                value={toAccountId}
                onChange={setToAccountId}
              />
            </div>
          )}

          <div className="flex gap-3">
            <input
              className="input flex-1"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <input
              type="date"
              className="input w-[44%]"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}

          <button
            type="button"
            onClick={save}
            disabled={createTx.isPending}
            className="btn-primary w-full"
          >
            {createTx.isPending ? <Spinner className="h-4 w-4 border-white/40" /> : "Save"}
          </button>
        </div>
      )}
    </Sheet>
  );
}

function AccountChips({
  accounts,
  value,
  onChange,
}: {
  accounts: { id: string; name: string; icon: string | null }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {accounts.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onChange(a.id)}
          className={`chip ${value === a.id ? "chip-active" : ""}`}
        >
          {a.icon && <span>{a.icon}</span>}
          {a.name}
        </button>
      ))}
    </div>
  );
}
