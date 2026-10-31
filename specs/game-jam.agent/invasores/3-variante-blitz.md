# SPEC JAM invasores C — INVASORES (blitz, móvil primero)

> **Estado:** Borrador
> **Variante:** Arcade intensa y móvil primero. Una sola vida, disparo automático, un dedo para jugar, multiplicador por racha y una bomba por oleada.
> **Depende de:** SPEC 02, SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-10-29
> **Objetivo:** Crear en TypeScript una versión rápida y táctil de Invasores y publicarla como el juego `invasores`, jugable en `/games/invasores/play` con leaderboard real.

## Por qué existe esta spec

Invasores es el quinto juego real de la plataforma. Reutiliza el patrón de SPEC 05 (motor canvas aislado, HUD, pausa y modal a cargo de `GamePlayer`), el de SPEC 06 (sesión de partida del servidor y tope de puntos por segundo) y el contrato de SPEC 07 a 09 (`initialLives` opcional, `GameInput`).

Es un juego nuevo sin referencia de código. Toma de `arkanoid` el control por puntero (conversión `(clientX − rect.left) × W / rect.width`, "manda el último evento" entre teclado y puntero) y la física en pasos fijos, y de `snake` y `tetris` la partida de una sola vida con `initialLives: 1`.

El eje de la variante es el móvil. El canvas escalado a 375 px reduce el marco a un 47 % de su tamaño, así que los sprites son mayores (44×32 px) y la formación tiene menos columnas. El jugador no pulsa botón de disparo: solo mueve.

Frente a los juegos ya implementados tiene cinco particularidades:

- Es el primer juego con disparo automático, y el primero donde un fallo (bala perdida) cambia la puntuación.
- La formación se mueve de forma continua en px/s, no a saltos.
- No hay escudos ni assets: los sprites son bitmaps de texto pintados con `fillRect`, sin estado `loading`.
- Una sola vida: `initialLives: 1`, como `tetris` y `snake`.
- La partida no tiene final por victoria: las oleadas se encadenan hasta morir.

## Alcance

**Dentro:**

- Entrada en `app/data/games.ts`: `id: "invasores"`, `title: "INVASORES"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-invasores"`, textos `short` y `long` en español. Sin `best` ni `plays`.
  - `short`: "Una vida, disparo automático y una racha que no puedes romper."
  - `long`: "Tu cañón dispara solo: tú esquivas, apuntas y decides cuándo soltar la bomba. Cada acierto seguido sube el multiplicador hasta ×8, pero una bala perdida lo reinicia. Una sola vida y oleadas que no se acaban. Se juega con un dedo."
