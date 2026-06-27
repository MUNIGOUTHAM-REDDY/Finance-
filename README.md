# SpendTrack

A fast, mobile-first spending tracker. Log a spend in ~3 taps, keep running
balances across your accounts, and track EMIs, rent, subscriptions, income, and
small loans to friends.

It's an installable **PWA**: open the URL on your phone and *Add to Home Screen*
to get an app icon that opens full-screen like a native app. No App Store, no
Mac required.

> **Data:** the current version stores everything **locally on your device**
> (no login, no backend, works instantly and offline). Export a backup any time
> from Settings. Optional cloud sync (Supabase / Google sign-in) is on the
> roadmap — see below.

## Features

- **Quick add** — amount keypad → category → account, in seconds.
- **Accounts** with live, derived balances (bank, UPI, cash, credit card, wallet)
  and transfers between them.
- **Recurring** EMIs, rent and subscriptions with due dates and one-tap "mark paid".
- **Loans** to/from friends with repayments and settle.
- **Dashboard** — total balance, this-month spent vs income, spend-by-category.
- **Backup** — export everything to JSON/CSV and re-import any time.
- Dark, minimal UI. Offline app shell via service worker.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · TanStack Query ·
Recharts. Data persists in the browser's `localStorage` (see `lib/store.ts`),
behind a small hook API (`lib/hooks.ts`) so a cloud backend can be slotted in
later without touching the UI.

---

## Deploy to Vercel (no configuration needed)

Because everything runs in the browser, there are **no environment variables and
no backend to set up** — it deploys as a static app.

**One-click:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmunigoutham-reddy%2Ffinance-&project-name=spendtrack)

**Or manually:** <https://vercel.com> → **Add New → Project** → import this repo
→ **Deploy**. You'll get a URL like `https://spendtrack-xxx.vercel.app`.

### Install on your iPhone

1. Open the Vercel URL in **Safari**.
2. Tap the **Share** icon → **Add to Home Screen**.
3. Launch it from the home screen — it opens full-screen and works offline.

(On Android/Chrome you'll get an "Install app" prompt instead.)

> Your data lives on the device, so it's per-browser. Use **Settings → Export**
> to back it up, and **Import** to move it to another device.

---

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
```

Scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`.
Icons are generated (no design tool needed): `node scripts/gen-icons.js`.

---

## How balances are computed

Balances are never stored directly — they're derived from the transaction
history every time (opening balance ± each transaction), so they can't drift out
of sync. Loan outstanding amounts work the same way. See `balanceMap` and
`listLoans` in `lib/store.ts`.

---

## Roadmap

- **Cloud sync + Google sign-in** — so data is backed up and available on every
  device. A ready-to-run Supabase schema (Postgres + Auth + Row Level Security)
  is already included at [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql);
  wiring it up means swapping `lib/store.ts` for Supabase calls behind the same
  hook API. The same backend could later power a native iOS (Swift) app.
- Auto-posting recurring items on their due date.
