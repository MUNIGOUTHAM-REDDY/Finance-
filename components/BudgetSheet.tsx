"use client";

import { useEffect, useState } from "react";
import { Sheet, Field, Spinner } from "@/components/ui";
import { useUpsertBudget } from "@/lib/hooks";

export interface BudgetTarget {
  categoryId: string | null; // null = overall
  label: string;
  current: number; // existing limit (0 if none)
}

export function BudgetSheet({
  target,
  onClose,
}: {
  target: BudgetTarget | null;
  onClose: () => void;
}) {
  const upsert = useUpsertBudget();
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (target) setAmount(target.current ? String(target.current) : "");
  }, [target]);

  if (!target) return null;

  async function save() {
    await upsert.mutateAsync({
      categoryId: target!.categoryId,
      amount: Number(amount) || 0, // 0 clears the budget
    });
    onClose();
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={`Budget · ${target.label}`}>
      <Field label="Monthly limit (leave empty to remove)">
        <input
          type="number"
          inputMode="decimal"
          className="input"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </Field>
      <div className="flex gap-3">
        {target.current > 0 && (
          <button
            type="button"
            onClick={async () => {
              await upsert.mutateAsync({ categoryId: target!.categoryId, amount: 0 });
              onClose();
            }}
            className="btn-ghost text-negative"
          >
            Remove
          </button>
        )}
        <button onClick={save} disabled={upsert.isPending} className="btn-primary flex-1">
          {upsert.isPending ? <Spinner className="h-4 w-4 border-white/40" /> : "Save"}
        </button>
      </div>
    </Sheet>
  );
}
