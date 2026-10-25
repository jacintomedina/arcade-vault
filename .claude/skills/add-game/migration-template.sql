-- supabase/migrations/<YYYYMMDDHHMMSS>_juego_<id>.sql
-- Registra el juego para que pueda abrir sesiones y guardar puntuaciones.
-- Sustituye <id>, <TÍTULO> y <tope> antes de aplicar.
--
-- <tope> = máximo teórico de puntos por segundo de una partida legítima.
--   Cálculo: <eventos por segundo> × <puntos por evento> = <tope>
--   (Asteroides: 5 disparos/s × 3 balas × 100 puntos = 1500)
-- Un tope NULL significa "juego sin puntuación registrable": no usar en juegos reales.

insert into public.games (id, title, max_score_per_second)
values ('<id>', '<TÍTULO>', <tope>);
