# SPEC 12 — Autenticación: registro, login, OAuth, recuperación de contraseña y perfil

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 06
> **Fecha:** 2026-11-04
> **Revisión 1:** 2026-11-04 — solo los usuarios registrados pueden guardar puntuaciones; el invitado sigue pudiendo jugar. `submitScore` exige sesión y usa el username de la cuenta.
> **Objetivo:** Sustituir el formulario de acceso simulado por autenticación real con Supabase Auth (email + contraseña con confirmación por correo, Google y GitHub, recuperación de contraseña y perfil con username único) y exigir una cuenta con username para guardar puntuaciones, manteniendo el modo invitado solo para jugar.

## Por qué existe esta spec

`/access` hoy es una maqueta: `AuthForm` llama a `login({ name })` y guarda un nombre en `localStorage` (`av_user`). Los botones de Google y GitHub no hacen nada y no hay cuentas. SPEC 04 dejó la base lista (clientes `@supabase/ssr` y `proxy.ts` que refresca la sesión) y prohibió explícitamente login y registro hasta ahora.

Decisiones ya cerradas por el usuario:

- Email + contraseña **y** OAuth Google/GitHub, todo en esta spec (se desaconsejó dividirla; el usuario decidió mantenerla junta).
- Confirmación de correo obligatoria al registrarse.
- El modo invitado se mantiene para **jugar**; guardar puntuaciones exige cuenta (revisión 1). Un usuario con cuenta guarda siempre con su username.
- Sesión de Supabase + invitado local; `useSession` conserva su contrato (`user.name`).
- Username público: campo en el registro, único.
- Cerrar sesión en el `Nav`, recuperar contraseña y perfil editable (`/profile`: username y contraseña) entran en el alcance.
- Primer login con OAuth: pantalla obligatoria para elegir username.
- Correos por el SMTP por defecto de Supabase (suficiente para desarrollo).
- Rutas de auth bajo `/access`.
- Sin rutas protegidas generales.

## Alcance

**Dentro:**

- **Migración** `supabase/migrations/20261104120000_auth_profiles.sql`: tabla `profiles`, índice único `lower(username)`, RLS y trigger que crea el perfil al insertarse un usuario en `auth.users`.
- **Server Actions** en `app/access/actions.ts`, usando el cliente de servidor (`app/_lib/supabase/server.ts`):
  - `signUp(formData)`: email, contraseña, username. Valida y llama a `auth.signUp` con `options.data.username` y `emailRedirectTo` a `/auth/callback`.
  - `signIn(formData)`: email + contraseña.
  - `signInWithProvider("google" | "github")`: devuelve la URL de OAuth de Supabase; el cliente navega a ella.
  - `signOutAction()`.
  - `requestPasswordReset(formData)`: `resetPasswordForEmail` con `redirectTo` a `/auth/callback?next=/access/reset`.
  - `updatePassword(formData)`: nueva contraseña desde `/access/reset` o `/profile`.
  - `setUsername(formData)`: fija o cambia el username del perfil propio.
  - `checkUsernameAvailable(username)`: comprobación previa (solo UX; la garantía es el índice único).
  - Todas devuelven `{ ok: true } | { ok: false, error: string }` con mensajes en español y genéricos (no revelan si un email existe).
- **Route Handler** `app/auth/callback/route.ts`: intercambia el `code` por sesión (`exchangeCodeForSession`) para confirmación de correo, OAuth y recuperación. Respeta `next` solo si es una ruta interna (empieza por `/` y no por `//`). Tras el intercambio: si el perfil no tiene username → `/access/username`; si no, `next` o `/`. Error → `/access?error=callback`.
- **Rutas nuevas** (App Router):
  - `/access` — se reescribe `auth-form.tsx`: pestañas INICIAR SESIÓN / CREAR CUENTA, campo username solo en registro, botones Google y GitHub funcionales, enlace «¿Olvidaste tu contraseña?», «JUGAR COMO INVITADO» se mantiene. Estados: enviando, error, y tras registrarse un aviso «Revisa tu correo para confirmar la cuenta».
  - `/access/forgot` — pide el email, siempre muestra el mismo mensaje de confirmación.
  - `/access/reset` — formulario de nueva contraseña; requiere la sesión de recuperación creada por el callback; sin ella, mensaje y enlace a `/access/forgot`.
  - `/access/username` — elegir username cuando el perfil no lo tiene (primer login OAuth o colisión en el trigger). Sin sesión → `/access`.
  - `/profile` — cambiar username y contraseña. Sin sesión → redirige a `/access`. La sección de contraseña solo se muestra a cuentas con identidad `email`.
