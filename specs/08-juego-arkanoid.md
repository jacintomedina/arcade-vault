# SPEC 08 — Juego Arkanoid jugable en la plataforma con leaderboard

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-10-28
> **Objetivo:** Portar `references/started-games/04-arkanoid/` a TypeScript y publicarlo como el juego `arkanoid`, jugable en `/games/arkanoid/play` con 10 niveles y leaderboard real.

## Por qué existe esta spec

Arkanoid es el tercer juego real de la plataforma. Reutiliza el patrón de SPEC 05 (motor canvas aislado, HUD, pausa y modal a cargo de `GamePlayer`), el de SPEC 06 (sesión de partida del servidor y tope de puntos por segundo) y el contrato de SPEC 07 (`initialLives` opcional, `GameInput`).

Frente a Asteroides y Tetris tiene seis particularidades:

- Es el primer juego con ratón y con assets: un spritesheet PNG que se carga dentro del motor, tras el montaje.
- El canvas original ya es 800×600 (4:3), así que no hace falta letterbox.
- Tiene vidas (3) y niveles, igual que el HUD de Asteroides. No hay que adaptar el HUD.
- El original solo define 5 niveles y termina con "¡Completaste el juego!". Esta spec lo amplía a 10 niveles, con 5 patrones nuevos, y la victoria cierra la partida.
- La velocidad sube ×1,1 por nivel y en el nivel 10 llega a ≈ ×2,36. A esa velocidad un solo paso por frame puede atravesar bloques, así que la física usa pasos fijos.
- El original no tiene control de ángulo en la pala ni saque manual. Esta spec añade ambos.

## Alcance

**Dentro:**

- Entrada en `app/data/games.ts`: `id: "arkanoid"`, `title: "ARKANOID"`, `cat: "ARCADE"`, `color: "yellow"`, `cover: "cover-arkanoid"`, textos `short` y `long` en español. Sin `best` ni `plays`.
- `GameCategory` ampliado con `"ARCADE"` y `CATS` con `"ARCADE"`.
- Portada `.cover-arkanoid` en `app/globals.css` (bloques de colores, bola y pala sobre fondo oscuro, tonos yellow) y `.arkanoid-canvas` junto a `.asteroides-canvas`, con `touch-action: none`.
- Assets en `public/games/arkanoid/`: `spritesheet-breakout.png`, copiado de la referencia sin cambios.
- Port de `game.js`, `levels.js` y `assets/spritesheet.js` a TypeScript en `app/_games/arkanoid/` (`constants.ts`, `levels.ts`, `entities.ts`, `input.ts`, `engine.ts`), sin globals ni acceso a `document`/`window` fuera de funciones de montaje.
- Componente cliente `app/_components/games/arkanoid-game.tsx` con `ArkanoidGame`, `ArkanoidControlsHint` y `ArkanoidTouchControls`.
- Registro en `REAL_GAMES` de `app/_components/game-player.tsx`.
- Canvas lógico 800×600, escalado por CSS al ancho de `.crt-screen`.
- Mecánicas del original que se conservan:
  - Rejilla de bloques de 10 columnas × 6 filas con celdas de 64×24 px y origen `(80, 80)`.
  - Pala de 81×14 px en `y = 560`, bola de 16×16 px.
  - Pala con teclado a 400 px/s.
  - Rebote en paredes izquierda, derecha y techo.
  - Cada bloque roto suma 10 puntos y rebota la bola invirtiendo `vy`.
  - Animación de explosión de 4 frames y 150 ms al romper un bloque.
  - 3 vidas. La bola que cae por abajo resta una vida.
  - Niveles 1 a 5 con los patrones de `levels.js`.
  - Velocidad base de la bola `(200, −300)` px/s, multiplicada por nivel.
