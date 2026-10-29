# SPEC 10 — Gamepad táctil estilo Game Boy bajo el canvas

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-10-29
> **Revisión 1:** 2026-10-29 — carcasa más baja con el HUD cabiendo debajo, y HUD simplificado en táctil (solo PAUSA y selector de skin).
> **Revisión 2:** 2026-10-29 — el gamepad tiene el mismo ancho que el marco CRT del canvas.
> **Revisión 3:** 2026-10-29 — el ancho incluye el anillo exterior del marco CRT (bordes dibujados con `box-shadow`), y se corrige `allowedDevOrigins` para poder probar en el móvil por la red local.
> **Objetivo:** Sustituir los controles táctiles propios de cada juego por un único gamepad estilo Game Boy clásico (cruceta + botones A y B, sin SELECT ni START) que se muestra bajo el canvas en pantallas táctiles, con un HUD simplificado (solo PAUSA y selector de skin) justo debajo del gamepad.

## Por qué existe esta spec

Hoy cada juego define sus propios `TouchControls` (joystick de Asteroides, cruceta de Tetris, cruceta de Snake, flechas y botón de Arkanoid). Son tres lenguajes visuales distintos y el HUD queda encima del canvas, lejos del pulgar. Esta spec unifica la experiencia móvil en un solo componente reutilizable y reordena la pantalla táctil.

Orden de arriba a abajo en pantallas táctiles: **canvas → gamepad → HUD**.

El usuario confirmó el diseño: Game Boy clásico (DMG) sin SELECT ni START, adaptado a la estética CRT oscura del sitio.

## Alcance

**Dentro:**

- Componente cliente `app/_components/gameboy-pad.tsx` con `GameBoyPad`:
  - Carcasa con forma de Game Boy: rectángulo redondeado, rejilla de altavoz decorativa.
  - Cruceta en cruz a la izquierda (▲ ▼ ◀ ▶) y botones redondos A y B a la derecha, en diagonal (B abajo a la izquierda, A arriba a la derecha).
  - Sin botones SELECT ni START. La pausa sigue en el HUD y con la tecla `P`.
- Botones de pulsación mantenida (`pointerdown` / `pointerup` / `pointercancel`) con `setPointerCapture`, `tabIndex={-1}`, `touch-action: none` y sin menú contextual. Varios botones a la vez (multitáctil): cruceta y A/B simultáneos.
- Cada juego declara su mapeo en `REAL_GAMES` con un campo `pad`, que sustituye a `TouchControls`:
  - Asteroides: ◀ ▶ rotan, ▲ propulsa, ▼ sin función, A dispara, B sin función.
  - Tetris: ◀ ▶ mueven, ▼ baja, ▲ sin función, A rota, B caída instantánea.
  - Arkanoid: ◀ ▶ mueven, ▲ ▼ sin función, A lanza la bola, B sin función.
  - Snake: ▲ ▼ ◀ ▶ giran, A y B sin función.
  - Los botones sin función se dibujan atenuados y desactivados (`aria-disabled`).
- Visibilidad solo con `@media (pointer: coarse)`, igual que `.touch-controls` actual. En escritorio el gamepad no se renderiza visualmente y el HUD sigue arriba.
- Reordenación solo en táctil: `.av-player` pasa a columna y `.player-hud` va debajo del gamepad (CSS `order`). En escritorio el orden no cambia.
- Carcasa compacta (revisión 1): se reduce solo la altura de la carcasa; el tamaño de los botones no cambia (cruceta 52×52 px, A/B 56×56 px, mínimo 48×48 px).
  - Altura objetivo de la carcasa: unos 176 px (hoy ≈ 248 px). Se logra recortando el relleno vertical, acercando A y B entre sí en vertical y sacando la rejilla del altavoz del flujo (posición absoluta en la esquina redondeada).
  - La forma de la carcasa es rectangular con las esquinas redondeadas. Todas las esquinas tienen el mismo radio.
