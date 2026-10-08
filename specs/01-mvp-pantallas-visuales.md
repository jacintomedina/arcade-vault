# SPEC 01 — MVP visual de Arcade Vault (5 pantallas)

> **Estado:** Implementado
> **Depende de:** ninguna
> **Fecha:** 2026-10-07
> **Objetivo:** Portar a Next.js (App Router) las 5 pantallas de `references/templates/` (Biblioteca, Detalle, Reproductor, Acceso y Salón de la Fama) como interfaz visual con datos ficticios, sin implementar ningún juego real.

## Por qué existe esta spec

`references/templates/` es un prototipo en React 18 por CDN con Babel, estado + hash como router y estilos globales. El proyecto es Next 16.4 + React 19.3 con `cacheComponents`. Hay que traducir el prototipo a la arquitectura real sin cambiar su aspecto, y aislar los datos ficticios en `app/data/` para reemplazarlos después por una base de datos.

## Alcance

**Dentro:**

- 5 pantallas con rutas reales del App Router:
  - Biblioteca: `/`
  - Detalle de juego: `/games/[id]`
  - Reproductor: `/games/[id]/play`
  - Acceso (iniciar sesión / crear cuenta): `/access`
  - Salón de la Fama: `/hall`
- Navbar (con menú móvil), footer y fondo (`av-bg`, `av-noise`) compartidos vía `app/layout.tsx`.
- Portar `references/templates/styles.css` (950 líneas) a la hoja global del proyecto, respetando los tokens de `app/globals.css` y las fuentes ya cargadas en `app/layout.tsx` (`--font-press-start`, `--font-jetbrains-mono`, `--font-courier-prime`).
- Datos ficticios en `app/data/` (juegos, categorías, jugadores, generador de puntuaciones sembrado), tipados en TypeScript.
- Sesión simulada en `localStorage` (clave `av_user`), expuesta por un contexto de React en el layout.
- Reproductor simulado: HUD, pausa, botón FIN, puntuación que sube sola, modal de fin de juego con guardado de puntuación en `localStorage` (clave `av_scores`).
- Biblioteca con búsqueda por nombre y filtro por categoría, efecto tilt en tarjetas.
- Textos en español, igual que el template.

**Fuera de alcance (specs futuras):**

- Cualquier juego real (lógica, canvas, teclado, táctil).
- Autenticación real (backend, OAuth, contraseñas). Los botones Google/GitHub no hacen nada.
- Base de datos real y API. `app/data/` es el punto de sustitución futuro.
- Leer `av_scores` para mostrar las marcas guardadas en Detalle o Salón. Se escribe, no se lee (igual que el template).
- Contador de créditos real. "CRÉDITOS · 03" es texto fijo.
- Tests automatizados (el proyecto no tiene runner).
- Internacionalización.

## Modelo de datos

Archivos nuevos bajo `app/data/`. Los nombres reflejan el template.

```ts
// app/data/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;          // slug, ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;       // clase CSS, ej. "cover-bricks"
  color: GameColor;
  best: number;        // mejor puntuación global
  plays: string;       // ya formateado, ej. "12.4K"
}

export const GAMES: Game[];                 // los 8 juegos de data.jsx
export const CATS: ("TODOS" | GameCategory)[];

// app/data/scores.ts
export interface ScoreRow { rank: number; name: string; score: number; date: string } // date: "DD/MM/2026"
export const PLAYERS: string[];
export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista

// Sesión (cliente)
export interface SessionUser { name: string }          // máx. 10 caracteres, mayúsculas
// localStorage "av_user" -> SessionUser | ausente (invitado)
// localStorage "av_scores" -> { game: string; score: number; name: string; at: number }[]
```

Convenciones:

- `seededScores` es determinista para una semilla dada (mismo algoritmo LCG de `data.jsx`).
- Formato numérico: `toLocaleString("es-ES")`.
- Las pantallas leen datos solo desde `app/data/`, nunca los definen inline.

## Plan de implementación