- `GameCategory` y `CATS` no cambian: `SHOOTER` ya existe. El color sale de la categoría (`SHOOTER` = `cyan`).
- Portada `.cover-invasores` en `app/globals.css` (invasores grandes pixelados con una estela de balas y un cañón sobre fondo oscuro, tonos yellow) e `.invasores-canvas` junto a `.snake-canvas`, con `touch-action: none`.
- Sin assets en `public/games/invasores/`: los sprites viven como datos en `entities.ts`.
- Motor en TypeScript en `app/_games/invasores/` (`constants.ts`, `entities.ts`, `input.ts`, `engine.ts`), sin globals ni acceso a `document`/`window` fuera de funciones de montaje.
- Componente cliente `app/_components/games/invasores-game.tsx` con `InvasoresGame`, `InvasoresControlsHint` y `InvasoresTouchControls`.
- Registro en `REAL_GAMES` de `app/_components/game-player.tsx` con `initialLives: 1`.
- Canvas lógico 800×600, escalado por CSS al ancho de `.crt-screen`.
- Mecánicas:
  - Formación de 9 columnas × 4 filas (36 invasores) con celdas de 44×32 px y paso de 64×48 px: 1 fila de calamares (30 puntos), 2 de cangrejos (20) y 1 de pulpos (10). Origen `FORM_X0 = 122`, `FORM_Y0 = 80`.
  - Movimiento continuo: velocidad horizontal `(50 + 8 × min(oleada, 12)) × (1 + 1,5 × (1 − vivos / 36))` px/s. Al tocar el margen de 20 px baja 30 px y cambia de sentido.
  - Cañón de 56×28 px en `y = 540`, a 360 px/s con teclado y a hasta 700 px/s siguiendo al puntero.
  - Disparo automático: una bala de 4×16 px a 720 px/s cada 0,2 s (5 por segundo), sin límite de balas en pantalla.
  - Racha y multiplicador: cada bala que impacta suma 1 a la racha y cada bala que sale por arriba sin impactar la pone a 0. Multiplicador `min(8, 1 + floor(racha / 4))`: ×2 con 4, ×3 con 8 y ×8 con 28 aciertos seguidos. Se aplica a los puntos de los invasores, no al platillo ni a la bomba.
  - Puntos flotantes `+60` de 600 ms en el punto del impacto, y un anillo alrededor del cañón cuyo grosor crece con el multiplicador. Son elementos del mundo, no un marcador.
  - Los invasores disparan desde el más bajo de una columna viva, máximo 6 balas en pantalla, a `min(400, 280 + 12 × oleada)` px/s, con un intervalo de `0,9 × 0,93^(oleada − 1)` s (mínimo 0,35 s). Desde la oleada 4 los calamares disparan hacia la `x` del cañón en el momento del disparo.
  - Una sola vida. Cualquier bala enemiga en el cañón lo destruye: parpadeo de 600 ms y `onGameOver`. Si un invasor llega a `y = 500` (borde inferior), también termina la partida.
  - Bomba: una por oleada. Destruye los dos niveles de altura más bajos de la formación (las dos filas vivas más bajas), borra las balas enemigas y suma los puntos base de los invasores destruidos sin multiplicador y sin tocar la racha. Recarga al empezar cada oleada.
  - Platillo bonus de 48×20 px en `y = 40`, a 170 px/s, una vez por oleada entre 6 y 12 s después de empezar. Vale 300 puntos fijos.
  - Oleada superada al destruir los 36 invasores: pausa de 0,8 s con las balas borradas, la racha se conserva, la bomba se recarga y oleada + 1. No hay escudos.
  - Nivel del HUD = oleada, sin tope. La dificultad deja de crecer en la oleada 12.
- Entrada:
  - Teclado: `←` `→` o `A` `D` mover, `Espacio` soltar la bomba, `P` pausar (lo gestiona `GamePlayer`).
  - Ratón: mover el puntero sobre el canvas lleva el cañón bajo el puntero, con el límite de 700 px/s. Sin clic.
  - Táctil: arrastrar el dedo sobre el canvas lleva el cañón (mismos eventos de puntero), y botones ◀ ▶ de mantener y BOMBA en pantalla.
- Pausa real: PAUSA y `P` detienen `update` y `draw`; al reanudar no hay salto de `dt`.
- Migración `supabase/migrations/20261029120000_juego_invasores.sql` con la fila de `games` y `max_score_per_second = 2100`.
- `app/_lib/supabase/database.types.ts` regenerado.
- Aviso de teclas (`.controls-hint`) bajo el marco CRT, oculto en pantallas táctiles y a ≤720 px.

**Fuera de alcance (para futuras specs):**

- Sonido y música.
- Escudos, jefes, blindados y power-ups.
- Selector de dificultad, bombas acumulables y vida extra.
- Vibración háptica y orientación forzada.
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

Contrato: `GameStats` no cambia. Invasores emite `{ score, lives: 1, level }` con `level` igual a la oleada (≥ 1). `initialLives` vale 1. `GameInput` no cambia: `press("left" | "right" | "bomb", down)`; `aim` queda vacío.

Registro en `game-player.tsx`:

```ts
invasores: {
	Component: InvasoresGame,
	Controls: InvasoresControlsHint,
	TouchControls: InvasoresTouchControls,
	initialLives: 1, // sin vidas extra: evita ver 3 corazones antes del primer onStats
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
export type InputKey = "left" | "right" | "bomb";
export function createEngine(opts: EngineOptions): Engine;
```

Estados del motor: `intro` (0,8 s con la formación quieta y el cañón ya disparando), `playing`, `clearing` (0,8 s entre oleadas), `dying` (parpadeo de 600 ms) y `finished` (`onGameOver` ya emitido una vez).

