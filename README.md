# SpendTrack

A fast, mobile-first spending tracker. Log a spend in ~3 taps, keep running
balances across your accounts, and track EMIs, rent, subscriptions, income, and
small loans to friends — all synced to the cloud.

It's an installable **PWA**: open the URL on your phone and *Add to Home Screen*
to get an app icon that opens full-screen like a native app. No App Store, no
Mac required.

## Features

- **Quick add** — amount keypad → category → account, in seconds.
- **Accounts** with live, derived balances (bank, UPI, cash, credit card, wallet)
  and transfers between them.
- **Recurring** EMIs, rent and subscriptions with due dates and one-tap "mark paid".
- **Loans** to/from friends with repayments and settle.
- **Dashboard** — total balance, this-month spent vs income, spend-by-category.
- **Cloud sync** via Supabase (email magic-link login, your data is private to you).
- **Backup** — export everything to JSON/CSV and re-import any time.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · TanStack Query ·
Supabase (Postgres + Auth + RLS) · Recharts. Dark mode.

---

## Setup (one-time, ~15 minutes, all free)

### 1. Create the Supabase project (database + login)

1. Go to <https://supabase.com> → sign up → **New project**. Pick a name and a
   strong database password; choose the region closest to you.
2. When it's ready, open **SQL Editor** → **New query**.
3. Paste the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   and click **Run**. This creates every table, the balance views, security
   rules, and seeds default categories + starter accounts for each new user.
4. Open **Project Settings → API** and copy:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> Email magic-links work out of the box on Supabase's built-in mailer for
> personal use. (For higher volume later, add your own SMTP under
> **Authentication → Emails**.)

### 2. Deploy the app to Vercel

1. Push this repo to GitHub (already done if you're reading this there).
2. Go to <https://vercel.com> → **Add New → Project** → import this repo.
3. Under **Environment Variables**, add the two values from step 1:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. You'll get a URL like `https://spendtrack-xxx.vercel.app`.

### 3. Point Supabase auth at your URL

In Supabase → **Authentication → URL Configuration**:
- Set **Site URL** to your Vercel URL.
- Add `https://your-vercel-url/auth/callback` under **Redirect URLs**.

### 4. Install on your iPhone

1. Open the Vercel URL in **Safari**.
2. Enter your email → tap **Send magic link** → open the link from your inbox
   on the same device.
3. Tap the **Share** icon → **Add to Home Screen**.

Done — SpendTrack now opens full-screen from your home screen and syncs to the
cloud. (On Android/Chrome you'll get an "Install app" prompt instead.)

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev                  # http://localhost:3000
```

Useful scripts: `npm run build`, `npm run lint`, `npm run typecheck`.

Icons are generated (no design tool needed): `node scripts/gen-icons.js`.

---

## How balances are computed

Account balances are never stored directly — they're derived by the
`account_balances` SQL view (opening balance ± every transaction), so they can't
drift out of sync. Loan outstanding amounts work the same way via
`loan_balances`. Every table is protected by Row Level Security, so each user
only ever sees their own rows.

---

## Roadmap / deferred ideas

- **"Remind me when I open a payment app"** — iOS doesn't let apps detect when
  other apps open, but you can build a personal **iOS Shortcuts Automation**
  ("When Slice/SuperMoney opens → open SpendTrack / send a reminder"). We can add
  a step-by-step guide for this.
- **Native iOS (Swift)** — when a Mac + Apple Developer account are available, a
  SwiftUI app can reuse this exact Supabase backend (Postgres + Auth) with no
  data migration. The PWA stays as the always-available web client.
- Auto-posting recurring items on their due date (needs a scheduled job).
