-- Invasores pasa a ser jugable. Tope teórico de puntos por segundo:
-- 4 disparos/s (bala única + enfriamiento de 0,25 s) x 300 puntos (platillo, lo más valioso) = 1200.
-- Máximo imposible de alcanzar jugando: el platillo aparece cada 20 a 30 s.
insert into public.games (id, title, max_score_per_second)
values ('invasores', 'INVASORES', 1200);