- Cambios sobre el original:
  - 10 niveles. Los niveles 6 a 10 son patrones nuevos (ver Modelo de datos). Completar el nivel 10 termina la partida con `onGameOver(score)`.
  - Velocidad por nivel `1,1^(nivel − 1)`: nivel 5 = ×1,4641 (el original redondea a 1,46) y nivel 10 = ×2,3579.
  - Ángulo según el punto de impacto en la pala (ver Modelo de datos).
  - Saque manual al inicio de la partida, tras perder una vida y al empezar cada nivel: la bola queda sobre la pala hasta que el jugador la lanza.
  - Física en pasos fijos de 1/120 s y un bloque roto como máximo por paso, para que a velocidad ×2,36 la bola no atraviese bloques.
  - Se descartan HUD pintado, overlay PAUSA/GAME OVER/victoria, selector de nivel, `Escape` como pausa y sonido.
- Entrada:
  - Teclado: `←` `→` mover la pala, `Espacio` lanzar, `P` pausar (lo gestiona `GamePlayer`).
  - Ratón: mover el puntero sobre el canvas centra la pala bajo el puntero; clic en el canvas lanza la bola.
  - Táctil: arrastrar el dedo sobre el canvas mueve la pala (mismos eventos de puntero que el ratón) y botones ◀ ▶ de mantener y LANZAR en pantalla.
- Pausa real: PAUSA y `P` detienen `update` y `draw`; al reanudar no hay salto de `dt`.
- Migración `supabase/migrations/20261028120000_juego_arkanoid.sql` con la fila de `games` y `max_score_per_second = 1200`.
- `app/_lib/supabase/database.types.ts` regenerado.
- Aviso de teclas (`.controls-hint`) bajo el marco CRT, oculto en pantallas táctiles y a ≤720 px como el de Tetris.

**Fuera de alcance (para futuras specs):**

- Sonido y música (`ball-bounce.mp3` y `break-sound.mp3` no se copian).
- Selector de nivel en la pausa del original.
- Power-ups, bloques de varios golpes, bloques indestructibles, láser o multibola.
- Supabase Auth, re-simulación en servidor, rate limiting, moderación de nombres.
- Gamepad, teclas remapeables.
- Tests automatizados.
- Leer el catálogo desde la tabla `games`.

## Modelo de datos

Entrada del catálogo:

```ts
// app/data/games.ts
{ id: "arkanoid", title: "ARKANOID", cat: "ARCADE", color: "yellow",
  cover: "cover-arkanoid", short: "...", long: "..." }
```

Contrato: `GameStats` no cambia. Arkanoid emite `{ score, lives, level }` con `lives` de 3 a 0 y `level` de 1 a 10. `initialLives` usa el valor por defecto (3). `GameInput` no cambia: `press("left" | "right" | "launch", down)`; `aim` queda vacío.

Registro en `game-player.tsx`:

```ts
arkanoid: {
	Component: ArkanoidGame,
	Controls: ArkanoidControlsHint,
	TouchControls: ArkanoidTouchControls,
},
```

