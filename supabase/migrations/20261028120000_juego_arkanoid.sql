-- Arkanoid pasa a ser jugable. Tope teórico de puntos por segundo:
-- 1 bloque roto por paso de física x 120 pasos/s = 120 bloques/s x 10 puntos = 1200.
insert into public.games (id, title, max_score_per_second)
values ('arkanoid', 'ARKANOID', 1200);
