-- Knowledge/Astrology — add birth-time precision fields to public.profiles
--
-- WHY
--   Mobile natal-chart creation must represent three birth-time states:
--   exact / approximate / unknown. The existing profiles columns store the
--   birth data + cached chart but cannot express HOW reliable the time (and
--   therefore the ascendant/houses) is. These columns let the backend record
--   precision and let get-astrology-profile tell iOS what is reliable.
--
-- SAFETY / BACKWARD COMPATIBILITY
--   * All columns are NULLABLE with NO default change to existing rows →
--     existing profiles keep working; NULL means "legacy / not specified" and
--     get-astrology-profile infers precision from birth_time + coordinates.
--   * Idempotent: ADD COLUMN IF NOT EXISTS + guarded CHECK constraints.
--   * NON-destructive: only adds columns/constraints; no data rewrite, no drops.
--   * Run manually (NOT auto-applied). Does not block the current web flow.

alter table public.profiles
  add column if not exists birth_time_accuracy   text,
  add column if not exists natal_chart_precision text,
  add column if not exists birth_time_source     text,
  add column if not exists natal_chart_notes     jsonb;

-- Guarded CHECK constraints (idempotent): drop-if-exists then add.
do $$
begin
  alter table public.profiles drop constraint if exists profiles_birth_time_accuracy_check;
  alter table public.profiles
    add constraint profiles_birth_time_accuracy_check
    check (birth_time_accuracy is null
           or birth_time_accuracy in ('exact','approximate','unknown'));

  alter table public.profiles drop constraint if exists profiles_natal_chart_precision_check;
  alter table public.profiles
    add constraint profiles_natal_chart_precision_check
    check (natal_chart_precision is null
           or natal_chart_precision in ('complete','approximate','partial','symbolic'));

  alter table public.profiles drop constraint if exists profiles_birth_time_source_check;
  alter table public.profiles
    add constraint profiles_birth_time_source_check
    check (birth_time_source is null
           or birth_time_source in ('user','estimated_noon','unknown'));
end $$;

-- =========================================================================
-- Verify (optional) — column presence only, never dumps chart/birth data
-- =========================================================================
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles'
--     and column_name in ('birth_time_accuracy','natal_chart_precision',
--                         'birth_time_source','natal_chart_notes');