- **`SessionProvider`** (`app/_components/session-provider.tsx`):
  - Sigue siendo un Client Component. Primer render sin usuario; tras montar lee la sesión con el cliente de navegador (`getUser`) y el perfil, y se suscribe a `onAuthStateChange`.
  - `useSession()` mantiene `user: { name } | null`, `login` y `logout`. Se añade `status: "loading" | "ready"` y `account: { id: string; email: string; username: string | null } | null`.
  - Con cuenta, `user.name` es el username (en mayúsculas). Sin cuenta, el invitado sigue en `av_user`. Con sesión de Supabase el invitado se ignora y **no se borra**; al cerrar sesión vuelve a invitado sin nombre.
  - `logout` cierra sesión de Supabase si hay cuenta y limpia el invitado.
- **`Nav`**: con cuenta, muestra el username enlazado a `/profile` y un botón CERRAR SESIÓN; con invitado conserva su botón actual; sin nadie, «Iniciar Sesión».
- **`app/_actions/scores.ts`** (revisión 1): `submitScore` deja de aceptar el nombre del cliente como identidad.
  - Obtiene el usuario con el cliente de servidor (`auth.getUser()`, que valida el JWT contra Supabase; no `getSession()`). Sin usuario → `{ ok: false, error: "Inicia sesión para guardar tu puntuación." }`.
  - Lee `profiles.username` del usuario. Si es `null` → `{ ok: false, error: "Elige un nombre de usuario para guardar tu puntuación." }`.
  - `player_name` se guarda como ese username en mayúsculas. El parámetro `name` se elimina de la firma (o se ignora); la regex de nombre ya no se aplica a la entrada del cliente.
  - Se mantienen sin cambios: validación del UUID, TTL de 2 h, tope `max_score_per_second`, `UPDATE` condicional de `consumed_at`, liberación de sesión si falla el insert, `updateTag("leaderboard")` y `revalidatePath`.
  - El orden es: comprobar sesión y username **antes** de consumir la sesión de juego, para que un rechazo por falta de cuenta no queme la partida.
  - `startGameSession` no cambia: el invitado puede jugar.
- **`game-player.tsx`**:
  - Con cuenta y username: el nombre del modal de guardado viene precargado con el username y de solo lectura; el cliente ya no envía nombre.
  - Con cuenta sin username: el modal muestra aviso y enlace a `/access/username`, sin botón de guardar.
  - Invitado (o `status: "loading"`): el modal de fin muestra la puntuación, el texto «Inicia sesión o crea una cuenta para guardarla» con enlace a `/access` y el botón «VOLVER AL VAULT»; no hay campo de nombre ni botón de guardar. El invitado no pierde la partida ni el flujo de FIN/SALIR.
- **Tipos**: regenerar `app/_lib/supabase/database.types.ts`.
- **Configuración manual en el dashboard de Supabase** (se documenta en `README.md`, no en el repo con secretos): Site URL, Redirect URLs (`/auth/callback` en local y en producción), «Confirm email» activo, proveedores Google y GitHub con sus Client ID/Secret. Los secretos viven solo en el dashboard.
- Estilos de las pantallas nuevas en `app/globals.css`, reutilizando `.av-auth-wrap`, `.auth-card`, `.field`, `.btn` (usar `/frontend-design`).

**Fuera de alcance (para futuras specs):**

