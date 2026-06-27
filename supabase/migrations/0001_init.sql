-- SpendTrack schema: accounts, categories, transactions, recurring, loans.
-- Every table is scoped per user via Row Level Security.
-- Run this in the Supabase SQL Editor (or via the Supabase CLI).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null default 'bank'
    check (type in ('bank', 'upi', 'cash', 'credit_card', 'wallet')),
  opening_balance numeric(14, 2) not null default 0,
  currency text not null default 'INR',
  color text,
  icon text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'expense' check (kind in ('expense', 'income')),
  icon text,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_name text not null,
  direction text not null check (direction in ('lent', 'borrowed')),
  principal numeric(14, 2) not null check (principal >= 0),
  account_id uuid references public.accounts (id) on delete set null,
  date date not null default current_date,
  note text,
  status text not null default 'open' check (status in ('open', 'settled')),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  type text not null check (type in (
    'expense', 'income', 'transfer',
    'loan_given', 'loan_repaid_to_me', 'loan_taken', 'loan_repaid_by_me'
  )),
  amount numeric(14, 2) not null check (amount > 0),
  category_id uuid references public.categories (id) on delete set null,
  to_account_id uuid references public.accounts (id) on delete set null,
  loan_id uuid references public.loans (id) on delete set null,
  recurring_id uuid,
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'other'
    check (kind in ('emi', 'rent', 'subscription', 'other')),
  amount numeric(14, 2) not null check (amount > 0),
  account_id uuid not null references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  frequency text not null default 'monthly'
    check (frequency in ('monthly', 'weekly', 'yearly')),
  due_day int not null default 1 check (due_day between 1 and 31),
  start_date date not null default current_date,
  end_date date,
  installments_total int,
  next_due_date date not null default current_date,
  auto_post boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- transactions.recurring_id references recurring (added after recurring exists)
alter table public.transactions
  drop constraint if exists transactions_recurring_id_fkey;
alter table public.transactions
  add constraint transactions_recurring_id_fkey
  foreign key (recurring_id) references public.recurring (id) on delete set null;

create index if not exists idx_transactions_user_date
  on public.transactions (user_id, date desc);
create index if not exists idx_transactions_account
  on public.transactions (account_id);
create index if not exists idx_transactions_loan
  on public.transactions (loan_id);
create index if not exists idx_recurring_user
  on public.recurring (user_id, next_due_date);

-- ---------------------------------------------------------------------------
-- Derived balances (security_invoker so RLS of the caller applies)
-- ---------------------------------------------------------------------------

create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.opening_balance + coalesce(t.delta, 0) as balance
from public.accounts a
left join (
  select acc_id, sum(delta) as delta
  from (
    select
      account_id as acc_id,
      case
        when type in ('income', 'loan_repaid_to_me', 'loan_taken') then amount
        else -amount
      end as delta
    from public.transactions
    union all
    select to_account_id as acc_id, amount as delta
    from public.transactions
    where type = 'transfer' and to_account_id is not null
  ) effects
  group by acc_id
) t on t.acc_id = a.id;

create or replace view public.loan_balances
with (security_invoker = true) as
select
  l.id as loan_id,
  l.user_id,
  l.principal - coalesce(r.repaid, 0) as outstanding
from public.loans l
left join (
  select loan_id, sum(amount) as repaid
  from public.transactions
  where loan_id is not null
    and type in ('loan_repaid_to_me', 'loan_repaid_by_me')
  group by loan_id
) r on r.loan_id = l.id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring enable row level security;
alter table public.loans enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['accounts', 'categories', 'transactions', 'recurring', 'loans']
  loop
    execute format('drop policy if exists "owner_select" on public.%I;', t);
    execute format('drop policy if exists "owner_insert" on public.%I;', t);
    execute format('drop policy if exists "owner_update" on public.%I;', t);
    execute format('drop policy if exists "owner_delete" on public.%I;', t);

    execute format(
      'create policy "owner_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format(
      'create policy "owner_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Seed default categories + starter accounts for every new user
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, kind, icon, color) values
    (new.id, 'Food', 'expense', '🍔', '#f59e0b'),
    (new.id, 'Groceries', 'expense', '🛒', '#84cc16'),
    (new.id, 'Transport', 'expense', '🚕', '#22d3ee'),
    (new.id, 'Rent', 'expense', '🏠', '#f97316'),
    (new.id, 'Bills', 'expense', '🧾', '#eab308'),
    (new.id, 'Subscriptions', 'expense', '📺', '#a78bfa'),
    (new.id, 'Shopping', 'expense', '🛍️', '#ec4899'),
    (new.id, 'Health', 'expense', '💊', '#ef4444'),
    (new.id, 'Gym', 'expense', '🏋️', '#10b981'),
    (new.id, 'Entertainment', 'expense', '🎬', '#8b5cf6'),
    (new.id, 'Travel', 'expense', '✈️', '#06b6d4'),
    (new.id, 'Education', 'expense', '📚', '#3b82f6'),
    (new.id, 'Other', 'expense', '💸', '#94a3b8'),
    (new.id, 'Salary', 'income', '💼', '#34d399'),
    (new.id, 'Freelance', 'income', '🧑‍💻', '#22c55e'),
    (new.id, 'Interest', 'income', '🏦', '#10b981'),
    (new.id, 'Refund', 'income', '↩️', '#14b8a6'),
    (new.id, 'Other Income', 'income', '➕', '#4ade80');

  insert into public.accounts (user_id, name, type, opening_balance, icon, color) values
    (new.id, 'Cash', 'cash', 0, '💵', '#22c55e'),
    (new.id, 'UPI', 'upi', 0, '📱', '#5b8cff');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
