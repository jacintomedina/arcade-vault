# SPEC JAM invasores A — INVASORES (clásico fiel)

> **Estado:** Aprobado
> **Variante:** Fiel. El Space Invaders de 1978 tal como se recuerda: formación de 11×5, marcha a pasos que se acelera, 4 escudos que se desgastan, platillo bonus y oleadas infinitas.
> **Depende de:** SPEC 02, SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-10-29
> **Objetivo:** Crear en TypeScript el juego Invasores, clon de Space Invaders, y publicarlo como el juego `invasores`, jugable en `/games/invasores/play` con leaderboard real.

## Por qué existe esta spec

Invasores es el quinto juego real de la plataforma. Reutiliza el patrón de SPEC 05 (motor canvas aislado, HUD, pausa y modal a cargo de `GamePlayer`), el de SPEC 06 (sesión de partida del servidor y tope de puntos por segundo) y el contrato de SPEC 07 a 09 (`initialLives` opcional, `GameInput`).

Es un juego nuevo sin referencia en `references/started-games/`: el motor se escribe desde cero, con `asteroides` como esqueleto de archivos (disparo con `Espacio`, nave con `←` `→`) y `arkanoid` como modelo de física en pasos fijos.

Frente a los juegos ya implementados tiene cinco particularidades:

- La formación se mueve a saltos discretos, no por `dt` continuo: un temporizador de "marcha" mueve a todos los invasores a la vez y su intervalo depende de cuántos quedan (como el tick de `snake`).
- Los escudos son un bitmap destructible por celdas de 3 px, el primer terreno erosionable de la plataforma.
- No hay assets: los sprites son bitmaps de texto pintados con `fillRect`, así que no hay estado `loading` ni carga de PNG.
- La partida no tiene final por victoria: las oleadas se encadenan sin límite y el juego termina por derrota.
- El canvas es 800×600 (4:3), igual que el resto. No hace falta letterbox.

## Alcance

**Dentro:**

- Entrada en `app/data/games.ts`: `id: "invasores"`, `title: "INVASORES"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-invasores"`, textos `short` y `long` en español. Sin `best` ni `plays`.
  - `short`: "Detén la marcha de los invasores antes de que lleguen al suelo."
  - `long`: "Una formación de 55 invasores baja paso a paso y cada vez más rápido. Dispara desde tu cañón, resguárdate tras los escudos, que se desgastan con cada impacto, y caza al platillo bonus. Tienes 3 vidas y las oleadas no se acaban."
