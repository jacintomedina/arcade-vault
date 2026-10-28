# SPEC 09 — Juego Snake jugable en la plataforma con leaderboard

> **Estado:** Aprobado
> **Depende de:** SPEC 02, SPEC 05, SPEC 06, SPEC 07, SPEC 08
> **Fecha:** 2026-10-28
> **Objetivo:** Crear en TypeScript el juego Snake con los sprites de fruta de `references/source-assets/snake-assets/` y publicarlo como el juego `snake`, jugable en `/games/snake/play` con leaderboard real.

## Por qué existe esta spec

Snake es el cuarto juego real de la plataforma. Reutiliza el patrón de SPEC 05 (motor canvas aislado, HUD, pausa y modal a cargo de `GamePlayer`), el de SPEC 06 (sesión de partida del servidor y tope de puntos por segundo) y el contrato de SPEC 07 y SPEC 08 (`initialLives` opcional, `GameInput`, assets en `public/games/<id>/`).

Frente a los juegos anteriores tiene cinco particularidades:

- No existe un juego de referencia en `references/started-games/`. Solo hay assets: `fruits.png` (spritesheet) y `sprites.js` (atlas con las coordenadas de 22 frutas). El motor se escribe desde cero.
- No hay vidas. Se usa `initialLives: 1`, como Tetris, y el HUD no enseña corazones antes del primer `onStats`.
- El movimiento es por casillas con un tick fijo, no por `dt` continuo.
- La velocidad sube por frutas comidas: el nivel sale del número de frutas.
- El canvas 800×600 se divide en una rejilla de 20×15 celdas de 40 px, exactamente 4:3.

## Alcance

**Dentro:**

- Entrada en `app/data/games.ts`: `id: "snake"`, `title: "SNAKE"`, `cat: "ARCADE"`, `color: "cyan"`, `cover: "cover-snake"`, textos `short` y `long` en español. Sin `best` ni `plays`.
- Portada `.cover-snake` en `app/globals.css` (serpiente a cuadros y una fruta sobre fondo oscuro, tonos cyan) y `.snake-canvas` junto a `.arkanoid-canvas`, con `touch-action: none`.
- Assets en `public/games/snake/`: `fruits.png`, copiado de la referencia sin cambios.
- Motor en TypeScript en `app/_games/snake/` (`constants.ts`, `entities.ts`, `input.ts`, `engine.ts`), sin globals ni acceso a `document`/`window` fuera de funciones de montaje.
- Atlas de frutas tipado en `entities.ts`, portado de `sprites.js`, con las 22 frutas y sus recortes `{ x, y, w, h }`.
- Componente cliente `app/_components/games/snake-game.tsx` con `SnakeGame`, `SnakeControlsHint` y `SnakeTouchControls`.
- Registro en `REAL_GAMES` de `app/_components/game-player.tsx` con `initialLives: 1`.
- Canvas lógico 800×600, escalado por CSS al ancho de `.crt-screen`.
- Mecánicas:
  - Rejilla de 20 columnas × 15 filas con celdas de 40×40 px.
  - La serpiente empieza con 3 segmentos en el centro, mirando a la derecha, y espera quieta hasta la primera pulsación de dirección.
  - Avanza una casilla por tick. No puede girar 180° sobre sí misma. Se guardan como máximo 2 giros pendientes entre ticks.
  - Las paredes no matan: al salir por un borde reaparece por el opuesto.
  - Chocar con su propio cuerpo termina la partida.
  - Siempre hay una fruta en el tablero, en una celda libre. Cada aparición elige una de las 22 frutas al azar.
  - Cada fruta comida suma 10 puntos y alarga la serpiente 1 segmento.
  - Nivel `min(9, 1 + floor(frutas / 5))`. Velocidad `7 + nivel` casillas/s: 8 en el nivel 1 y 16 en el nivel 9.
  - Animación breve de la fruta al comerla (pulso de 150 ms) y de la serpiente al morir (parpadeo de 600 ms) antes de emitir `onGameOver`.
  - Llenar las 300 celdas termina la partida con `onGameOver(score)`.