1. Leer `node_modules/next/dist/docs/` (`01-app`) sobre Cache Components, rutas dinámicas, `generateStaticParams` y client components. Sin cambios de código.
2. Crear `app/data/games.ts` y `app/data/scores.ts` con los datos y tipos de `data.jsx`. Verificar con `npm run build`.
3. Portar `styles.css` a `app/globals.css`, adaptando las variables de fuente (`--pixel`, `--mono`) a las variables de `next/font`. Eliminar selectores de `#root`. La página actual sigue renderizando.
4. Crear proveedor de sesión (`app/_components/session-provider.tsx`, cliente) con `user`, `login`, `logout` sobre `av_user`, y montarlo en `app/layout.tsx`. Guardar con try/catch.
5. Crear `Nav` (con menú móvil) y `Footer` en `app/_components/`, y montarlos en `app/layout.tsx`. Enlace activo según `usePathname`.
6. Implementar Biblioteca en `app/page.tsx` (hero, búsqueda, chips, `GameCard` con tilt, estado vacío). Tarjeta navega a `/games/[id]`.
7. Implementar Detalle en `app/games/[id]/page.tsx` con `generateStaticParams` sobre `GAMES`. `notFound()` si el id no existe. Botones a `/games/[id]/play` y `/`.
8. Implementar Acceso en `app/access/page.tsx` (tabs entrar/crear, campos, invitado, botones sociales inertes). Al enviar: `login`, redirige a `/`. Invitado: `logout`, redirige a `/`.
9. Implementar Salón en `app/hall/page.tsx`: tabs por juego, podio top 3, tabla de 12 filas, bloque "tu mejor marca" solo con sesión.
10. Implementar Reproductor en `app/games/[id]/play/page.tsx`: HUD, arena CRT decorativa, pausa, FIN, modal con guardado en `av_scores`, reiniciar, volver. Botón SALIR vuelve a `/games/[id]`.
11. Pasada final de pulido: metadata por página, responsive (≤ 768px con menú hamburguesa), `npm run lint` y `npm run build` limpios.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [x] `npm run lint` termina sin errores.
- [x] `npm run build` termina sin errores ni advertencias de Cache Components.
- [x] `/` muestra 8 tarjetas de juego bajo el título "ARCADE VAULT".
- [x] Escribir "gl" en el buscador deja solo la tarjeta GLOTÓN.
- [x] Pulsar el chip SHOOTER muestra exactamente INVASORES y ROCAS.
- [x] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [x] Pulsar una tarjeta navega a `/games/<id>` de ese juego.
- [x] `/games/fall` muestra título, descripción larga, etiquetas, partidas, mejor global y 10 filas de puntuaciones.
- [x] El botón "JUGAR AHORA" navega a `/games/fall/play`.
- [x] En `/games/fall/play` la puntuación aumenta sola y "PAUSA" la detiene; "REANUDAR" la retoma.
- [x] "FIN" abre el modal con la puntuación final; "GUARDAR PUNTUACIÓN" añade una entrada a `localStorage.av_scores` y muestra "PUNTUACIÓN GUARDADA".
- [x] "JUGAR DE NUEVO" pone puntuación en 0, vidas en 3 y nivel en 01.
- [x] En `/access` la pestaña "CREAR CUENTA" añade el campo de correo; "INICIAR SESIÓN" lo oculta.
- [x] Enviar el formulario con usuario "kai" guarda `av_user = {"name":"KAI"}`, redirige a `/` y la navbar muestra "KAI".
- [x] "JUGAR COMO INVITADO" borra `av_user` y redirige a `/`.
- [x] Recargar la página conserva la sesión.
- [x] `/hall` muestra 8 pestañas, podio con 3 posiciones y tabla de 12 filas; cambiar de pestaña cambia los datos.
- [x] En `/hall` el bloque "TU MEJOR MARCA" aparece solo con sesión iniciada.
- [x] La navbar marca "Biblioteca" activa en `/`, `/games/*` y reproductor, y "Salón de la Fama" activa en `/hall`.
- [x] Con ancho de 375px aparece el botón hamburguesa y abre el panel móvil con 3 enlaces.
- [x] Con `localStorage` bloqueado ninguna pantalla lanza error en consola.
- [x] Ningún componente define datos de juegos o puntuaciones fuera de `app/data/`.

## Decisiones tomadas y descartadas

- **Sí:** rutas reales del App Router. Permiten enlaces profundos y encajan con Next. **No:** una sola página con estado + hash como el template (pierde URLs, SEO y code splitting).
- **Sí:** datos ficticios en `app/data/` en TypeScript. Un solo lugar a sustituir cuando exista base de datos. **No:** base de datos ahora (spec aparte).
- **Sí:** sesión simulada en `localStorage` con claves `av_user` y `av_scores`, iguales al template. **No:** auth real (spec aparte).
- **Sí:** reproductor simulado con puntos aleatorios, como el template. Es la parte visual que se pidió. **No:** juegos reales.
- **Sí:** `av_scores` solo se escribe. Leer marcas propias exige modelo de datos de usuario; va con la base de datos.
- **Sí:** reutilizar las fuentes de `app/layout.tsx` ya cargadas con `next/font`. **No:** `<link>` de Google Fonts del template.
- **Sí:** portar `styles.css` casi tal cual a CSS global. Garantiza fidelidad visual. **No:** reescribir en utilidades Tailwind (alto coste, riesgo de divergencia).
- **Sí:** componentes de servidor por defecto; `"use client"` solo donde hay estado, efectos o `localStorage`.
- **Sí:** pestaña activa del Salón como estado de cliente, sin query param. **No:** URL por juego (se puede añadir luego).

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Cache Components exige envolver en `Suspense` el acceso a datos dinámicos y a `params` | Leer docs en el paso 1. Usar `generateStaticParams` para `[id]`. |
| Hidratación: `localStorage` no existe en servidor y la navbar cambia según sesión | Inicializar sesión en `useEffect`; renderizar estado "sin sesión" hasta montar. |
| `localStorage` bloqueado o JSON corrupto | Envolver lecturas y escrituras en `try/catch` y caer a invitado. |
| CSS global de 950 líneas choca con estilos de create-next-app | Reemplazar el contenido de `globals.css` en el paso 3 y revisar `app/page.tsx`. |
| Cambios de API de Next 16 vs. conocimiento previo | Seguir `AGENTS.md`: consultar `node_modules/next/dist/docs/` antes de escribir código. |

## Lo que **no** está en esta spec

- Juegos reales de ningún tipo.
- Auth real, OAuth, registro con correo.
- Base de datos, API o puntuaciones compartidas entre usuarios.
- Mostrar en la interfaz las puntuaciones guardadas del usuario.
- Créditos funcionales.
- Tests automatizados e internacionalización.

Cada punto, si llega, va en su propia spec.