- `GameCategory` y `CATS` no cambian: `SHOOTER` ya existe. El color sale de la categoría (`SHOOTER` = `cyan`); `green` queda libre para una categoría nueva.
- Portada `.cover-invasores` en `app/globals.css` (filas de invasores pixelados y un cañón sobre fondo oscuro, tonos cyan) y `.invasores-canvas` junto a `.snake-canvas`.
- Sin assets en `public/games/invasores/`: los sprites viven como datos en `entities.ts`.
- Motor en TypeScript en `app/_games/invasores/` (`constants.ts`, `entities.ts`, `input.ts`, `engine.ts`), sin globals ni acceso a `document`/`window` fuera de funciones de montaje.
- Componente cliente `app/_components/games/invasores-game.tsx` con `InvasoresGame`, `InvasoresControlsHint` y `InvasoresTouchControls`.
- Registro en `REAL_GAMES` de `app/_components/game-player.tsx`, con 3 vidas por defecto (sin `initialLives`).
- Canvas lógico 800×600, escalado por CSS al ancho de `.crt-screen`.
- Mecánicas:
  - Formación de 11 columnas × 5 filas: 1 fila de calamares (30 puntos), 2 de cangrejos (20) y 2 de pulpos (10). Cada invasor ocupa una celda de 36×24 px con paso de 48 px en horizontal y 36 px en vertical.
  - Marcha: cada "tick" mueve toda la formación 8 px en horizontal y alterna el frame de animación. Al tocar un borde (margen de 20 px) baja 24 px y cambia de sentido.
  - Intervalo de marcha `(0,03 + 0,6 × vivos / 55) × 0,95^min(oleada − 1, 8)` segundos: 0,63 s con 55 invasores y 0,03 s con 1 en la oleada 1.
  - Cañón de 44×20 px en `y = 548`, a 300 px/s, limitado a `[20, 736]`.
  - Una sola bala del jugador a la vez (4×14 px, 600 px/s) y un enfriamiento de 0,25 s entre disparos. Mantener `Espacio` dispara en cuanto se permite.
  - Los invasores disparan al azar desde el más bajo de una columna viva, con máximo 3 balas enemigas en pantalla (4×14 px, 260 px/s) y un intervalo aleatorio de 0,5 a 1,2 s, multiplicado por `0,95^min(oleada − 1, 8)` y con un mínimo de 0,35 s.
  - Una bala del jugador y una enemiga que se cruzan se destruyen entre sí, sin puntos.
  - 4 escudos de 66×48 px con centros en `x = 160, 320, 480, 640` e `y = 440`, hechos de celdas de 3 px (rejilla de 22×16). Cada impacto, de bala propia o enemiga, borra las celdas en un radio de 2 celdas. Un invasor que cruza un escudo borra las celdas que toca.
  - Platillo bonus de 40×18 px en `y = 50`, a 140 px/s, que cruza la pantalla cada 20 a 30 s mientras queden al menos 8 invasores. Vale 50, 100, 150 o 300 puntos al azar.
  - 3 vidas. Un impacto enemigo en el cañón detiene la partida 1,2 s (explosión), borra todas las balas y recoloca el cañón en el centro.
  - Fin de partida al perder la tercera vida o cuando cualquier invasor llega a `y = 500` (borde inferior), aunque queden vidas.
  - Oleada superada al destruir los 55 invasores: pausa de 1,2 s, escudos restaurados, formación nueva y oleada + 1. Cada oleada empieza `24 × min(oleada − 1, 4)` px más abajo (`FORM_Y0 = 90`).
  - Nivel del HUD = oleada, sin tope. La dificultad deja de crecer en la oleada 9.
- Entrada:
  - Teclado: `←` `→` mover, `Espacio` disparar, `P` pausar (lo gestiona `GamePlayer`).
  - Táctil: botones ◀ ▶ de mantener a la izquierda y FUEGO a la derecha, como Asteroides.
  - Sin ratón.
- Pausa real: PAUSA y `P` detienen `update` y `draw`; al reanudar no hay salto de `dt`.
- Migración `supabase/migrations/20261029120000_juego_invasores.sql` con la fila de `games` y `max_score_per_second = 1200`.
- `app/_lib/supabase/database.types.ts` regenerado.
- Aviso de teclas (`.controls-hint`) bajo el marco CRT, oculto en pantallas táctiles y a ≤720 px como el de Tetris, Arkanoid y Snake.

**Fuera de alcance (para futuras specs):**

- Sonido y música.
- Vida extra por puntuación, modo de 2 jugadores, tabla de récords local.
- Invasores de varios golpes, jefes, power-ups y bombas.
- Ratón y gestos en pantallas táctiles.
- Supabase Auth, re-simulación en servidor, rate limiting, moderación de nombres.
- Gamepad, teclas remapeables.
- Tests automatizados.
- Leer el catálogo desde la tabla `games`.

## Modelo de datos

Entrada del catálogo:

```ts
// app/data/games.ts
{ id: "invasores", title: "INVASORES", cat: "SHOOTER", color: "cyan",
  cover: "cover-invasores", short: "...", long: "..." }
```

Contrato: `GameStats` no cambia. Invasores emite `{ score, lives, level }` con `lives` de 3 a 0 y `level` igual a la oleada (≥ 1). `GameInput` no cambia: `press("left" | "right" | "fire", down)`; `aim` queda vacío.

