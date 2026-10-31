---
name: add-game
description: Crea un juego jugable con leaderboard en Arcade Vault y lo integra en la plataforma, a partir de una carpeta de references/started-games/ o desde cero. Primero redacta la spec siguiendo /spec, luego implementa.
disable-model-invocation: true
argument-hint: '<carpeta en references/started-games, p. ej. 03-tetris | descripción de un juego nuevo>'
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Skill, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git diff:*), Bash(git log:*), Bash(npm run lint:*), Bash(npm run build:*), Bash(npx tsc:*), mcp__supabase__list_tables, mcp__supabase__list_migrations, mcp__supabase__apply_migration, mcp__supabase__execute_sql, mcp__supabase__get_advisors, mcp__supabase__generate_typescript_types
---

# /add-game — Crear e integrar un juego con leaderboard

## Contexto de sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe specs/"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No existe references/started-games/"`

Juegos ya en el catálogo (`id`):
!`grep -E '^\s+id: "' app/data/games.ts`

Rama actual:
!`git branch --show-current`

---

Argumento recibido: `$ARGUMENTS`

Este skill convierte un juego (de `references/started-games/` o nuevo) en un juego real de la plataforma: motor canvas en TypeScript, componente cliente, registro en `GamePlayer`, fila en Supabase y leaderboard. El patrón sale de SPEC 05 (Asteroides) y SPEC 06 (leaderboard).

Responde en el mismo idioma del prompt inicial (normalmente español). Flujo **spec primero**: no se escribe código hasta que el usuario apruebe la spec.

Archivos de apoyo, en esta misma carpeta:

- `spec-template.md`: anexo con el contenido de juego que debe llevar cada sección de la spec.
- `integration-checklist.md`: archivos exactos a tocar y patrón a copiar.
- `porting-guide.md`: cómo portar un `game.js` vanilla al motor TS.
- `migration-template.sql`: fila de `games` con su tope de puntos.

## Fase 1 — Contexto

1. Lee `CLAUDE.md` y `AGENTS.md`. Next es 16.4: antes de escribir código Next, lee la guía relevante de `node_modules/next/dist/docs/01-app/`.
2. Lee `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-tabla-de-juegos.md` completas. Son el modelo de formato y de patrón.
3. Lee `integration-checklist.md` y `porting-guide.md`.
4. Si `$ARGUMENTS` es una carpeta de `references/started-games/`: lee su `README.md`, `CLAUDE.md`, `index.html`, `game.js` y, si existen, `levels.js`, `style.css` y `assets/`. Anota: tamaño del canvas, HUD propio, GAME OVER propio, vidas, niveles, puntuación, controles (teclado, ratón), sonido, assets.
5. Si `$ARGUMENTS` es una descripción o está vacío: no hay referencia. Si está vacío, pide al usuario una descripción de una frase. Si no cabe en una frase, sugiere dividirlo.
6. Revisa el código real de `app/_games/asteroides/`, `app/_components/games/asteroides-game.tsx` y `app/_components/game-player.tsx`. Pueden haber cambiado desde las specs; el código manda.

## Fase 2 — Preguntas

Lee ahora el skill `/spec`: `~/.claude/skills/spec/SKILL.md` y `~/.claude/skills/spec/template.md`. Es referencia obligatoria. Sigue su fase de preguntas (bloques de 3 a 5, con `AskUserQuestion`, esperando respuesta entre bloques) y sus categorías (alcance, datos, integración, persistencia, UX y estados, riesgos, decisiones cerradas). Si esos archivos no existen, avisa al usuario y usa SPEC 05 y 06 como modelo de formato.

Preguntas propias de un juego que debes cubrir (no preguntes lo que la referencia o el código ya responden):

