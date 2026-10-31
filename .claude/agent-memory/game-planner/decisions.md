# Decisiones de game-planner

Estados: `propuesto` / `aceptado` / `descartado` / `implementado`.

## 2026-10-28 — Estado inicial

- Asteroides, Tetris, Arkanoid y Snake: `implementado`. Sin propuestas previas.

## 2026-10-29 — Primera propuesta

- Candidatos: `invasores` (SHOOTER) 29/30; `2048` (PUZZLE) 25/30; `pong` (ARCADE) 23/30.
- Elegido: `invasores` (clon genérico de Space Invaders). Estado: `propuesto`.
- Razón: color `cyan` por regla de categoría (antes `green`), equilibra categorías (SHOOTER solo tenía 1 y ARCADE 2), reutiliza pala de `arkanoid` y disparo/vidas de `asteroides`.
- No elegidos (siguen disponibles, no descartados): `2048` (sin tensión arcade, final natural menos claro, anti-cheat flojo), `pong` (demasiado cercano a `arkanoid`, sin puntuación creciente natural).

## 2026-10-29 — Ampliación a 21 candidatos

- Cuatro `game-planner` en paralelo (SHOOTER, PUZZLE, ARCADE, variados). Total /30, 6 criterios.
- Añadidos (todos `propuesto`): `misiles` 28, `aleteo` 28, `corredor` 28, `ciempies` 27, `burbujas` 27, `bloques` 27, `rana` 27, `autopista` 27, `escuadron` 26, `gemas` 26, `comecocos` 26, `topos` 26, `saltarin` 25, `galeria` 25, `simon` 25, `ritmo` 24, `tanques` 23, `cajas` 22.
- Tabla completa en `references/game-suggestions-todo.md`. Elegido sigue siendo `invasores`.
- `topos` y `saltarin` salieron en dos agentes con `max_score_per_second` distinto (topos 150 vs 800; saltarin 120 vs 25). Fijar el valor en el brief definitivo.
