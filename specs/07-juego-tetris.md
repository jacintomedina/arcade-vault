# SPEC 07 — Juego Tetris jugable en la plataforma con leaderboard

> **Estado:** Aprobado
> **Depende de:** SPEC 02, SPEC 05, SPEC 06
> **Fecha:** 2026-10-25
> **Objetivo:** Portar `references/started-games/03-tetris/` a TypeScript y publicarlo como el juego `tetris`, jugable en `/games/tetris/play` con leaderboard real.

## Por qué existe esta spec

Tetris es el segundo juego real de la plataforma. Reutiliza el patrón de SPEC 05 (motor canvas aislado, HUD, pausa y modal a cargo de `GamePlayer`) y el de SPEC 06 (sesión de partida del servidor y tope de puntos por segundo).

Frente a Asteroides tiene cuatro particularidades:

- No tiene vidas. El HUD conserva VIDAS con un único corazón fijo; la partida acaba al apilar hasta arriba.
- El tablero es vertical (10×20), pero el marco `.crt-screen` es 4:3. El canvas lógico sigue siendo 800×600 y el tablero se pinta dentro.
- El nivel del original no tiene techo, así que no hay tope fijo de puntos por segundo. La spec fija un nivel máximo de 15.
- El `game.js` trae 8 piezas (las 7 clásicas más la tuerca `N`). El código manda y se portan las 8, pero la tuerca solo aparece desde el nivel 6.

## Alcance

**Dentro:**

- Entrada en `app/data/games.ts`: `id: "tetris"`, `title: "TETRIS"`, `cat: "PUZZLE"`, `color: "magenta"`, `cover: "cover-tetris"`, textos `short` y `long` en español. Sin `best` ni `plays`.
- `GameCategory` ampliado con `"PUZZLE"` y `CATS` con `"PUZZLE"`.
- Portada `.cover-tetris` en `app/globals.css` (bloques de colores sobre fondo oscuro) y `.tetris-canvas` junto a `.asteroides-canvas`.
- Port de `game.js` a TypeScript en `app/_games/tetris/` (`constants.ts`, `entities.ts`, `input.ts`, `engine.ts`), sin globals ni acceso a `document`/`window` fuera de funciones de montaje.
- Componente cliente `app/_components/games/tetris-game.tsx` con `TetrisGame`, `TetrisControlsHint` y `TetrisTouchControls`.
- Registro en `REAL_GAMES` de `app/_components/game-player.tsx`.
- Canvas lógico 800×600. Tablero de 300×600 (10×20 celdas de 30 px) centrado en `x = 250`. Columna derecha pintada en el canvas, de arriba abajo: PUNTUACIÓN, NIVEL y panel SIGUIENTE.
- Mecánicas del original que se conservan:
  - Tablero 10×20.
  - 8 piezas: I, O, T, S, Z, J, L y N (tuerca, anillo 3×3), con los colores y formas de `game.js`.
  - Aparición en `y = 0`, centrada en `floor(10 / 2) - floor(ancho / 2)`.
  - Rotación horaria con wall kicks `[0, -1, 1, -2, 2]`.
  - Pieza fantasma al 20 % de opacidad.
  - Soft drop: +1 punto por fila. Si no puede bajar, la pieza se fija.
  - Hard drop: +2 puntos por celda recorrida y fijación inmediata.
  - Puntos por líneas: `[0, 100, 300, 500, 800] × nivel`.
  - Nivel `min(15, floor(líneas / 10) + 1)`.
  - Intervalo de caída `max(0,1 s, 1 s − (nivel − 1) × 0,09 s)`.
  - Fin de partida cuando una pieza recién generada colisiona al aparecer.
- Cambios sobre el original:
  - Nivel máximo 15 (multiplicador y HUD).
  - La pieza tuerca `N` solo se genera desde el nivel 6 (`NUT_MIN_LEVEL = 6`). En los niveles 1 a 5 el reparto es aleatorio puro entre las 7 clásicas. Desde el nivel 6, aleatorio puro entre las 8.
  - Animación al borrar líneas: las filas completas parpadean 0,3 s antes de eliminarse. Estado `clearing` del motor.
  - Auto-repeat propio para `←` `→` `↓`: retardo 170 ms y repetición cada 50 ms. El motor ignora `e.repeat`.
  - Se descartan el toggle claro/oscuro, el panel HTML, el overlay PAUSA/GAME OVER y el reinicio con botón del original.
  - Las líneas de rejilla usan `rgba(255,255,255,0.06)` sobre fondo negro, en lugar de la variable CSS `--grid-line`.
