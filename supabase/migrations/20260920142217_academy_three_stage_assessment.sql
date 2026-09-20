-- Academy: preserve existing progress and SEVER trigger while adding a distinct review stage.
-- Applied as academy_three_stage_assessment, version 20260920142217.
-- Additive columns; no user rows changed. Keep the separate practice evidence constraint.
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
-- Drop only the exact status constraint, never the separate practice-evidence check.
alter table public.academy_path_progress drop constraint if exists academy_path_progress_status_check;
alter table public.academy_path_progress add constraint academy_path_progress_status_check
  check (status in ('viewed','draft','practiced'));
-- Existing RLS, progress records and calendar trigger remain unchanged.
commit;