- Rutas protegidas generales o redirecciones globales (solo `/profile` y `/access/username` comprueban sesión).
- «Mis puntuaciones» o historial por cuenta.
- Columna `scores.user_id` (el servidor ya fuerza el nombre; enlazar por id queda para «mis puntuaciones»).
- Guardar la puntuación de un invitado para enviarla tras iniciar sesión.
- Reescribir puntuaciones antiguas al cambiar de username.
- MFA, passkeys, magic link, teléfono.
- Cambio de email, borrado de cuenta, avatar.
- Vincular o desvincular proveedores OAuth.
- SMTP personalizado con Resend, plantillas de correo propias.
- Rate limiting propio (se usa el de Supabase).
- Roles y administración.
- Tests automatizados.

## Modelo de datos

Migración `20261104120000_auth_profiles.sql`:

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text check (username ~ '^[A-Za-z0-9_ ]{1,10}$'),  -- null hasta elegirlo (OAuth)
  created_at timestamptz not null default now()
);

create unique index profiles_username_lower_idx
  on public.profiles (lower(username)) where username is not null;

alter table public.profiles enable row level security;

create policy "profiles lectura pública" on public.profiles for select using (true);
create policy "profiles actualiza el propio" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- Sin política de INSERT/DELETE: el perfil lo crea el trigger y se borra en cascada.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, nullif(new.raw_user_meta_data ->> 'username', ''));
  return new;
exception when unique_violation or check_violation then
  insert into public.profiles (id, username) values (new.id, null);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Notas:

- El username usa la misma regex que el nombre de puntuación (`/^[\p{L}\p{N}_ ]{1,10}$/u`) pero la restricción SQL se limita a ASCII por portabilidad; la validación Unicode completa vive en la Server Action. **El implementador debe alinear ambas** (ver Riesgos). La unicidad es sin distinguir mayúsculas.
- Si el trigger encuentra colisión o valor inválido, crea el perfil con `username = null` y el usuario elige uno en `/access/username`. Nunca bloquea el alta.
- `profiles` es legible públicamente porque el username ya es público en el leaderboard. El email nunca se guarda en `profiles`.

Tipos TypeScript:

```ts
// app/_components/session-provider.tsx
export interface SessionUser { name: string }
export interface SessionAccount { id: string; email: string; username: string | null }

interface SessionContextValue {
  user: SessionUser | null;          // sin cambios de contrato
  account: SessionAccount | null;    // nuevo
  status: "loading" | "ready";       // nuevo
  login: (user: SessionUser) => void;  // solo invitado
  logout: () => Promise<void>;         // cierra Supabase si hay cuenta + limpia invitado
}

// app/access/actions.ts
export type AuthResult = { ok: true } | { ok: false; error: string };
```

