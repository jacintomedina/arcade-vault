# SPEC 06 — Leaderboard real y tabla de juegos en Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 04, SPEC 05
> **Fecha:** 2026-10-23
> **Objetivo:** Crear en Supabase las tablas `games`, `game_sessions` y `scores` y sustituir las puntuaciones simuladas de `/hall` y `/games/[id]` por un leaderboard real de Asteroides, cuyas puntuaciones solo se guardan desde el modal de fin de partida mediante Server Actions que validan una sesión de partida emitida por el servidor.

## Por qué existe esta spec

SPEC 04 dejó la base de datos vacía y SPEC 05 dejó un juego real cuyas marcas solo van a `localStorage` (`av_scores`). `/hall` y la ficha del juego siguen pintando `seededScores`, datos inventados. Esta spec conecta ambos extremos.

El usuario pidió que "nunca se pueda inventar un score". Con un juego que corre en el navegador del jugador esa garantía absoluta no existe: solo la daría que el servidor re-simulara la partida. Esta spec fija un nivel intermedio y explícito: la puntuación entra solo a través de una sesión de partida creada por el servidor, de un solo uso y con un tope de puntos por segundo transcurrido. Cierra la inserción directa por API o consola; no detiene a un bot que simule el tiempo y las puntuaciones plausibles. Ese límite queda registrado en Riesgos.

## Alcance

**Dentro:**

- Tabla `games` en Supabase: una fila por entrada de `app/data/games.ts` (`id`, `title`), usada como referencia (FK) de `game_sessions` y `scores`. La app **sí** lee el catálogo de esta tabla.
- Columna `games.max_score_per_second` (nullable). `NULL` significa "juego sin puntuación registrable". Solo `asteroides` tiene valor.
- Tabla `game_sessions` (sesiones de partida emitidas por el servidor) y tabla `scores`.
- Vista `leaderboard` con el top 10 por juego.
- RLS activado en las tres tablas: lectura pública de `games` y `scores`; ninguna política de escritura para `anon` ni `authenticated`. `game_sessions` sin acceso público.
- Variable de entorno `SUPABASE_SERVICE_ROLE_KEY` (solo servidor, sin prefijo `NEXT_PUBLIC_`) y cliente administrador `app/_lib/supabase/admin.ts`, con `import "server-only"`.
- Server Actions en `app/_actions/scores.ts`: `startGameSession(gameId)` y `submitScore(sessionId, name, score)`.
- `GamePlayer` abre una sesión de partida al montar un juego real y en cada `runKey` nuevo, y el botón GUARDAR PUNTUACIÓN del modal llama a `submitScore`.
- Tras guardar, el modal muestra el rango obtenido (`#NN`).
- `/hall` y `/games/[id]` leen el top 10 de `leaderboard`. Estado vacío "SÉ EL PRIMERO EN JUGAR!" para juegos sin marcas.
- Se eliminan `seededScores`, `PLAYERS`, `app/data/scores.ts` y el bloque simulado "TU MEJOR MARCA" de `/hall`.
- Se elimina el guardado en `localStorage["av_scores"]`.
- Tipos generados de la base de datos en `app/_lib/supabase/database.types.ts`.
- Migraciones en `supabase/migrations/`, aplicadas por MCP (`apply_migration`).
- Invalidación de la caché del leaderboard al guardar una marca (Cache Components), incluida la caché del router del cliente (`revalidatePath` de `/hall`, `/games` y `/games/[id]`).
- **Ampliación (catálogo reducido):** eliminar los juegos simulados. `app/data/games.ts` queda solo con `asteroides`; se borran de la tabla `games` las otras 8 filas (no tienen sesiones ni marcas); desaparece el simulador de `GamePlayer` y las rutas de los demás juegos devuelven 404. `CATS` y `GameCategory` se reducen a lo que usa el catálogo (`SHOOTER`).
- **Ampliación (datos reales en tarjetas y ficha):** `best` y `plays` salen de la base de datos. "Mejor puntuación" de la tarjeta y "Mejor global" de la ficha muestran la marca nº 1 del juego (0 si no hay marcas). "Partidas" de la ficha muestra el número de marcas guardadas del juego. Se eliminan `best` y `plays` de `app/data/games.ts`.
- Nombre por defecto del jugador en las partidas: `PLAYER 1`.

