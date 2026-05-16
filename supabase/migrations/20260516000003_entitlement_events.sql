-- Entitlement Events: immutable audit log of all RevenueCat webhook events.
-- Never updated or deleted. Provides full history for debugging billing issues.
-- Safe to run on production: additive only.

create table if not exists public.entitlement_events (
  id              uuid        primary key default gen_random_uuid(),
  -- Null if the RC user cannot be mapped to a Supabase user yet
  user_id         uuid        references auth.users(id) on delete set null,
  revenuecat_id   text        not null,
  event_type      text        not null,
  product_id      text,
  entitlement_key text,
  -- Full raw payload from RevenueCat for forensic replay
  raw_payload     jsonb       not null default '{}',
  processed_at    timestamptz not null default now(),
  -- Whether we successfully applied the entitlement change
  applied         boolean     not null default false,
  apply_error     text
);

-- Deduplication: one row per RC event id
create unique index if not exists entitlement_events_rc_id
  on public.entitlement_events (revenuecat_id);

create index if not exists entitlement_events_user_id
  on public.entitlement_events (user_id);

create index if not exists entitlement_events_event_type
  on public.entitlement_events (event_type);

-- RLS: admins only (no user-facing read); service role bypasses
alter table public.entitlement_events enable row level security;

-- No select policy for regular users — entitlement events are internal only