Archivos de `app/_games/invasores/`:

- `constants.ts`: `W`, `H`, `COLS`, `ROWS`, `ALIEN_W`, `ALIEN_H`, `PITCH_X`, `PITCH_Y`, `FORM_X0`, `FORM_Y0`, `BASE_SPEED`, `SPEED_PER_WAVE`, `SPEEDUP`, `DROP_Y`, `SIDE_MARGIN`, `INVASION_Y`, `SHIP_W`, `SHIP_H`, `SHIP_Y`, `SHIP_SPEED_KEYS`, `SHIP_SPEED_POINTER`, `BULLET_SPEED`, `AUTOFIRE_INTERVAL`, `ENEMY_BULLET_BASE`, `ENEMY_BULLET_MAX`, `MAX_ENEMY_BULLETS`, `STREAK_PER_LEVEL`, `MAX_MULT`, `ALIEN_POINTS`, `UFO_POINTS`, `MAX_WAVE_SCALE`, `START_LIVES`, `STEP`, `MAX_DT`, `POPUP_MS`, `DEATH_MS`.
- `entities.ts`: tipos `Alien`, `Bullet`, `Ufo`, `Ship`, `Popup`; bitmaps de texto `SPRITES` (calamar, cangrejo, pulpo con 2 frames, cañón, platillo, explosión); funciones `drawSprite`, `drawAlien`, `drawShip`, `drawPopup` (todas reciben `ctx`).
- `input.ts`: `createInput(canvas)` con `attach()`, `detach()`, `set()`, `poll()`, `clear()`. Teclado en `window` (`ArrowLeft`, `ArrowRight`, `KeyA`, `KeyD`, `Space`); `pointermove` y `pointerdown` en el canvas, con la conversión `(clientX − rect.left) × W / rect.width`.
- `engine.ts`: bucle con acumulador de pasos fijos, disparo automático, racha, bomba, platillo, oleadas, `onStats` y `onGameOver`.

Convenciones:

- Origen arriba a la izquierda. Tamaño lógico 800×600. Velocidades en px/s.
- `dt` en segundos, limitado a 0,05 s. El motor lo consume en pasos fijos de `STEP = 1/120` s (máximo 6 por frame), como `arkanoid`: la bala recorre 6 px por paso, menos que el alto de un invasor (32 px).
- Puntero: el cañón se centra bajo el puntero y se limita a `[20, W − 20 − SHIP_W]`, desplazándose como mucho 700 px/s. Si hay puntero y teclado a la vez, manda el último evento. `pointerdown` no dispara ni lanza bomba.
- Sprites: bitmaps de texto pintados a 4 px por celda, centrados en la celda de 44×32 del invasor. Sin PNG ni `Image`.
- Aleatoriedad: `Math.random()` solo dentro del motor, tras el montaje, para elegir columna y momento de disparo y el momento del platillo.
- `onStats` emite `{ score, lives: 1, level }` solo cuando cambia alguno. Un `onStats` inicial con `{ 0, 1, 1 }` al empezar.
- `onGameOver(finalScore)` una sola vez: tras `dying` o al invadir el suelo.

Fila de `games`:

```sql
insert into public.games (id, title, max_score_per_second)
values ('invasores', 'INVASORES', 2100);
```

Cálculo de `max_score_per_second`:

