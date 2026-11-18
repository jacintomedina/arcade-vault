-- Verificación de solo lectura. Pegar en el SQL Editor del proyecto de PRODUCCIÓN.
-- Cada bloque indica el resultado esperado.

-- 1. Tablas con RLS activo.
-- Esperado: games, game_sessions, profiles, scores, todas con rls_enabled = true.
select c.relname as tabla, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- 2. Políticas.
-- Esperado (4 filas):
--   games    "games lectura pública"            SELECT
--   scores   "scores lectura pública"           SELECT
--   profiles "profiles lectura pública"         SELECT
--   profiles "profiles actualiza el propio"     UPDATE (qual con (select auth.uid()))
-- game_sessions: ninguna política (a propósito).
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. Catálogo de juegos.
-- Esperado (5 filas): arkanoid 1200, asteroides 1500, invasores 1200, snake 160, tetris 12200.
select id, title, max_score_per_second from public.games order by id;

-- 4. Vista leaderboard con security_invoker.
-- Esperado: reloptions contiene security_invoker=true.
select c.relname, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'leaderboard';

-- 5. Trigger de perfiles en auth.users.
-- Esperado: 1 fila, on_auth_user_created, tgenabled = 'O'.
select t.tgname, t.tgenabled, p.proname as funcion
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal and t.tgname = 'on_auth_user_created';

-- 6. handle_new_user no ejecutable por la API.
-- Esperado: anon_exec = false, authenticated_exec = false.
select
  has_function_privilege('anon', 'public.handle_new_user()', 'execute') as anon_exec,
  has_function_privilege('authenticated', 'public.handle_new_user()', 'execute') as authenticated_exec;

-- 7. Permisos de tablas para anon/authenticated.
-- Esperado:
--   games, scores: solo SELECT
--   profiles: SELECT y UPDATE (más los grants por defecto de Supabase que no se tocaron)
--   game_sessions: ninguna fila
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privilegios
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- 8. Columnas añadidas por session_abuse_controls.
-- Esperado: game_sessions.ip_hash (text), scores.user_id (uuid).
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'game_sessions' and column_name = 'ip_hash')
    or (table_name = 'scores' and column_name = 'user_id'));

-- 9. Índices.
-- Esperado: game_sessions_game_id_idx, game_sessions_ip_started_idx, game_sessions_open_started_idx,
--           scores_game_score_idx, scores_user_game_created_idx, scores_user_id_idx,
--           profiles_username_lower_idx (más las claves primarias y unique).
select tablename, indexname
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 10. Migraciones registradas (solo si usaste `supabase db push`).
-- Esperado: 11 filas, de 20261023120000 a 20261106130000.
select version, name from supabase_migrations.schema_migrations order by version;

-- 11. Prod debe estar vacío de datos de prueba.
-- Esperado: 0, 0, 0, 0.
select
  (select count(*) from auth.users) as usuarios,
  (select count(*) from public.profiles) as perfiles,
  (select count(*) from public.scores) as scores,
  (select count(*) from public.game_sessions) as sesiones;
