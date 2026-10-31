# SPEC JAM invasores B — INVASORES (10 niveles, jefes y mejoras)

> **Estado:** Borrador
> **Variante:** Con giro. Diez niveles con formaciones propias, invasores blindados, dos jefes (niveles 5 y 10) y mejoras que suelta el platillo; ganar el nivel 10 termina la partida.
> **Depende de:** SPEC 02, SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-10-29
> **Objetivo:** Crear en TypeScript el juego Invasores con niveles, jefes y mejoras, y publicarlo como el juego `invasores`, jugable en `/games/invasores/play` con leaderboard real.

## Por qué existe esta spec

Invasores es el quinto juego real de la plataforma. Reutiliza el patrón de SPEC 05 (motor canvas aislado, HUD, pausa y modal a cargo de `GamePlayer`), el de SPEC 06 (sesión de partida del servidor y tope de puntos por segundo) y el contrato de SPEC 07 a 09 (`initialLives` opcional, `GameInput`).

Es un juego nuevo sin referencia de código. Toma el esqueleto de `asteroides` (nave y disparo con `Espacio`, y el disparo triple que ya existe allí como mejora), los niveles como datos tipados de `arkanoid` (`levels.ts`, fin al completar el nivel 10) y sus pasos fijos de física.

Frente a los juegos ya implementados tiene seis particularidades:

- Los niveles son datos en `levels.ts` con una máscara de texto por fila, no una formación fija.
- Hay invasores blindados (2 impactos) y dos jefes con barra de vida.
- Las mejoras salen del platillo y se recogen con la nave, un tipo de objeto que cae y no existe aún en la plataforma.
- La marcha de la formación es por saltos discretos (como el tick de `snake`), con intervalo según los invasores vivos.
- Los escudos son un bitmap destructible por celdas de 3 px.
- No hay assets: los sprites son bitmaps de texto pintados con `fillRect`, sin estado `loading`.

## Alcance

**Dentro:**

- Entrada en `app/data/games.ts`: `id: "invasores"`, `title: "INVASORES"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-invasores"`, textos `short` y `long` en español. Sin `best` ni `plays`.
  - `short`: "Limpia diez oleadas de invasores y derriba a los dos jefes."
  - `long`: "Diez niveles con formaciones distintas, invasores blindados que aguantan dos disparos y un jefe en los niveles 5 y 10. Derriba el platillo para soltar una mejora: ráfaga, disparo doble o barrera. Tienes 3 vidas y los escudos se desgastan con cada impacto."
- `GameCategory` y `CATS` no cambian: `SHOOTER` ya existe. El color sale de la categoría (`SHOOTER` = `cyan`).
- Portada `.cover-invasores` en `app/globals.css` (un jefe grande y una fila de invasores pixelados sobre fondo oscuro, tonos magenta) e `.invasores-canvas` junto a `.snake-canvas`.
- Sin assets en `public/games/invasores/`: los sprites viven como datos en `entities.ts`.
- Motor en TypeScript en `app/_games/invasores/` (`constants.ts`, `levels.ts`, `entities.ts`, `input.ts`, `engine.ts`), sin globals ni acceso a `document`/`window` fuera de funciones de montaje.
- Componente cliente `app/_components/games/invasores-game.tsx` con `InvasoresGame`, `InvasoresControlsHint` y `InvasoresTouchControls`.
- Registro en `REAL_GAMES` de `app/_components/game-player.tsx`, con 3 vidas por defecto.
- Canvas lógico 800×600, escalado por CSS al ancho de `.crt-screen`.
- Mecánicas base (iguales al clásico):
  - Celdas de invasor de 36×24 px con paso de 48×36 px, marcha de 8 px por tick, bajada de 24 px al tocar el margen de 20 px y fin si un invasor llega a `y = 500`.
  - Intervalo de marcha `(0,03 + 0,6 × vivos / inicial) × 0,93^(nivel − 1)` segundos, donde `inicial` es el número de invasores del nivel.
  - Cañón de 44×20 px en `y = 548`, a 300 px/s, limitado a `[20, 736]`.
  - Puntos: calamar 30, cangrejo 20, pulpo 10, blindado 50 (se destruye al segundo impacto y el primero no suma).
  - Balas enemigas de 4×14 px a `240 + 8 × (nivel − 1)` px/s, máximo 3 en pantalla, desde el invasor más bajo de una columna viva, con intervalo aleatorio de 0,5 a 1,2 s multiplicado por `0,93^(nivel − 1)` (mínimo 0,3 s).
  - 4 escudos de 66×48 px con centros en `x = 160, 320, 480, 640` e `y = 440`, de celdas de 3 px que se borran en un radio de 2 con cada impacto. Se restauran al empezar cada nivel.
  - 3 vidas. Un impacto enemigo congela la partida 1,2 s, borra las balas, quita las mejoras y recoloca el cañón en el centro.
