# Checklist de integración de un juego

Rutas reales del repo. Comprueba cada una contra el código actual antes de copiar: pueden haber cambiado desde SPEC 05 y 06.

## 1. Catálogo — `app/data/games.ts`

- Añade la entrada a `GAMES`: `id`, `title`, `short`, `long`, `cat`, `cover`, `color`. Sin `best` ni `plays`.
- Categoría nueva: amplía `GameCategory` y `CATS`.
- `id` en minúsculas y kebab-case. Es parte de la URL y de la FK de Supabase.
- Las rutas `app/games/[id]/page.tsx` y `app/games/[id]/play/page.tsx` usan `GAMES` en `generateStaticParams`. No requieren cambios.

## 2. Estilos — `app/globals.css`

- `.cover-<id>` y `.cover-<id>::after` junto a `.cover-asteroides`. Usa `/frontend-design`.
- `.<id>-canvas` junto a `.asteroides-canvas` si el canvas necesita estilos propios (escalado al ancho de `.crt-screen`, sin deformar).
- Controles táctiles: reutiliza `.touch-controls`, `.fire-btn`, `.joystick` si sirven; clases nuevas solo si no.

## 3. Motor — `app/_games/<id>/`

Modelo: `app/_games/asteroides/`.

- `constants.ts`: tamaño lógico, velocidades, puntos.
- `entities.ts`: clases o fábricas tipadas; `draw(ctx, ...)` recibe el contexto como argumento.
- `input.ts`: `createInput()` con `attach()`, `detach()`, `set()`, `clear()`. Teclado en `window` dentro de `attach`.
- `engine.ts`: `createEngine({ canvas, onStats, onGameOver })` devuelve `{ start, stop, setPaused, setInput, ... }`.
- Sin HUD, sin GAME OVER, sin reinicio por tecla.

## 4. Componente — `app/_components/games/<id>-game.tsx`

Modelo: `asteroides-game.tsx`.

- `"use client"`.
- Refs para `onStats`, `onGameOver` y `paused`, actualizadas en un `useEffect` sin dependencias.
- `useEffect(..., [runKey])` crea el motor, llama a `start()` y devuelve `stop()`.
- `useEffect(..., [paused])` llama a `setPaused`.
- `useEffect(..., [inputRef])` publica un `GameInput` en `inputRef.current` y lo limpia al desmontar.
- Exporta también `<Id>ControlsHint` y, si procede, `<Id>TouchControls` (props `TouchControlsProps`).

## 5. Reproductor — `app/_components/game-player.tsx`

- Añade una entrada a `REAL_GAMES`: `{ Component, Controls, TouchControls }`.
- Hoy `GAME_KEYS` (teclas con `preventDefault`) e `INITIAL_LIVES` son constantes del archivo. Si el juego necesita otras, conviértelas en propiedades de la entrada del registro, con el valor actual de Asteroides como valor por defecto. No uses `if (game.id === ...)`.
- Si el juego no tiene vidas o nivel, decide con el usuario qué muestra el HUD (la spec lo fija).
- `startGameSession(game.id)`, `submitScore` y el modal ya son genéricos.

## 6. Contrato — `app/_components/games/types.ts`

- Solo ampliar. Una propiedad nueva obligatoria rompe Asteroides; hazla opcional.

## 7. Supabase

- Archivo `supabase/migrations/<timestamp>_juego_<id>.sql` desde `migration-template.sql`. Timestamp en formato `YYYYMMDDHHMMSS`, posterior al último de la carpeta.
- Muestra el SQL y pide confirmación; luego `apply_migration` con el mismo nombre y SQL.
- `list_tables`: RLS activo en `games`, `game_sessions`, `scores`.
- `get_advisors` (seguridad): sin avisos nuevos.
- `execute_sql`: `select id, max_score_per_second from public.games;` muestra el juego con su tope.
- `generate_typescript_types` y actualiza `app/_lib/supabase/database.types.ts`.

## 8. Sin cambios esperados (verificar)

- `app/_actions/scores.ts`: genérico por `gameId`.
- `app/_lib/leaderboard.ts`: `getGameStats` recorre `GAMES`; `getLeaderboard` filtra por juego.
- `app/hall/` y `app/_components/hall-of-fame.tsx`: pestañas por `GAMES`.
- `/games` y `/games/[id]`: leen `getGameStats()`.

Si alguno de estos falla con un segundo juego (p. ej. la UI de `/hall` asume un solo juego), arréglalo dentro de la spec y anótalo en Decisiones.

## 9. Assets

- Imágenes y sonidos de la referencia → `public/games/<id>/`.
- Rutas absolutas desde `/games/<id>/...`. Carga dentro del motor, tras el montaje.

## 10. Verificación final

- `npm run lint` y `npm run build`.
- `npm run dev`: jugar, perder, guardar en el modal, ver `#NN`, comprobar `/hall`, `/games` y `/games/<id>`.
- 375px y 768px.
- Asteroides sigue funcionando.
- `SUPABASE_SERVICE_ROLE_KEY` no aparece en `.next/static`.