- Entrada de teclado: `←` `→` mover, `↓` bajar, `↑` o `X` rotar, `Espacio` caída instantánea, `P` pausar.
- Controles táctiles: botones ◀ ▼ ▶ con repetición al mantener a la izquierda, y CAÍDA y ROTAR a la derecha (en ese orden). El aviso de teclas (`.controls-hint`) se oculta en pantallas táctiles y a ≤720 px.
- Pausa real: PAUSA y `P` detienen `update` y `draw`; al reanudar no hay salto de `dt`.
- Contrato ampliado sin romper Asteroides: propiedad opcional `initialLives` en la entrada de `REAL_GAMES` (3 por defecto, 1 para Tetris). `GameStats` no cambia.
- Migración `supabase/migrations/<timestamp>_juego_tetris.sql` con la fila de `games` y `max_score_per_second = 12200`.
- `app/_lib/supabase/database.types.ts` regenerado.
- Sección "Cambios en el port a Arcade Vault" añadida a `references/started-games/03-tetris/README.md`, que documenta las diferencias con el original sin tocar el resto del archivo. Revisar al implementar que siga siendo exacta.

**Fuera de alcance (para futuras specs):**

- Sonido y música.
- Pieza de reserva (hold), 7-bag, rotación SRS, lock delay.
- Toggle claro/oscuro propio del juego.
- Supabase Auth, re-simulación en servidor, rate limiting, moderación de nombres.
- Gamepad, teclas remapeables, gestos táctiles sobre el canvas.
- Tests automatizados.
- Leer el catálogo desde la tabla `games`.

## Modelo de datos

Entrada del catálogo:

```ts
// app/data/games.ts
{ id: "tetris", title: "TETRIS", cat: "PUZZLE", color: "magenta",
  cover: "cover-tetris", short: "...", long: "..." }
```

Contrato: `GameStats` no cambia. Tetris emite siempre `lives: 1`; el HUD muestra un corazón durante toda la partida.

Registro en `game-player.tsx`:

```ts
tetris: {
	Component: TetrisGame,
	Controls: TetrisControlsHint,
	TouchControls: TetrisTouchControls,
	initialLives: 1, // por defecto 3; evita ver 3 corazones antes del primer onStats
},
```

Motor (`app/_games/tetris/`), sin React:

```ts
export interface EngineOptions {
	canvas: HTMLCanvasElement;
	onStats: (s: GameStats) => void;
	onGameOver: (finalScore: number) => void;
}
export interface Engine {
	start(): void;
	stop(): void; // cancela rAF y quita listeners
	setPaused(p: boolean): void;
	setInput(k: InputKey, down: boolean): void; // táctil
}
export type InputKey = "left" | "right" | "down" | "rotate" | "drop";
export function createEngine(opts: EngineOptions): Engine;
```

Estados del motor: `playing`, `clearing` (0,3 s con las filas parpadeando, sin gravedad ni entrada) y `gameover`.

Archivos de `app/_games/tetris/`:

- `constants.ts`: `W`, `H`, `COLS`, `ROWS`, `BLOCK`, `BOARD_X`, `NEXT_X`, `NEXT_Y`, `COLORS`, `PIECES`, `LINE_SCORES`, `MAX_LEVEL`, `NUT_MIN_LEVEL`, `MAX_DT`, `DAS`, `ARR`, `CLEAR_TIME`.
- `entities.ts`: tipos `Piece` y `Board`, funciones `randomPiece(level)` (recibe el nivel para decidir si entra la tuerca), `rotateCW`, `collide(board, ...)`, `createBoard` y `drawBlock(ctx, ox, oy, ...)`.
- `input.ts`: `createInput()` con `attach()`, `detach()`, `set()`, `poll(dt)` (consume pasos pendientes y avanza el auto-repeat), `clear()`, auto-repeat y pulsaciones de un solo disparo para rotar y caída.
- `engine.ts`: bucle, tablero, gravedad, fijación, borrado de líneas, `onStats` y `onGameOver`.

Convenciones:

- Origen arriba a la izquierda. Tamaño lógico 800×600.
- Columna derecha centrada en `x = 615 + 60`: PUNTUACIÓN (y = 300) y NIVEL (y = 380) con su valor debajo. Panel SIGUIENTE: caja de 4×4 celdas de 30 px en `x = 615`, `y = 480`, con la etiqueta "SIGUIENTE" encima. La columna queda alineada abajo con el tablero. La pieza se centra en la caja por su tamaño real.
- `dt` en segundos, limitado a 0,05 s. El acumulador de caída se reinicia a 0 al bajar, como en el original.
- `onStats` emite `{ score, lives: 1, level }` solo cuando cambia la puntuación o el nivel. Las líneas son estado interno del motor (nivel y puntos), no se muestran.
- El canvas pinta puntuación y nivel en la columna derecha (petición del usuario). No pinta líneas ni texto de fin de partida.

Fila de `games`:

```sql
insert into public.games (id, title, max_score_per_second)
values ('tetris', 'TETRIS', 12200);
```

Cálculo de `max_score_per_second`:

- Caída: 5 piezas/s × 38 puntos (2 puntos × 19 filas de hard drop desde la aparición) = 190.
- Líneas: una pieza tiene como máximo 8 celdas (tuerca). 5 piezas/s son 40 celdas/s, es decir, 1 Tetris/s (4 líneas = 40 celdas). Un Tetris a nivel 15 da 800 × 15 = 12000.
- Total: 190 + 12000 = 12190. Se redondea a 12200.
- Es un máximo teórico muy por encima de cualquier partida legítima. Evita rechazar una partida válida.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/01-app/` lo relevante a Client Components, `useEffect`, Server Actions y Cache Components. Sin cambios de código.
2. Añadir `tetris` a `app/data/games.ts`, ampliar `GameCategory` y `CATS`, y añadir `.cover-tetris` y `.tetris-canvas` a `app/globals.css`. `/games` muestra la tarjeta nueva y `/games/tetris` carga la ficha. El botón de jugar aún falla al no haber componente registrado.
3. Crear la migración `juego_tetris`, mostrar el SQL, pedir confirmación, aplicarla con `apply_migration` y regenerar `database.types.ts`. Verificar con `list_tables`, `get_advisors` y `execute_sql`.
4. Crear `constants.ts` y `entities.ts` del motor. Sin enganche a la UI.
5. Crear `input.ts` con teclado, auto-repeat y `set()` táctil.
6. Crear `engine.ts`: bucle, gravedad, fijación, estado `clearing`, `setPaused`, `stop`, `onStats` y `onGameOver`. Dibujar tablero, pieza fantasma, pieza actual y panel SIGUIENTE.
7. Crear `tetris-game.tsx` con canvas 800×600, `useEffect` con limpieza, `inputRef` y aviso de teclas.
8. Ampliar `game-player.tsx` con `initialLives` (usado en el estado inicial y en `restart`). Registrar `tetris` en `REAL_GAMES`. Asteroides no cambia de aspecto.
9. Crear `TetrisTouchControls` con botones ◀ ▶ ▼, ROTAR y CAÍDA (usar `/frontend-design`) y sus estilos en `app/globals.css`.
10. Pulido: 375px y 768px, `npm run lint` y `npm run build` limpios.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [x] `npm run lint` termina sin errores.
- [x] `npm run build` termina sin errores ni advertencias de Cache Components.
- [x] `/games` muestra la tarjeta TETRIS con su portada `cover-tetris` y Asteroides sigue igual.
- [x] `/games/tetris` muestra la ficha y su botón de jugar lleva a `/games/tetris/play`.
- [x] `/games/tetris/play` muestra un canvas con el tablero 10×20, el tablero centrado, PUNTUACIÓN, NIVEL y SIGUIENTE a la derecha, y ni líneas ni texto de fin pintados.
- [x] Hay 8 tipos de pieza, incluida la tuerca 3×3, con los colores de `game.js`.
- [x] En los niveles 1 a 5 nunca aparece la tuerca; desde el nivel 6 puede aparecer.
- [x] La pieza SIGUIENTE ya generada antes de subir de nivel no se regenera: si se generó en el nivel 5, no es tuerca; la primera tuerca posible es la pieza generada con el nivel 6 ya activo.
- [x] `←` y `→` mueven la pieza una celda y no la sacan del tablero.
- [x] Mantener `←`, `→` o `↓` repite tras 170 ms y luego cada 50 ms.
- [x] `↑` y `X` rotan en sentido horario, con wall kicks de hasta 2 columnas.
- [x] La pieza fantasma se muestra al 20 % de opacidad donde aterrizará la pieza.
- [x] `↓` suma 1 punto por fila; si no puede bajar, la pieza se fija.
- [x] `Espacio` suma 2 puntos por celda recorrida y fija la pieza al instante.
- [x] Borrar 1, 2, 3 y 4 líneas suma 100, 300, 500 y 800 por el nivel actual.
- [x] Las filas completas parpadean 0,3 s antes de eliminarse y la gravedad y la entrada se detienen durante ese tiempo.
- [x] El nivel sube cada 10 líneas y no pasa de 15.
- [x] El intervalo de caída es 1 s en nivel 1 y 0,1 s desde el nivel 11.
- [x] La partida termina cuando una pieza nueva colisiona al aparecer.
- [x] El HUD de la plataforma refleja puntuación y nivel en tiempo real y muestra exactamente 1 corazón en VIDAS durante toda la partida, también justo tras montar y tras "JUGAR DE NUEVO".
- [x] PAUSA y la tecla `P` congelan el juego; al reanudar no hay salto de movimiento.
- [x] Al terminar se abre el modal "FIN DEL JUEGO" con la puntuación final.
- [x] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id = 'tetris'` y el modal muestra `#NN`.
- [x] "JUGAR DE NUEVO" reinicia con puntuación 0, nivel 1 y 1 corazón, y abre una sesión nueva.
- [x] `startGameSession('tetris')` devuelve `sessionId`.
- [x] `execute_sql` muestra la fila `tetris` con `max_score_per_second = 12200`.
- [x] `list_tables` muestra RLS activo y `get_advisors` no reporta problemas nuevos.
- [x] `/hall` muestra la pestaña TETRIS con estado vacío "SÉ EL PRIMERO" si no hay marcas.
- [x] Tarjeta y ficha muestran la mejor marca y las partidas reales de Tetris (0 sin marcas).
- [x] Con las flechas y `Espacio` la página no hace scroll durante la partida.
- [x] Al salir de `/games/tetris/play` no quedan listeners ni `requestAnimationFrame` activos (un segundo montaje no duplica la velocidad).
- [x] A 375px el canvas ocupa el ancho del marco, sin scroll horizontal, y los botones ◀ ▶ ▼, ROTAR y CAÍDA controlan la pieza.
- [x] `/games/asteroides/play` y las rutas de SPEC 01 a 06 siguen funcionando, con el HUD de Asteroides mostrando VIDAS.

