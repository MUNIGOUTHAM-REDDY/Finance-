"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-3xl font-bold text-white">
          ₹
        </div>
        <h1 className="text-2xl font-semibold text-text">SpendTrack</h1>
        <p className="mt-1 text-sm text-muted">Track your spending in seconds.</p>
      </div>

      {sent ? (
        <div className="card text-center">
          <p className="text-base font-medium text-text">Check your email</p>
          <p className="mt-2 text-sm text-muted">
            We sent a sign-in link to <span className="text-text">{email}</span>.
            Open it on this device to continue.
          </p>
          <button
            className="btn-ghost mt-4 w-full"
            onClick={() => setSent(false)}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={sendLink} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-negative">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner className="h-4 w-4 border-white/40" /> : "Send magic link"}
          </button>
          <p className="text-center text-xs text-muted">
            No password needed — we email you a one-tap sign-in link.
          </p>
        </form>
      )}
    </div>
  );
}
