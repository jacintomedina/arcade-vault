# SPEC 10 — Gamepad táctil estilo Game Boy bajo el canvas

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-10-29
> **Objetivo:** Sustituir los controles táctiles propios de cada juego por un único gamepad estilo Game Boy clásico (cruceta + botones A y B, sin SELECT ni START) que se muestra bajo el canvas en pantallas táctiles, con el HUD debajo del gamepad.

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
- Cambiar la lógica, el HUD, la pausa, el modal o la puntuación de cualquier juego.
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
- [ ] A 375 px el gamepad cabe sin scroll horizontal y cada botón mide al menos 48×48 px.
- [ ] Los botones PAUSA, FIN y SALIR del HUD siguen funcionando bajo el gamepad.
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

## Lo que **no** está en esta spec

- SELECT y START.
- Deslizar sobre la cruceta, háptica y sonido.
- Orientación horizontal con gamepad lateral.
- Gamepad físico y teclas remapeables.
- HUD bajo el canvas en escritorio.
- Nuevas acciones por juego.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