## Decisiones tomadas y descartadas

- **Sí:** port a TypeScript con componente cliente. **No:** `iframe` con `index.html`.
- **Sí:** la plataforma manda en HUD, pausa y modal. **No:** HUD, overlay ni reinicio propios en el motor.
- **Sí:** registro por mapa en `REAL_GAMES`. **No:** `if (game.id === ...)`.
- **Sí:** `id` `tetris`, categoría nueva PUZZLE y color magenta. Cyan ya lo usa Asteroides. **No:** reutilizar `SHOOTER` (no es un shooter).
- **Sí:** las 8 piezas del código, tuerca incluida, con la tuerca bloqueada hasta el nivel 6 (petición del usuario: la dificultad extra llega tras dominar las clásicas). El código manda sobre el README. **No:** tuerca desde el nivel 1 ni reducir a 7 piezas.
- **Sí:** la pieza se genera con el nivel vigente en ese momento, incluida la SIGUIENTE. **No:** regenerar la SIGUIENTE al subir de nivel (la vista previa dejaría de ser fiable).
- **Sí:** HUD con VIDAS y un único corazón fijo (petición del usuario, cambia la decisión inicial de mostrar LÍNEAS). Mantiene el HUD idéntico al de Asteroides y no toca `GameStats`. `initialLives` en el registro evita el parpadeo de 3 corazones. **No:** sustituir VIDAS por LÍNEAS ni ocultar el bloque.
- **Sí:** canvas lógico 800×600 con el tablero centrado y PUNTUACIÓN, NIVEL y SIGUIENTE en la columna derecha del canvas. No toca el marco 4:3 ni requiere HTML aparte. **No:** canvas vertical 300×600 ni marco distinto por juego.
- **Sí:** nivel máximo 15. Permite fijar un tope de puntos por segundo; la velocidad ya se estabiliza en el nivel 11, así que solo se limita el multiplicador. **No:** nivel ilimitado con tope arbitrario (rechazaría partidas largas legítimas).
- **Sí:** `max_score_per_second = 12200` en la BD, con el cálculo explicado. Es un máximo teórico por encima de cualquier partida legítima. **No:** constante en código.
- **Sí:** auto-repeat propio (170 ms / 50 ms) para `←` `→` `↓` y los botones táctiles. Mismo comportamiento en todos los sistemas. **No:** depender del auto-repeat del sistema operativo.
- **Sí:** botones táctiles ◀ ▶ ▼, ROTAR y CAÍDA. **No:** gestos sobre el canvas (imprecisos y chocan con el scroll).
- **Sí:** animación de 0,3 s al borrar líneas (petición del usuario), con estado `clearing`. Puntos y nivel se aplican al terminar la animación.
- **Sí:** descartar toggle claro/oscuro, panel HTML y overlay del original. La plataforma ya tiene tema, HUD y modal.
- **Sí:** aleatorio puro y sin hold, como el original. **No:** 7-bag ni reserva (cambian el juego).
- **Sí:** `Math.random()` solo dentro del motor, tras el montaje.
- **Sí: Skins del juego original** - El selector Retro / Neon / Pastel / Pixel Art se implementa. Razón: se añade para que el usuario pueda cambiar el aspecto del juego y se graba la preferencia en el localStorage. **No implementado:** contradice el Alcance y «Fuera de alcance» (sin tareas ni criterios), así que queda fuera de esta spec.