- Cambios sobre el clásico:
  - 10 niveles definidos en `levels.ts`. Completar el nivel 10 termina la partida con `onGameOver(score)`.
  - Invasores blindados (`A`), de 2 impactos, desde el nivel 4.
  - Jefes en los niveles 5 y 10.
  - Platillo una vez por nivel normal (entre 8 y 15 s después de empezar) que suelta una mejora al destruirse. Vale 50, 100, 150 o 300 puntos.
  - Tres mejoras, exclusivas entre sí (la nueva sustituye a la actual):
    - `RÁFAGA`: hasta 3 balas del jugador a la vez y enfriamiento de 0,15 s. Dura 10 s.
    - `DOBLE`: cada disparo saca 2 balas paralelas separadas 16 px, una salva a la vez y enfriamiento de 0,25 s. Dura 10 s.
    - `BARRERA`: absorbe el siguiente impacto enemigo en el cañón. Dura hasta usarse o 15 s.
  - Sin mejora: una bala a la vez, enfriamiento de 0,25 s y 600 px/s, como el clásico.
  - Las cápsulas caen a 100 px/s, miden 28×16 px, y desaparecen si llegan al suelo sin recogerse.
  - Se descartan HUD pintado, overlay GAME OVER, vida extra y sonido.

Los niveles (máscara por fila: `S` calamar, `C` cangrejo, `O` pulpo, `A` blindado, `.` hueco):

| Nivel | Formación                                                         | Invasores   | Blindados |
| ----- | ----------------------------------------------------------------- | ----------- | --------- |
| 1     | 11×3: `S`, `C`, `O`                                               | 33          | 0         |
| 2     | 11×4: `S`, `C`, `C`, `O`                                          | 44          | 0         |
| 3     | 11×5: `S`, `C`, `C`, `O`, `O`                                     | 55          | 0         |
| 4     | 11×5 con hueco en la columna 5; fila 0 blindada                   | 50          | 10        |
| 5     | **Jefe** de 20 vidas + escolta de una fila de 11 `C`              | 1 + 11      | 0         |
| 6     | Pirámide de 5 filas de 3, 5, 7, 9 y 11; los extremos de fila `A`  | 35          | 10        |
| 7     | 11×5 como el nivel 3, columnas 0 y 10 blindadas                   | 55          | 10        |
| 8     | 11×6 con la fila 2 blindada                                       | 66          | 11        |
| 9     | 11×6 con las filas 0 y 1 blindadas                                | 66          | 22        |
| 10    | **Jefe** de 40 vidas + escolta de 2 filas de 11 `A`               | 1 + 22      | 22        |

- Jefe: sprite de 120×48 px en `y = 70`, cada impacto le resta 1 de vida, sin puntos por golpe y al caer da 1000 puntos (nivel 5) o 2000 (nivel 10). Se mueve de lado a lado a 110 px/s dentro de `[20, 780]` y dispara un abanico de 3 balas (−15°, 0°, +15°) cada 1,4 s (nivel 5) o 1,0 s (nivel 10). Lleva una barra de vida de 4 px sobre su sprite, que forma parte del objeto y no del HUD.
- En los niveles de jefe, la escolta marcha como siempre; el nivel se supera al caer el jefe, y los invasores restantes explotan sin dar puntos. No hay platillo.
- Entrada:
  - Teclado: `←` `→` mover, `Espacio` disparar (mantener repite según el enfriamiento), `P` pausar (lo gestiona `GamePlayer`).
  - Táctil: botones ◀ ▶ de mantener a la izquierda y FUEGO a la derecha.
  - Sin ratón.