- Ancho del gamepad (revisión 2): en táctil la carcasa ocupa el 100 % del ancho del marco CRT (`.crt`), alineada con sus bordes izquierdo y derecho. Se elimina el `max-width` fijo de 340 px.
  - Se mide contra el objeto visible completo del canvas, bordes incluidos (revisión 3): la caja `.crt` más el anillo exterior de 7 px por lado que dibuja su `box-shadow` (`0 0 0 6px` + `0 0 0 7px`). Es decir, ancho de `.crt` + 14 px, con margen lateral negativo de 7 px en `.gb-pad`. No se mide contra la caja `.crt` sola ni contra el `<canvas>` interior.
  - Cruceta pegada al lado izquierdo y A/B al derecho (`justify-content: space-between`), con el relleno horizontal de la carcasa; el hueco central crece con el ancho.
  - Los botones no cambian de tamaño (52 y 56 px) ni la altura de la carcasa (≈ 176 px).
  - Mismo ancho en 375 px y en 768 px, donde el marco CRT es más ancho que en móvil.
  - El HUD queda inmediatamente debajo de la carcasa, con el menor margen posible entre ambos.
- HUD simplificado solo en táctil (revisión 1): dentro de `@media (pointer: coarse)` el HUD muestra únicamente el botón PAUSA/REANUDAR y el selector de skin, en una sola fila.
  - Se ocultan con CSS (sin cambiar el JSX ni la lógica): JUGADOR, PUNTUACIÓN, VIDAS, NIVEL, FIN y SALIR.
  - Escritorio no cambia: el HUD completo sigue encima del canvas.
  - Los juegos siguen emitiendo `onStats` y el modal de fin sigue mostrando la puntuación final; solo cambia qué se ve en el HUD táctil.
  - Sin FIN ni SALIR en táctil, la partida termina al perder (`onGameOver`); para salir se usa el menú de navegación.
- Eliminar los `*TouchControls` de los cuatro juegos y sus estilos (`.joystick`, `.joystick-knob`, `.fire-btn`, `.tt-*`, `.sn-*`, `.ak-launch`, `.snake-touch`, `.tetris-touch`) una vez migrados.
- Asteroides: el motor ya acepta `left`, `right`, `thrust` y `fire` por `press`. Se elimina el uso de `aim` por joystick desde la UI; `GameInput.aim` se mantiene en el contrato sin uso táctil.
- Estilos del gamepad en `app/globals.css` con prefijo `.gb-` (usar `/frontend-design`).
- Aviso de teclas (`.controls-hint`) sin cambios: sigue oculto en táctil.

**Fuera de alcance (para futuras specs):**

- Botones SELECT y START.
- Deslizar el dedo entre direcciones de la cruceta (cada flecha es un botón independiente).
- Vibración háptica y sonido de los botones.
- Orientación horizontal con gamepad a los lados del canvas.
- Gamepad físico (Gamepad API) y remapeo de teclas.
- Mover el HUD bajo el canvas en escritorio.
- Cambiar la lógica, la pausa, el modal o la puntuación de cualquier juego. El HUD solo cambia en lo que dice la revisión 1 (visibilidad en táctil).
- Mostrar puntuación, vidas o nivel en otro lugar de la pantalla táctil.
- Reubicar FIN y SALIR en táctil (por ejemplo, en un menú).
- Nuevos botones de acción por juego (hiperespacio, etc.).
- Tests automatizados.

## Modelo de datos

Sin tablas ni persistencia nuevas. Cambia el contrato de registro en `game-player.tsx`.

```ts
// app/_components/gameboy-pad.tsx
export type PadButton = "up" | "down" | "left" | "right" | "a" | "b";

export interface PadMapping {
	// tecla de GameInput.press por botón; sin entrada = botón desactivado
	up?: string;
	down?: string;
	left?: string;
	right?: string;
	a?: string;
	b?: string;
}

export function GameBoyPad({ input, mapping }: { input: GameInput; mapping: PadMapping }): JSX.Element;
```

Registro en `REAL_GAMES` (reemplaza `TouchControls`):

```ts
asteroides: { ..., pad: { left: "left", right: "right", up: "thrust", a: "fire" } },
tetris:     { ..., pad: { left: "left", right: "right", down: "down", a: "rotate", b: "drop" } },
arkanoid:   { ..., pad: { left: "left", right: "right", a: "launch" } },
snake:      { ..., pad: { up: "up", down: "down", left: "left", right: "right" } },
```

