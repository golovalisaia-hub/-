\set QUIET on
\pset footer off
-- 1. Anonymous caller gets nothing.
select 'anon claim (expect f): ' || public.academy_claim_ai_quota()::text;

-- 2. Five claims in five minutes succeed, the sixth is refused.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'burst 1..5 all true: ' || bool_and(public.academy_claim_ai_quota())::text from generate_series(1,5);
select '6th within 5 min (expect f): ' || public.academy_claim_ai_quota()::text;

-- 3. A different user is unaffected (per-user isolation).
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'other user still allowed (expect t): ' || public.academy_claim_ai_quota()::text;

-- 4. Once the 5-minute window has passed, requests resume until the daily cap.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.academy_ai_usage set claimed_at = now() - interval '10 minutes'
  where user_id='11111111-1111-1111-1111-111111111111';
select 'after 5-min window (expect t): ' || public.academy_claim_ai_quota()::text;

-- 5. Daily cap of 30 holds.
insert into public.academy_ai_usage(user_id, claimed_at)
  select '11111111-1111-1111-1111-111111111111', now() - interval '30 minutes' from generate_series(1,30);
select '31st within 24h (expect f): ' || public.academy_claim_ai_quota()::text;

-- 6. Rows older than 48h are cleaned up rather than accumulating.
insert into public.academy_ai_usage(user_id, claimed_at)
  values ('22222222-2222-2222-2222-222222222222', now() - interval '72 hours');
select 'stale rows before cleanup: ' || count(*)::text from public.academy_ai_usage where claimed_at < now() - interval '48 hours';
select public.academy_claim_ai_quota() into temp t1;
select 'stale rows after cleanup (expect 0): ' || count(*)::text from public.academy_ai_usage where claimed_at < now() - interval '48 hours';

-- 7. Grants: anon must not be able to execute.
select 'anon has execute (expect f): ' || has_function_privilege('anon','public.academy_claim_ai_quota()','execute')::text;
select 'authenticated has execute (expect t): ' || has_function_privilege('authenticated','public.academy_claim_ai_quota()','execute')::text;
select 'RLS enabled (expect t): ' || relrowsecurity::text from pg_class where relname='academy_ai_usage';
