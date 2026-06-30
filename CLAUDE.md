# SpendTrack — Project Guide

A personal spending tracker. The goal: log spends in seconds (amount → category →
account), keep running balances across accounts, and track EMIs/subscriptions,
income, and small loans to friends — replacing a high-friction Google Sheet.

This repo contains **two apps that share the same design and data model**:

1. **Web app (PWA)** — live and in daily-usable shape. `app/`, `components/`, `lib/`.
2. **Native iOS app (SwiftUI)** — `ios/`. v1 core built; needs to be compiled on a
   Mac and rounded out to full parity.

> Active branch: **`claude/spending-tracker-app-k4zlyo`** (all work lives here).

---

## 1. Web app (Next.js PWA) — DONE & DEPLOYED

**Live:** https://spendtrack-flax.vercel.app (installable: open in Safari → Share →
Add to Home Screen).

### Stack
- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **TanStack Query** for data state, **Recharts** for charts, **@phosphor-icons/react**
- **Poppins** font (`next/font`)
- **Data: `localStorage` only** — no backend, no login, works offline. All data lives
  on the device. See `lib/store.ts`.
- Hosting: **Vercel** (zero env vars needed).

### How data works
- `lib/store.ts` — the whole data layer: a `localStorage`-backed DB (`spendtrack:v1`)
  with CRUD, **derived balances** (`balanceMap`), loan outstanding (`listLoans`),
  recurring mark-paid, seeding of default categories + Cash/UPI accounts, and a
  one-time **muted-palette migration**.
- `lib/hooks.ts` — thin TanStack Query wrappers over the store (same hook names the UI
  uses). Swapping `store` for a real backend later means only changing these two files.
- `lib/types.ts` — shared TS types. `lib/format.ts` — currency/date helpers (currency is
  configurable, display-only). `lib/backup.ts` — JSON/CSV export + import. `lib/tx.ts`,
  `lib/range.ts` — small helpers. `lib/haptics.ts`.

### Screens (`app/(app)/`)
- `page.tsx` — **Home**: calm, balance-first. Balance hero, this-month spent/income,
  budget progress bar, "where it went" stacked bar + category breakdown, recent list.
- `transactions/` — Activity list (filter/search, grouped by day).
- `transaction/[id]/` — transaction **detail** (edit sheet + delete).
- `accounts/` — accounts as gradient **card tiles** + editor (color picker).
- `recurring/` — EMIs/rent/subscriptions, mark-paid.
- `loans/` — money lent/borrowed, repayments, settle.
- `budgets/` — per-category + overall monthly limits with progress + alerts.
- `insights/` — month-over-month, avg/day, daily-spend bars, biggest categories.
- `profile/` — name, email, currency, hub links. `settings/` — categories, backup, reset.
- `export/` — dedicated export screen (CSV/JSON toggles, time range).
- Global: `components/Drawer.tsx` (slide-over menu), `components/QuickAdd.tsx` (keypad
  add sheet), `components/Fab.tsx`, `components/BottomNav.tsx`.

### Commands
```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run lint
npm run typecheck    # tsc --noEmit
node scripts/gen-icons.js   # regenerate PWA icons
```
### Deploy (Vercel CLI)
```bash
npx vercel deploy --prod --yes --scope munigoutham   # needs a Vercel token
```
Project is already linked (`munigoutham/spendtrack`). Git auto-deploy is NOT set up
(the repo was on a proxied host), so deploys are manual via the CLI, or connect the
GitHub repo in Vercel → Project → Settings → Git.

---

## 2. Native iOS app (SwiftUI + SwiftData) — v1 CORE, NEEDS FIRST BUILD

Location: **`ios/`**. Local-only (SwiftData on device), dark, mirrors the web design.
Built to install on a **free Apple ID** (apps expire after 7 days — just re-run from
Xcode to refresh). No cloud sync, no widget yet (both deferred).

### Build & install (on a Mac with Xcode 15+)
The Xcode project is generated from `ios/project.yml` via **XcodeGen** (so no fragile
`.xcodeproj` is committed):
```bash
brew install xcodegen     # once
cd ios
xcodegen generate         # creates SpendTrack.xcodeproj
open SpendTrack.xcodeproj
```
Then in Xcode: target **SpendTrack** → Signing & Capabilities → automatic signing →
pick your Team (free Apple ID OK; change bundle id if "not available") → Run on device.
Full steps in `ios/README.md`.

