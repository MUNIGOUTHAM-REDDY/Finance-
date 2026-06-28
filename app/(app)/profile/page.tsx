"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/ui";
import { BudgetIcon, InsightsIcon, SettingsIcon, ChevronIcon } from "@/components/icons";
import { useProfile, useUpdateProfile } from "@/lib/hooks";
import { setActiveCurrency } from "@/lib/format";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"];

export default function ProfilePage() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
      setCurrency(profile.currency);
    }
  }, [profile]);

  if (isLoading || !profile) return <PageLoader />;

  async function save() {
    await update.mutateAsync({ name: name.trim(), email: email.trim(), currency });
    setActiveCurrency(currency);
    qc.invalidateQueries(); // re-render amounts in the new currency
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "🙂";

  return (
    <div>
      <PageHeader title="Profile" />

      {/* Identity */}
      <div className="card mb-4 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft text-2xl font-semibold text-accent">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-text">
            {name.trim() || "Your name"}
          </p>
          <p className="truncate text-sm text-muted">{email.trim() || "Add your details below"}</p>
        </div>
      </div>

      {/* Personal details */}
      <section className="card mb-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-muted">Personal details</p>
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={save} disabled={update.isPending} className="btn-primary mt-4 w-full">
          {saved ? "Saved ✓" : "Save"}
        </button>
      </section>

      {/* Manage */}
      <section className="card mb-4 divide-y divide-border py-0">
        <HubLink href="/budgets" Icon={BudgetIcon} label="Budgets" sub="Set monthly limits & alerts" />
        <HubLink href="/insights" Icon={InsightsIcon} label="Insights" sub="Trends & where your money goes" />
        <HubLink href="/settings" Icon={SettingsIcon} label="Categories & data" sub="Categories, backup, reset" />
      </section>

      <p className="px-1 text-center text-xs text-muted">
        SpendTrack · stored on this device
      </p>
    </div>
  );
}

function HubLink({
  href,
  Icon,
  label,
  sub,
}: {
  href: string;
  Icon: (p: { className?: string }) => JSX.Element;
  label: string;
  sub: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 py-3.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text">{label}</p>
        <p className="truncate text-xs text-muted">{sub}</p>
      </div>
      <ChevronIcon className="h-4 w-4 text-muted" />
    </Link>
  );
}
