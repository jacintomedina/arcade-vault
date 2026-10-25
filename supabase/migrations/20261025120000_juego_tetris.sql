-- Tetris pasa a ser jugable. Tope teórico de puntos por segundo:
-- caída 5 piezas/s x 38 = 190, líneas 1 Tetris/s a nivel 15 = 800 x 15 = 12000.
-- 190 + 12000 = 12190, redondeado a 12200.
insert into public.games (id, title, max_score_per_second)
values ('tetris', 'TETRIS', 12200);