Variables de entorno: no se añaden. El origen para `emailRedirectTo`/`redirectTo` se toma de la cabecera `origin` de la petición.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/01-app/` Server Actions, Route Handlers, `redirect`, Cache Components con `cookies()` y `Suspense`. Leer con el MCP de Supabase (`search_docs`) las guías de Auth para Next.js con `@supabase/ssr`, OAuth, `resetPasswordForEmail` y PKCE. Sin cambios de código. Comprobar con `grep` los usos de `useSession`, `login` y `logout` (`nav.tsx`, `game-player.tsx`, `auth-form.tsx`).
2. Migración: mostrar el SQL al usuario y pedir confirmación, aplicar con `apply_migration`, guardar el archivo en `supabase/migrations/`. Verificar con `list_tables`, `get_advisors` (RLS, `search_path` de la función) y `execute_sql`. Regenerar `database.types.ts`.
3. Configuración manual en el dashboard (la hace el usuario, con la guía en `README.md`): Site URL, Redirect URLs, confirmación de correo, Google y GitHub. Sin esto los pasos 5–9 no se pueden probar de extremo a extremo.
4. `app/access/actions.ts` con todas las Server Actions, validación de email, contraseña (mínimo 8) y username, y mensajes genéricos. Reutilizar `NAME_RE` de `scores.ts` si se puede importar sin acoplar; si no, duplicar la regex con un comentario.
5. `app/auth/callback/route.ts` con intercambio de código, saneado de `next` y redirección por username nulo.
6. `SessionProvider`: lectura de sesión y perfil tras montar, `onAuthStateChange`, `account`, `status`, `logout` asíncrono y convivencia con el invitado. Verificar que no hay desajuste de hidratación y que el invitado sigue funcionando.
7. Reescribir `auth-form.tsx` y la página `/access` (con `Suspense` si lee `searchParams`): registro, login, OAuth, aviso de correo, errores. `/access` con sesión activa redirige a `/`.
8. Páginas `/access/forgot`, `/access/reset` y `/access/username`, con sus formularios y estados.
9. Página `/profile` (guarda de sesión en servidor dentro de `Suspense`) con cambio de username y de contraseña.
10. `Nav`: usuario enlazado a `/profile` y CERRAR SESIÓN para cuentas.
11. (Revisión 1) `scores.ts`: `submitScore` exige sesión y username y guarda con el username del perfil, comprobándolo antes de consumir la sesión de juego. `game-player.tsx`: modal de fin según tres estados (cuenta con username, cuenta sin username, invitado). Probar los tres y que un invitado que llama a `submitScore` directamente recibe el error sin consumir la sesión.
12. `README.md`: sección de autenticación (rutas, configuración del dashboard, límites del SMTP por defecto). Actualizar `CLAUDE.md` en las secciones de rutas, `SessionProvider`, «Leaderboard and anti-cheat» y «Session and contact».
13. Pulido: `npx tsc --noEmit`, `npm run lint`, `npm run build` limpios; probar todos los flujos de los criterios; `get_advisors` sin avisos de seguridad nuevos.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores ni advertencias de Cache Components.
- [ ] La migración existe en `supabase/migrations/`, está aplicada, `profiles` tiene RLS activo y `get_advisors` no reporta avisos de seguridad nuevos.
- [ ] Registrarse con email, contraseña (≥ 8) y username válido crea el usuario, muestra «Revisa tu correo» y **no** inicia sesión hasta confirmar.
- [ ] El enlace del correo de confirmación pasa por `/auth/callback`, inicia sesión y deja un perfil con el username elegido.
- [ ] Iniciar sesión sin confirmar el correo falla con un mensaje claro; con credenciales erróneas muestra «Credenciales incorrectas» sin distinguir entre email inexistente y contraseña mala.
- [ ] Un username ya usado (comparado sin mayúsculas) o con caracteres no permitidos se rechaza en el registro con mensaje de campo; el índice único impide duplicados aunque se salte la comprobación previa.
- [ ] Iniciar sesión con email y contraseña correctos deja la sesión activa; recargar la página la mantiene (cookie refrescada por `proxy.ts`).
- [ ] Google y GitHub inician el flujo OAuth y vuelven a la app con sesión. Si el perfil no tiene username, se redirige a `/access/username` y no se puede salir de ahí sin elegir uno válido y único.
- [ ] `/access/forgot` muestra siempre el mismo mensaje exista o no el email; el correo lleva a `/access/reset` con sesión de recuperación y permite fijar una nueva contraseña; entrar a `/access/reset` sin esa sesión muestra el aviso y el enlace a `/access/forgot`.
- [ ] `/profile` sin sesión redirige a `/access`. Con sesión permite cambiar el username (único, mismas reglas) y la contraseña; la sección de contraseña no aparece en cuentas solo-OAuth.
- [ ] `next` en `/auth/callback` solo acepta rutas internas: `?next=https://evil.com` y `?next=//evil.com` redirigen a `/`.
- [ ] El `Nav` muestra el username y CERRAR SESIÓN con cuenta; cerrar sesión borra la sesión de Supabase y el `Nav` vuelve a «Iniciar Sesión»; el invitado conserva su comportamiento actual.
- [ ] «JUGAR COMO INVITADO» sigue funcionando: un invitado juega los cinco juegos, usa SALIR/FIN y ve su puntuación final.
- [ ] El modal de fin de un invitado no tiene campo de nombre ni botón de guardar; muestra el aviso con enlace a `/access` y «VOLVER AL VAULT».
- [ ] Con cuenta y username, el modal muestra el username precargado y de solo lectura, y la puntuación aparece en el leaderboard con ese nombre en mayúsculas.
- [ ] Con cuenta sin username, el modal muestra aviso con enlace a `/access/username` y no permite guardar.
- [ ] Llamar a `submitScore` sin sesión (sin cookie) devuelve `{ ok: false }` con el mensaje de inicio de sesión, no inserta fila en `scores` y **no** marca `consumed_at` de la sesión de juego (verificado con `execute_sql`).
- [ ] Llamar a `submitScore` con sesión pero enviando otro nombre guarda el username de la cuenta, no el enviado.
- [ ] Tras guardar, `updateTag("leaderboard")` y las `revalidatePath` siguen funcionando: `/hall`, `/games` y `/games/<id>` muestran la nueva puntuación.
- [ ] Primer render sin desajuste de hidratación (sin avisos en consola) con y sin sesión.
- [ ] Ningún mensaje de error ni respuesta de las Server Actions filtra claves, contraseñas ni detalles internos de Supabase.
- [ ] `leaderboard.ts`, las migraciones previas y los motores de `app/_games/` no cambian; en `scores.ts` solo cambia lo descrito en la revisión 1.
- [ ] `README.md` documenta la configuración del dashboard y `CLAUDE.md` refleja las rutas y el `SessionProvider` nuevos. Ningún archivo versionado contiene secretos de Google, GitHub ni claves de Supabase.