- Pausa real: PAUSA y `P` detienen `update` y `draw`; al reanudar no hay salto de `dt` y los temporizadores de mejora no avanzan.
- Migración `supabase/migrations/20261029120000_juego_invasores.sql` con la fila de `games` y `max_score_per_second = 1000`.
- `app/_lib/supabase/database.types.ts` regenerado.
- Aviso de teclas (`.controls-hint`) bajo el marco CRT, oculto en pantallas táctiles y a ≤720 px.

**Fuera de alcance (para futuras specs):**

- Sonido y música.
- Más de dos jefes, jefes con fases y selector de nivel.
- Mejoras permanentes, tienda y vida extra.
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

Contrato: `GameStats` no cambia. Invasores emite `{ score, lives, level }` con `lives` de 3 a 0 y `level` de 1 a 10. `GameInput` no cambia: `press("left" | "right" | "fire", down)`; `aim` queda vacío.

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

Estados del motor: `intro` (0,8 s con la formación quieta), `playing`, `dying` (1,2 s tras un impacto), `clearing` (1,2 s entre niveles) y `finished` (derrota o victoria; `onGameOver` ya emitido una vez).

Archivos de `app/_games/invasores/`:

- `constants.ts`: `W`, `H`, `PITCH_X`, `PITCH_Y`, `ALIEN_W`, `ALIEN_H`, `MARCH_STEP_X`, `DROP_Y`, `SIDE_MARGIN`, `INVASION_Y`, `SHIP_W`, `SHIP_H`, `SHIP_Y`, `SHIP_SPEED`, `BULLET_SPEED`, `ENEMY_BULLET_BASE`, `MAX_ENEMY_BULLETS`, `SHIELD_CELL`, `SHIELD_BLAST`, `ALIEN_POINTS`, `ARMORED_POINTS`, `UFO_SCORES`, `BOSS_W`, `BOSS_H`, `BOSS_SPEED`, `BOSS_BONUS`, `POWERUPS`, `MAX_LEVEL`, `START_LIVES`, `STEP`, `MAX_DT`.
- `levels.ts`: `LEVELS: Level[]` con `{ rows: string[]; boss?: { hp: number; fireEvery: number; bonus: number } }`. Datos tipados, sin generación aleatoria.
- `entities.ts`: tipos `Alien`, `Boss`, `Bullet`, `Shield`, `Ufo`, `Capsule`, `Ship`; bitmaps de texto `SPRITES` (calamar, cangrejo, pulpo, blindado con 2 frames, jefe, cañón, platillo, cápsulas, explosión); `createShield`, `erodeShield` y funciones `draw*` que reciben `ctx`.
- `input.ts`: `createInput()` con `attach()`, `detach()`, `set()`, `poll()`, `clear()`. Teclado en `window`; mapa `e.code → acción` para `ArrowLeft`, `ArrowRight` y `Space`.
- `engine.ts`: bucle con acumulador de pasos fijos, marcha, mejoras, jefes, escudos, platillo, niveles, `onStats` y `onGameOver`.

Convenciones:

- Origen arriba a la izquierda. Tamaño lógico 800×600. Velocidades en px/s.
- `dt` en segundos, limitado a 0,05 s. El motor lo consume en pasos fijos de `STEP = 1/120` s (máximo 6 por frame), como `arkanoid`: las balas recorren 5 px por paso, menos que el alto de un invasor (24 px).
- Fila `A`: el primer impacto la pinta en su segundo frame de daño y el segundo la destruye.
- Aleatoriedad: `Math.random()` solo dentro del motor, tras el montaje, para elegir columna y momento de disparo, la puntuación del platillo y el tipo de mejora.
- Blindado y jefe: un impacto resta 1 de vida; la bala se consume siempre.
- `onStats` emite `{ score, lives, level }` solo cuando cambia alguno. Un `onStats` inicial con `{ 0, 3, 1 }` al empezar.
- `onGameOver(finalScore)` una sola vez: al perder la tercera vida (tras `dying`), al invadir el suelo o al caer el jefe del nivel 10.

Fila de `games`:

```sql
insert into public.games (id, title, max_score_per_second)
values ('invasores', 'INVASORES', 1000);
```

Cálculo de `max_score_per_second`:

- El mayor ritmo de balas del jugador es `DOBLE`: 2 balas cada 0,25 s = 8 balas/s. `RÁFAGA` da 1 / 0,15 s = 6,7 balas/s.
- Una bala destruye como máximo un invasor. El más valioso es el blindado, con 50 puntos: 8 × 50 = 400 puntos/s.
- El jefe da 0 por golpe y 1000 o 2000 al caer. Con 8 balas/s tarda al menos 20/8 = 2,5 s (nivel 5) o 40/8 = 5 s (nivel 10), es decir 400 puntos/s en ambos casos.
- Suma de los dos peores casos: 800 puntos/s. El platillo (300 puntos) añade como mucho 1 destrucción por nivel.
- Se redondea a 1000 puntos/s. Es un máximo teórico imposible de alcanzar jugando, porque las 8 balas/s exigen que todas impacten y que haya un objetivo para cada una. Evita rechazar una partida legítima.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/01-app/` lo relevante a Client Components, `useEffect` y Cache Components. Sin cambios de código.
2. Añadir `invasores` a `app/data/games.ts`, y `.cover-invasores` e `.invasores-canvas` a `app/globals.css` (usar `/frontend-design` para la portada). `/games` muestra la tarjeta nueva y `/games/invasores` carga la ficha. El botón de jugar aún falla al no haber componente registrado.
3. Crear la migración `juego_invasores`, mostrar el SQL, pedir confirmación, aplicarla con `apply_migration` y regenerar `database.types.ts`. Verificar con `list_tables`, `get_advisors` y `execute_sql`.
4. Crear `constants.ts` y `levels.ts`. Sin enganche a la UI.
5. Crear `entities.ts`: tipos, bitmaps, escudo erosionable, cápsulas y funciones de dibujo.
6. Crear `input.ts` con teclado (`←` `→` `Espacio`) y `set()` para los botones.
7. Crear `engine.ts`: pasos fijos, marcha, cañón, balas, escudos, blindados, platillo, mejoras, jefes, niveles, vidas, `setPaused`, `stop`, `onStats` y `onGameOver`.
8. Crear `invasores-game.tsx` con canvas 800×600, `useEffect` con limpieza, `inputRef` y aviso de teclas.
9. Registrar `invasores` en `REAL_GAMES` de `game-player.tsx`. Los otros cuatro juegos no cambian.
10. Crear `InvasoresTouchControls` con ◀ ▶ y FUEGO (usar `/frontend-design`) y sus estilos en `app/globals.css`.
11. Pulido: 375px y 768px, `npm run lint` y `npm run build` limpios.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni advertencias de Cache Components.
- [ ] `/games` muestra la tarjeta INVASORES con su portada `cover-invasores`, y los otros cuatro juegos siguen igual.
- [ ] `/games/invasores` muestra la ficha y su botón de jugar lleva a `/games/invasores/play`.
- [ ] `/games/invasores/play` muestra 33 invasores (11×3), 4 escudos y el cañón, y ni HUD ni texto de fin pintados en el canvas.
- [ ] `←` y `→` mueven el cañón a 300 px/s y no lo sacan de `[20, 736]` px lógicos.
- [ ] Sin mejora, `Espacio` dispara una sola bala a la vez con 0,25 s de enfriamiento.
- [ ] Los niveles 1 a 10 tienen 33, 44, 55, 50, 1+11, 35, 55, 66, 66 y 1+22 invasores, con 0, 0, 0, 10, 0, 10, 10, 11, 22 y 22 blindados.
- [ ] Destruir un calamar suma 30, un cangrejo 20, un pulpo 10 y un blindado 50 puntos; el primer impacto a un blindado no suma.
- [ ] Un blindado cambia de aspecto tras el primer impacto y desaparece con el segundo.
- [ ] El intervalo de marcha baja con los invasores vivos y con el nivel (`0,93^(nivel − 1)`).
- [ ] El platillo aparece una vez por nivel normal, entre 8 y 15 s después de empezar, y no aparece en los niveles 5 y 10.
- [ ] Destruir el platillo suma 50, 100, 150 o 300 puntos y suelta una cápsula de mejora que cae a 100 px/s.
- [ ] Recoger una cápsula activa `RÁFAGA`, `DOBLE` o `BARRERA`; la nueva sustituye a la anterior y una cápsula no recogida desaparece al llegar al suelo.
- [ ] `RÁFAGA` permite 3 balas a la vez con 0,15 s de enfriamiento y dura 10 s.
- [ ] `DOBLE` saca 2 balas paralelas por disparo y dura 10 s.
- [ ] `BARRERA` absorbe un impacto enemigo sin quitar vida y se consume; si no se usa, caduca a los 15 s.
- [ ] Perder una vida quita la mejora activa.
- [ ] Los temporizadores de mejora no avanzan durante la pausa.
- [ ] En el nivel 5 aparece un jefe de 20 vidas con barra de vida que baja un punto por impacto, dispara un abanico de 3 balas cada 1,4 s y da 1000 puntos al caer.
- [ ] Al caer el jefe el nivel se supera y los invasores de la escolta explotan sin sumar puntos.
- [ ] En el nivel 10 el jefe tiene 40 vidas, dispara cada 1,0 s y da 2000 puntos.
- [ ] Una bala a 600 px/s no atraviesa invasores, escudos ni el jefe.
- [ ] Un impacto enemigo resta una vida, congela la partida 1,2 s y recoloca el cañón; un invasor a `y = 500` termina la partida aunque queden vidas.
- [ ] Al superar un nivel sube el nivel tras 1,2 s, se restauran los escudos y se carga la siguiente formación.
- [ ] Derribar al jefe del nivel 10 abre el modal "FIN DEL JUEGO" con la puntuación final, sin pasar por el nivel 11.
- [ ] El HUD de la plataforma refleja puntuación, vidas (3 a 0) y nivel (01 a 10) en tiempo real.
- [ ] PAUSA y la tecla `P` congelan el juego (marcha, jefe, platillo y cápsulas); al reanudar no hay salto de movimiento.
- [ ] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id = 'invasores'` y el modal muestra `#NN`.
- [ ] "JUGAR DE NUEVO" reinicia con puntuación 0, 3 vidas, nivel 1 y sin mejora, y abre una sesión nueva.
- [ ] `startGameSession('invasores')` devuelve `sessionId`.
- [ ] `execute_sql` muestra la fila `invasores` con `max_score_per_second = 1000`.
- [ ] `list_tables` muestra RLS activo y `get_advisors` no reporta problemas nuevos.
- [ ] `/hall` muestra la pestaña INVASORES con estado vacío "SÉ EL PRIMERO" si no hay marcas, y las pestañas de los otros juegos siguen funcionando.
- [ ] Tarjeta y ficha muestran la mejor marca y las partidas reales de Invasores (0 sin marcas).
- [ ] La biblioteca `/games` muestra ASTEROIDES e INVASORES en el filtro SHOOTER.
- [ ] Con las flechas y `Espacio` la página no hace scroll durante la partida.
- [ ] Al salir de `/games/invasores/play` no quedan listeners ni `requestAnimationFrame` activos (un segundo montaje no duplica la velocidad).
- [ ] A 375px el canvas ocupa el ancho del marco, sin scroll horizontal, y ◀ ▶ y FUEGO controlan el cañón.
- [ ] `/games/asteroides/play`, `/games/tetris/play`, `/games/arkanoid/play`, `/games/snake/play` y las rutas de SPEC 01 a 09 siguen funcionando.

