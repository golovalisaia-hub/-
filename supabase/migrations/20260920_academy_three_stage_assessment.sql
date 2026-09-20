-- Academy: preserve existing progress and SEVER trigger while adding a distinct review stage.
-- Run via Supabase migration academy_three_stage_assessment. Additive columns; no user rows changed.
-- Do not drop the separate academy_path_practice_evidence constraint.
begin;
alter table public.academy_path_progress
  add column if not exists certified_at timestamptz,
  add column if not exists assessment jsonb,
  add column if not exists attempts jsonb not null default '[]'::jsonb;

comment on column public.academy_path_progress.certified_at is
  'Timestamp of an in-app knowledge check, not an external qualification or proof that free-text work was expert-reviewed.';
comment on column public.academy_path_progress.assessment is
  'In-app answers and self-review evidence. Speaking is self-reported; unavailable listening must be marked not tested.';
comment on column public.academy_path_progress.attempts is
  'Recent knowledge-check attempts. Keep failed attempts as well as passed attempts.';

-- Only replace the exact named status constraint; never select an arbitrary CHECK
-- containing the word status (that would accidentally delete practice evidence).
alter table public.academy_path_progress
  drop constraint if exists academy_path_progress_status_check;
alter table public.academy_path_progress
  add constraint academy_path_progress_status_check
  check (status in ('viewed','draft','practiced'));

-- Existing trigger academy_progress_to_sever_calendar reads status = 'practiced';
-- certification writes keep status unchanged, so calendar behavior is preserved.
-- Existing RLS policies and user rows are unchanged.
commit;