## Decisiones tomadas y descartadas

- **Sí:** Supabase Auth con email + contraseña y OAuth Google/GitHub en una sola spec (decisión del usuario, que prefirió no dividir pese a la advertencia de tamaño). **No:** dividir en dos specs ni usar magic link.
- **Sí:** confirmación de correo obligatoria. El usuario priorizó seguridad. **No:** entrada directa sin confirmar.
- **Sí:** SMTP por defecto de Supabase. Vale para desarrollo; su límite de envíos y de destinatarios se documenta como riesgo. **No:** Resend como SMTP personalizado (fuera de alcance, requiere dominio verificado).
- **Sí:** tabla `profiles` con username único insensible a mayúsculas y trigger tolerante a colisiones. **No:** guardar el username solo en `user_metadata` (no se puede consultar ni garantizar unicidad).
- **Sí:** username elegido por el usuario; en OAuth, pantalla obligatoria `/access/username`. **No:** derivarlo del email ni autogenerarlo.
- **Sí (revisión 1):** solo cuentas con username guardan puntuaciones, y se exige en **servidor** (`submitScore`) además de en la UI; si solo fuera UI, cualquiera podría llamar a la Server Action. El invitado sigue jugando. **No:** bloquear el juego a invitados, ni dejar el guardado abierto con nombre libre. Sustituye a la decisión inicial de mantener `scores.ts` intacto.
- **Sí (revisión 1):** `player_name` sale del perfil en servidor, no del cliente. Así nadie suplanta un nombre ajeno. **No:** añadir `scores.user_id` ahora (queda para «mis puntuaciones»).
- **Sí (revisión 1):** comprobar cuenta y username antes de consumir la sesión de juego. **No:** consumirla primero, que quemaría la partida de quien aún no ha iniciado sesión.
- **No (revisión 1):** guardar en `localStorage` la puntuación de un invitado para enviarla tras registrarse. La regla CLAUDE.md prohíbe puntuaciones vía `localStorage`, y la sesión de juego caduca a las 2 h.
- **Sí:** `useSession` conserva `user.name` y añade `account` y `status`. Así `Nav` y `game-player.tsx` apenas cambian. **No:** reemplazar el contrato.
- **Sí:** Server Actions para las operaciones de auth (cookies en servidor, mismo patrón que `scores.ts` y `sendContactMessage`) y un Route Handler solo para el callback. **No:** llamar a `auth.*` desde el navegador salvo la lectura de sesión en `SessionProvider`.
- **Sí:** el invitado se ignora (no se borra) mientras hay sesión de Supabase. **No:** borrarlo al iniciar sesión.
- **Sí:** rutas bajo `/access` más `/auth/callback` (handler, sin UI) y `/profile`. **No:** `/login` y `/register`, que romperían `/access`.
- **Sí:** solo `/profile` y `/access/username` comprueban sesión. **No:** rutas protegidas globales: nada más lo necesita.
- **Sí:** mensajes de error genéricos para no permitir enumerar cuentas. **No:** distinguir «email no registrado».
- **Sí:** cambiar de username no reescribe puntuaciones antiguas, que conservan el nombre con el que se guardaron. **No:** migrar `scores.player_name`.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| SMTP por defecto de Supabase: pocos correos por hora y, en proyectos nuevos, solo a miembros del equipo | Documentarlo en `README.md`; si bloquea las pruebas, nueva spec con Resend como SMTP. |
| Fuga de datos de cuentas por enumeración (registro, recuperación) | Mensajes genéricos y misma respuesta exista o no el email. |
| Open redirect en `next` del callback | Aceptar solo rutas que empiecen por `/` y no por `//`; probado en criterios. |
| (Revisión 1) El invitado termina una partida larga y pierde la puntuación al no poder guardarla | El modal lo avisa con enlace a `/access`; sin guardado diferido (fuera de alcance). Se aceptan perder esa partida. |
| (Revisión 1) `submitScore` llama a `auth.getUser()` y lee `profiles`: dos consultas más por guardado | Una vez por partida, coste despreciable; usar el cliente de servidor con cookies, no el de `use cache`. |
| (Revisión 1) Una cuenta cambia de username entre `startGameSession` y `submitScore` | Se guarda el username vigente en el momento de enviar; no es un problema de seguridad. |
| (Revisión 1) El cambio rompe el flujo de guardado actual de los cinco juegos | Probar guardado con cuenta en los cinco juegos y el rechazo como invitado antes de cerrar. |
| Regex del username distinta en SQL (ASCII) y en servidor (Unicode) rechaza o acepta nombres de forma inconsistente | Usar una sola regla; si se mantiene Unicode, quitar el `check` ASCII de SQL y validar solo en la acción, o ampliarlo a `\p{L}` con una regex compatible con Postgres. Decidir en el paso 2 y reflejarlo en la migración. |
| Trigger con `security definer` mal configurado permite escalado | `set search_path = ''`, nombres calificados, `get_advisors` tras migrar. |
| `cookies()` en Server Actions y páginas con Cache Components rompe el render estático | Leer las sesiones solo en acciones, el callback y componentes dentro de `Suspense`; el resto de rutas siguen estáticas. |
| `SessionProvider` provoca desajuste de hidratación o parpadeo del `Nav` | Primer render sin usuario, lectura tras montar y `status` para evitar mostrar «Iniciar Sesión» mientras carga. |
| OAuth no se puede probar sin configurar Google Cloud y GitHub | El paso 3 lo hace el usuario; los criterios de OAuth se marcan al terminar esa configuración. |
| Nueva contraseña por `/access/reset` sin sesión de recuperación válida | La página comprueba la sesión y, si falta, muestra aviso y enlace a `/access/forgot`. |
| `proxy.ts` no refresca bien la sesión tras cambios de cookies en acciones | Probar recarga tras login, logout y cambio de contraseña. |
| Una cuenta OAuth y una de email con el mismo correo se enlazan o duplican según la configuración de Supabase | Revisar el ajuste de vinculación automática de identidades en el dashboard y anotar el comportamiento. |

## Lo que **no** está en esta spec

- Rutas protegidas globales y roles.
- `scores.user_id` y «mis puntuaciones».
- Guardado diferido de la puntuación de un invitado.
- MFA, passkeys, magic link, cambio de email, borrado de cuenta, avatar.
- Vincular o desvincular proveedores.
- SMTP con Resend y plantillas de correo propias.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
