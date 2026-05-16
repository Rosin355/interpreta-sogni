-- User Entitlements: server-side entitlement mirror synced from RevenueCat.
-- The mobile client reads this via the get-user-entitlements Edge Function —
-- it never sends entitlement data, it only receives it.
-- Safe to run on production: additive only.

create table if not exists public.user_entitlements (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,
  entitlement_key       text        not null,
  is_active             boolean     not null default true,
  -- Source of truth: "revenuecat" | "manual" | "promo"
  source                text        not null default 'revenuecat',
  revenuecat_product_id text,
  -- Null means no expiry (lifetime / manual grant)
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint user_entitlements_source_check
    check (source in ('revenuecat', 'manual', 'promo'))
);

-- Unique active entitlement per user (one row per key, upserted by webhook)
create unique index if not exists user_entitlements_user_key
  on public.user_entitlements (user_id, entitlement_key);

create index if not exists user_entitlements_user_active
  on public.user_entitlements (user_id, is_active)
  where is_active = true;

-- updated_at auto-maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_entitlements_updated_at
  before update on public.user_entitlements
  for each row execute function public.set_updated_at();

-- RLS: users can read their own entitlements; only service role can write
alter table public.user_entitlements enable row level security;

create policy "users_read_own_entitlements"
  on public.user_entitlements
  for select
  using (auth.uid() = user_id);