- Entrada:
  - Teclado: `←` `→` `↑` `↓` y `W` `A` `S` `D` para girar, `P` pausar (lo gestiona `GamePlayer`).
  - Táctil: cruceta en pantalla ▲ ▼ ◀ ▶ (botones de pulsación). Sin gesto de deslizar.
  - Sin ratón.
- Pausa real: PAUSA y `P` detienen `update` y `draw`; al reanudar no hay salto de tiempo.
- Migración `supabase/migrations/20261028130000_juego_snake.sql` con la fila de `games` y `max_score_per_second = 160`.
- `app/_lib/supabase/database.types.ts` regenerado.
- Aviso de teclas (`.controls-hint`) bajo el marco CRT, oculto en pantallas táctiles y a ≤720 px como el de Tetris y Arkanoid.

**Fuera de alcance (para futuras specs):**

- Sonido y música.
- Estilo visual de neón o pixel art propio: se usa un tablero verde a cuadros claros y oscuros al estilo del Snake de Google, con formas simples para la serpiente y los sprites originales para las frutas.
- Frutas con valores distintos, frutas especiales, obstáculos o muros.
- Ratón y gesto de deslizar en pantallas táctiles.
- Supabase Auth, re-simulación en servidor, rate limiting, moderación de nombres.
- Gamepad, teclas remapeables, selector de dificultad.
- Tests automatizados.
- Leer el catálogo desde la tabla `games`.

## Modelo de datos

Entrada del catálogo:

```ts
// app/data/games.ts
{ id: "snake", title: "SNAKE", cat: "ARCADE", color: "cyan",
  cover: "cover-snake", short: "...", long: "..." }
```

Contrato: `GameStats` no cambia. Snake emite `{ score, lives: 1, level }` con `level` de 1 a 9. `initialLives` vale 1. `GameInput` no cambia: `press("up" | "down" | "left" | "right", down)`; `aim` queda vacío.

Registro en `game-player.tsx`:

```ts
snake: {
	Component: SnakeGame,
	Controls: SnakeControlsHint,
	TouchControls: SnakeTouchControls,
	initialLives: 1,
},
```

