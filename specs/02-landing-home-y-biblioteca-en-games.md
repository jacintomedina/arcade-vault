# SPEC 02 — Landing en `/` y Biblioteca en `/games`

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-13
> **Objetivo:** Portar `references/templates/home-about/home.jsx` como landing en `/`, mover la Biblioteca a `/games` y actualizar Nav y estilos con `nav.jsx` y `styles.css` de esa carpeta, **sin implementar `about.jsx`**.

## Por qué existe esta spec

`references/templates/home-about/` trae una landing (`home.jsx`), una Nav nueva (`nav.jsx`) y una hoja de estilos ampliada (`styles.css`, 1744 líneas). Hoy `/` es la Biblioteca. La landing pasa a `/` y la Biblioteca pasa a `/games`, junto a `/games/[id]` que ya existe.

## Alcance

**Dentro:**

- Landing en `/` portada de `home.jsx`: hero con siluetas flotantes, "¿Por qué Arcade Vault?" (4 tarjetas con `FeatureIcon`), "Juegos disponibles ahora" (6 `MiniCard`), stats, "Actividad en vivo" (últimas puntuaciones + top jugadores), precios con FAQ y CTA final. Revelado al hacer scroll (`useReveal`).
- Biblioteca movida de `/` a `/games` (`app/games/page.tsx`), sin cambios visuales.
- Nav actualizada según `nav.jsx`: enlaces **Inicio** (`/`), **Biblioteca** (`/games`), **Salón de la Fama** (`/hall`), en barra y panel móvil.
- Fusionar `home-about/styles.css` en `app/globals.css`, adaptando variables de fuente y sin selectores de `#root`.
- Los datos de la landing (actividad, top, features, precios, stats) viven en `app/data/`.
- Enlaces internos: "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS", "INSERTAR MONEDA" → `/games`; "CREAR CUENTA", "EMPEZAR GRATIS" → `/access`; "VER SALÓN" → `/hall`; `MiniCard` → `/games/[id]`.
- Textos en español, igual que el template.

**Fuera de alcance:**

- **`about.jsx` y la ruta `/about`.** No se crea página, ni enlace "Acerca de" en Nav, ni se porta el CSS exclusivo de about (`.about*`, líneas ~1071+ de `styles.css`). Pendiente de spec propia.
- Datos reales para actividad, top o stats (son ficticios, estáticos).
- Cambios en Detalle, Reproductor, Acceso o Salón, salvo los enlaces que apunten a la antigua Biblioteca.
- Contador de créditos real, auth real, tests, i18n (igual que SPEC 01).

## Modelo de datos

Nuevo archivo `app/data/home.ts` (tipado), con los datos hoy inline en `home.jsx`:

```ts
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";
export interface Feature { icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET"; title: string; desc: string; color: NeonColor }
export interface RecentScore { player: string; game: string; score: number; ago: string; color: NeonColor }
export interface TopPlayer { rank: number; player: string; score: number }
export interface Stat { n: string; unit: string; sub: string }
export interface Faq { q: string; a: string }
export const FEATURES: Feature[];
export const RECENT_SCORES: RecentScore[];   // 7 filas
export const TOP_PLAYERS: TopPlayer[];       // 5 filas
export const STATS: Stat[];                  // 3 bloques
export const PRICING_FEATURES: string[];     // 6 ítems
export const FAQS: Faq[];                    // 3 preguntas
```