Motor (`app/_games/arkanoid/`), sin React:

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
export type InputKey = "left" | "right" | "launch";
export function createEngine(opts: EngineOptions): Engine;
```

Estados del motor: `loading` (spritesheet cargando, sin bucle), `serving` (bola sobre la pala, esperando saque), `playing` y `finished` (derrota o victoria; `onGameOver` ya emitido una vez).

Archivos de `app/_games/arkanoid/`:

- `constants.ts`: `W`, `H`, `COLS`, `ROWS`, `BLOCK_W`, `BLOCK_H`, `ORIGIN_X`, `ORIGIN_Y`, `PADDLE_W`, `PADDLE_H`, `PADDLE_Y`, `PADDLE_SPEED`, `BALL_SIZE`, `BASE_VX`, `BASE_VY`, `SPEED_STEP`, `MAX_LEVEL`, `MAX_ANGLE`, `BLOCK_POINTS`, `STEP`, `MAX_DT`, `EXPLOSION_MS`, `START_LIVES`.
- `levels.ts`: `LEVELS: Level[]` con `{ blocks: { col, row, color }[] }`; la velocidad sale de `speedOf(level)`. Datos tipados, sin generación aleatoria.
- `entities.ts`: tipos `Block`, `Ball`, `Paddle`, `Explosion`, tabla de sprites (`SPRITES`, `EXPLOSION_FRAMES`), `loadSpritesheet(): Promise<HTMLImageElement>` y funciones `drawSprite`/`drawFrame(ctx, img, ...)`.
- `input.ts`: `createInput(canvas)` con `attach()`, `detach()`, `set()`, `poll()`, `clear()`. Teclado en `window`; `pointermove` y `pointerdown` en el canvas, con la conversión `(clientX − rect.left) × W / rect.width`.
- `engine.ts`: bucle con acumulador de pasos fijos, colisiones, niveles, vidas, `onStats` y `onGameOver`.

Patrones de los niveles 6 a 10 (índices `col` 0–9, `row` 0–5; colores por fila con la paleta existente, fijados en `levels.ts`):

| Nivel | Patrón | Regla | Bloques |
| ----- | ------ | ----- | ------- |
| 6 | Columnas alternas | `col` par, todas las filas | 30 |
| 7 | Diagonales | todas las celdas salvo `(col + row) % 3 === 0` | 40 |
| 8 | Pirámide invertida | fila `r` ocupa `col` de `r` a `9 − r`, para `r` de 0 a 4 | 30 |
| 9 | Marco doble | marco exterior del nivel 5 más las filas 2 y 3 con `col` de 2 a 7 | 40 |
| 10 | Parrilla con hueco | 10×6 completa sin las celdas `col` 4–5 de las filas 2–3 | 56 |

Los niveles 1 a 5 tienen 60, 40, 30, 39 y 39 bloques. Total de la partida completa: 404 bloques = 4040 puntos.

Convenciones:

- Origen arriba a la izquierda. Tamaño lógico 800×600. Velocidades en px/s.
- `dt` en segundos, limitado a 0,05 s. El motor lo consume en pasos fijos de `STEP = 1/120` s (como máximo 6 por frame). A ×2,36 la bola recorre 7,1 px por paso, menos que su tamaño (16 px) y que el alto de un bloque (24 px).
- Velocidad de la bola: módulo `|(200, −300)| × speedOf(nivel)` = 360,56 × 1,1^(nivel − 1) px/s.
- Saque: la bola sigue el centro de la pala en `serving`. Al lanzar sale con `(200, −300) × speedOf(nivel)`, como el original.
- Rebote en la pala: `offset = (centroBola − centroPala) / (PADDLE_W / 2)` limitado a `[−1, 1]`; ángulo = `offset × MAX_ANGLE` respecto a la vertical con `MAX_ANGLE = 60°`; `vx = módulo × sin(ángulo)`, `vy = −módulo × cos(ángulo)`. El módulo se conserva, `vy` nunca queda por debajo de `0,5 × módulo`.
- Rebote en bloques: `vy` se invierte y se rompe un bloque por paso, como el original.
- Ratón y dedo: la pala se centra bajo el puntero y se limita a `[0, W − PADDLE_W]`. En teclado, `←` `→` mueven 400 px/s. Si hay puntero y teclado a la vez, manda el último evento.
- Spritesheet: se carga con `new Image()` dentro del motor. Mientras carga, el estado es `loading` y no arranca el bucle. Si falla la carga, el motor arranca igualmente y dibuja rectángulos de color y un círculo; la partida sigue siendo jugable.
- `onStats` emite `{ score, lives, level }` solo cuando cambia alguno. Un `onStats` inicial con `{ 0, 3, 1 }` al empezar.
- `onGameOver(finalScore)` una sola vez: al perder la tercera vida o al romper el último bloque del nivel 10.

Fila de `games`:

```sql
insert into public.games (id, title, max_score_per_second)
values ('arkanoid', 'ARKANOID', 1200);
```

Cálculo de `max_score_per_second`:

- Un paso de física rompe como máximo un bloque.
- Hay 120 pasos por segundo (`STEP = 1/120`), así que el máximo teórico es 120 bloques/s.
- 120 bloques/s × 10 puntos = 1200 puntos/s.
- Es un máximo teórico imposible de alcanzar jugando, porque tras cada rotura `vy` se invierte y la bola se aleja del bloque. Evita rechazar una partida legítima. La partida entera suma 4040 puntos como máximo.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/01-app/` lo relevante a Client Components, `useEffect`, ficheros estáticos en `public/` y Cache Components. Sin cambios de código.
2. Añadir `arkanoid` a `app/data/games.ts`, ampliar `GameCategory` y `CATS`, y añadir `.cover-arkanoid` y `.arkanoid-canvas` a `app/globals.css` (usar `/frontend-design` para la portada). `/games` muestra la tarjeta nueva y `/games/arkanoid` carga la ficha. El botón de jugar aún falla al no haber componente registrado.
3. Crear la migración `juego_arkanoid`, mostrar el SQL, pedir confirmación, aplicarla con `apply_migration` y regenerar `database.types.ts`. Verificar con `list_tables`, `get_advisors` y `execute_sql`.
4. Copiar `spritesheet-breakout.png` a `public/games/arkanoid/`. Crear `constants.ts` y `levels.ts`. Sin enganche a la UI.
5. Crear `entities.ts`: tipos, tablas de sprites, `loadSpritesheet` y funciones de dibujo.
6. Crear `input.ts` con teclado, puntero (ratón y táctil) y `set()` para los botones.
7. Crear `engine.ts`: carga de sprites, pasos fijos, rebotes, ángulo de pala, saque, bloques, explosiones, niveles, vidas, `setPaused`, `stop`, `onStats` y `onGameOver`.
8. Crear `arkanoid-game.tsx` con canvas 800×600, `useEffect` con limpieza, `inputRef` y aviso de teclas.
9. Registrar `arkanoid` en `REAL_GAMES` de `game-player.tsx`. Asteroides y Tetris no cambian.
10. Crear `ArkanoidTouchControls` con botones ◀ ▶ y LANZAR (usar `/frontend-design`) y sus estilos en `app/globals.css`.
11. Pulido: 375px y 768px, `npm run lint` y `npm run build` limpios.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [x] `npm run lint` termina sin errores.
- [x] `npm run build` termina sin errores ni advertencias de Cache Components.
- [x] `/games` muestra la tarjeta ARKANOID con su portada `cover-arkanoid`, y Asteroides y Tetris siguen igual.
- [x] `/games/arkanoid` muestra la ficha y su botón de jugar lleva a `/games/arkanoid/play`.
- [x] `/games/arkanoid/play` muestra un canvas con 60 bloques, la pala y la bola sobre ella, y ni HUD ni texto de fin pintados en el canvas.
- [x] El spritesheet se carga desde `/games/arkanoid/spritesheet-breakout.png`; si la petición falla, el juego se dibuja con formas simples y sigue siendo jugable.
- [x] `←` y `→` mueven la pala a 400 px/s y no la sacan del canvas.
- [x] Mover el ratón sobre el canvas centra la pala bajo el puntero, también con el canvas escalado, sin salirse de `[0, 719]` px lógicos.
- [x] Arrastrar el dedo sobre el canvas mueve la pala y no hace scroll de la página.
- [x] La bola queda sobre la pala hasta pulsar `Espacio`, hacer clic en el canvas o pulsar LANZAR; entonces sale con velocidad `(200, −300)`.
- [x] Tras perder una vida y al empezar cada nivel, la bola vuelve a quedar sobre la pala esperando saque.
- [x] La bola rebota en las paredes izquierda y derecha y en el techo.
- [x] Un golpe en el centro de la pala sale en vertical; en el borde sale a 60° de la vertical; el módulo de la velocidad no cambia.
- [x] Romper un bloque suma exactamente 10 puntos, invierte `vy` y muestra la explosión de 4 frames durante 150 ms.
- [x] A la velocidad del nivel 10 (×2,36) la bola no atraviesa bloques ni la pala.
- [x] Al caer la bola por abajo se pierde una vida; con la tercera termina la partida.
- [x] Al romper todos los bloques de un nivel sube el nivel y se carga el siguiente patrón con su velocidad.
- [x] Los niveles 1 a 5 tienen 60, 40, 30, 39 y 39 bloques y los niveles 6 a 10 tienen 30, 40, 30, 40 y 56.
- [x] El nivel 5 va a ×1,4641 y el nivel 10 a ×2,3579 la velocidad base.
- [x] Romper el último bloque del nivel 10 abre el modal "FIN DEL JUEGO" con la puntuación final, sin pasar por el nivel 11.
- [x] El HUD de la plataforma refleja puntuación, vidas (3 a 0) y nivel (01 a 10) en tiempo real.
- [x] PAUSA y la tecla `P` congelan el juego (incluida la bola en `serving`); al reanudar no hay salto de movimiento.
- [x] `Escape` no pausa el juego.
- [x] Al terminar se abre el modal "FIN DEL JUEGO" con la puntuación final.
- [x] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id = 'arkanoid'` y el modal muestra `#NN`.
- [x] "JUGAR DE NUEVO" reinicia con puntuación 0, 3 vidas y nivel 1, y abre una sesión nueva.
- [x] `startGameSession('arkanoid')` devuelve `sessionId`.
- [x] `execute_sql` muestra la fila `arkanoid` con `max_score_per_second = 1200`.
- [x] `list_tables` muestra RLS activo y `get_advisors` no reporta problemas nuevos.
- [x] `/hall` muestra la pestaña ARKANOID con estado vacío "SÉ EL PRIMERO" si no hay marcas, y las pestañas de Asteroides y Tetris siguen funcionando.
- [x] Tarjeta y ficha muestran la mejor marca y las partidas reales de Arkanoid (0 sin marcas).
- [x] La biblioteca `/games` ofrece el filtro ARCADE y muestra solo ARKANOID en él.
- [x] Con las flechas y `Espacio` la página no hace scroll durante la partida.
- [x] Al salir de `/games/arkanoid/play` no quedan listeners ni `requestAnimationFrame` activos (un segundo montaje no duplica la velocidad).
- [x] A 375px el canvas ocupa el ancho del marco, sin scroll horizontal, y los botones ◀ ▶ y LANZAR controlan la pala y el saque.
- [x] `/games/asteroides/play`, `/games/tetris/play` y las rutas de SPEC 01 a 07 siguen funcionando.

