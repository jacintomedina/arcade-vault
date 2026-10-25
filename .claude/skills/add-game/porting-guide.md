# Guía de port: `game.js` vanilla → motor TypeScript

Referencias en `references/started-games/`. Cada una es HTML + JS sin build, con globals, HUD y GAME OVER propios. El port conserva las mecánicas y quita el marco.

## Checklist

1. **Globals → closure.** Todo el estado vive dentro de `createEngine(opts)`. Nada a nivel de módulo salvo constantes puras.
2. **`ctx` por argumento.** Los métodos `draw` reciben el contexto. El motor lo obtiene de `canvas.getContext("2d")` dentro de `createEngine`.
3. **Sin `document` ni `window` fuera de funciones.** El módulo debe poder importarse en el servidor sin errores.
4. **Quita el marco del original.** HUD, texto GAME OVER, mensajes de pausa y botones de reinicio los pinta la plataforma. El reinicio por tecla (`Espacio`, `Enter`) desaparece: reinicia "JUGAR DE NUEVO".
5. **Emite, no pintes.**
   - `onStats({ score, lives, level })` solo cuando cambia alguno de los tres.
   - `onGameOver(finalScore)` una sola vez por partida.
6. **Bucle.** `requestAnimationFrame` con `dt` en segundos, limitado a 0,05 s. Velocidades en px/s (si el original usa px/frame, multiplica por 60 y anota la conversión).
7. **Pausa real.** `setPaused(true)` detiene `update` y `draw`. Al reanudar, reinicia `lastTime` para que `dt` no salte.
8. **`stop()`.** Cancela `requestAnimationFrame` y llama a `input.detach()`. Un segundo montaje no duplica la velocidad.
9. **Entrada.**
   - Teclado: mapa `e.code → acción` en `input.ts`, listeners en `attach()`.
   - Ratón: convierte coordenadas con `getBoundingClientRect()` a coordenadas lógicas (`(clientX - rect.left) * W / rect.width`), porque el canvas se escala por CSS.
   - Táctil: la plataforma envía `setInput(k, down)` y, si procede, `setAim`. El componente decide los controles; el motor solo los consume.
   - `GamePlayer` ya gestiona `P` para pausar y `preventDefault` de flechas y `Espacio`. No dupliques ese atajo en el motor. Las teclas extra del juego deben añadirse a `GAME_KEYS`.
10. **Aleatoriedad.** `Math.random()` solo dentro del motor, tras el montaje. Nunca durante el render de React.
11. **Tipos.** Interfaces para entidades, `readonly` donde aplique, sin `any`.
12. **Canvas.** Tamaño lógico fijo (800×600 si es 4:3). El CSS escala al ancho de `.crt-screen`. Si el original no es 4:3, la spec decide: letterbox dentro del canvas, o ajustar el marco.
13. **Assets.** Carga imágenes y audio dentro del motor, tras el montaje, desde `public/games/<id>/`. Mientras cargan, el motor no arranca el bucle. Un fallo de carga no debe romper la página.
14. **Estilo visual.** Se conserva el del original salvo decisión de la spec. No rediseñar con neones.

## Notas por referencia

### `02-asteroids`

Ya portado (SPEC 05). Es el modelo.

### `03-tetris`

- Archivos: `index.html`, `style.css`, `game.js`. El HTML trae su propio panel (siguiente pieza, puntuación, nivel). La spec decide si el panel "siguiente" se pinta en el canvas o se descarta.
- No hay vidas. La partida acaba al apilar hasta arriba. Decidir qué emite `onStats.lives` y qué muestra el HUD (p. ej. un solo valor fijo con los corazones ocultos).
- Nivel sube por líneas: emitir en `onStats`.
- Tablero vertical, no 4:3. Decidir proporción en la spec.
- Teclas: flechas, rotación, caída rápida y caída instantánea. Añadir las que hagan scroll a `GAME_KEYS`.
- Tope de puntos por segundo: calcular a partir de la tabla de puntos real de `game.js`.

### `04-arkanoid`

- Archivos: `index.html`, `game.js`, `levels.js`, `assets/spritesheet-breakout.png`, `assets/spritesheet.js`, `assets/sounds/`.
- Ratón y flechas. El ratón necesita conversión de coordenadas (punto 9).
- 5 niveles definidos en `levels.js`: se portan como datos tipados.
- Pausa del original con `P` o `Escape` y selector de nivel en el overlay: la plataforma ya tiene pausa; el selector de nivel se descarta salvo decisión contraria.
- Pantalla de victoria "¡Completaste el juego!": el motor llama a `onGameOver(score)` al completar el nivel 5; la spec decide cómo se distingue de perder.
- Spritesheet y sonidos: decidir en la spec si entran (assets en `public/games/arkanoid/`) o se dibujan formas simples y se omite el sonido.
- Tope de puntos por segundo: bloques × 10 puntos × ritmo máximo de rotura razonable; justificarlo.

### Juego nuevo (sin referencia)

Usa Asteroides como esqueleto de archivos y la misma interfaz `Engine`. La spec define mecánicas, controles y puntuación antes de escribir código.

## Cálculo de `max_score_per_second`

Máximo teórico de puntos que una partida legítima puede sumar en un segundo. Ejemplo de SPEC 06: 5 disparos/s × 3 balas × 100 puntos = 1500. Escribe el cálculo en la spec. Es mejor un tope alto que rechazar una partida legítima; se afina después con datos reales.
