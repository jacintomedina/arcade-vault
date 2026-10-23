create table public.games (
  id text primary key,                 -- mismo id que app/data/games.ts
  title text not null,
  max_score_per_second integer check (max_score_per_second > 0)
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  started_at timestamptz not null default now(),
  consumed_at timestamptz
);

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games(id),
  session_id uuid not null unique references public.game_sessions(id),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score > 0),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

create view public.leaderboard with (security_invoker = true) as
select game_id, player_name, score, created_at, rank
from (
  select s.*, row_number() over (
    partition by game_id order by score desc, created_at asc
  ) as rank
  from public.scores s
) t
where rank <= 10;

alter table public.games enable row level security;
alter table public.game_sessions enable row level security;
alter table public.scores enable row level security;

create policy "games lectura pública" on public.games for select using (true);
create policy "scores lectura pública" on public.scores for select using (true);
-- Sin políticas de INSERT/UPDATE/DELETE. game_sessions sin ninguna política.
-- El cliente administrador (service_role) omite RLS y es la única vía de escritura.

insert into public.games (id, title, max_score_per_second) values
  ('bloque-buster', 'BLOQUE BUSTER', null),
  ('caida', 'CAÍDA', null),
  ('serpentina', 'SERPENTINA', null),
  ('gloton', 'GLOTÓN', null),
  ('invasores', 'INVASORES', null),
  ('rocas', 'ROCAS', null),
  ('asteroides', 'ASTEROIDES', 1500),
  ('ranaria', 'RANARIA', null),
  ('duelo-pixel', 'DUELO PIXEL', null);