- El disparo automático da 5 balas por segundo y cada bala destruye como máximo un objetivo.
- El mayor valor por bala es el del platillo, 300 puntos fijos. Un calamar con multiplicador ×8 vale 240.
- 5 balas/s × 300 puntos = 1500 puntos/s.
- La bomba suma como máximo las dos filas más bajas de la formación: 18 invasores, todos calamares como peor caso, es decir 18 × 30 = 540 puntos, sin multiplicador. Se puede usar una vez por oleada.
- 1500 + 540 = 2040 puntos/s en el peor segundo. Se redondea a 2100.
- Es un máximo teórico imposible de alcanzar jugando, porque exige que cada bala del segundo dé en el platillo y que además se suelte la bomba sobre dos filas de calamares. En la práctica, un jugador experto con ×8 y cangrejos hace unos 5 × 160 = 800 puntos/s en picos. El tope evita rechazar una partida legítima.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/01-app/` lo relevante a Client Components, `useEffect` y Cache Components. Sin cambios de código.
2. Añadir `invasores` a `app/data/games.ts`, y `.cover-invasores` e `.invasores-canvas` (con `touch-action: none`) a `app/globals.css` (usar `/frontend-design` para la portada). `/games` muestra la tarjeta nueva y `/games/invasores` carga la ficha. El botón de jugar aún falla al no haber componente registrado.
3. Crear la migración `juego_invasores`, mostrar el SQL, pedir confirmación, aplicarla con `apply_migration` y regenerar `database.types.ts`. Verificar con `list_tables`, `get_advisors` y `execute_sql`.
4. Crear `constants.ts`. Sin enganche a la UI.
5. Crear `entities.ts`: tipos, bitmaps de sprites y funciones de dibujo.
6. Crear `input.ts` con teclado (`←` `→` `A` `D` `Espacio`), puntero (ratón y táctil) y `set()` para los botones.
7. Crear `engine.ts`: pasos fijos, movimiento continuo, disparo automático, racha, bomba, platillo, oleadas, `setPaused`, `stop`, `onStats` y `onGameOver`.
8. Crear `invasores-game.tsx` con canvas 800×600, `useEffect` con limpieza, `inputRef` y aviso de teclas.
9. Registrar `invasores` en `REAL_GAMES` de `game-player.tsx` con `initialLives: 1`. Los otros cuatro juegos no cambian.
10. Crear `InvasoresTouchControls` con ◀ ▶ y BOMBA (usar `/frontend-design`) y sus estilos en `app/globals.css`, con zonas de pulsación de al menos 56 px.
11. Pulido: 375px y 768px, `npm run lint` y `npm run build` limpios.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni advertencias de Cache Components.
- [ ] `/games` muestra la tarjeta INVASORES con su portada `cover-invasores`, y los otros cuatro juegos siguen igual.
- [ ] `/games/invasores` muestra la ficha y su botón de jugar lleva a `/games/invasores/play`.
- [ ] `/games/invasores/play` muestra 36 invasores (9×4) y el cañón, y ni HUD ni texto de fin pintados en el canvas.
- [ ] El cañón dispara solo, 5 balas por segundo, sin pulsar nada.
- [ ] `←` `→` y `A` `D` mueven el cañón a 360 px/s y no lo sacan de `[20, W − 20 − 56]` px lógicos.
- [ ] Mover el ratón sobre el canvas lleva el cañón bajo el puntero, también con el canvas escalado, a no más de 700 px/s.
- [ ] Arrastrar el dedo sobre el canvas lleva el cañón y no hace scroll de la página.
- [ ] Destruir un calamar suma 30, un cangrejo 20 y un pulpo 10 puntos con multiplicador ×1.
- [ ] Con 4 aciertos seguidos el multiplicador pasa a ×2, con 8 a ×3 y con 28 o más queda en ×8.
- [ ] Una bala que sale por arriba sin impactar reinicia la racha y el multiplicador a ×1.
- [ ] El platillo cruza en `y = 40` a 170 px/s una vez por oleada y da 300 puntos sin multiplicador.
- [ ] Los puntos flotantes `+N` aparecen 600 ms donde cae el invasor y muestran el valor con multiplicador.
- [ ] El movimiento horizontal se acelera cuando quedan menos invasores, hasta ×2,46 con 1 vivo, y baja 30 px al tocar el margen.
- [ ] Nunca hay más de 6 balas enemigas, y desde la oleada 4 los calamares disparan hacia la `x` del cañón.
- [ ] Una bala enemiga en el cañón inicia el parpadeo de 600 ms y luego abre el modal "FIN DEL JUEGO".
- [ ] Un invasor que llega a `y = 500` termina la partida.
- [ ] `Espacio` y BOMBA destruyen las dos filas vivas más bajas, borran las balas enemigas y suman sus puntos base sin multiplicador ni cambio de racha.
- [ ] La bomba solo se puede usar una vez por oleada y se recarga al empezar la siguiente.
- [ ] A 720 px/s la bala no atraviesa invasores ni el platillo.
- [ ] Al destruir los 36 invasores sube la oleada tras 0,8 s con las balas borradas y la racha conservada.
- [ ] El HUD de la plataforma refleja puntuación, nivel (oleada) y una sola vida, sin enseñar 3 corazones al empezar.
- [ ] PAUSA y la tecla `P` congelan el juego, incluido el disparo automático; al reanudar no hay salto de movimiento ni ráfaga de balas.
- [ ] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id = 'invasores'` y el modal muestra `#NN`.
- [ ] "JUGAR DE NUEVO" reinicia con puntuación 0, oleada 1, racha 0 y bomba disponible, y abre una sesión nueva.
- [ ] `startGameSession('invasores')` devuelve `sessionId`.
- [ ] `execute_sql` muestra la fila `invasores` con `max_score_per_second = 2100`.
- [ ] `list_tables` muestra RLS activo y `get_advisors` no reporta problemas nuevos.
- [ ] `/hall` muestra la pestaña INVASORES con estado vacío "SÉ EL PRIMERO" si no hay marcas, y las pestañas de los otros juegos siguen funcionando.
- [ ] Tarjeta y ficha muestran la mejor marca y las partidas reales de Invasores (0 sin marcas).
- [ ] La biblioteca `/games` muestra ASTEROIDES e INVASORES en el filtro SHOOTER.
- [ ] Con las flechas y `Espacio` la página no hace scroll durante la partida.
- [ ] Al salir de `/games/invasores/play` no quedan listeners ni `requestAnimationFrame` activos (un segundo montaje no duplica la velocidad).
- [ ] A 375px el canvas ocupa el ancho del marco, sin scroll horizontal, los invasores se distinguen y ◀ ▶ y BOMBA tienen zonas de pulsación de al menos 56 px.
- [ ] `/games/asteroides/play`, `/games/tetris/play`, `/games/arkanoid/play`, `/games/snake/play` y las rutas de SPEC 01 a 09 siguen funcionando.

