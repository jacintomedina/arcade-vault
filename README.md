## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

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

Variables de entorno (copiar `.env.example` a `.env.local` y rellenar; `.env.local` no se versiona):

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — clave publicable.
- `SUPABASE_DB_PASSWORD` — contraseña de la base de datos. Solo servidor, sin prefijo `NEXT_PUBLIC_`.

Clientes en `app/_lib/supabase/` (`client.ts` navegador, `server.ts` servidor). `proxy.ts` refresca la sesión.

Migraciones: archivos SQL en `supabase/migrations/`, aplicadas al proyecto remoto con el MCP de Supabase (`apply_migration`).

Diagnóstico: `GET /api/health/supabase` devuelve `200 { "ok": true }` si Supabase es alcanzable, o `503 { "ok": false, "error": "..." }`.

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```
