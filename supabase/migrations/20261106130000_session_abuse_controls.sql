-- Hash de IP (no la IP en claro) para limitar el ritmo de creación de sesiones.
alter table public.game_sessions
  add column if not exists ip_hash text;

-- Quién guardó cada puntuación: permite exigir sesiones secuenciales por usuario.
alter table public.scores
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists game_sessions_ip_started_idx
  on public.game_sessions (ip_hash, started_at);
create index if not exists game_sessions_open_started_idx
  on public.game_sessions (started_at) where consumed_at is null;
create index if not exists scores_user_game_created_idx
  on public.scores (user_id, game_id, created_at desc);
create index if not exists scores_user_id_idx on public.scores (user_id);