## Decisiones tomadas y descartadas

- **Sí:** juego nuevo sin referencia de código, con el móvil como eje. **No:** buscar un `game.js` en `references/started-games/`.
- **Sí:** `id` `invasores` y título `INVASORES`. **No:** `space-invaders`.
- **Sí:** `SHOOTER` y `cyan` (color de la categoría). **No:** categoría nueva ni `green`.
- **Sí:** la plataforma manda en HUD, pausa y modal. **No:** marcador, multiplicador ni texto GAME OVER en el canvas; el multiplicador se comunica con el anillo del cañón y los puntos flotantes (elementos del mundo).
- **Sí:** registro por mapa en `REAL_GAMES` con `initialLives: 1`. **No:** `if (game.id === ...)` ni 3 vidas.
- **Sí:** una sola vida. Sube la tensión y encaja con partidas cortas de móvil. **No:** 3 vidas ni vida extra.
- **Sí:** disparo automático. Con un dedo no se puede mover y disparar a la vez de forma cómoda. **No:** botón de disparo.
- **Sí:** racha que se rompe con balas perdidas. Con disparo automático aporta la decisión de apuntar. **No:** multiplicador por tiempo o sin castigo.
- **Sí:** el multiplicador no afecta al platillo ni a la bomba. Acota el tope de puntos. **No:** multiplicar todo.
- **Sí:** bomba única por oleada, con `Espacio` y botón BOMBA. Da una salida a la presión sin ser un segundo arma. **No:** bombas acumulables.
- **Sí:** 9×4 invasores de 44×32 px. A 375 px los sprites de 36×24 serían de 17×11 px y poco legibles. **No:** 11×5 del clásico.
- **Sí:** sin escudos. Con disparo automático y balas ilimitadas los escudos propios se destruirían solos. **No:** escudos erosionables.
- **Sí:** movimiento continuo en px/s con aceleración según los vivos. Es más fluido en pantallas pequeñas y no necesita temporizador de marcha. **No:** marcha por saltos como el clásico.
- **Sí:** la racha se conserva entre oleadas. **No:** reiniciarla, que penalizaría el ritmo que busca la variante.
- **Sí:** puntero con tope de 700 px/s. Evita teletransportes por tap y mantiene el reto. **No:** posición instantánea.
- **Sí:** teclado con `A` `D` además de flechas, como Snake. **No:** solo flechas.
- **Sí:** nivel del HUD = oleada, sin tope, con dificultad plana desde la oleada 12. **No:** victoria por oleadas.
- **Sí:** pasos fijos de 1/120 s como `arkanoid`. **No:** un único paso por frame.
- **Sí:** sprites como bitmaps de texto con `fillRect`. **No:** PNG ni sonido.
- **Sí:** `max_score_per_second = 2100` en la BD, con el cálculo explicado. **No:** constante en código.

