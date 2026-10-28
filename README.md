## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

Juegos disponibles: Asteroides, Tetris, Arkanoid y Snake, con leaderboard real por juego.

Rutas: `/` (landing), `/games` (biblioteca), `/games/[id]` (ficha), `/games/[id]/play` (jugar), `/hall` (Salón de la Fama), `/about` (acerca de y contacto), `/access` (acceso como invitado).

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

Esquema: tablas `games`, `game_sessions` y `scores`, más la vista `leaderboard` (top 10 por juego). Las puntuaciones solo entran por los Server Actions `startGameSession` y `submitScore` de `app/_actions/scores.ts`, que validan la sesión y el tope `max_score_per_second` del juego.

Migraciones: archivos SQL en `supabase/migrations/`, aplicadas al proyecto remoto con el MCP de Supabase (`apply_migration`). Configuración del MCP en `.mcp.json`, a partir de `.mcp.json.example` con tu `project_ref` (`.mcp.json` no se versiona).

Diagnóstico: `GET /api/health/supabase` devuelve `200 { "ok": true }` si Supabase es alcanzable, o `503 { "ok": false, "error": "..." }`.

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```

Skill del proyecto: `/add-game` (`.claude/skills/add-game/`). Convierte un juego de `references/started-games/` —o uno nuevo— en un juego real de la plataforma: primero la spec, y tras la aprobación el motor en `app/_games/<id>/`, el componente cliente, el registro en `REAL_GAMES`, la migración de Supabase y el leaderboard.