Contrato: `GameComponentProps`, `GameStats`, `GameInput` no cambian. `TouchControlsProps` se elimina si ningún archivo lo usa.

Las claves de `press` son las que cada motor ya acepta en su `input.ts`. Antes de fijar el mapeo se comprueba en cada `*-game.tsx` cómo traduce `inputRef.current.press(k, down)` a su `InputKey`.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/01-app/` lo relevante a Client Components. Revisar `inputRef.press` en los cuatro `*-game.tsx` y confirmar las claves del mapeo. Sin cambios de código.
2. Crear `gameboy-pad.tsx` y estilos `.gb-*` en `app/globals.css` con `/frontend-design`: carcasa, cruceta, A/B, rejilla, estados `:active` y desactivado.
3. Añadir el campo opcional `pad?: PadMapping` a `REAL_GAMES` y renderizar `<GameBoyPad>` en `game-player.tsx` bajo el CRT cuando `pad` exista. Conviven con `TouchControls` solo durante este paso.
4. Declarar `pad` en los cuatro juegos y verificar cada uno en un viewport táctil.
5. Reordenar en táctil: `.av-player` en columna con `.player-hud { order: 3 }` dentro de `@media (pointer: coarse)`. Verificar que escritorio no cambia.
6. Borrar `TouchControls` del tipo de `REAL_GAMES`, los `*TouchControls` de los cuatro componentes, `TouchControlsProps` y los estilos sin uso.
7. Pulido: 375 px y 768 px, `npx tsc --noEmit`, `npm run lint` y `npm run build` limpios.
8. (Revisión 1) Carcasa compacta: en `.gb-*` reducir relleno vertical, acercar A y B en vertical (contenedor `.gb-actions` más bajo, botones iguales) y pasar `.gb-speaker` a posición absoluta sin ocupar alto. Medir la carcasa a 375 px: objetivo ≈ 176 px de alto. Botones sin cambios de tamaño.
9. (Revisión 1) HUD simplificado en táctil: dentro de `@media (pointer: coarse)` ocultar `.hud-stat` (jugador, puntuación, vidas, nivel) y los botones FIN y SALIR del HUD; dejar PAUSA y el selector de skin en una fila; ajustar el margen entre carcasa y HUD. Verificar escritorio sin cambios y que a 375×667 el HUD queda visible bajo la carcasa (ver criterios).
10. (Revisión 2) Ancho y esquinas del gamepad: en `.gb-pad` quitar `max-width: 340px` y el centrado por `margin: auto`, dejar `width: 100%` con el mismo ancho que `.crt`, y sustituir el radio asimétrico (`16px 16px 64px 16px`) por un único `border-radius: 16px` en las cuatro esquinas. Verificar a 375 px y 768 px que los bordes de `.gb-pad` y `.crt` coinciden, sin scroll horizontal, con los botones intactos y con el altavoz sin solaparse con A.
11. (Revisión 3) Ancho con bordes y prueba en móvil: en `.gb-pad` usar `width: calc(100% + 14px)` y `margin: 14px -7px 0`; verificar a 375 px y 768 px que sus bordes coinciden con el anillo exterior de `.crt` y que no hay scroll horizontal. En `next.config.ts` cambiar `allowedDevOrigins: ["192.168.1.36:3000"]` por `["192.168.1.36"]`, reiniciar `npm run dev` y comprobar desde la IP de la red local que la página hidrata.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores ni advertencias de Cache Components.
- [ ] En un dispositivo táctil (o emulación `pointer: coarse`) `/games/<id>/play` muestra, de arriba a abajo: canvas, gamepad, HUD.
- [ ] En escritorio (`pointer: fine`) no se ve el gamepad y el HUD sigue encima del canvas, como antes.
- [ ] El gamepad muestra cruceta, A y B, y no muestra SELECT ni START.
- [ ] Asteroides: ◀ ▶ rotan la nave, ▲ propulsa, A dispara. ▼ y B salen atenuados y no hacen nada.
- [ ] Tetris: ◀ ▶ mueven, ▼ baja, A rota, B hace caída instantánea. ▲ sale atenuado.
- [ ] Arkanoid: ◀ ▶ mueven la pala, A lanza la bola.
- [ ] Snake: las cuatro flechas giran la serpiente.
- [ ] Se pueden pulsar a la vez una dirección y A o B.
- [ ] Soltar o cancelar el toque libera el botón: la nave no sigue girando ni la pala moviéndose.
- [ ] Pulsar el gamepad no hace scroll, zoom ni abre menú contextual, y los botones no toman el foco.
- [ ] A 375 px el gamepad cabe sin scroll horizontal y cada botón mide al menos 48×48 px (cruceta 52×52 px y A/B 56×56 px, sin cambios).
- [ ] A 375 px la carcasa del gamepad mide como máximo 176 px de alto y su aspecto de Game Boy se mantiene (rectángulo con las cuatro esquinas del mismo radio, altavoz visible).
- [ ] En táctil el gamepad tiene el mismo ancho visible que el marco CRT, bordes incluidos: el borde izquierdo de `.gb-pad` coincide con el borde exterior izquierdo del anillo del marco (`.crt` − 7 px), y lo mismo en el derecho (±1 px), a 375 px y a 768 px, sin scroll horizontal.
- [ ] En el móvil real (servidor de desarrollo por IP de la red local) la página hidrata y los cuatro juegos responden al gamepad, a PAUSA y al selector de skin.
- [ ] Con el gamepad a todo el ancho, cruceta a la izquierda y A/B a la derecha siguen midiendo 52×52 y 56×56 px.
- [ ] En táctil el HUD queda inmediatamente debajo de la carcasa y se ve completo, sin scroll, a 375×812. A 375×667 se ve al menos su fila entera con un scroll mínimo (medido y anotado al verificar).
- [ ] En táctil el HUD muestra solo PAUSA/REANUDAR y el selector de skin, en una fila. No aparecen JUGADOR, PUNTUACIÓN, VIDAS, NIVEL, FIN ni SALIR.
- [ ] En escritorio el HUD sigue completo (jugador, puntuación, vidas, nivel, skin, PAUSA, FIN y SALIR) y encima del canvas.
- [ ] El botón PAUSA/REANUDAR y el selector de skin siguen funcionando bajo el gamepad, y el cambio de skin se aplica a la partida.
- [ ] Con el juego en pausa o terminado, el gamepad no altera la partida.
- [ ] No quedan `*TouchControls`, `TouchControlsProps` ni estilos `.joystick`, `.fire-btn`, `.tt-*`, `.sn-*`, `.ak-launch` sin uso.
- [ ] Teclado en escritorio, skins, pausa con `P`, modal de fin y guardado de puntuación siguen funcionando en los cuatro juegos.
- [ ] `scores.ts`, `app/_lib/` y `supabase/` no cambian.

## Decisiones tomadas y descartadas

- **Sí:** un único `GameBoyPad` reutilizable con mapeo por juego. **No:** un gamepad por juego.
- **Sí:** Game Boy clásico sin SELECT ni START (petición del usuario). La pausa queda en el HUD y en `P`. **No:** START/SELECT decorativos ni funcionales.
- **Sí:** el gamepad solo se ve en táctil (`pointer: coarse`) y el HUD solo baja en táctil. Escritorio intacto. **No:** mostrarlo siempre ni mover el HUD en escritorio.
- **Sí:** el orden se logra con CSS `order` en táctil. Evita duplicar el HUD o mover el DOM. **No:** renderizar dos HUD.
- **Sí:** Asteroides con cruceta digital + A (disparo). Pierde el control analógico a cambio de coherencia y sin tocar el motor. **No:** cruceta que emite `aim` ni dejar el joystick.
- **Sí:** botones sin función atenuados y desactivados. El gamepad conserva su forma en todos los juegos. **No:** ocultar botones según el juego.
- **Sí:** botones independientes con pulsación mantenida, como los actuales. **No:** cruceta con deslizamiento (se difiere).
- **Sí:** reemplazar `TouchControls` por `pad` en `REAL_GAMES`. **No:** mantener dos mecanismos en paralelo tras la migración.
- **Sí:** prefijo `.gb-` para los estilos nuevos. **No:** reutilizar `.tt-*`.
- **Sí:** el gamepad es independiente de las skins; no cambia con ellas.
- **Sí (revisión 1):** carcasa más baja manteniendo el tamaño de los botones, para que el HUD quepa debajo. **No:** encoger los botones (el mínimo táctil de 48 px manda).
- **Sí (revisión 2):** el gamepad ocupa el ancho del marco CRT, para alinear visualmente canvas y mando. **No:** mantener el ancho fijo de 340 px centrado ni medirlo contra el `<canvas>` interior. Revisión 3: el ancho cuenta el anillo exterior del marco, no solo la caja `.crt`.
- **Sí (revisión 3):** `allowedDevOrigins` solo con el hostname (`192.168.1.36`), sin puerto, como exige Next. Con el puerto, el dev server bloquea los recursos de desarrollo desde el móvil y la página no hidrata. **No:** dejar la entrada con `:3000`.
- **Sí (revisión 1):** HUD táctil reducido a PAUSA y selector de skin, ocultando el resto con CSS en `pointer: coarse`. **No:** cambiar el JSX ni la lógica del HUD, ni tocar el HUD de escritorio.
- **Sí (revisión 1):** aceptar que en táctil no se ven puntuación, vidas ni nivel durante la partida, y que no hay FIN ni SALIR. La puntuación final sigue saliendo en el modal de fin. **No:** reubicar esos datos en esta spec (queda para una spec propia si hace falta).

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| El gamepad robaba espacio vertical y el canvas queda fuera de pantalla | Canvas y gamepad con alturas acotadas; verificar a 375×667. |
| Un toque queda "pegado" si el dedo sale del botón | `setPointerCapture` y liberar en `pointerup` y `pointercancel`. |
| El zoom por doble toque o el scroll interfieren | `touch-action: none` en los botones y `preventDefault` en `pointerdown`. |
| Perder el control analógico empeora Asteroides | Aceptado por el usuario; si molesta, spec propia. |
| Dispositivos híbridos (portátil con pantalla táctil) reportan `pointer: fine` | Se mantiene el criterio actual de `.touch-controls`; fuera de alcance cambiarlo. |
| Reordenar con `order` rompe el foco o la lectura de pantalla | Verificar el orden de tabulación; el HUD sigue siendo un bloque contiguo. |
| Borrar estilos `.tt-*` rompe algo en escritorio | Buscar usos con `grep` antes de borrar y verificar los cuatro juegos. |
| Las claves de `press` difieren de las asumidas | Paso 1 las confirma en cada `*-game.tsx` antes de tocar nada. |
| La cruceta (156 px) fija un mínimo de alto: la carcasa no baja mucho de ≈ 176 px | Se recorta relleno y se saca el altavoz del flujo; si a 375×667 el HUD aún no cabe entero, se anota y se decide en otra revisión (p. ej. acotar el canvas). |
| Sin puntuación, vidas ni FIN/SALIR en táctil, el jugador no ve su progreso ni puede abandonar | Aceptado por el usuario. La puntuación final aparece en el modal. Si molesta, spec propia. |
| A 768 px el gamepad a todo el ancho (≈ 578 px) deja un hueco central grande entre cruceta y A/B | Aceptado: es la consecuencia de igualar el ancho. Si queda mal, spec propia (p. ej. limitar el ancho en tablet). |
| Ocultar `.hud-stat` con CSS deja huecos o desalinea PAUSA y el selector | Verificar la fila a 375 px y 768 px en los cuatro juegos. |

## Lo que **no** está en esta spec

- SELECT y START.
- Deslizar sobre la cruceta, háptica y sonido.
- Orientación horizontal con gamepad lateral.
- Gamepad físico y teclas remapeables.
- HUD bajo el canvas en escritorio.
- Puntuación, vidas y nivel visibles en táctil, y FIN/SALIR reubicados.
- Nuevas acciones por juego.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