### Structure (`ios/SpendTrack/`)
- `SpendTrackApp.swift` — `@main`, SwiftData `ModelContainer`.
- `Models.swift` — `@Model` types (`Account`, `Category`, `Transaction`, `Recurring`,
  `Loan`, `Budget`) + enums. Foreign keys stored as `UUID` (like the web app).
- `Store.swift` — derived balances, seeding defaults, currency/date formatting.
- `Theme.swift` — `Palette` colors + `Card`. `Components.swift` — `StackedBar`,
  `TransactionRowView`, button style.
- `Views/` — `RootView` (3 tabs + floating add), `HomeView`, `QuickAddView`,
  `AccountsView`, `TransactionsView`, `TransactionDetailView`, `SettingsView`.
- `Assets.xcassets/` — app icon (`gen-appicon.js` regenerates) + accent color.

### iOS status
- **Built (v1 core):** Home, Quick-Add (keypad), Accounts (cards + editor),
  Activity (filter/search → detail with edit/delete), Settings (name/currency/clear).
- **NOT yet built:** Recurring, Loans, Budgets, Insights, dedicated Profile screen,
  export/import.
- **Important:** this Swift was written without a compiler available, so the **first
  Xcode build may surface a compile error or two** — fix those first. Most likely areas:
  SwiftData `@Model` + custom `id: UUID` (Identifiable), `.task` vs `.onAppear`,
  segmented `Picker` tags.

---

## 3. Shared data model (both apps)

- **Account**: id, name, type (bank|upi|cash|credit_card|wallet), openingBalance,
  icon, color, archived. Balance is **derived** from transactions, never stored.
- **Category**: id, name, kind (expense|income), icon, color.
- **Transaction**: id, type (expense|income|transfer|loan_given|loan_repaid_to_me|
  loan_taken|loan_repaid_by_me), amount, accountID, categoryID?, toAccountID?, loanID?,
  date, note.
- **Recurring**: name, kind (emi|rent|subscription|other), amount, account, category,
  frequency, dueDay, nextDueDate, installmentsTotal?, active.
- **Loan**: personName, direction (lent|borrowed), principal, account?, status. Outstanding
  = principal − linked repayment transactions.
- **Budget**: categoryID? (nil = overall), amount (monthly).

Balance sign rule: `income / loan_repaid_to_me / loan_taken` add; `expense / loan_given /
loan_repaid_by_me` subtract; `transfer` moves from→to.

---

## 4. Design system

- **Dark only. True black** background (`#000`), neutral-gray surfaces.
- **Blue (`#3b82f6`) is a *secondary* accent** — only primary actions / active states.
- **Semantic colors:** green = income / healthy budget, orange = warning, red = over /
  delete.
- **Muted, cohesive category palette** (e.g. Food `#D9A05B`, Rent `#CC7E5C`, …) — defined
  in `lib/store.ts` (web) and `Store.swift` (iOS).
- Web font: **Poppins**. Minimal, Apple-style spacing. Calm hierarchy (balance is the
  hero on Home).

---

## 5. Future / deferred

- **Cloud sync + login** (so data backs up / syncs across web + iOS + devices). A
  ready-to-run Supabase schema is already in `supabase/migrations/0001_init.sql`
  (Postgres + Auth + RLS) — currently **unused**; the apps are local-only. Wiring it up =
  swap `lib/store.ts` / iOS `Store` for Supabase calls behind the same interfaces.
- **iOS Home Screen widget** (needs a paid Apple Developer account).
- **iOS full parity** (Recurring / Loans / Budgets / Insights / Profile / export).
- Optional: connect GitHub → Vercel for auto-deploy of the web app.

---

## 6. Conventions

- Work on branch **`claude/spending-tracker-app-k4zlyo`**; commit + push regularly.
- Keep web and iOS designs in sync (same palette, same calm/minimal feel).
- The web app must stay buildable: run `npm run typecheck && npm run lint && npm run build`
  before pushing web changes.