**Fuera de alcance (para futuras specs):**

- Leer el catálogo (biblioteca, home, fichas) desde la tabla `games` y borrar `app/data/games.ts`.
- Contenido inventado de la home que menciona juegos borrados (`RECENT_SCORES`, `TOP_PLAYERS`, `STATS`, `FEATURES`): se anota para una spec de limpieza de la home.
- Supabase Auth real, perfiles y `user_id` en `scores`. El nombre sigue siendo libre.
- Más juegos reales y su catálogo en la base de datos (cuando existan, cada uno entra en su propia spec).
- Re-simulación de la partida en el servidor (la única garantía fuerte anti-trampas).
- Rate limiting por IP y limpieza de sesiones sin usar.
- Sustituir `TOP_PLAYERS` y `RECENT_SCORES` de la home por datos reales.
- Contar partidas iniciadas o abandonadas: "Partidas" cuenta solo marcas guardadas.
- Migrar las marcas ya guardadas en `localStorage` de los navegadores.
- Realtime del leaderboard.
- Tests automatizados.

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_leaderboard.sql

create table public.games (
  id text primary key,                 -- mismo id que app/data/games.ts
  title text not null,
  max_score_per_second integer check (max_score_per_second > 0)
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  started_at timestamptz not null default now(),
  consumed_at timestamptz
);

create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null references public.games(id),
  session_id uuid not null unique references public.game_sessions(id),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score > 0),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

create view public.leaderboard with (security_invoker = true) as
select game_id, player_name, score, created_at, rank
from (
  select s.*, row_number() over (
    partition by game_id order by score desc, created_at asc
  ) as rank
  from public.scores s
) t
where rank <= 10;
```

Siembra: una fila de `games` por cada entrada de `app/data/games.ts`. `asteroides` con `max_score_per_second = 1500` (máximo teórico: 5 disparos/s × 3 balas del power-up × 100 puntos por asteroide pequeño; ninguna partida legítima lo supera). El resto con `NULL`.

RLS:

```sql
alter table public.games enable row level security;
alter table public.game_sessions enable row level security;
alter table public.scores enable row level security;

create policy "games lectura pública" on public.games for select using (true);
create policy "scores lectura pública" on public.scores for select using (true);
-- Sin políticas de INSERT/UPDATE/DELETE. game_sessions sin ninguna política.
-- El cliente administrador (service_role) omite RLS y es la única vía de escritura.
```

Server Actions (`app/_actions/scores.ts`, `"use server"`):

```ts
export type StartSessionResult =
	| { ok: true; sessionId: string }
	| { ok: false; error: string };

export type SubmitScoreResult =
	| { ok: true; rank: number }
	| { ok: false; error: string };