Registro en `game-player.tsx`:

```ts
invasores: {
	Component: InvasoresGame,
	Controls: InvasoresControlsHint,
	TouchControls: InvasoresTouchControls,
},
```

Motor (`app/_games/invasores/`), sin React:

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
export type InputKey = "left" | "right" | "fire";
export function createEngine(opts: EngineOptions): Engine;
```

Estados del motor: `intro` (0,8 s con la formación quieta), `playing`, `dying` (1,2 s tras un impacto), `clearing` (1,2 s entre oleadas) y `finished` (`onGameOver` ya emitido una vez).

Archivos de `app/_games/invasores/`:

- `constants.ts`: `W`, `H`, `COLS`, `ROWS`, `ALIEN_W`, `ALIEN_H`, `PITCH_X`, `PITCH_Y`, `FORM_X0`, `FORM_Y0`, `MARCH_STEP_X`, `DROP_Y`, `SIDE_MARGIN`, `INVASION_Y`, `SHIP_W`, `SHIP_H`, `SHIP_Y`, `SHIP_SPEED`, `PLAYER_BULLET_SPEED`, `FIRE_COOLDOWN`, `ENEMY_BULLET_SPEED`, `MAX_ENEMY_BULLETS`, `SHIELD_COUNT`, `SHIELD_CELL`, `SHIELD_BLAST`, `UFO_Y`, `UFO_SPEED`, `UFO_SCORES`, `ALIEN_POINTS`, `START_LIVES`, `STEP`, `MAX_DT`.
- `entities.ts`: tipos `Alien`, `Bullet`, `Shield`, `Ufo`, `Ship`; bitmaps de texto `SPRITES` (calamar, cangrejo, pulpo con 2 frames, cañón, platillo, explosión); funciones `createShield`, `erodeShield`, `drawSprite`, `drawShield`, `drawAlien`, `drawShip` (todas reciben `ctx`).
- `input.ts`: `createInput()` con `attach()`, `detach()`, `set()`, `poll()`, `clear()`. Teclado en `window`; mapa `e.code → acción` para `ArrowLeft`, `ArrowRight` y `Space`.
- `engine.ts`: bucle con acumulador de pasos fijos, temporizador de marcha, colisiones, escudos, platillo, oleadas, `onStats` y `onGameOver`.

Convenciones:

- Origen arriba a la izquierda. Tamaño lógico 800×600. Velocidades en px/s.
- `dt` en segundos, limitado a 0,05 s. El motor lo consume en pasos fijos de `STEP = 1/120` s (como máximo 6 por frame), igual que `arkanoid`: la bala del jugador recorre 5 px por paso, menos que el alto de un invasor (24 px). La marcha usa su propio acumulador y avanza como máximo 1 tick por paso.
- Sprites: bitmaps de texto (`"X"` pinta, `"."` no) de 11×8 celdas pintadas a 3 px, centrados en la celda de 36×24 del invasor. Sin PNG ni `Image`.
- Aleatoriedad: `Math.random()` solo dentro del motor, tras el montaje, para elegir columna y momento de disparo y la puntuación del platillo.
- `onStats` emite `{ score, lives, level }` solo cuando cambia alguno. Un `onStats` inicial con `{ 0, 3, 1 }` al empezar.
- `onGameOver(finalScore)` una sola vez: al perder la tercera vida (tras `dying`) o al invadir el suelo.

Fila de `games`:

```sql
insert into public.games (id, title, max_score_per_second)
values ('invasores', 'INVASORES', 1200);
```

Cálculo de `max_score_per_second`:

- Solo hay una bala del jugador a la vez y entre disparos pasan al menos 0,25 s, así que como máximo hay 4 disparos por segundo.
- Una bala destruye como máximo una cosa. Lo más valioso que puede destruir es el platillo, con 300 puntos (un calamar vale 30).
- 4 disparos/s × 300 puntos = 1200 puntos/s.
- Es un máximo teórico imposible de alcanzar jugando, porque el platillo aparece una vez cada 20 a 30 s y tarda unos 5,7 s en cruzar. Un ritmo realista de calamares da unos 120 puntos/s. El tope evita rechazar una partida legítima.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/01-app/` lo relevante a Client Components, `useEffect` y Cache Components. Sin cambios de código.
2. Añadir `invasores` a `app/data/games.ts`, y `.cover-invasores` e `.invasores-canvas` a `app/globals.css` (usar `/frontend-design` para la portada). `/games` muestra la tarjeta nueva y `/games/invasores` carga la ficha. El botón de jugar aún falla al no haber componente registrado.
3. Crear la migración `juego_invasores`, mostrar el SQL, pedir confirmación, aplicarla con `apply_migration` y regenerar `database.types.ts`. Verificar con `list_tables`, `get_advisors` y `execute_sql`.
4. Crear `constants.ts`. Sin enganche a la UI.
5. Crear `entities.ts`: tipos, bitmaps de sprites, escudo erosionable y funciones de dibujo.
6. Crear `input.ts` con teclado (`←` `→` `Espacio`) y `set()` para los botones.
7. Crear `engine.ts`: pasos fijos, marcha, cañón, balas, escudos, platillo, vidas, oleadas, `setPaused`, `stop`, `onStats` y `onGameOver`.
8. Crear `invasores-game.tsx` con canvas 800×600, `useEffect` con limpieza, `inputRef` y aviso de teclas.
9. Registrar `invasores` en `REAL_GAMES` de `game-player.tsx`. Los otros cuatro juegos no cambian.
10. Crear `InvasoresTouchControls` con ◀ ▶ y FUEGO (usar `/frontend-design`) y sus estilos en `app/globals.css`, reutilizando `.touch-controls` y `.fire-btn` si sirven.
11. Pulido: 375px y 768px, `npm run lint` y `npm run build` limpios.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni advertencias de Cache Components.
- [ ] `/games` muestra la tarjeta INVASORES con su portada `cover-invasores`, y los otros cuatro juegos siguen igual.
- [ ] `/games/invasores` muestra la ficha y su botón de jugar lleva a `/games/invasores/play`.
- [ ] `/games/invasores/play` muestra una formación de 11×5 invasores, 4 escudos y el cañón, y ni HUD ni texto de fin pintados en el canvas.
- [ ] `←` y `→` mueven el cañón a 300 px/s y no lo sacan de `[20, 736]` px lógicos.
- [ ] `Espacio` dispara; con una bala en pantalla no sale otra, y mantener `Espacio` dispara cada 0,25 s como mínimo.
- [ ] La formación se mueve 8 px por tick, baja 24 px y cambia de sentido al tocar el margen de 20 px, y alterna el frame de los sprites.
- [ ] El intervalo de marcha es 0,63 s con 55 invasores y 0,03 s con 1 en la oleada 1, y baja más en oleadas superiores hasta la 9.
- [ ] Destruir un calamar suma 30, un cangrejo 20 y un pulpo 10 puntos, exactamente.
- [ ] Nunca hay más de 3 balas enemigas a la vez, y salen solo de invasores sin otro invasor debajo en su columna.
- [ ] Una bala propia y una enemiga que se cruzan desaparecen sin sumar puntos.
- [ ] Cada impacto en un escudo, propio o enemigo, borra celdas en un radio de 2 y consume la bala; un escudo agotado deja pasar las balas.
- [ ] Un invasor que cruza un escudo borra las celdas que toca.
- [ ] El platillo cruza en `y = 50` a 140 px/s, solo con 8 o más invasores vivos, y da 50, 100, 150 o 300 puntos.
- [ ] A la velocidad de bala de 600 px/s la bala no atraviesa invasores ni el platillo.
- [ ] Un impacto enemigo resta una vida, congela la partida 1,2 s, borra las balas y recoloca el cañón.
- [ ] Un invasor que llega a `y = 500` termina la partida aunque queden vidas.
- [ ] Destruir los 55 invasores sube la oleada tras 1,2 s, restaura los escudos y baja la formación 24 px más (hasta 96 px).
- [ ] El HUD de la plataforma refleja puntuación, vidas (3 a 0) y oleada como nivel en tiempo real.
- [ ] PAUSA y la tecla `P` congelan el juego, incluidos marcha y platillo; al reanudar no hay salto de movimiento.
- [ ] Al terminar se abre el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id = 'invasores'` y el modal muestra `#NN`.
- [ ] "JUGAR DE NUEVO" reinicia con puntuación 0, 3 vidas y oleada 1, y abre una sesión nueva.
- [ ] `startGameSession('invasores')` devuelve `sessionId`.
- [ ] `execute_sql` muestra la fila `invasores` con `max_score_per_second = 1200`.
- [ ] `list_tables` muestra RLS activo y `get_advisors` no reporta problemas nuevos.
- [ ] `/hall` muestra la pestaña INVASORES con estado vacío "SÉ EL PRIMERO" si no hay marcas, y las pestañas de los otros juegos siguen funcionando.
- [ ] Tarjeta y ficha muestran la mejor marca y las partidas reales de Invasores (0 sin marcas).
- [ ] La biblioteca `/games` ofrece el filtro SHOOTER y muestra ASTEROIDES e INVASORES en él.
- [ ] Con las flechas y `Espacio` la página no hace scroll durante la partida.
- [ ] Al salir de `/games/invasores/play` no quedan listeners ni `requestAnimationFrame` activos (un segundo montaje no duplica la velocidad).
- [ ] A 375px el canvas ocupa el ancho del marco, sin scroll horizontal, y ◀ ▶ y FUEGO controlan el cañón.
- [ ] `/games/asteroides/play`, `/games/tetris/play`, `/games/arkanoid/play`, `/games/snake/play` y las rutas de SPEC 01 a 09 siguen funcionando.

