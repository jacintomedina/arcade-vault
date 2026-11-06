## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

Juegos disponibles: Asteroides, Tetris, Arkanoid y Snake, con leaderboard real por juego.

Rutas: `/` (landing), `/games` (biblioteca), `/games/[id]` (ficha), `/games/[id]/play` (jugar), `/hall` (Salón de la Fama), `/about` (acerca de y contacto), `/access` (iniciar sesión, crear cuenta o jugar como invitado), `/access/forgot`, `/access/reset`, `/access/username` y `/profile`.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No test runner configured.

## Supabase

Variables de entorno (copiar `.env.template` a `.env.local` y rellenar; `.env.local` no se versiona):

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — clave publicable.
- `SUPABASE_SERVICE_ROLE_KEY` — clave `service_role`. Solo servidor, sin prefijo `NEXT_PUBLIC_`. Omite RLS: no la expongas al cliente.
- `SUPABASE_DB_PASSWORD` — contraseña de la base de datos. Solo servidor, sin prefijo `NEXT_PUBLIC_`.
- `RESEND_API_KEY` y `CONTACT_FROM_EMAIL` — envío del formulario de contacto. Solo servidor.

Clientes en `app/_lib/supabase/` (`client.ts` navegador, `server.ts` servidor, `admin.ts` `service_role`, `proxy.ts` refresco de sesión). `proxy.ts` en la raíz refresca la sesión en cada petición.

Esquema: tablas `games`, `game_sessions`, `scores` y `profiles`, más la vista `leaderboard` (top 10 por juego). Las puntuaciones solo entran por los Server Actions `startGameSession` y `submitScore` de `app/_actions/scores.ts`, que validan la sesión y el tope `max_score_per_second` del juego. `submitScore` exige una cuenta con username y guarda con ese nombre.

Migraciones: archivos SQL en `supabase/migrations/`, aplicadas al proyecto remoto con el MCP de Supabase (`apply_migration`). Configuración del MCP en `.mcp.json`, a partir de `.mcp.json.example` con tu `project_ref` (`.mcp.json` no se versiona).

Diagnóstico: `GET /api/health/supabase` devuelve `200 { "ok": true }` si Supabase es alcanzable, o `503 { "ok": false, "error": "..." }`.

## Autenticación

Supabase Auth con email + contraseña (confirmación de correo obligatoria), Google y GitHub. Jugar no requiere cuenta; **guardar una puntuación sí** y se guarda siempre con el username de la cuenta.

Rutas:

- `/access` — iniciar sesión, crear cuenta, Google, GitHub y «Jugar como invitado». Con sesión activa redirige a `/`.
- `/access/forgot` — pide el enlace de recuperación (misma respuesta exista o no el email).
- `/access/reset` — nueva contraseña; necesita la sesión que crea el enlace del correo.
- `/access/username` — elegir username cuando el perfil no lo tiene (primer login con Google/GitHub).
- `/profile` — cambiar username y contraseña (la contraseña solo en cuentas con email).
- `/auth/callback` — Route Handler que intercambia el `code` por la sesión (confirmación, OAuth y recuperación). `next` solo acepta rutas internas.

El username es único sin distinguir mayúsculas, de 1 a 10 caracteres ASCII (`A-Z`, `a-z`, `0-9`, `_` y espacio).

### Configuración en el dashboard de Supabase

Se hace a mano; los secretos viven solo en el dashboard, nunca en el repo.

1. **Authentication → URL Configuration**: Site URL (`http://localhost:3000` en local, el dominio en producción) y en Redirect URLs `http://localhost:3000/auth/callback` y `https://<tu-dominio>/auth/callback`. Para probar desde el móvil, añade también la IP de la red local.
2. **Authentication → Sign In / Providers → Email**: activar «Confirm email».
3. **Google**: crear un cliente OAuth (Web) en Google Cloud con la URI de redirección `https://<project_ref>.supabase.co/auth/v1/callback`; pegar Client ID y Secret en Supabase.
4. **GitHub**: crear una OAuth App con esa misma URL como «Authorization callback URL»; pegar Client ID y Secret en Supabase.
5. «Allow manual linking» queda desactivado: la app no vincula proveedores a mano.

### Límites del SMTP por defecto

Los correos (confirmación y recuperación) salen del SMTP integrado de Supabase, pensado para desarrollo: pocos envíos por hora y, en proyectos nuevos, solo a miembros del equipo del proyecto. Si bloquea las pruebas o la producción, configura un SMTP propio (por ejemplo Resend) en una spec aparte.

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```

Skill del proyecto: `/add-game` (`.claude/skills/add-game/`). Convierte un juego de `references/started-games/` —o uno nuevo— en un juego real de la plataforma: primero la spec, y tras la aprobación el motor en `app/_games/<id>/`, el componente cliente, el registro en `REAL_GAMES`, la migración de Supabase y el leaderboard.
