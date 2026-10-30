# SPEC 11 — HUD móvil menos saturado: datos sobre el canvas, controles bajo el gamepad

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 10
> **Fecha:** 2026-10-30
> **Objetivo:** En pantallas táctiles, repartir el HUD en dos bloques (datos encima del canvas, controles debajo del gamepad), con un solo botón SALIR en lugar de FIN y SALIR, para que ya no sea una banda saturada de ocho elementos en dos líneas.

## Por qué existe esta spec

La revisión 5 de SPEC 10 metió JUGADOR, PUNTUACIÓN, VIDAS, NIVEL, skin, PAUSA, FIN y SALIR en un único bloque bajo el gamepad, en dos líneas con fuentes de 8–10 px. Cabe, pero se ve apretado y cuesta leerlo. Esta spec **sustituye el diseño táctil del HUD de la revisión 5** (los criterios de HUD táctil aún sin marcar en SPEC 10 quedan reemplazados por los de esta spec).

Orden de arriba a abajo en pantallas táctiles: **datos → canvas → gamepad → controles**.

Decisiones ya cerradas por el usuario:

- Datos encima del canvas, controles debajo del gamepad.
- Se quita el botón SALIR actual (enlace a `/games/<id>`); el botón FIN pasa a llamarse SALIR.
- La etiqueta SKIN va encima del desplegable, no a su lado, para ganar ancho.
- Vidas y nivel con etiqueta corta o icono.
- El cambio de SALIR vale también en escritorio.

## Alcance

**Dentro:**

- `game-player.tsx`:
  - Botón único **SALIR** (antes FIN). Mantiene la acción de FIN: `setOver(true)`, que abre el modal de fin con guardado de puntuación y «VOLVER AL VAULT». Se elimina el `Link` SALIR a `/games/<id>`. Aplica en táctil y en escritorio.
  - El bloque de datos (hoy un `div` sin clase con estilos en línea) recibe la clase `hud-data` y pierde esos estilos en línea; el gap y el wrap pasan a CSS.
  - Etiquetas cortas de vidas y nivel: el valor de nivel se muestra como `NV 02` y las vidas como corazón(es) sin la etiqueta larga «VIDAS». Se resuelve con CSS (etiqueta `.l` oculta o abreviada) o con un `<span>` de etiqueta corta, sin cambiar la lógica de `onStats`.
  - La etiqueta «Skin» del desplegable se coloca encima del `select` (en vertical) en táctil.
- `app/globals.css`, solo dentro de `@media (pointer: coarse)` salvo lo indicado:
  - `.player-hud` pasa a `display: contents` para que `.hud-data` y `.hud-actions` sean hijos directos de `.av-player` y se puedan ordenar por separado. No se duplica el HUD ni se mueve el DOM.
  - `.hud-data`: `order: -1`, una línea (JUGADOR, PUNTUACIÓN, VIDAS, NIVEL), fuente mayor que la actual (valores ≥ 12 px, etiquetas ≥ 9 px), puntuación destacada, nombre recortado con `text-overflow: ellipsis`, margen inferior pequeño hasta el canvas. Con su propio fondo, borde y relleno (`.player-hud` ya no tiene caja con `display: contents`).
  - `.hud-actions`: `order: 1` (tras el gamepad), una sola fila: skin (etiqueta arriba, `select` debajo), PAUSA/REANUDAR y SALIR. Botones y `select` de 44 px de alto como mínimo, fuente ≥ 10 px.
  - Se borran las reglas de la revisión 5 que quedan sin uso (`.player-hud > div:first-child` con `!important`, fuentes de 8–9 px, `.hud-stat` en fila).
- Escritorio: HUD en una barra encima del canvas como hoy, con datos a la izquierda y acciones a la derecha. Cambia solo que FIN pasa a ser SALIR y desaparece el segundo SALIR.
- El `Nav` sigue oculto en `/games/<id>/play` (SPEC 10, revisión 4).

**Fuera de alcance (para futuras specs):**

- Menús desplegables (⋯), iconos en lugar de texto en los botones o gestos.
- Mover los controles dentro de la carcasa del gamepad.
- Cambiar el gamepad (tamaños, ancho, esquinas) o el modal de fin.
- Cambiar la lógica de los juegos, la pausa, la puntuación o el guardado.
- Cambiar el criterio `pointer: coarse` o el HUD en ventanas estrechas de escritorio.
- Confirmación al pulsar SALIR (el modal de fin ya actúa como paso intermedio).
- Tests automatizados.

## Modelo de datos

