# Проверка миграции лимита запросов ИИ

`../../supabase/migrations/20260921090000_academy_ai_quota.sql` создаёт функцию
`academy_claim_ai_quota`, которую серверная функция `academy-tutor` уже вызывает перед
каждым платным запросом к OpenAI. Файл `academy-ai-quota.test.sql` проверяет её поведение
на **локальной** базе. Он ничего не выполняет в production.

Как запустить на временной базе (PostgreSQL 16):

```sh
initdb -D /tmp/academy-pg -U audit --auth=trust
pg_ctl -D /tmp/academy-pg -o "-p 5433" -l /tmp/academy-pg/pg.log start

# Минимальная замена объектов Supabase, которых нет в чистом PostgreSQL.
psql -p 5433 -U audit -d postgres <<'SQL'
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key);
create role anon; create role authenticated;
create or replace function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
insert into auth.users(id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222') on conflict do nothing;
SQL

psql -p 5433 -U audit -d postgres -v ON_ERROR_STOP=1 \
  -f ../../supabase/migrations/20260921090000_academy_ai_quota.sql
psql -p 5433 -U audit -d postgres -v ON_ERROR_STOP=1 -t -A \
  -f academy-ai-quota.test.sql
```

Ожидаемый результат (проверено на PostgreSQL 16.13 21.09.2026):

```
anon claim (expect f): false
burst 1..5 all true: true
6th within 5 min (expect f): false
other user still allowed (expect t): true
after 5-min window (expect t): true
31st within 24h (expect f): false
stale rows before cleanup: 1
stale rows after cleanup (expect 0): 0
anon has execute (expect f): false
authenticated has execute (expect t): true
RLS enabled (expect t): true
```

Проверка выполняется вручную и **не включена в CI**: в раннере GitHub Actions нет
базы Supabase, а подключать production к автоматическим тестам нельзя.