- `id` kebab-case en minúsculas (parte de la URL), título visible en mayúsculas, categoría (si es nueva, se amplían `GameCategory` y `CATS`), color derivado de la categoría (`SHOOTER`=`cyan`, `PUZZLE`=`magenta`, `ARCADE`=`yellow`; categoría nueva=`green`), sin preguntarlo, textos `short` y `long` en español.
- Mecánicas del original que se conservan, se cambian o se quitan. Si no hay vidas o niveles (p. ej. Tetris), cómo se muestran en el HUD.
- Entrada: teclado, ratón, táctil. Qué controles táctiles hacen falta.
- Sonido y assets: dentro o fuera de alcance. Los assets van a `public/games/<id>/`.
- Proporción del canvas si no es 4:3 (el marco `.crt-screen` es 4:3).
- `max_score_per_second`: calcula el máximo teórico de una partida legítima, muéstralo y justifícalo como en SPEC 06. Nunca debe rechazar una partida legítima.
- Qué NO entra en esta spec.

## Fase 3 — Redactar la spec

1. Calcula el número `NN` siguiente al mayor de `specs/` y el nombre `specs/NN-juego-<id>.md`.
2. Antes de escribir, relee `~/.claude/skills/spec/SKILL.md` y `template.md` si no están en contexto, y lee `spec-template.md` de este skill.
3. Construye la spec con la estructura de `/spec` (cabecera, por qué, alcance dentro y fuera, modelo de datos, plan, criterios, decisiones, riesgos, lo que no está), rellenándola con el contenido de juego de `spec-template.md`. Usa el idioma, los estados y los encabezados de las specs existentes (`Borrador`, `Aprobado`, `Implementado`). Estado inicial: `Borrador`. `Depende de:` SPEC 02, SPEC 05, SPEC 06 más las que apliquen.
4. Respeta las reglas globales de `/spec`: una frase por idea, nombres concretos, sin TODOs, sin funciones completas de código.
5. Guarda la spec y muestra un resumen. Pide aprobación explícita. Si el usuario pide cambios, edita y vuelve a pedirla. **No avances a la Fase 4 sin aprobación.**

## Fase 4 — Implementar

1. Cambia el estado de la spec a `Aprobado`.
2. Crea la rama `spec-NN-juego-<id>` desde la rama principal (`git checkout -b`). Si hay cambios sin confirmar en el árbol, avisa antes.
3. Sigue el plan de la spec paso a paso, apoyándote en `integration-checklist.md` y `porting-guide.md`. Tras cada paso, enseña el diff resumido y espera conformidad antes del siguiente. Cada paso deja la app arrancando.
4. Invoca `/frontend-design` (Skill) para la portada `.cover-<id>`, los controles táctiles y el aviso de teclas. Lo exige `CLAUDE.md`.
5. Migración de Supabase: genera `supabase/migrations/<timestamp>_juego_<id>.sql` desde `migration-template.sql`. **Muestra el SQL y pide confirmación** antes de `apply_migration`. Después verifica con `list_tables`, `get_advisors` (seguridad) y `execute_sql` (la fila existe), y regenera `app/_lib/supabase/database.types.ts` con `generate_typescript_types`.
6. Ejecuta `npm run lint` y `npm run build`. Corrige hasta que terminen limpios.
7. Verifica los criterios de la spec. Marca `[x]` solo los que hayas comprobado de verdad; di cuáles quedan sin verificar (por ejemplo, jugabilidad en navegador). Cuando todo esté comprobado, estado `Implementado`.
8. No hagas commit ni push salvo que el usuario lo pida.

## Reglas fijas del patrón

- La plataforma manda: HUD, pausa, FIN y modal de guardado son de `GamePlayer`. El motor no pinta HUD ni GAME OVER y solo emite `onStats` y `onGameOver(finalScore)`.
- Ningún módulo toca `document` ni `window` en el nivel superior. El motor se crea solo dentro de `useEffect`, y la limpieza llama a `stop()` (cancela `requestAnimationFrame`, quita listeners).
- `dt` en segundos, limitado a 0,05 s; al reanudar se reinicia `lastTime`. La pausa real detiene `update` y `draw`.
- `Math.random()` solo dentro del motor, tras el montaje; nunca durante el render.
- Registro por mapa en `REAL_GAMES` de `game-player.tsx`. Nunca `if (game.id === ...)` suelto.
- Las puntuaciones solo entran por `startGameSession` y `submitScore` (`app/_actions/scores.ts`). Nunca desde el cliente directo ni por `localStorage`.
- No rompas Asteroides ni el contrato `GameComponentProps`: solo se amplía.
- No toques `SUPABASE_SERVICE_ROLE_KEY` ni la muestres.
