"use client";

import { useEffect, useState } from "react";
import { Sheet, Field, Segmented, Spinner } from "@/components/ui";
import { useAccounts, useCreateLoan, useRecordRepayment } from "@/lib/hooks";
import { formatCurrency, todayISO } from "@/lib/format";
import type { Loan, LoanDirection, LoanWithOutstanding } from "@/lib/types";

export function NewLoanSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: accounts } = useAccounts();
  const create = useCreateLoan();
  const live = (accounts ?? []).filter((a) => !a.archived);

  const [person, setPerson] = useState("");
  const [direction, setDirection] = useState<LoanDirection>("lent");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setPerson("");
      setDirection("lent");
      setAmount("");
      setAccountId(live[0]?.id ?? "");
      setDate(todayISO());
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save() {
    const value = Number(amount);
    if (!person.trim() || !value || value <= 0) return;
    await create.mutateAsync({
      person_name: person.trim(),
      direction,
      principal: value,
      account_id: accountId || null,
      date,
      note: note.trim() || null,
    });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="New loan">
      <Field label="Person">
        <input
          className="input"
          placeholder="Friend's name"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
        />
      </Field>

      <Field label="Direction">
        <Segmented
          options={[
            { value: "lent", label: "I lent" },
            { value: "borrowed", label: "I borrowed" },
          ]}
          value={direction}
          onChange={setDirection}
        />
      </Field>

      <div className="flex gap-3">
        <Field label="Amount">
          <input
            type="number"
            inputMode="decimal"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Account (optional — records the cash movement)">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAccountId("")}
            className={`chip ${accountId === "" ? "chip-active" : ""}`}
          >
            None
          </button>
          {live.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccountId(a.id)}
              className={`chip ${accountId === a.id ? "chip-active" : ""}`}
            >
              {a.icon && <span>{a.icon}</span>}
              {a.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Note">
        <input
          className="input"
          placeholder="Optional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      <button onClick={save} disabled={create.isPending} className="btn-primary w-full">
        {create.isPending ? <Spinner className="h-4 w-4 border-white/40" /> : "Save loan"}
      </button>
    </Sheet>
  );
}

export function RepaymentSheet({
  loan,
  onClose,
}: {
  loan: LoanWithOutstanding | null;
  onClose: () => void;
}) {
  const { data: accounts } = useAccounts();
  const record = useRecordRepayment();
  const live = (accounts ?? []).filter((a) => !a.archived);

  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (loan) {
      setAmount(String(loan.outstanding));
      setAccountId(loan.account_id ?? live[0]?.id ?? "");
      setDate(todayISO());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan]);

  if (!loan) return null;

  async function save() {
    const value = Number(amount);
    if (!value || value <= 0 || !accountId) return;
    await record.mutateAsync({
      loan: loan as Loan,
      amount: value,
      account_id: accountId,
      date,
    });
    onClose();
  }

  return (
    <Sheet open={!!loan} onClose={onClose} title={`Repayment · ${loan.person_name}`}>
      <p className="mb-4 text-sm text-muted">
        Outstanding {formatCurrency(loan.outstanding)} ·{" "}
        {loan.direction === "lent" ? "they owe you" : "you owe them"}
      </p>

      <div className="flex gap-3">
        <Field label="Amount">
          <input
            type="number"
            inputMode="decimal"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label={loan.direction === "lent" ? "Into account" : "From account"}>
        <div className="flex flex-wrap gap-2">
          {live.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccountId(a.id)}
              className={`chip ${accountId === a.id ? "chip-active" : ""}`}
            >
              {a.icon && <span>{a.icon}</span>}
              {a.name}
            </button>
          ))}
        </div>
      </Field>

      <button onClick={save} disabled={record.isPending} className="btn-primary w-full">
        {record.isPending ? <Spinner className="h-4 w-4 border-white/40" /> : "Record repayment"}
      </button>
    </Sheet>
  );
}
