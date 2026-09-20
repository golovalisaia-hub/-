-- Academy · три стадии освоения и доказательства зачёта
-- Дата: 2026-09-20
--
-- Подход повторяет academy_qa_english_calendar_atomic_sync (её текст живёт только в Supabase):
-- только добавление, ничего не удаляем и не переименовываем, личные записи не трогаем,
-- скрипт идемпотентен и его можно выполнить повторно.
--
-- Главное свойство этой миграции: **триггер календаря менять не нужно**. Зачёт не меняет
-- колонку status, которую читает academy_progress_to_sever_calendar. Практика по-прежнему
-- обозначается status='practiced', а зачёт — отдельной отметкой certified_at. Поэтому
-- существующая логика «оба предмета подтверждены → закрыть задачу SEVER» остаётся ровно той,
-- что уже проверена, и зачёт не может случайно открыть или закрыть чужую задачу.
--
-- Пока миграция не применена, сайт работает в прежнем режиме двух стадий и честно пишет
-- об этом: кнопка зачёта отключена, ложных отметок не появляется.

begin;

-- 1. Отметка зачёта, доказательства и история попыток. Все колонки необязательные.
alter table public.academy_path_progress
  add column if not exists certified_at timestamptz,
  add column if not exists assessment jsonb,
  add column if not exists attempts jsonb not null default '[]'::jsonb;

comment on column public.academy_path_progress.certified_at is
  'Момент сдачи зачёта. Практика (status=''practiced'') остаётся отдельной, более ранней стадией; календарь SEVER по-прежнему смотрит только на status.';
comment on column public.academy_path_progress.assessment is
  'Доказательства зачёта: какие объективные задачи решены, какая рубрика применена, какие навыки CEFR подтверждены. Говорение помечено как самооценка, аудирование без синтеза речи — как непроверенное.';
comment on column public.academy_path_progress.attempts is
  'История попыток зачёта: [{at, ok, note}]. Неудачные попытки сохраняются наравне с успешными и не удаляются.';

-- 2. Новая стадия «ознакомился». Старые значения продолжают приниматься.
do $$
declare
  existing text;
begin
  select conname into existing
  from pg_constraint
  where conrelid = 'public.academy_path_progress'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if existing is not null then
    execute format('alter table public.academy_path_progress drop constraint %I', existing);
  end if;
end $$;

alter table public.academy_path_progress
  add constraint academy_path_progress_status_check
  check (status in ('viewed','draft','practiced'));

-- 3. Проверка перед применением: убедиться, что триггер действительно смотрит только на status
--    и не зависит от новых колонок. Запрос ничего не меняет, он для чтения глазами.
--    select pg_get_functiondef('public.academy_progress_to_sever_calendar'::regproc);
--
--    Если в теле функции встретится сравнение вида status = 'practiced' — это ожидаемо и
--    исправлять его не нужно: зачёт не меняет status.

-- 4. Старые 84 комбинированные задачи с обязательным Python уже мягко архивированы предыдущей
--    миграцией (deleted_at заполнен, строки не удалены и не помечены выполненными).
--    Здесь только проверка: ничего не удаляем и не пишем.
do $$
declare
  archived int;
  wrongly_completed int;
begin
  select count(*) into archived
  from public.tasks
  where title like 'IT · День %/84:%'
    and deleted_at is not null;

  select count(*) into wrongly_completed
  from public.tasks
  where title like 'IT · День %/84:%'
    and deleted_at is not null
    and completed = true;

  raise notice 'Архивных задач старого маршрута: %, из них ошибочно отмечены выполненными: %',
    archived, wrongly_completed;
end $$;

commit;

-- Откат: колонки можно просто оставить, старому коду они не мешают.
-- Удалять attempts нельзя — это потеря истории попыток пользователя.
-- alter table public.academy_path_progress drop constraint academy_path_progress_status_check;
-- alter table public.academy_path_progress add constraint academy_path_progress_status_check
--   check (status in ('draft','practiced'));
