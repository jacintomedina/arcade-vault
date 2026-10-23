# SPEC 05 — Juego Asteroides jugable en la plataforma

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-18
> **Objetivo:** Portar `references/started-games/02-asteroids/` a TypeScript como componente cliente y publicarlo en la plataforma como el juego nuevo `asteroides`, jugable en `/games/asteroides/play` dentro del reproductor existente.

## Por qué existe esta spec

Hasta ahora `GamePlayer` solo simula partidas (puntuación aleatoria sobre una arena falsa). Asteroides es el primer juego real y fija el patrón que seguirán los siguientes (`03-tetris`, `04-arkanoid`): motor en canvas aislado, HUD y flujo de fin de partida a cargo de la plataforma. El juego original es un único `game.js` con globals, sin tipos y con su propio HUD y GAME OVER que conectará con la interfaz React de la play-page dedicada. Hay que separar el motor del marco de la plataforma.

## Alcance

**Dentro:**

- Nueva entrada en `app/data/games.ts`: `id: "asteroides"`, `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-asteroides"`, textos `short`/`long` en español y `best`/`plays` sembrados como el resto. La entrada `rocas` no se toca.
- Portada `.cover-asteroides` en `app/globals.css` (nave y roca en línea vectorial, tonos cyan).
- Port de `game.js` a TypeScript en `app/_games/asteroides/`, sin variables globales ni acceso a `document`/`window` fuera de funciones de montaje.
- Componente cliente `app/_components/games/asteroides-game.tsx` que monta el canvas lógico de 800×600 y arranca/detiene el motor con un `useEffect` con limpieza.
- Canvas escalable: tamaño lógico fijo 800×600, escalado por CSS al ancho del marco `.crt-screen` (4:3) sin deformar ni desbordar a 375px.
- Mecánicas del original sin cambios: nave con rotación, empuje e inercia, disparo con cooldown, envolvimiento toroidal, asteroides de tamaño 3/2/1 que se parten, partículas de explosión, 3 vidas con invencibilidad parpadeante, niveles (`3 + nivel` asteroides), puntuación 20/50/100 y power-up de disparo triple `3x`.
- Entrada de teclado: `←` `→` rotar, `↑` propulsar, `Espacio` disparar, `P` pausar/reanudar.
- Controles táctiles en pantallas táctiles: botones en pantalla para rotar a izquierda y derecha, propulsar y disparar.
- Pausa real: PAUSA y `P` detienen `update` y `draw` del motor; al reanudar no hay salto de `dt`.
- Registro `id → componente` en `app/_components/game-player.tsx`: `{ asteroides: AsteroidesGame }`. Un juego sin entrada en el mapa sigue usando el simulador actual.
- Integración con el HUD y el modal de la plataforma: el motor emite puntuación, vidas, nivel y fin de partida; `GamePlayer` los muestra en su HUD HTML y, al terminar, abre el modal "FIN DEL JUEGO" con el guardado en `localStorage` (`av_scores`) ya existente.
- Aviso de controles bajo el marco CRT con las teclas.

**Fuera de alcance (para futuras specs):**

- Puntuaciones en Supabase, ranking real y Hall of Fame con datos del juego.
- OVNIs enemigos (la ficha de `rocas` los menciona; el original no los tiene).
- Sonido y música.
- Volver a conectar `rocas`, `caida`, `bloque-buster` ni otros juegos del catálogo.
- Los juegos `03-tetris` y `04-arkanoid`.
- Gamepad, ajustes de dificultad, teclas remapeables.
- Tests automatizados.
- Estilo visual de neón nuevo para el canvas: se conservan los trazos blancos del original.

## Modelo de datos

Esta spec añade una entrada al catálogo y la interfaz entre motor y reproductor. No toca el modelo `Game` existente ni crea tablas.

```ts
// app/data/games.ts — nueva entrada (id en minúsculas, como el resto de ids)
{ id: "asteroides", title: "ASTEROIDES", cat: "SHOOTER", color: "cyan",
  cover: "cover-asteroides", short: "...", long: "...", best: 0, plays: "0" }
```

Contrato del componente de juego (compartido por todos los juegos reales futuros):

```ts
// app/_components/games/types.ts
export interface GameStats {
	score: number;
	lives: number;
	level: number;
}

export interface GameComponentProps {
	paused: boolean; // controlado por GamePlayer
	runKey: number; // al cambiar, reinicia la partida
	onStats: (s: GameStats) => void; // en cada cambio de score, lives o level
	onGameOver: (finalScore: number) => void; // al perder la última vida
}
```

Registro en `game-player.tsx`:

```ts
const REAL_GAMES: Record<string, ComponentType<GameComponentProps>> = {
	asteroides: AsteroidesGame,
};
```

Motor (`app/_games/asteroides/`), sin React:

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
	setInput(k: "left" | "right" | "thrust" | "fire", down: boolean): void; // táctil
}
export function createEngine(opts: EngineOptions): Engine;
```

Archivos previstos dentro de `app/_games/asteroides/`: `engine.ts` (bucle, estado, colisiones), `entities.ts` (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`), `input.ts` (teclado y entrada táctil), `constants.ts` (`W`, `H`, `RADII`, `SPEEDS`, `POINTS`, power-up).

Convenciones:

- Coordenadas con origen arriba a la izquierda; tamaño lógico 800×600.
- Velocidades en px/s; `dt` en segundos y limitado a 0,05 s, como el original.
- El motor no pinta HUD ni GAME OVER: eso lo hace la plataforma.
- Estados del motor: `playing`, `dead` (2 s tras perder una vida) y `gameover`.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` (`01-app`) lo relevante a Client Components, `useEffect`/refs, `next/dynamic` y Cache Components. Sin cambios de código.
2. Añadir `asteroides` a `app/data/games.ts` y `.cover-asteroides` a `app/globals.css`. `/games` muestra la tarjeta nueva y `/games/asteroides` carga con el simulador.
3. Crear `app/_components/games/types.ts` con `GameStats` y `GameComponentProps`.
4. Crear `app/_games/asteroides/constants.ts` y `entities.ts`: port tipado de las clases, pasando el `ctx` como argumento en `draw`. Sin enganche a la UI todavía.
5. Crear `input.ts` (teclado con `justPressed`, `setInput` para táctil) y `engine.ts` con bucle, colisiones, niveles, power-up, `setPaused`, `stop` y emisión de `onStats`/`onGameOver`. Quitar HUD y GAME OVER del canvas. Quitar el reinicio con `Espacio`.
6. Crear `app/_components/games/asteroides-game.tsx`: canvas 800×600 escalado por CSS, `useEffect` con limpieza, reinicio al cambiar `runKey`, controles táctiles y aviso de teclas.
7. Modificar `game-player.tsx`: registro `REAL_GAMES`; para juegos con componente real, sustituir el `setInterval` aleatorio y la arena falsa por el componente, usar `onStats` para puntuación/vidas/nivel y `onGameOver` para abrir el modal. `restart` incrementa `runKey`. El botón FIN abre el modal con la puntuación actual. Los demás juegos conservan el simulador.
8. Atajo `P` para pausar/reanudar (activo solo con el reproductor montado) y `preventDefault` de flechas y `Espacio` solo mientras el juego está montado y sin modal abierto.
9. Pulido: escalado a 375px y 768px, `prefers-reduced-motion` sin efecto sobre el juego, `npm run lint` y `npm run build` limpios.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [x] `npm run lint` termina sin errores.
- [x] `npm run build` termina sin errores ni advertencias de Cache Components.
- [x] `/games` muestra la tarjeta ASTEROIDES con su portada `cover-asteroides`, y `rocas` sigue igual.
- [x] `/games/asteroides` muestra la ficha y su botón de jugar lleva a `/games/asteroides/play`.
- [x] `/games/asteroides/play` muestra un canvas con nave, 4 asteroides grandes y sin HUD ni texto pintado en el canvas.
- [x] `←` y `→` rotan la nave, `↑` la propulsa con inercia y `Espacio` dispara con cooldown de 0,2 s.
- [x] La nave que sale por un borde reaparece por el opuesto.
- [x] Un disparo a un asteroide grande suma 20 puntos y lo parte en 2 medianos; mediano suma 50; pequeño suma 100 y no se parte.
- [x] El HUD de la plataforma refleja puntuación, vidas y nivel en tiempo real.
- [x] Al chocar con un asteroide la nave explota, se pierde una vida y reaparece tras 2 s con invencibilidad parpadeante.
- [x] Al destruir todos los asteroides sube el nivel y aparecen `3 + nivel` asteroides.
- [x] El power-up `3x` aparece y, al recogerlo, dispara 3 balas durante 5 s.
- [x] PAUSA y la tecla `P` congelan el juego; al reanudar no hay salto de movimiento.
- [x] Al perder la tercera vida se abre el modal "FIN DEL JUEGO" con la puntuación final.
- [x] Guardar en el modal añade `{ game: "asteroides", score, name, at }` a `localStorage["av_scores"]`.
- [x] "JUGAR DE NUEVO" reinicia con 3 vidas, nivel 1 y puntuación 0.
- [x] FIN abre el modal con la puntuación actual; SALIR y VOLVER AL VAULT salen sin errores.
- [x] Con flechas y `Espacio` la página no hace scroll durante la partida.
- [x] Al salir de `/games/asteroides/play` no quedan listeners ni `requestAnimationFrame` activos (un segundo montaje no duplica la velocidad de juego).
- [x] A 375px de ancho el canvas ocupa el ancho del marco, sin scroll horizontal, y los botones táctiles de rotar, propulsar y disparar controlan la nave.
- [x] Los demás juegos (`/games/caida/play`, etc.) siguen usando el simulador.
- [x] Las rutas de SPEC 01 a SPEC 04 siguen funcionando.

## Decisiones tomadas y descartadas

- **Sí:** port a TypeScript con componente cliente. Permite pausa, HUD y puntuación compartidos con la plataforma. **No:** `iframe` con `index.html` estático (sin comunicación fluida) ni port a JS (el repo es TS).
- **Sí:** juego nuevo `asteroides`, independiente de `rocas`. Petición explícita del usuario; la coincidencia temática con `rocas` es casual. **No:** reutilizar ni reemplazar `rocas`.
- **Sí:** `id` en minúsculas (`asteroides`). Es parte de la URL y los demás ids son kebab-case en minúsculas. Título visible `ASTEROIDES`.
- **Sí:** SHOOTER, cyan y portada nueva `cover-asteroides`, para distinguirlo de `rocas` (yellow, `cover-rocas`). **No:** reutilizar portada (dos tarjetas iguales).
- **Sí:** la plataforma manda: HUD, pausa, FIN y modal de guardado de `GamePlayer`. El motor solo emite `onStats`/`onGameOver`. **No:** motor con HUD y GAME OVER propios (duplicaría UI y no permitiría guardar la puntuación).
- **Sí:** registro `id → componente` en `game-player.tsx`. Cada juego futuro añade una línea. **No:** `if (game.id === ...)` suelto.
- **Sí:** contrato `GameComponentProps` genérico en `app/_components/games/types.ts`, aunque hoy lo use un solo juego. Los dos juegos de referencia siguientes lo necesitarán igual.
- **Sí:** controles táctiles y canvas escalable. La ficha dice "TECLADO / TÁCTIL" y sin escalado desborda a 375px.
- **Sí:** power-up `3x` tal cual. Está en `game.js` aunque el README no lo mencione.
- **Sí:** pausa real, con atajo `P` además del botón. Petición del usuario; no existe en el original.
- **Sí:** se elimina el reinicio con `Espacio` del GAME OVER original; reinicia el botón "JUGAR DE NUEVO" del modal. Evita reiniciar por error por un disparo.
- **Sí:** guardado en `localStorage` (`av_scores`), el mecanismo que ya existe. **No:** Supabase aquí (spec propia con tablas y RLS).
- **Sí:** trazos blancos del original sobre fondo negro, dentro del marco CRT existente. **No:** rediseñar el canvas con neones.
- **No:** OVNIs ni sonido. Quedan fuera para mantener el port fiel.

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                                                  |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| React Strict Mode monta el efecto dos veces en desarrollo y duplica el bucle                 | `createEngine` devuelve `stop()` y el `useEffect` lo llama en la limpieza; criterio de aceptación sobre un segundo montaje. |
| Cache Components o SSR evalúan `window`/`canvas`                                             | El motor solo se crea dentro de `useEffect`; ningún módulo toca `document` en el nivel superior.                            |
| `Math.random()` en render rompe la hidratación                                               | Toda la aleatoriedad vive en el motor, que arranca tras el montaje, nunca durante el render.                                |
| Las flechas y `Espacio` hacen scroll o activan botones enfocados                             | `preventDefault` solo con el reproductor montado y sin modal abierto; el foco no se deja en un botón tras pulsar táctil.    |
| `dt` enorme al volver de una pestaña en segundo plano o al reanudar                          | Se conserva el tope de 0,05 s y al reanudar se reinicia `lastTime`.                                                         |
| Reescalado CSS desalinea los botones táctiles o el canvas pierde nitidez en pantallas densas | Tamaño lógico fijo y escalado por CSS; se verifica en 375px y en escritorio.                                                |
| El modal y el HUD se desincronizan del motor (puntuación final distinta)                     | `onGameOver` entrega la puntuación final y `GamePlayer` la usa; no se recalcula.                                            |

## Lo que **no** está en esta spec

- Puntuaciones en Supabase ni Hall of Fame real.
- OVNIs, sonido, música, gamepad.
- Tetris, Arkanoid ni otros juegos de `references/started-games/`.
- Cambios en `rocas` ni en los demás juegos simulados.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
