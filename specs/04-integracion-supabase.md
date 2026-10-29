# SPEC 04 — Integración de Supabase (base de datos y autenticación)

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 03
> **Fecha:** 2026-10-18
> **Objetivo:** Conectar la app Next.js al proyecto Supabase existente con `@supabase/ssr` y `@supabase/supabase-js`, dejando clientes de navegador y servidor, refresco de sesión y una ruta de diagnóstico listos para las specs futuras.

## Por qué existe esta spec

Las specs siguientes (catálogo real, puntuaciones, auth, Realtime, Edge Functions) necesitan una base común. Esta spec crea solo esa base: **no cambia ninguna pantalla ni dato visible**. Los datos siguen en `app/data/`.

## Alcance

**Dentro:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a `.env.example`.
- Variables de entorno de Supabase (URL del proyecto y clave publicable) en `.env.local`, con sus nombres documentados en `.env.example` sin valores. Valores obtenidos del proyecto vinculado en `.mcp.json` con el MCP de Supabase (`get_project_url`, `get_publishable_keys`). La spec no contiene valores, identificadores de proyecto ni claves.
- Cliente de navegador: `app/_lib/supabase/client.ts`.
- Cliente de servidor (cookies de `next/headers`): `app/_lib/supabase/server.ts`.
- Refresco de sesión en `proxy.ts` (raíz, convención de Next 16) apoyado en `app/_lib/supabase/proxy.ts`. Sin lógica de redirección ni rutas protegidas.
- Ruta de diagnóstico `GET /api/health/supabase` (`app/api/health/supabase/route.ts`), que se conserva.
- Archivos de migración en `supabase/migrations/` como convención de carpeta, aplicadas por MCP (`apply_migration`) en specs futuras. Esta spec no aplica ninguna.

**Fuera de alcance (para futuras specs):**

- Tablas (`games`, `scores`, mensajes de contacto, perfiles) y políticas RLS.
- Pantallas de login, registro o cierre de sesión; rutas protegidas; proveedores OAuth.
- Sustituir `app/data/games.ts` o `app/data/home.ts` por datos reales.
- Guardar puntuaciones o mensajes de `/about`.
- Realtime y Edge Functions.
- Tipos generados de la base de datos (`generate_typescript_types`): se añaden cuando existan tablas.
- Clave `service_role` y cliente administrador.
- Supabase CLI local, Docker, ramas de Supabase.
- Tests automatizados.

## Modelo de datos

Esta spec no introduce tablas ni estructuras de datos de dominio. La base de datos queda vacía.

Archivos nuevos y firmas:

```ts
// app/_lib/supabase/client.ts
export function createClient(): SupabaseClient;            // createBrowserClient

// app/_lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient>; // createServerClient + cookies()

// app/_lib/supabase/proxy.ts
export async function updateSession(request: NextRequest): Promise<NextResponse>;
```

Variables de entorno: dos, URL y clave publicable, con prefijo `NEXT_PUBLIC_` y nombres según la guía oficial de `@supabase/ssr` (se fijan en el paso 2 y quedan en `.env.example`).

Respuesta de `/api/health/supabase`:

```ts
{ ok: true }                       // 200
{ ok: false, error: string }       // 503
```

La contraseña de base de datos ya existe en `.env.local` y `.env.example`. Esta spec no la usa en código de la app.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` (`01-app`) `proxy.md`, Route Handlers y Cache Components (`cookies()` es API dinámica). Leer con `search_docs` del MCP la guía de Supabase para Next.js con `@supabase/ssr`. Sin cambios de código.
2. Instalar `@supabase/supabase-js` y `@supabase/ssr`. Obtener URL y clave publicable con el MCP, añadirlas a `.env.local` y documentar los nombres en `.env.example` sin secretos.
3. Crear `app/_lib/supabase/client.ts`. La app sigue arrancando.
4. Crear `app/_lib/supabase/server.ts` con cookies de `next/headers`.
5. Crear `app/_lib/supabase/proxy.ts` y `proxy.ts` en la raíz con `matcher` que excluye `_next/static`, `_next/image`, `favicon.ico` e imágenes. El proxy solo refresca la sesión y propaga cookies. Si `updateSession` lanza (p. ej. URL de Supabase inválida), `proxy.ts` captura el error y continúa con `NextResponse.next()` para no romper el resto de rutas.
6. Crear `app/api/health/supabase/route.ts`: hace `fetch` a `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health` con la clave publicable en el header `apikey`, sin caché y con timeout de 5 s. Respuesta OK devuelve 200. Variables ausentes, respuesta no OK, timeout o cualquier excepción devuelve 503 con mensaje genérico, sin filtrar claves. (`auth.getUser()` se descartó: sin sesión no llama a la red y daría falsos 200.)
7. Crear `supabase/migrations/.gitkeep` y añadir a `README.md` una sección corta: variables de entorno, convención de migraciones y ruta de diagnóstico.
8. Pulido: `npm run lint` y `npm run build` limpios. Probar con `npm run dev` la ruta de diagnóstico y las rutas de SPEC 01–03.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores ni advertencias de Cache Components ni de la convención `proxy`.
- [ ] `package.json` lista `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] `GET /api/health/supabase` con las variables correctas devuelve 200 y `{ "ok": true }`.
- [ ] `GET /api/health/supabase` con la URL de Supabase inválida (malformada o inalcanzable) devuelve 503 y `{ "ok": false, ... }` sin lanzar excepción no controlada, y el resto de rutas siguen respondiendo 200.
- [ ] La respuesta de error no contiene la clave publicable ni la contraseña de base de datos.
- [ ] `.env.example` lista los nombres de las variables de Supabase sin valores reales; `.env.local` no está versionado.
- [ ] La contraseña de base de datos no aparece en el bundle del cliente (grep en `.next/static`).
- [ ] Ningún archivo de `specs/` ni de `.env.example` contiene el identificador del proyecto Supabase, su URL ni claves.
- [ ] `proxy.ts` existe en la raíz; no existe `middleware.ts`.
- [ ] Las peticiones a `/_next/static/*` no pasan por el proxy.
- [ ] `list_tables` del MCP sobre el esquema `public` no devuelve tablas nuevas creadas por esta spec.
- [ ] Las rutas `/`, `/games`, `/games/[id]`, `/hall`, `/access` y `/about` siguen funcionando y se ven igual.