## Riesgos

| Riesgo                                                                         | Mitigación                                                                                                       |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| React Strict Mode monta el efecto dos veces y duplica el bucle                 | `createEngine` devuelve `stop()`, que el `useEffect` llama en la limpieza. Criterio de aceptación de un segundo montaje. |
| Módulos del motor evalúan `window` o `document` en SSR                          | Nada a nivel superior; el motor se crea solo dentro de `useEffect`.                                              |
| `Math.random()` en el render rompe la hidratación                              | La aleatoriedad vive en el motor, que arranca tras el montaje.                                                   |
| Las flechas y `Espacio` hacen scroll                                            | Ya están en las teclas con `preventDefault` de `GamePlayer`; criterio de aceptación sin scroll.                   |
| `dt` enorme al volver de otra pestaña o al reanudar                            | Tope de 0,05 s y reinicio de `lastTime` al reanudar.                                                             |
| Auto-repeat del motor y `e.repeat` del navegador se suman                      | El motor ignora `e.repeat` y genera sus propias repeticiones.                                                    |
| Mantener `↓` fija varias piezas seguidas sin querer                            | Comportamiento del original; se conserva. Se anota para una spec de ajuste (lock delay).                         |
| El tope de 12200 pts/s es muy alto y apenas frena a un bot                     | Límite aceptado en SPEC 06. El uso único de la sesión y el tope por segundo limitan el daño.                     |
| Cambiar `REAL_GAMES` rompe Asteroides                                          | Solo se amplía: `initialLives` opcional con valor por defecto 3. Criterio de aceptación sobre Asteroides.        |
| Un corazón fijo sugiere que se puede perder una vida                           | Aceptado por decisión del usuario; el fin de partida es inmediato y el modal explica el resultado.               |
| La UI de `/hall`, `/games` o `GamePlayer` asume un solo juego                  | Verificar con dos juegos en el catálogo; corregir dentro de esta spec y anotarlo en Decisiones.                  |
| Canvas 4:3 con tablero vertical deja espacio vacío y puede verse pequeño a 375px | Tablero a 600 px de alto en el lienzo lógico; se comprueba la legibilidad a 375px.                                |
| Desfase de escalado en los botones táctiles                                     | Tamaño lógico fijo y escalado por CSS; se verifica en 375px y en escritorio.                                     |

## Lo que **no** está en esta spec

- Sonido y música.
- Hold, 7-bag, SRS, lock delay.
- Toggle claro/oscuro del juego.
- Supabase Auth, re-simulación en servidor, rate limiting y moderación de nombres.
- Gamepad, teclas remapeables, gestos táctiles.
- Arkanoid ni otros juegos de `references/started-games/`.
- Catálogo leído desde la BD.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
