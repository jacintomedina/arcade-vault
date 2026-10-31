# Anexo de spec para un juego nuevo

Este archivo **no es una plantilla propia**. La estructura de la spec la fija `~/.claude/skills/spec/template.md` (skill `/spec`). Aquí solo se lista el contenido específico de juego que debe llevar cada sección. El modelo de redacción son `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-tabla-de-juegos.md`.

Nombre del archivo: `specs/NN-juego-<id>.md`. Objetivo en una sola frase, p. ej.: "Portar `references/started-games/<carpeta>/` a TypeScript y publicarlo como el juego `<id>`, jugable en `/games/<id>/play` con leaderboard real."

## Cabecera

- Estado inicial `Borrador`. Fecha de `date +%F`.
- `Depende de:` SPEC 02, SPEC 05, SPEC 06 (y las que apliquen).

## Por qué existe esta spec

Qué tiene de particular este juego frente a Asteroides (sin vidas, ratón, assets, otra proporción…) y qué patrón de SPEC 05 y 06 reutiliza.

## Alcance — Dentro

- Entrada en `app/data/games.ts`: `id`, `title`, `cat`, `color` (por categoría: SHOOTER=cyan, PUZZLE=magenta, ARCADE=yellow, nueva=green), `cover`, `short`, `long`. Sin `best` ni `plays` (salen de la BD).
- `GameCategory` y `CATS` ampliados, solo si la categoría es nueva.
- Portada `.cover-<id>` en `app/globals.css`, y `.<id>-canvas` si hace falta.
- Port a TypeScript en `app/_games/<id>/` (`engine.ts`, `entities.ts`, `input.ts`, `constants.ts`), sin globals ni acceso a `document`/`window` fuera de funciones de montaje.
- Componente cliente `app/_components/games/<id>-game.tsx`: el juego, `<Id>ControlsHint` y, si procede, `<Id>TouchControls`.
- Registro en `REAL_GAMES` de `app/_components/game-player.tsx`.
- Mecánicas del original que se conservan, una por línea y verificables.
- Entrada de teclado/ratón/táctil con la lista exacta de teclas.
- Pausa real y atajo `P`.
- Canvas de tamaño lógico fijo y escalado por CSS al marco `.crt-screen`; comportamiento a 375px.
- Migración `supabase/migrations/<timestamp>_juego_<id>.sql`: fila en `games` con `max_score_per_second`.
- `database.types.ts` regenerado.
- Assets y sonido, solo si se decidió incluirlos, en `public/games/<id>/`.

## Alcance — Fuera

Siempre: Supabase Auth, re-simulación en servidor, rate limiting, moderación de nombres, tests automatizados, gamepad, remapeo de teclas. Más lo que el usuario difirió en las preguntas (sonido, niveles extra…).

## Modelo de datos

- Entrada del catálogo (código real).
- `EngineOptions` y `Engine` del juego. Basarse en `app/_games/asteroides/engine.ts`; la interfaz de entrada táctil usa `GameInput` de `app/_components/games/types.ts`.
- Estados del motor (`playing`, `gameover`, y los propios del juego).
- Convenciones: origen arriba a la izquierda, tamaño lógico, unidades de velocidad, `dt` en segundos con tope 0,05 s.
- SQL de la fila de `games` y cálculo del `max_score_per_second`:
  máximo teórico = eventos por segundo × puntos por evento. Debe quedar justificado y ser ≥ cualquier partida legítima.
- Si el juego no tiene vidas o nivel: qué valores emite en `onStats` y qué muestra el HUD.

## Plan de implementación

Cada paso deja la app arrancando con `npm run dev` y se puede confirmar solo. Orden recomendado:

1. Leer docs de Next relevantes (`node_modules/next/dist/docs/01-app/`). Sin cambios de código.
2. Catálogo + portada. `/games` muestra la tarjeta y `/games/<id>` carga.
3. Migración de Supabase + tipos (con confirmación antes de aplicar).
4. `constants.ts` y `entities.ts`.
5. `input.ts` y `engine.ts` (bucle, colisiones, `setPaused`, `stop`, `onStats`, `onGameOver`).
6. Componente cliente, controles y aviso de teclas.
7. Registro en `REAL_GAMES` y ajustes de `GamePlayer` si el juego lo exige (`GAME_KEYS`, vidas iniciales) como propiedades del registro.
8. Pulido: 375px y 768px, `npm run lint`, `npm run build`.

Un paso que pase de 30–50 líneas de código se divide.

## Criterios de aceptación

Booleanos y verificables. Incluir siempre:

- [ ] `npm run lint` sin errores.
- [ ] `npm run build` sin errores ni advertencias de Cache Components.
- [ ] `/games` muestra la tarjeta con su portada y Asteroides sigue igual.
- [ ] `/games/<id>` muestra la ficha y su botón lleva a `/games/<id>/play`.
- [ ] `/games/<id>/play` muestra el canvas sin HUD ni texto de fin pintados en él.
- [ ] Un criterio por mecánica conservada, con cifras exactas (puntos, vidas, velocidades).
- [ ] El HUD de la plataforma refleja puntuación, vidas y nivel en tiempo real.
- [ ] PAUSA y `P` congelan el juego; al reanudar no hay salto.
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id = '<id>'` y el modal muestra `#NN`.
- [ ] "JUGAR DE NUEVO" reinicia y abre una sesión nueva.
- [ ] `startGameSession('<id>')` devuelve `sessionId`.
- [ ] `/hall` muestra la pestaña del juego, con estado vacío "SÉ EL PRIMERO" si no hay marcas.
- [ ] Tarjeta y ficha muestran la mejor marca y las partidas reales (0 sin marcas).
- [ ] `list_tables` muestra RLS activo y `get_advisors` no reporta problemas nuevos.
- [ ] Con las teclas del juego la página no hace scroll.
- [ ] Al salir de la ruta no quedan listeners ni `requestAnimationFrame` activos.
- [ ] A 375px el canvas ocupa el ancho del marco, sin scroll horizontal.
- [ ] `/games/asteroides/play` y las rutas de SPEC 01 a 06 siguen funcionando.

## Decisiones tomadas y descartadas

Una por línea, con motivo y alternativa descartada. Las habituales:

- Port a TypeScript con componente cliente. No `iframe`.
- Plataforma manda en HUD, pausa y modal. No HUD propio en el motor.
- Registro por mapa en `REAL_GAMES`. No `if (game.id === ...)`.
- Tope `max_score_per_second` en la BD, con el cálculo explicado.
- Las decisiones propias del juego salidas de las preguntas.

## Riesgos

Mantener los de SPEC 05 y 06 que apliquen (doble montaje de Strict Mode, `window` en SSR, `Math.random` en render, scroll con teclas, `dt` enorme, desfase de escalado, desincronía de modal y motor) y añadir los propios (ratón escalado, carga de assets, proporción no 4:3).

## Lo que no está en esta spec

Repetir el "Fuera" y añadir que cada elemento, si llega, va en su propia spec.
