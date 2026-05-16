-- Usage Ledger: append-only log of AI feature usage per user.
-- Rows are never hard-deleted. Rollback sets rolled_back = true.
-- Safe to run on a production DB: additive only, no existing tables touched.

create table if not exists public.usage_ledger (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  feature       text        not null,
  recorded_at   timestamptz not null default now(),
  rolled_back   boolean     not null default false,
  metadata      jsonb       not null default '{}'
);

-- Lookups: user + feature + month window (most common query pattern)
create index if not exists usage_ledger_user_feature_recorded_at
  on public.usage_ledger (user_id, feature, recorded_at);

-- Secondary: rolled_back filter
create index if not exists usage_ledger_rolled_back
  on public.usage_ledger (rolled_back)
  where rolled_back = false;

-- RLS: users can read their own rows; only service role can insert/update
alter table public.usage_ledger enable row level security;

create policy "users_read_own_usage"
  on public.usage_ledger
  for select
  using (auth.uid() = user_id);

-- No insert/update policy for users — service role bypasses RLS