`GAMES` de `app/data/games.ts` se reutiliza para `MiniCard` (primeros 6). Formato numérico: `toLocaleString("es-ES")`.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` (`01-app`) lo relevante a Cache Components, `next/link` y client components. Sin cambios de código.
2. Mover el contenido de `app/page.tsx` a `app/games/page.tsx` (Biblioteca en `/games`). `app/page.tsx` renderiza provisionalmente un placeholder. Actualizar enlaces a `/` que significaban Biblioteca. Verificar con `npm run build`.
3. Fusionar `home-about/styles.css` en `app/globals.css` (excluyendo bloque `.about*`). Adaptar `--pixel`/`--mono` a variables de `next/font`. La app sigue renderizando.
4. Crear `app/data/home.ts` con los datos de la landing.
5. Actualizar `app/_components/nav.tsx`: enlaces Inicio / Biblioteca / Salón en barra y panel móvil. "Inicio" activo solo en `/`; "Biblioteca" activo en `/games`, `/games/*` y reproductor.
6. Crear `app/_components/home/` con `FloatingSilhouettes`, `FeatureIcon`, `MiniCard` y el hook/componente de reveal (cliente, `IntersectionObserver`). Resto en servidor.
7. Implementar la landing en `app/page.tsx` con todas las secciones y enlaces con `next/link`.
8. Pulido: metadata de `/` y `/games`, responsive ≤ 768px, respeto a `prefers-reduced-motion` si el CSS lo define, `npm run lint` y `npm run build` limpios.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni advertencias de Cache Components.
- [ ] `/` muestra el título "EL ARCADE CLÁSICO ESTÁ DE VUELTA" y estas secciones en orden: hero, por qué (4 tarjetas), juegos (6 mini-tarjetas), stats (3 bloques), actividad (7 + 5 filas), precios, CTA final.
- [ ] `/games` muestra las 8 tarjetas bajo "ARCADE VAULT" con búsqueda y chips funcionando como en SPEC 01.
- [ ] "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS" navegan a `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS" a `/access`; "VER SALÓN →" a `/hall`.
- [ ] Pulsar una mini-tarjeta navega a `/games/<id>` de ese juego.
- [ ] La Nav tiene exactamente 3 enlaces (Inicio, Biblioteca, Salón de la Fama) en barra y en el panel móvil de 375px, y ninguno dice "Acerca de".
- [ ] "Inicio" está activa en `/`; "Biblioteca" en `/games`, `/games/fall` y `/games/fall/play`; "Salón" en `/hall`.
- [ ] No existe `app/about/` ni ningún enlace a `/about`; `globals.css` no contiene selectores `.about*`.
- [ ] Las secciones con `.reveal` pasan a visibles al hacer scroll.
- [ ] Con 375px de ancho no hay scroll horizontal en `/`.
- [ ] Ningún componente define datos de landing fuera de `app/data/`.
- [ ] Las rutas de SPEC 01 (`/games/[id]`, `/play`, `/access`, `/hall`) siguen funcionando.

## Decisiones tomadas y descartadas

- **Sí:** landing en `/` y Biblioteca en `/games`. Es el patrón habitual y encaja con `/games/[id]`. **No:** landing en `/games` (mezcla dos conceptos bajo una ruta).
- **Sí:** excluir `about.jsx` por completo, incluidos enlace y CSS. Petición explícita del usuario. **No:** enlace a página inexistente (daría 404).
- **Sí:** actualizar Nav y CSS con las versiones nuevas de `home-about/`. **No:** conservar los antiguos (divergirían del diseño).
- **Sí:** datos de la landing en `app/data/home.ts`, ficticios. Mismo criterio que SPEC 01.
- **Sí:** servidor por defecto; `"use client"` solo para reveal y Nav.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| `styles.css` nuevo pisa estilos ya portados (SPEC 01) | Comparar con diff antes de fusionar; revisar las 5 pantallas tras el paso 3. |
| Enlaces a `/` de SPEC 01 que significaban Biblioteca (Detalle, Reproductor) | Buscarlos con grep en el paso 2 y apuntarlos a `/games`. |
| `IntersectionObserver` en SSR / hidratación | Hook solo cliente, con contenido visible si falla. |
| Cache Components exige `Suspense` con datos dinámicos | Datos estáticos de `app/data/`; sin APIs dinámicas. |

## Lo que **no** está en esta spec

- Página "Acerca de" (`about.jsx`), su ruta, enlace y CSS.
- Datos reales o en vivo para actividad, top y stats.
- Juegos reales, auth real, base de datos, tests, i18n.
