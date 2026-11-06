-- F04: evita reevaluar auth.uid() por fila (advisor auth_rls_initplan).
alter policy "profiles actualiza el propio" on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- F05: índice para la FK game_sessions.game_id (advisor unindexed_foreign_keys).
create index if not exists game_sessions_game_id_idx on public.game_sessions (game_id);

-- F06: defensa en profundidad. Solo se conservan los SELECT públicos de games
-- y scores; game_sessions es exclusiva del service role. El UPDATE de
-- profiles para authenticated no se toca.
revoke insert, update, delete, truncate, trigger, references
  on public.games, public.scores from anon, authenticated;
revoke all on public.game_sessions from anon, authenticated;