Sin tablas, tipos ni persistencia nuevos. `GameComponentProps`, `GameStats` y `GameInput` no cambian. Solo cambian el JSX de `game-player.tsx` y CSS.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/01-app/` lo relevante a Client Components y `next/link`. Usar `/frontend-design` para el diseño del HUD. Comprobar con `grep` que nadie más usa las clases `.hud-stat`, `.hud-actions`, `.player-hud` ni el texto «FIN».
2. JSX en `game-player.tsx`: clase `hud-data` en el bloque de datos (quitando estilos en línea y llevando gap/wrap a CSS), botón FIN renombrado a SALIR, `Link` SALIR eliminado (y el import de `Link` solo si deja de usarse; el modal lo sigue usando). Etiquetas cortas de vidas y nivel. Verificar que escritorio se ve igual salvo el botón.
3. CSS táctil: `.player-hud { display: contents }`, `order` de `.hud-data` y `.hud-actions`, tipografía y relleno nuevos, skin con etiqueta encima. Borrar las reglas de la revisión 5 que ya no apliquen.
4. Medir en emulación `pointer: coarse` a 375×667, 375×812, 320×568 y 768×1024: todo visible sin scroll horizontal, datos en una línea, controles en una fila, orden datos → canvas → gamepad → controles, botones ≥ 44 px, y comprobar si hay scroll vertical a 667 (anotar la medida).
5. Pulido: los cuatro juegos (con y sin skins), vidas en Asteroides y Arkanoid, `initialLives: 1` en Tetris y Snake; `npx tsc --noEmit`, `npm run lint` y `npm run build` limpios.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores ni advertencias de Cache Components.
- [x] En táctil (`pointer: coarse`) `/games/<id>/play` muestra, de arriba a abajo: datos, canvas, gamepad, controles, en los cuatro juegos.
- [x] En táctil la fila de datos muestra JUGADOR, PUNTUACIÓN, VIDAS y NIVEL en una sola línea, sin saltos, a 375 px y a 320 px; el nombre se recorta con puntos suspensivos si no cabe.
- [x] Los valores de la fila de datos miden al menos 12 px y sus etiquetas al menos 9 px; la puntuación destaca sobre el resto.
- [x] El nivel se ve como `NV 02` y las vidas sin la etiqueta larga «VIDAS»; la puntuación se actualiza durante la partida.
- [x] En táctil la fila de controles contiene, en una sola línea, el selector de skin (con su etiqueta «SKIN» encima del desplegable), PAUSA/REANUDAR y SALIR. En juegos sin skins solo PAUSA y SALIR.
- [x] En táctil, botones y selector miden al menos 44 px de alto, con fuente de al menos 10 px.
- [x] No existe un botón FIN ni un enlace SALIR a `/games/<id>` en ninguna resolución. Solo hay un botón SALIR.
- [x] SALIR abre el modal de fin con la puntuación; desde él se puede guardar y pulsar «VOLVER AL VAULT». Probado en táctil y en escritorio.
- [x] El gamepad conserva su ancho, altura y alineación con el marco CRT (sin cambios respecto a SPEC 10).
- [x] Sin scroll horizontal a 320, 375 y 768 px. La altura total a 375×812 cabe sin scroll vertical; a 375×667 se anota la medida real.
- [x] En escritorio el HUD sigue en una barra encima del canvas: datos a la izquierda; skin, PAUSA y SALIR a la derecha; sin gamepad.
- [x] PAUSA/REANUDAR y el cambio de skin siguen funcionando en táctil y en escritorio.
- [x] `scores.ts`, `app/_lib/`, `supabase/` y los motores `app/_games/` no cambian.

## Decisiones tomadas y descartadas

- **Sí:** repartir el HUD en dos bloques (datos arriba, controles abajo del gamepad) para reducir la densidad. **No:** mantener un único bloque de ocho elementos.
- **Sí:** `display: contents` en `.player-hud` solo en táctil y `order` en los dos bloques. Un único HUD en el DOM. **No:** renderizar dos HUD ni mover nodos con JS.
- **Sí:** un único botón SALIR que abre el modal de fin. Evita perder la puntuación por un toque accidental y el modal ya ofrece «VOLVER AL VAULT». **No:** navegar directamente a `/games/<id>`.
- **Sí:** el cambio de FIN → SALIR vale en escritorio también (decisión del usuario), para no tener dos comportamientos con la misma etiqueta.
- **Sí:** etiqueta SKIN encima del desplegable en táctil para ganar ancho. **No:** etiqueta a su lado.
- **Sí:** vidas y nivel con etiqueta corta (`NV 02`, corazones), más tipografía mayor. **No:** menú desplegable ⋯ ni iconos en botones (descartado por el usuario a favor de este diseño).
- **Sí:** mantener JUGADOR en la fila de datos, ahora con espacio. **No:** quitarlo.
- **Sí:** criterio solo `pointer: coarse`, igual que SPEC 10. **No:** añadir `max-width: 720px`.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| `display: contents` pierde fondo, borde y relleno de `.player-hud` | Dar caja propia a `.hud-data` y `.hud-actions` en táctil; verificar visualmente. |
| Navegadores con errores de accesibilidad en `display: contents` | El contenedor no tiene rol ni foco; verificar el orden de tabulación (datos, canvas, gamepad sin foco, controles). |
| Datos arriba empujan el canvas hacia abajo y el pad o los controles quedan fuera de pantalla a 375×667 | Medir y anotar. Si no cabe, spec propia (p. ej. acotar el alto del canvas). |
| Cuatro datos en una línea no caben a 320 px | Recortar el nombre con puntos suspensivos y reducir hueco antes de pasar a dos líneas; verificar a 320 px. |
| Eliminar el enlace SALIR deja un `Link` sin uso o el HUD de escritorio sin acceso rápido a `/games/<id>` | SALIR abre el modal con «VOLVER AL VAULT»; revisar el import de `Link`. |
| Reglas CSS de la revisión 5 quedan muertas o chocan con las nuevas | Buscar con `grep` `.hud-stat`, `.hud-actions` y `.player-hud` dentro de `pointer: coarse` antes de borrar. |

## Lo que **no** está en esta spec

- Menús desplegables o iconos en el HUD.
- Cambios en el gamepad, el modal de fin, la pausa, las skins o la puntuación.
- Ajustes del HUD de escritorio más allá del botón SALIR.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