## Decisiones tomadas y descartadas

- **Sí:** port a TypeScript con componente cliente. **No:** `iframe` con `index.html`.
- **Sí:** la plataforma manda en HUD, pausa y modal. **No:** HUD, overlay ni selector de nivel propios en el motor.
- **Sí:** registro por mapa en `REAL_GAMES`. **No:** `if (game.id === ...)`.
- **Sí:** `id` `arkanoid`, categoría nueva ARCADE y color yellow (petición del usuario). Cyan y magenta ya los usan Asteroides y Tetris. **No:** `PUZZLE` (Arkanoid no es un puzzle).
- **Sí:** spritesheet del original en `public/games/arkanoid/` y explosiones de 4 frames (petición del usuario). Mantiene el aspecto original. **No:** rediseñar con formas simples.
- **Sí:** sonido fuera de alcance (petición del usuario). Evita autoplay bloqueado, silencio y pausa del audio. **No:** copiar los `.mp3`.
- **Sí:** 10 niveles con patrones nuevos 6 a 10 y fin de partida al completar el 10 (petición del usuario: "fin en el nivel 10"). **No:** parar en 5 como el original ni niveles infinitos.
- **Sí:** velocidad `1,1^(nivel − 1)` hasta ×2,36 (petición del usuario). Fórmula única que reproduce la tabla del original salvo redondeos (×1,331 y ×1,4641 frente a ×1,33 y ×1,46). **No:** tope de velocidad en el nivel 5.
- **Sí:** física en pasos fijos de 1/120 s con un bloque roto por paso. Evita el tunneling a ×2,36 y da un tope de puntos exacto. **No:** un único paso por frame como el original.
- **Sí:** ángulo de rebote según el punto de impacto en la pala, hasta 60° (petición del usuario). Da control al jugador. **No:** rebote fiel sin ángulo.
- **Sí:** saque manual con `Espacio`, clic o LANZAR (petición del usuario). Evita perder vidas en cadena. **No:** bola en movimiento al instante.
- **Sí:** táctil con arrastre sobre el canvas más botones ◀ ▶ y LANZAR. El arrastre usa los mismos eventos de puntero que el ratón y el canvas lleva `touch-action: none`. **No:** solo botones (pala imprecisa).
- **Sí:** el rebote en bloques invierte `vy`, como el original. **No:** resolver por eje de menor penetración (cambia el comportamiento sin que se haya pedido).
- **Sí:** `Escape` deja de pausar y el selector de nivel se descarta. La pausa es de la plataforma (`P`). **No:** duplicar atajos ni UI dentro del canvas.
- **Sí:** `max_score_per_second = 1200` en la BD, con el cálculo explicado. **No:** constante en código.
- **Sí:** fallback de formas simples si falla la carga del spritesheet. La página no se rompe. **No:** bloquear la partida.
- **Sí:** `Math.random()` no se usa; el motor es determinista. **No:** aleatoriedad en el saque.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| React Strict Mode monta el efecto dos veces y duplica el bucle | `createEngine` devuelve `stop()`, que el `useEffect` llama en la limpieza. Criterio de aceptación de un segundo montaje. |
| Módulos del motor evalúan `window`, `document` o `Image` en SSR | Nada a nivel superior; el motor y la carga del spritesheet se crean solo dentro de `useEffect`. |
| Carga asíncrona del spritesheet con Strict Mode o `stop()` antes de terminar | El motor comprueba un flag `stopped` al resolver la carga y no arranca el bucle si ya se detuvo. |
| Las flechas y `Espacio` hacen scroll | Ya están en las teclas con `preventDefault` de `GamePlayer`; criterio de aceptación sin scroll. |
| El arrastre táctil sobre el canvas hace scroll de la página | `touch-action: none` en `.arkanoid-canvas` y `preventDefault` en `pointerdown`. |
| Ratón desalineado con el canvas escalado por CSS | Conversión con `getBoundingClientRect()` a coordenadas lógicas; criterio de aceptación con el canvas escalado. |
| `dt` enorme al volver de otra pestaña o al reanudar | Tope de 0,05 s (máximo 6 pasos por frame) y reinicio de `lastTime` al reanudar. |
| Tunneling de la bola a ×2,36 | Pasos fijos de 1/120 s: 7,1 px por paso frente a 16 px de bola y 24 px de bloque. |
| Bola atrapada en un bucle horizontal infinito (`vy` casi 0) | Ángulo limitado a 60° en la pala, así `vy` ≥ 0,5 × módulo en cada rebote de pala. |
| La bola se queda en `serving` y el jugador no sabe cómo lanzar | El aviso de teclas indica `Espacio` / clic y el botón LANZAR es visible en táctil. |
| Pausa durante `serving` o el lanzamiento con `Espacio` activa un botón enfocado | `preventDefault` de `Espacio` en `GamePlayer` y `tabIndex={-1}` en los botones táctiles, como en Tetris. |
| Fallo de red al cargar el PNG | Fallback de formas simples; la partida sigue. |
| La UI de `/hall`, `/games` o `GamePlayer` asume un número fijo de juegos o categorías | Verificar con tres juegos y la categoría ARCADE; corregir dentro de esta spec y anotarlo en Decisiones. |
| Cambiar `REAL_GAMES` rompe Asteroides o Tetris | Solo se añade una entrada; criterio de aceptación sobre ambos. |
| El tope de 1200 pts/s apenas frena a un bot | Límite aceptado en SPEC 06. El uso único de la sesión y el tope por segundo limitan el daño. |

## Lo que **no** está en esta spec

- Sonido y música.
- Selector de nivel, power-ups, bloques especiales, multibola.
- Supabase Auth, re-simulación en servidor, rate limiting y moderación de nombres.
- Gamepad y teclas remapeables.
- Catálogo leído desde la BD.
- Tests automatizados.
- Otros juegos de `references/started-games/`.

Cada uno, si llega, va en su propia spec.