Motor (`app/_games/snake/`), sin React:

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
export type InputKey = "up" | "down" | "left" | "right";
export function createEngine(opts: EngineOptions): Engine;
```

Estados del motor: `loading` (spritesheet cargando, sin bucle), `ready` (serpiente quieta, esperando la primera dirección), `playing`, `dying` (parpadeo de 600 ms) y `finished` (`onGameOver` ya emitido una vez).

Archivos de `app/_games/snake/`:

- `constants.ts`: `W`, `H`, `COLS`, `ROWS`, `CELL`, `START_LENGTH`, `FRUIT_POINTS`, `FRUITS_PER_LEVEL`, `MAX_LEVEL`, `BASE_SPEED`, `MAX_DT`, `EAT_MS`, `DEATH_MS`, `SPRITE_URL`.
- `entities.ts`: tipos `Cell`, `Direction`, `Fruit`, atlas `FRUITS` (22 entradas portadas de `sprites.js`), `loadSprites(): Promise<HTMLImageElement>` y funciones `drawBoard`, `drawSnake`, `drawFruit(ctx, img, ...)`.
- `input.ts`: `createInput()` con `attach()`, `detach()`, `set()`, `poll()`, `clear()`. Teclado en `window`; mapa `e.code → dirección` para flechas y `WASD`.
- `engine.ts`: bucle, tick por acumulador, colisiones, frutas, niveles, `onStats` y `onGameOver`.

Convenciones:

- Origen arriba a la izquierda. Tamaño lógico 800×600. La celda `(col, fila)` ocupa `(col × 40, fila × 40)`.
- `dt` en segundos, limitado a 0,05 s. El motor suma `dt` a un acumulador y avanza un tick cada `1 / velocidad` s, como máximo 2 ticks por frame. Al reanudar se reinicia `lastTime` y el acumulador no cambia.
- Velocidad en casillas/s: `BASE_SPEED + nivel = 7 + nivel`.
- Cada fruta se dibuja dentro de su celda con el recorte del atlas, escalado para caber en 40×40 px sin deformar y centrado.
- Spritesheet: se carga con `new Image()` dentro del motor. Mientras carga, el estado es `loading` y no arranca el bucle. Si falla la carga, el motor arranca igualmente y dibuja un círculo de color por fruta; la partida sigue siendo jugable.
- Aleatoriedad: `Math.random()` solo dentro del motor, tras el montaje, para elegir la fruta y su celda libre.
- `onStats` emite `{ score, lives: 1, level }` solo cuando cambia alguno. Un `onStats` inicial con `{ 0, 1, 1 }` al empezar.
- `onGameOver(finalScore)` una sola vez: al chocar con el cuerpo (tras `dying`) o al llenar las 300 celdas.

Fila de `games`:

```sql
insert into public.games (id, title, max_score_per_second)
values ('snake', 'SNAKE', 160);
```

Cálculo de `max_score_per_second`:

- Un tick come como máximo una fruta.
- La velocidad máxima es 16 casillas/s (nivel 9), así que el máximo teórico es 16 frutas/s.
- 16 frutas/s × 10 puntos = 160 puntos/s.
- Es un máximo teórico imposible de alcanzar jugando, porque tras comer la fruta nueva aparece en otra celda y exige varias casillas de recorrido. Evita rechazar una partida legítima. La partida entera suma como máximo 2970 puntos (297 frutas = 300 celdas − 3 iniciales).

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/01-app/` lo relevante a Client Components, `useEffect`, ficheros estáticos en `public/` y Cache Components. Sin cambios de código.
2. Añadir `snake` a `app/data/games.ts`, y `.cover-snake` y `.snake-canvas` a `app/globals.css` (usar `/frontend-design` para la portada). `/games` muestra la tarjeta nueva y `/games/snake` carga la ficha. El botón de jugar aún falla al no haber componente registrado.
3. Crear la migración `juego_snake`, mostrar el SQL, pedir confirmación, aplicarla con `apply_migration` y regenerar `database.types.ts`. Verificar con `list_tables`, `get_advisors` y `execute_sql`.
4. Copiar `fruits.png` a `public/games/snake/`. Crear `constants.ts`. Sin enganche a la UI.
5. Crear `entities.ts`: tipos, atlas de 22 frutas, `loadSprites` y funciones de dibujo.
6. Crear `input.ts` con teclado (flechas y `WASD`) y `set()` para los botones.
7. Crear `engine.ts`: carga de sprites, tick por acumulador, giros con cola de 2, envolvimiento, colisión con el cuerpo, frutas, niveles, animaciones, `setPaused`, `stop`, `onStats` y `onGameOver`.
8. Crear `snake-game.tsx` con canvas 800×600, `useEffect` con limpieza, `inputRef` y aviso de teclas.
9. Registrar `snake` en `REAL_GAMES` de `game-player.tsx`. Asteroides, Tetris y Arkanoid no cambian.
10. Crear `SnakeTouchControls` con la cruceta ▲ ▼ ◀ ▶ (usar `/frontend-design`) y sus estilos en `app/globals.css`.
11. Pulido: 375px y 768px, `npm run lint` y `npm run build` limpios.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni advertencias de Cache Components.
- [ ] `/games` muestra la tarjeta SNAKE con su portada `cover-snake`, y Asteroides, Tetris y Arkanoid siguen igual.
- [ ] `/games/snake` muestra la ficha y su botón de jugar lleva a `/games/snake/play`.
- [ ] `/games/snake/play` muestra un tablero de 20×15 celdas, una serpiente de 3 segmentos, una fruta, y ni HUD ni texto de fin pintados en el canvas.
- [ ] El spritesheet se carga desde `/games/snake/fruits.png`; si la petición falla, la fruta se dibuja como círculo y el juego sigue siendo jugable.
- [ ] La serpiente no se mueve hasta la primera pulsación de dirección.
- [ ] `←` `→` `↑` `↓` y `A` `D` `W` `S` giran la serpiente.
- [ ] Un giro de 180° sobre sí misma se ignora.
- [ ] Dos giros pulsados dentro del mismo tick se aplican en ticks consecutivos.
- [ ] La serpiente que sale por un borde reaparece por el opuesto, sin morir.
- [ ] Comer una fruta suma exactamente 10 puntos y alarga la serpiente 1 segmento.
- [ ] La fruta nueva nunca aparece sobre la serpiente y es una de las 22 del atlas.
- [ ] El nivel sube cada 5 frutas y se queda en 9. La velocidad pasa de 8 casillas/s (nivel 1) a 16 casillas/s (nivel 9).
- [ ] Chocar con el propio cuerpo inicia el parpadeo de 600 ms y luego abre el modal "FIN DEL JUEGO".
- [ ] Llenar las 300 celdas termina la partida con `onGameOver(score)`.
- [ ] El HUD de la plataforma refleja puntuación, nivel (01 a 09) y una sola vida en tiempo real, sin enseñar 3 corazones al empezar.
- [ ] PAUSA y la tecla `P` congelan el juego; al reanudar no hay salto de movimiento.
- [ ] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id = 'snake'` y el modal muestra `#NN`.
- [ ] "JUGAR DE NUEVO" reinicia con puntuación 0, nivel 1 y la serpiente quieta, y abre una sesión nueva.
- [ ] `startGameSession('snake')` devuelve `sessionId`.
- [ ] `execute_sql` muestra la fila `snake` con `max_score_per_second = 160`.
- [ ] `list_tables` muestra RLS activo y `get_advisors` no reporta problemas nuevos.
- [ ] `/hall` muestra la pestaña SNAKE con estado vacío "SÉ EL PRIMERO" si no hay marcas, y las pestañas de los otros juegos siguen funcionando.
- [ ] Tarjeta y ficha muestran la mejor marca y las partidas reales de Snake (0 sin marcas).
- [ ] La biblioteca `/games` muestra SNAKE y ARKANOID en el filtro ARCADE.
- [ ] Con las flechas y `Espacio` la página no hace scroll durante la partida.
- [ ] Al salir de `/games/snake/play` no quedan listeners ni `requestAnimationFrame` activos (un segundo montaje no duplica la velocidad).
- [ ] A 375px el canvas ocupa el ancho del marco, sin scroll horizontal, y la cruceta controla la serpiente.
- [ ] `/games/asteroides/play`, `/games/tetris/play`, `/games/arkanoid/play` y las rutas de SPEC 01 a 08 siguen funcionando.