## Decisiones tomadas y descartadas

- **Sí:** juego nuevo sin referencia de código, con las reglas del arcade de 1978 de memoria. **No:** buscar un `game.js` en `references/started-games/`.
- **Sí:** interpretar "Invasores (clon de Space Invaders)" como el clásico de un jugador, no variantes posteriores (Space Invaders Part II, Deluxe). **No:** inventar mecánicas.
- **Sí:** `id` `invasores` y título `INVASORES`. Es el nombre pedido y el catálogo está en español. **No:** `space-invaders`.
- **Sí:** `SHOOTER` y `cyan`. `SHOOTER` ya existe y su color por regla es `cyan`. **No:** categoría nueva ni `green`.
- **Sí:** la plataforma manda en HUD, pausa y modal. **No:** marcador ni texto GAME OVER dentro del canvas, aunque el original lo pinta.
- **Sí:** registro por mapa en `REAL_GAMES`. **No:** `if (game.id === ...)`.
- **Sí:** 3 vidas, sin `initialLives`. **No:** vida extra a 1500 puntos (el HUD no está probado con más de 3 corazones).
- **Sí:** formación de 11×5 con 30/20/10 puntos. **No:** 8 columnas ni 6 filas.
- **Sí:** marcha por temporizador con intervalo según los vivos, que reproduce la aceleración típica del original. **No:** velocidad continua por `dt`.
- **Sí:** oleadas sin límite y fin solo por derrota. **No:** final por victoria como `arkanoid`; el clásico no tiene final.
- **Sí:** nivel del HUD = oleada. **No:** nivel fijo.
- **Sí:** dificultad con tope en la oleada 9 y formación inicial más baja hasta 96 px. **No:** aumento infinito, que haría injugables las oleadas altas.
- **Sí:** una bala propia a la vez más un enfriamiento de 0,25 s. Es el comportamiento del original y da un tope exacto de puntos. **No:** disparo libre.
- **Sí:** escudos por celdas de 3 px y erosión circular. **No:** escudos de una pieza con vida o indestructibles.
- **Sí:** puntuación del platillo al azar entre 50, 100, 150 y 300. El original depende del contador de disparos y se quita porque haría el resultado predecible. **No:** tabla por disparos.
- **Sí:** la invasión del suelo mata aunque queden vidas, como el original. **No:** restar solo una vida.
- **Sí:** sprites como bitmaps de texto pintados con `fillRect`. Sin carga asíncrona ni estado `loading`. **No:** PNG ni sonido.
- **Sí:** pasos fijos de 1/120 s como `arkanoid`. Evita atravesar invasores si el navegador va a pocos fps. **No:** un único paso por frame.
- **Sí:** `max_score_per_second = 1200` en la BD, con el cálculo explicado. **No:** constante en código.