export async function startGameSession(
	gameId: string,
): Promise<StartSessionResult>;
export async function submitScore(
	sessionId: string,
	name: string,
	score: number,
): Promise<SubmitScoreResult>;
```

Reglas de `startGameSession`: el `gameId` existe en `games` y su `max_score_per_second` no es `NULL`; inserta una fila en `game_sessions` y devuelve su `id`.

Reglas de `submitScore`, todas evaluadas en el servidor con su reloj:

1. `sessionId` es un UUID y la sesión existe.
2. `consumed_at` es `NULL` (un solo uso) y han pasado como máximo 2 h desde `started_at`.
3. `name` normalizado (`trim`, mayúsculas) tiene entre 1 y 10 caracteres y solo contiene letras, dígitos, `_` y espacio.
4. `score` es un entero con `1 <= score <= floor(segundos_transcurridos × max_score_per_second)`.
5. Marca la sesión como consumida e inserta en `scores` de forma atómica (un `UPDATE … WHERE consumed_at IS NULL` condiciona el `INSERT`; si no afecta ninguna fila, devuelve error).
6. Devuelve el rango: `1 + número de filas de scores del mismo juego con score mayor`.

Los errores devuelven mensajes genéricos en español, sin detalles internos ni claves.

Convenciones:

- Fechas en `timestamptz`; la interfaz las formatea `dd/mm/aaaa` como el resto de la app.
- Empates: gana el que lo logró antes (`created_at asc`).
- Variables de entorno nuevas: `SUPABASE_SERVICE_ROLE_KEY` (solo servidor). Su nombre va a `.env.example` sin valor.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` (`01-app`) Server Actions, Cache Components (`use cache`, `cacheTag`, `cacheLife`, `updateTag`/`revalidateTag`) y cómo combinarlos con un cliente sin `cookies()`. Revisar con `search_docs` la guía de RLS y `service_role` de Supabase. Sin cambios de código.
2. Obtener la clave `service_role` del panel de Supabase (el MCP no la expone), añadirla a `.env.local` y documentar el nombre en `.env.example`. Crear `app/_lib/supabase/admin.ts` con `server-only`. La app sigue arrancando.
3. Migración `leaderboard`: tablas, índice, vista, RLS y siembra de `games`, aplicada con `apply_migration` y guardada en `supabase/migrations/`. Verificar con `list_tables` y `get_advisors` (seguridad). Generar `database.types.ts`.
4. Crear `app/_actions/scores.ts` con `startGameSession` y `submitScore`. Comprobar las reglas con `execute_sql` y llamadas directas: sesión inexistente, consumida, expirada, score por encima del tope, nombre inválido, juego sin `max_score_per_second`.
5. Modificar `game-player.tsx`: para juegos reales, abrir sesión al montar y en cada `runKey`, guardar el `sessionId` en estado, sustituir `saveScore` por `submitScore`, mostrar rango o error en el modal y deshabilitar GUARDAR mientras no haya sesión. Eliminar `SCORES_KEY` y `saveScore`. Los juegos simulados no abren sesión y el modal oculta GUARDAR PUNTUACIÓN para ellos.
6. Crear la lectura del leaderboard (función en `app/_lib/leaderboard.ts`) con `use cache`, `cacheTag("leaderboard")` y cliente sin cookies; `submitScore` invalida la etiqueta al insertar.
7. Reescribir `/hall`: la página servidor carga el top 10 de todos los juegos y `HallOfFame` (cliente) solo gestiona la pestaña activa, con podio, tabla y estado vacío. Quitar el bloque "TU MEJOR MARCA".
8. Modificar `/games/[id]`: `aside.leaderboard` lee de `leaderboard` y muestra estado vacío. Eliminar `app/data/scores.ts`.
9. Pulido: `npm run lint` y `npm run build` limpios; probar el flujo completo con `npm run dev` y en 375px; confirmar que `SUPABASE_SERVICE_ROLE_KEY` no está en el bundle del cliente.

