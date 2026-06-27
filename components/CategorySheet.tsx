"use client";

import { useEffect, useState } from "react";
import { Sheet, Field, Segmented, Spinner } from "@/components/ui";
import { useCreateCategory } from "@/lib/hooks";
import type { CategoryKind } from "@/lib/types";

export function CategorySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateCategory();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [icon, setIcon] = useState("🏷️");

  useEffect(() => {
    if (open) {
      setName("");
      setKind("expense");
      setIcon("🏷️");
    }
  }, [open]);

  async function save() {
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), kind, icon });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="New category">
      <Field label="Kind">
        <Segmented
          options={[
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
          ]}
          value={kind}
          onChange={setKind}
        />
      </Field>
      <div className="flex gap-3">
        <Field label="Icon">
          <input
            className="input w-20 text-center text-xl"
            maxLength={2}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />
        </Field>
        <Field label="Name">
          <input
            className="input"
            placeholder="e.g. Coffee"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
      </div>
      <button onClick={save} disabled={create.isPending} className="btn-primary w-full">
        {create.isPending ? <Spinner className="h-4 w-4 border-white/40" /> : "Add category"}
      </button>
    </Sheet>
  );
}