## Decisiones tomadas y descartadas

- **Sí:** juego nuevo sin referencia de código; los assets de `snake-assets/` fijan solo las frutas. **No:** buscar un `game.js` en `references/started-games/`.
- **Sí:** port a motor TypeScript con componente cliente. **No:** `iframe`.
- **Sí:** la plataforma manda en HUD, pausa y modal. **No:** HUD ni overlay propios en el motor.
- **Sí:** registro por mapa en `REAL_GAMES`. **No:** `if (game.id === ...)`.
- **Sí:** `id` `snake`, `ARCADE` y `cyan` (petición del usuario). Evita ampliar `GameCategory`. **No:** categoría nueva ni `green`.
- **Sí:** rejilla 20×15 de 40 px sobre 800×600. Es 4:3 exacto y encaja con `.crt-screen`. **No:** 17×15 de Google Snake (obliga a letterbox) ni 30×22.
- **Sí:** las paredes se atraviesan (petición del usuario). Solo mata el cuerpo propio. **No:** muerte por pared ni 3 vidas.
- **Sí:** `initialLives: 1` y nivel por frutas (5 por nivel, tope 9). Mismo patrón que Tetris. **No:** 3 vidas ni nivel fijo.
- **Sí:** velocidad `7 + nivel` casillas/s con tick por acumulador (8 a 16). Da la progresión pedida y un tope de puntos exacto. **No:** velocidad constante ni 6/s.
- **Sí:** las 22 frutas del atlas al azar, 10 puntos cada una (petición del usuario). **No:** fruta fija ni puntos por fruta.
- **Sí:** la serpiente espera la primera dirección. Evita morir al empezar. **No:** movimiento automático al montar.
- **Sí:** cola de 2 giros y bloqueo de 180°. Evita la muerte por doble pulsación rápida. **No:** un giro por tick sin cola.
- **Sí:** táctil solo con cruceta (petición del usuario). **No:** gesto de deslizar.
- **Sí:** animación de comer (150 ms) y de morir (600 ms), y fin de partida al llenar el tablero. No se pidió dejarlas fuera. **No:** muerte instantánea.
- **Sí:** sonido y estilo de neón fuera de alcance (petición del usuario). Tablero a cuadros simple y sprites originales.
- **Sí:** `max_score_per_second = 160` en la BD, con el cálculo explicado. **No:** constante en código.
- **Sí:** fallback de círculos si falla el PNG. La página no se rompe. **No:** bloquear la partida.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| React Strict Mode monta el efecto dos veces y duplica el bucle | `createEngine` devuelve `stop()`, que el `useEffect` llama en la limpieza. Criterio de aceptación de un segundo montaje. |
| Módulos del motor evalúan `window`, `document` o `Image` en SSR | Nada a nivel superior; el motor y la carga del PNG se crean solo dentro de `useEffect`. |
| `stop()` antes de terminar la carga del PNG | El motor comprueba un flag `stopped` al resolver la carga y no arranca el bucle si ya se detuvo. |
| `Math.random()` en render rompe la hidratación | Toda la aleatoriedad vive en el motor, que arranca tras el montaje. |
| Las flechas y `Espacio` hacen scroll | Ya están en las teclas con `preventDefault` de `GamePlayer`; criterio de aceptación sin scroll. |
| `W` `A` `S` `D` chocan con otros atajos del navegador | Solo se escuchan sin `ctrl`, `meta` ni `alt`, y no cuando el foco está en un campo de texto. |
| `dt` enorme al volver de otra pestaña o al reanudar | Tope de 0,05 s y máximo 2 ticks por frame; reinicio de `lastTime` al reanudar. |
| Fruta nueva imposible de colocar con el tablero casi lleno | Se elige entre las celdas libres; si no queda ninguna, la partida termina como victoria. |
| El tope de 160 pts/s apenas frena a un bot | Límite aceptado en SPEC 06. El uso único de la sesión y el tope por segundo limitan el daño. |
| `fruits.png` pesa (3790×442) y retrasa el inicio | Se carga una vez dentro del motor; mientras tanto el estado es `loading`. Si pesa demasiado, se anota para una spec de optimización. |
| La cruceta o `Espacio` activan un botón enfocado | `tabIndex={-1}` en los botones táctiles, como en Tetris y Arkanoid. |
| La UI de `/hall`, `/games` o `GamePlayer` asume un número fijo de juegos | Verificar con cuatro juegos; corregir dentro de esta spec y anotarlo en Decisiones. |
| Cambiar `REAL_GAMES` rompe otros juegos | Solo se añade una entrada; criterio de aceptación sobre los tres juegos anteriores. |

## Lo que **no** está en esta spec

- Sonido y música.
- Estilo de neón o pixel art propio para el tablero.
- Frutas con valores distintos, obstáculos y power-ups.
- Ratón y gesto de deslizar.
- Supabase Auth, re-simulación en servidor, rate limiting y moderación de nombres.
- Gamepad y teclas remapeables.
- Catálogo leído desde la BD.
- Tests automatizados.
- Otros juegos de `references/started-games/`.

Cada uno, si llega, va en su propia spec.