10. **Ampliación — catálogo reducido.** Migración `solo_asteroides` que borra de `games` los ids distintos de `asteroides`. Reducir `app/data/games.ts` a Asteroides, `CATS` y `GameCategory` a `SHOOTER`. Quitar el simulador de `GamePlayer` (puntuación aleatoria, arena, nivel por puntos) y el nombre por defecto `PLAYER 1`.
11. **Ampliación — datos reales.** `getGameStats()` en `app/_lib/leaderboard.ts` (`use cache`, `cacheTag("leaderboard")`) con `best` y `plays` por juego. `/games` pasa `best` a `Library` y `GameCard`; `/games/[id]` lo usa para "Mejor global" y "Partidas". Quitar `best` y `plays` de `Game`. `submitScore` invalida también `/games`.
12. Verificar: lint, build, flujo de guardado (tarjeta y ficha se actualizan al volver), rutas de juegos borrados con 404 y 375px.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni advertencias de Cache Components.
- [ ] `list_tables` del esquema `public` muestra `games`, `game_sessions` y `scores` con RLS activado.
- [ ] `get_advisors` (seguridad) no reporta tablas sin RLS ni la vista `leaderboard` como `SECURITY DEFINER`.
- [ ] `games` contiene una fila por cada id de `app/data/games.ts`; solo `asteroides` tiene `max_score_per_second` no nulo.
- [ ] Un `INSERT` en `scores` o `game_sessions` con la clave publicable (API REST) es rechazado.
- [ ] Un `SELECT` sobre `game_sessions` con la clave publicable no devuelve filas.
- [ ] `SELECT` público sobre `scores` y `leaderboard` funciona.
- [ ] `startGameSession("asteroides")` devuelve un `sessionId`; `startGameSession("caida")` y un id inexistente devuelven error.
- [ ] `submitScore` rechaza: sesión inexistente, sesión ya consumida, sesión de más de 2 h, `score` mayor que `segundos × max_score_per_second`, `score` ≤ 0 o no entero, nombre vacío, de más de 10 caracteres o con caracteres no permitidos.
- [ ] Dos llamadas simultáneas a `submitScore` con la misma sesión insertan una sola fila.
- [ ] Jugar Asteroides hasta GAME OVER y pulsar GUARDAR PUNTUACIÓN inserta una fila en `scores` con el nombre y la puntuación del modal, y el modal muestra el rango `#NN`.
- [ ] Tras guardar, el botón GUARDAR desaparece y no se puede guardar dos veces la misma partida.
- [ ] "JUGAR DE NUEVO" abre una sesión nueva y permite guardar la nueva puntuación.
- [ ] El botón FIN seguido de GUARDAR PUNTUACIÓN guarda la puntuación actual si no supera el tope.
- [ ] Si falla `startGameSession` o `submitScore`, el modal muestra un error genérico, no se rompe y "JUGAR DE NUEVO" y "VOLVER AL VAULT" siguen funcionando.
- [ ] `/hall` muestra podio y tabla con las marcas reales de Asteroides, ordenadas por puntuación y desempate por antigüedad.
- [ ] Las pestañas de juegos sin marcas en `/hall` y el panel de `/games/caida` muestran el estado vacío "SÉ EL PRIMERO".
- [ ] Tras guardar una marca, `/hall` y `/games/asteroides` la muestran al recargar sin reconstruir la app.
- [ ] No quedan referencias a `seededScores`, `PLAYERS`, `app/data/scores.ts` ni a `av_scores` en el código.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no aparece en `.next/static` ni en ningún archivo de `specs/` ni de `.env.example` con valor.
- [ ] `/hall` y `/games/[id]` no tienen scroll horizontal a 375px.
- [ ] Las rutas de SPEC 01 a SPEC 05 siguen funcionando y `GET /api/health/supabase` devuelve 200.
- [ ] `games` (tabla) y `app/data/games.ts` contienen solo `asteroides`; `/games/caida` y `/games/caida/play` devuelven 404.
- [ ] `GamePlayer` no contiene simulador (sin puntuación aleatoria ni `game-arena`) y el nombre por defecto es `PLAYER 1`.
- [ ] La tarjeta de `/games` y "Mejor global" de la ficha muestran la marca nº 1 real (0 sin marcas) y "Partidas" el número de marcas guardadas.
- [ ] Tras guardar una marca y volver con SALIR o VOLVER AL VAULT, tarjeta, ficha y `/hall` muestran los datos nuevos sin recargar.
- [ ] No quedan `best` ni `plays` en `app/data/games.ts`.

## Decisiones tomadas y descartadas

