-- Academy: the request limit the academy-tutor Edge Function already depends on.
--
-- WHY THIS EXISTS
-- supabase/functions/academy-tutor/index.ts calls `db.rpc('academy_claim_ai_quota')`
-- before every paid OpenAI request and refuses the request when the call errors:
--     if(quota.error) return json({error:'QUOTA', ...}, 503);
-- No migration in this repository ever created that function, so if the database does
-- not already contain it, every tutor request fails with «Не удалось проверить лимит.»
-- and the AI tutor cannot work at all after deployment.
--
-- SAFETY
-- Additive only: a new table, a new function and its grant. No existing table, policy,
-- row, trigger or SEVER integration is touched. Idempotent, so it is harmless if the
-- owner already created an equivalent function by hand.
-- NOT APPLIED TO PRODUCTION BY THIS BRANCH — apply it only after review, together with
-- the academy-tutor deployment described in ACADEMY-TUTOR-REVIEW.md.
--
-- LIMITS: 5 requests per 5 minutes and 30 per 24 hours, per user, matching the message
-- the function already returns to the learner. This bounds request volume, not money.
begin;

create table if not exists public.academy_ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);

create index if not exists academy_ai_usage_user_time_idx
  on public.academy_ai_usage (user_id, claimed_at desc);

alter table public.academy_ai_usage enable row level security;

-- A learner may read only their own usage; all writes go through the function below.
drop policy if exists academy_ai_usage_select_own on public.academy_ai_usage;
create policy academy_ai_usage_select_own on public.academy_ai_usage
  for select using (auth.uid() = user_id);

create or replace function public.academy_claim_ai_quota()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  recent integer;
  daily integer;
begin
  -- Anonymous callers never consume quota. The Edge Function also verifies JWT and role.
  if caller is null then
    return false;
  end if;

  delete from public.academy_ai_usage
    where claimed_at < now() - interval '48 hours';

  select count(*) into recent from public.academy_ai_usage
    where user_id = caller and claimed_at > now() - interval '5 minutes';
  if recent >= 5 then
    return false;
  end if;

  select count(*) into daily from public.academy_ai_usage
    where user_id = caller and claimed_at > now() - interval '24 hours';
  if daily >= 30 then
    return false;
  end if;

  insert into public.academy_ai_usage (user_id) values (caller);
  return true;
end;
$$;

comment on function public.academy_claim_ai_quota() is
  'Claims one Academy AI tutor request slot for the calling user: at most 5 per 5 minutes and 30 per 24 hours. Returns false when the limit is reached. Not a spending limit.';

revoke all on function public.academy_claim_ai_quota() from public, anon;
grant execute on function public.academy_claim_ai_quota() to authenticated;

commit;
