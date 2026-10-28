-- Snake pasa a ser jugable. Tope teórico de puntos por segundo:
-- 1 fruta por tick x 16 casillas/s (nivel 9) = 16 frutas/s x 10 puntos = 160.
insert into public.games (id, title, max_score_per_second)
values ('snake', 'SNAKE', 160);