- **Sí:** tabla `games` solo como referencia (FK) y base del tope por juego. Petición del usuario: "mantener ahí las referencias de los juegos". **No:** que la app lea el catálogo de la BD ahora (toca biblioteca, home y fichas, y las reglas de Cache Components; spec propia).
- **Sí:** `scores` en Supabase. **No:** `localStorage` ni fallback local (dos fuentes de verdad).
- **Sí:** solo juegos reales guardan puntuación (`max_score_per_second` nulo = no registrable). Datos honestos; los simulados generan números aleatorios. **No:** guardar marcas del simulador.
- **Sí:** eliminar `seededScores` y mostrar estado vacío. **No:** sembrar filas falsas ni mezclarlas con reales.
- **Sí:** nombre libre sin auth. El modal ya pide iniciales y el login actual (`av_user`) es de mentira. **No:** Supabase Auth ahora (spec propia, toca toda la app).
- **Sí:** sesión de partida emitida por el servidor, de un solo uso, con tope de puntos por segundo, y escritura solo por Server Actions con `service_role`. Es el nivel de protección más alto razonable sin re-simular. **No:** `INSERT` anónimo con RLS (cualquiera inserta cualquier score con la clave publicable). **No:** replay en servidor (única garantía real, pero requiere ejecutar el motor en el servidor y registrar entradas; spec propia).
- **Sí:** el tope vive en `games.max_score_per_second`, ajustable sin desplegar. Valor inicial 1500, el máximo teórico, para no rechazar jamás una partida legítima; se puede afinar con datos reales. **No:** constante en código.
- **Sí:** `service_role` en servidor con `server-only`. SPEC 04 lo dejó fuera hasta que una Server Action lo exigiera; esta lo exige. **No:** RPC `SECURITY DEFINER` invocable por `anon` (la lógica quedaría expuesta a llamadas directas sin pasar por la app).
- **Sí:** `scores.session_id unique`. Una sesión, una marca, garantizado por la BD. **No:** confiar solo en la comprobación del código.
- **Sí:** top 10 por juego con vista `leaderboard` y rango propio en el modal. **No:** top 20 ni "tu mejor marca" (sin identidad real no hay "tú").
- **Sí:** quitar el bloque "TU MEJOR MARCA" de `/hall`. Era simulado y no hay identidad que lo respalde.
- **Sí (ampliación):** `best` y `plays` pasan a datos reales. `best` = marca nº 1; `plays` = marcas guardadas, que se pueden contar con lectura pública sin exponer `game_sessions`. **No:** contar sesiones iniciadas (se inflan por abandonos y por el doble montaje de React en desarrollo).
- **Sí (ampliación):** borrar los juegos simulados y quedarse solo con `asteroides`. Petición del usuario: es el único jugable y los demás generaban datos falsos. **No:** conservar fichas sin juego.
- **Sí (ampliación):** `revalidatePath` además de `updateTag`. `updateTag` no invalida la caché del router del cliente y la ficha mostraba la lista anterior al volver del juego.
- **Sí:** el servidor calcula el rango. **No:** que el cliente lo deduzca de una lista.

## Riesgos

| Riesgo                                                                      | Mitigación                                                                                                                                               |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un bot abre una sesión, espera y envía una puntuación plausible             | Límite aceptado y documentado. Mitigaciones futuras fuera de alcance: rate limiting y re-simulación. El tope por segundo y el uso único limitan el daño. |
| Cuenta de segundos inflada por la pausa o por dejar la pestaña abierta      | Aceptado: el tope usa tiempo real transcurrido, más permisivo que el tiempo jugado. Nunca rechaza una partida legítima.                                  |
| Fuga de `SUPABASE_SERVICE_ROLE_KEY` al cliente                              | Sin prefijo `NEXT_PUBLIC_`, `import "server-only"` en `admin.ts` y grep en `.next/static` como criterio de aceptación.                                   |
| Acumulación de sesiones sin consumir (abuso o abandono)                     | Aceptado en esta spec. Limpieza y rate limiting en spec futura.                                                                                          |
| Cache Components: lecturas con `cookies()` o caché obsoleta del leaderboard | Lectura con cliente sin cookies dentro de `use cache` con `cacheTag("leaderboard")`; `submitScore` invalida la etiqueta. Leer docs en el paso 1.         |
| Carrera entre dos envíos de la misma sesión                                 | `UPDATE … WHERE consumed_at IS NULL` condiciona el `INSERT` y `scores.session_id` es único. Criterio de aceptación de envío simultáneo.                  |
| Sesión no lista cuando el jugador pierde muy rápido                         | GUARDAR queda deshabilitado hasta tener `sessionId`; si falla, el modal informa y no bloquea el resto de acciones.                                       |
| La vista `leaderboard` ignora RLS                                           | Se crea con `security_invoker = true`; `get_advisors` lo verifica.                                                                                       |
| Nombres ofensivos                                                           | Fuera de alcance; se anota para una spec de moderación.                                                                                                  |

## Lo que **no** está en esta spec

- Catálogo de juegos leído desde la BD.
- Auth real, perfiles, `user_id` en puntuaciones.
- Contenido inventado de la home (`RECENT_SCORES`, `TOP_PLAYERS`, `STATS`, `FEATURES`).
- Re-simulación de la partida, rate limiting, limpieza de sesiones, moderación de nombres.
- `TOP_PLAYERS` y `RECENT_SCORES` reales en la home.
- Realtime y Edge Functions.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