## Decisiones tomadas y descartadas

- **Sí:** juego nuevo sin referencia de código; esta variante añade niveles y jefes al clásico. **No:** buscar un `game.js` en `references/started-games/`.
- **Sí:** `id` `invasores` y título `INVASORES`. **No:** `space-invaders`.
- **Sí:** `SHOOTER` y `cyan` (color de la categoría). **No:** categoría nueva ni `green`.
- **Sí:** la plataforma manda en HUD, pausa y modal. **No:** marcador ni texto GAME OVER en el canvas.
- **Sí:** la barra de vida del jefe se pinta en el canvas, pegada a su sprite, porque es parte del objeto del mundo. **No:** mostrarla en el HUD de la plataforma (el contrato `GameStats` no la contempla).
- **Sí:** registro por mapa en `REAL_GAMES`. **No:** `if (game.id === ...)`.
- **Sí:** 3 vidas, sin `initialLives`. **No:** una sola vida ni vida extra.
- **Sí:** 10 niveles con formaciones en `levels.ts` y fin al completar el 10, igual que `arkanoid`. **No:** oleadas infinitas.
- **Sí:** jefes en los niveles 5 y 10. Marcan el ritmo de la partida a mitad y al final. **No:** un jefe cada 3 niveles ni uno solo.
- **Sí:** blindados con 2 impactos que puntúan 50 solo al caer. Añaden decisión de puntería sin cambiar el control. **No:** blindados de 3 o más impactos.
- **Sí:** el platillo es la fuente de mejoras, una vez por nivel normal (garantiza acceso). **No:** caídas aleatorias de cada invasor.
- **Sí:** mejoras exclusivas y con duración; se pierden al morir. Hacen visible el riesgo y mantienen el tope de puntos. **No:** mejoras acumulables.
- **Sí:** `BARRERA` absorbe un único impacto. **No:** invulnerabilidad temporal.
- **Sí:** el jefe da 0 por golpe y un bonus fijo al caer. Simplifica el cálculo de `max_score_per_second`. **No:** puntos por impacto.
- **Sí:** al caer el jefe, la escolta explota sin puntos. Evita abusar de la escolta como granja de puntos. **No:** obligar a limpiar la escolta.
- **Sí:** dificultad con `0,93^(nivel − 1)` en marcha y disparo, y balas enemigas de `240 + 8 × (nivel − 1)` px/s. Con 10 niveles no hace falta tope. **No:** tope en la oleada 9 del clásico.
- **Sí:** pasos fijos de 1/120 s como `arkanoid`. **No:** un único paso por frame.
- **Sí:** sprites como bitmaps de texto con `fillRect`. **No:** PNG ni sonido.
- **Sí:** `max_score_per_second = 1000` en la BD, con el cálculo explicado. **No:** constante en código.