## Riesgos

| Riesgo                                                                  | Mitigación                                                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| React Strict Mode monta el efecto dos veces y duplica el bucle          | `createEngine` devuelve `stop()`, que el `useEffect` llama en la limpieza. Criterio de aceptación de un segundo montaje. |
| Módulos del motor evalúan `window` o `document` en SSR                  | Nada a nivel superior; el motor se crea solo dentro de `useEffect`.                                          |
| `Math.random()` en render rompe la hidratación                          | Toda la aleatoriedad vive en el motor, que arranca tras el montaje.                                          |
| Las flechas y `Espacio` hacen scroll                                    | Ya están en las teclas con `preventDefault` de `GamePlayer`; criterio de aceptación sin scroll.              |
| El arrastre táctil sobre el canvas hace scroll de la página             | `touch-action: none` en `.invasores-canvas` y `preventDefault` en `pointerdown`.                             |
| Ratón desalineado con el canvas escalado por CSS                        | Conversión con `getBoundingClientRect()` a coordenadas lógicas; criterio de aceptación con el canvas escalado. |
| Al reanudar tras la pausa se acumula una ráfaga de balas                | El temporizador de disparo avanza con el tiempo de simulación por pasos y `lastTime` se reinicia al reanudar. |
| `dt` enorme al volver de otra pestaña                                   | Tope de 0,05 s (máximo 6 pasos por frame) y reinicio de `lastTime` al reanudar.                              |
| Balas que atraviesan invasores                                          | Pasos fijos de 1/120 s: 6 px por paso frente a 32 px de invasor.                                             |
| Mucha dificultad: una sola vida y balas dirigidas                       | Balas dirigidas solo desde la oleada 4, tope de 6 balas y de velocidad a 400 px/s; se afina jugando.         |
| Dedo que tapa el cañón y los invasores bajos                            | El cañón queda en `y = 540`, donde el dedo no lo oculta al arrastrar desde la mitad inferior; se verifica a 375 px. |
| Botones táctiles demasiado pequeños                                     | Zonas de pulsación de al menos 56 px y criterio de aceptación a 375 px.                                      |
| El tope de 2100 pts/s apenas frena a un bot                             | Límite aceptado en SPEC 06. El uso único de la sesión y el tope por segundo limitan el daño.                 |
| BOMBA o `Espacio` activan un botón enfocado                             | `tabIndex={-1}` en los botones táctiles, como en Tetris, Arkanoid y Snake.                                   |
| La UI de `/hall`, `/games` o `GamePlayer` asume un número fijo de juegos | Verificar con cinco juegos; corregir dentro de esta spec y anotarlo en Decisiones.                           |
| Cambiar `REAL_GAMES` rompe otros juegos                                 | Solo se añade una entrada; criterio de aceptación sobre los cuatro juegos anteriores.                        |

## Lo que **no** está en esta spec

- Sonido y música.
- Escudos, jefes, blindados y power-ups.
- Selector de dificultad y vida extra.
- Vibración háptica y orientación forzada.
- Supabase Auth, re-simulación en servidor, rate limiting y moderación de nombres.
- Gamepad y teclas remapeables.
- Catálogo leído desde la BD.
- Tests automatizados.
- Otros juegos de `references/started-games/`.

Cada uno, si llega, va en su propia spec.