## Riesgos

| Riesgo                                                                   | Mitigación                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| React Strict Mode monta el efecto dos veces y duplica el bucle           | `createEngine` devuelve `stop()`, que el `useEffect` llama en la limpieza. Criterio de aceptación de un segundo montaje. |
| Módulos del motor evalúan `window` o `document` en SSR                   | Nada a nivel superior; el motor se crea solo dentro de `useEffect`.                                                      |
| `Math.random()` en render rompe la hidratación                           | Toda la aleatoriedad vive en el motor, que arranca tras el montaje.                                                      |
| Las flechas y `Espacio` hacen scroll                                     | Ya están en las teclas con `preventDefault` de `GamePlayer`; criterio de aceptación sin scroll.                          |
| `dt` enorme al volver de otra pestaña o al reanudar                      | Tope de 0,05 s (máximo 6 pasos por frame) y reinicio de `lastTime` al reanudar.                                          |
| Bala que atraviesa un invasor o una bala enemiga                         | Pasos fijos de 1/120 s: 5 px por paso frente a 14 px de bala y 24 px de invasor.                                         |
| Marcha de 0,03 s con pocos invasores se siente inconsistente en 60 fps   | La marcha avanza como máximo 1 tick por paso fijo, es decir 120 por segundo; el mínimo real de 0,03 s es alcanzable.     |
| Escudos pesados de pintar (4 × 352 celdas por frame)                     | Pintar por filas contiguas o cachear en un canvas fuera de pantalla creado en el motor; medir antes de optimizar.        |
| Oleadas altas imposibles                                                 | Tope de dificultad en la oleada 9; el fin llega por derrota, no por desbordamiento de velocidad.                         |
| El tope de 1200 pts/s apenas frena a un bot                              | Límite aceptado en SPEC 06. El uso único de la sesión y el tope por segundo limitan el daño.                             |
| FUEGO o `Espacio` activan un botón enfocado                              | `tabIndex={-1}` en los botones táctiles, como en Tetris, Arkanoid y Snake.                                               |
| La UI de `/hall`, `/games` o `GamePlayer` asume un número fijo de juegos | Verificar con cinco juegos; corregir dentro de esta spec y anotarlo en Decisiones.                                       |
| Cambiar `REAL_GAMES` rompe otros juegos                                  | Solo se añade una entrada; criterio de aceptación sobre los cuatro juegos anteriores.                                    |

## Lo que **no** está en esta spec

- Sonido y música.
- Vida extra, 2 jugadores y récord local.
- Jefes, invasores blindados, power-ups y bombas.
- Ratón y gestos táctiles.
- Supabase Auth, re-simulación en servidor, rate limiting y moderación de nombres.
- Gamepad y teclas remapeables.
- Catálogo leído desde la BD.
- Tests automatizados.
- Otros juegos de `references/started-games/`.

Cada uno, si llega, va en su propia spec.