## Riesgos

| Riesgo                                                                  | Mitigación                                                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| React Strict Mode monta el efecto dos veces y duplica el bucle          | `createEngine` devuelve `stop()`, que el `useEffect` llama en la limpieza. Criterio de aceptación de un segundo montaje. |
| Módulos del motor evalúan `window` o `document` en SSR                  | Nada a nivel superior; el motor se crea solo dentro de `useEffect`.                                          |
| `Math.random()` en render rompe la hidratación                          | Toda la aleatoriedad vive en el motor, que arranca tras el montaje.                                          |
| Las flechas y `Espacio` hacen scroll                                    | Ya están en las teclas con `preventDefault` de `GamePlayer`; criterio de aceptación sin scroll.              |
| `dt` enorme al volver de otra pestaña o al reanudar                     | Tope de 0,05 s (máximo 6 pasos por frame) y reinicio de `lastTime` al reanudar.                              |
| Los temporizadores de mejora corren durante la pausa                    | Se miden con el tiempo de simulación acumulado por pasos, no con `performance.now()`.                        |
| Balas que atraviesan blindados, jefe o escudos                          | Pasos fijos de 1/120 s: 5 px por paso frente a 14 px de bala y 24 px de invasor.                             |
| Jefe del nivel 10 demasiado fácil o difícil                             | Vidas y cadencia en `levels.ts` como datos; ajustable sin tocar el motor. Se afina jugando.                  |
| Mejora `DOBLE` con `RÁFAGA` rompe el tope de puntos                     | Son exclusivas; el cálculo de `max_score_per_second` parte de ese supuesto.                                  |
| Escudos pesados de pintar (4 × 352 celdas por frame)                    | Pintar por filas contiguas o cachear en un canvas fuera de pantalla creado en el motor; medir antes de optimizar. |
| El tope de 1000 pts/s apenas frena a un bot                             | Límite aceptado en SPEC 06. El uso único de la sesión y el tope por segundo limitan el daño.                 |
| FUEGO o `Espacio` activan un botón enfocado                             | `tabIndex={-1}` en los botones táctiles, como en Tetris, Arkanoid y Snake.                                   |
| La UI de `/hall`, `/games` o `GamePlayer` asume un número fijo de juegos | Verificar con cinco juegos; corregir dentro de esta spec y anotarlo en Decisiones.                           |
| Cambiar `REAL_GAMES` rompe otros juegos                                 | Solo se añade una entrada; criterio de aceptación sobre los cuatro juegos anteriores.                        |

## Lo que **no** está en esta spec

- Sonido y música.
- Más jefes, fases de jefe y selector de nivel.
- Mejoras permanentes, tienda y vida extra.
- Ratón y gestos táctiles.
- Supabase Auth, re-simulación en servidor, rate limiting y moderación de nombres.
- Gamepad y teclas remapeables.
- Catálogo leído desde la BD.
- Tests automatizados.
- Otros juegos de `references/started-games/`.

Cada uno, si llega, va en su propia spec.
