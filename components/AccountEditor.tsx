"use client";

import { useEffect, useState } from "react";
import { Sheet, Field, Spinner } from "@/components/ui";
import { useCreateAccount, useUpdateAccount } from "@/lib/hooks";
import type { AccountType, AccountWithBalance } from "@/lib/types";

const TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: "bank", label: "Bank", icon: "🏦" },
  { value: "upi", label: "UPI", icon: "📱" },
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "credit_card", label: "Credit", icon: "💳" },
  { value: "wallet", label: "Wallet", icon: "👛" },
];

const CARD_COLORS = [
  "#2a2a30", // Black Titanium
  "#3b82f6", // Blue
  "#22c55e", // Green
  "#f59e0b", // Orange
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#14b8a6", // Teal
  "#475569", // Slate
];

export function AccountEditor({
  account,
  open,
  onClose,
}: {
  account: AccountWithBalance | null;
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const editing = !!account;

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [opening, setOpening] = useState("0");
  const [icon, setIcon] = useState("🏦");
  const [color, setColor] = useState(CARD_COLORS[0]);

  useEffect(() => {
    if (open) {
      setName(account?.name ?? "");
      setType(account?.type ?? "bank");
      setOpening(account ? String(account.opening_balance) : "0");
      setIcon(account?.icon ?? "🏦");
      setColor(account?.color ?? CARD_COLORS[0]);
    }
  }, [open, account]);

  async function save() {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      type,
      opening_balance: Number(opening) || 0,
      icon,
      color,
    };
    if (editing) await update.mutateAsync({ id: account!.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  }

  const pending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit account" : "New account"}>
      <Field label="Name">
        <input
          className="input"
          placeholder="e.g. HDFC, SuperMoney, Cash"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Type">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setType(t.value);
                if (!editing) setIcon(t.icon);
              }}
              className={`chip ${type === t.value ? "chip-active" : ""}`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex gap-3">
        <Field label="Icon">
          <input
            className="input w-20 text-center text-xl"
            value={icon}
            maxLength={2}
            onChange={(e) => setIcon(e.target.value)}
          />
        </Field>
        <Field label={editing ? "Opening balance" : "Current balance"}>
          <input
            type="number"
            inputMode="decimal"
            className="input"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Card colour">
        <div className="flex flex-wrap gap-2.5">
          {CARD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Colour ${c}`}
              className={`h-8 w-8 rounded-full transition ${
                color === c ? "ring-2 ring-white ring-offset-2 ring-offset-surface" : ""
              }`}
              style={{ background: `linear-gradient(135deg, ${c}, #0a0a0c)` }}
            />
          ))}
        </div>
      </Field>

      {editing && (
        <button
          type="button"
          onClick={async () => {
            await update.mutateAsync({ id: account!.id, archived: !account!.archived });
            onClose();
          }}
          className="btn-ghost mb-3 w-full text-muted"
        >
          {account!.archived ? "Unarchive account" : "Archive account"}
        </button>
      )}

      <button onClick={save} disabled={pending} className="btn-primary w-full">
        {pending ? <Spinner className="h-4 w-4 border-white/40" /> : "Save"}
      </button>
    </Sheet>
  );
}