## Decisiones tomadas y descartadas

- **Sí:** `@supabase/ssr` + `@supabase/supabase-js`. Petición explícita del usuario; es el paquete oficial para cookies de sesión en Next. **No:** `supabase-js` solo (sesión en `localStorage`, ilegible en servidor).
- **Sí:** base de datos y auth como infraestructura, sin tablas ni UI. El usuario quiere la integración para specs futuras. **No:** crear `games`/`scores` aquí.
- **Sí:** `proxy.ts` con refresco de sesión desde ahora. Evita que la spec de auth retoque la base. Interpretación de la respuesta del usuario (eligió `@supabase/ssr`, cuyo patrón oficial incluye el proxy). **No:** `middleware.ts` (convención reemplazada en Next 16).
- **Sí:** clave publicable (formato nuevo de Supabase). **No:** clave `anon` heredada.
- **Sí:** spec sin valores, identificadores de proyecto ni claves. Petición del usuario: la spec es legible por cualquiera con acceso al repo. Los valores viven solo en `.env.local`.
- **Sí:** ruta `/api/health/supabase` permanente. Petición del usuario; sirve de diagnóstico para las specs siguientes. **No:** script desechable.
- **Sí:** health con `fetch` a `/auth/v1/health`. Prueba alcance real; verificado con URL malformada e inalcanzable. **No:** `auth.getUser()` (sin sesión no toca la red, falso 200).
- **Sí:** `try/catch` en `proxy.ts`. Una URL inválida lanzaba dentro del proxy y daba 500 en todas las rutas. **No:** excluir `api/health` del matcher (el resto de rutas seguiría rompiéndose).
- **Sí:** migraciones aplicadas al proyecto remoto por MCP, con archivos en `supabase/migrations/`. **No:** Supabase CLI local con Docker (más setup, sin necesidad hoy).
- **Sí:** sin tipos generados todavía. Con la base vacía solo producirían un archivo sin contenido. **No:** generar `database.ts` ahora.
- **Sí:** clientes bajo `app/_lib/supabase/`, mismo patrón que `app/_components/`. **No:** carpeta `lib/` en la raíz (el repo no la usa).
- **Sí:** `service_role` fuera de esta spec. Se añadirá solo cuando una Edge Function o Server Action lo exija. **No:** exponerla ahora sin uso.

## Riesgos

| Riesgo                                                              | Mitigación                                                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Cache Components: `cookies()` en el cliente de servidor es dinámico | Usarlo solo en Route Handler y Server Actions futuras, nunca en el render estático de páginas actuales; leer docs en el paso 1. |
| Proxy rompe estáticos o añade latencia a todas las rutas            | `matcher` que excluye estáticos e imágenes; verificar en el criterio de aceptación.                                             |
| Variables ausentes rompen el build                                  | Los clientes lanzan error claro solo al ejecutarse; la ruta de diagnóstico devuelve 503, no excepción.                          |
| Fuga de secretos                                                    | Solo prefijo `NEXT_PUBLIC_` para URL y clave publicable (pensadas para el cliente); la contraseña de base de datos sin prefijo. |
| Proyecto Supabase pausado o inaccesible                             | Ruta de diagnóstico lo expone con 503 y mensaje genérico.                                                                       |

## Lo que **no** está en esta spec

- Tablas, RLS y migraciones aplicadas.
- Login, registro, rutas protegidas, OAuth.
- Datos reales para juegos, puntuaciones, actividad o mensajes de contacto.
- Realtime y Edge Functions.
- Tipos generados, `service_role`, CLI local.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
