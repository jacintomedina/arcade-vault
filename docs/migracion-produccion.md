# Migración de Supabase dev → producción

Claude solo tiene acceso al proyecto **dev** (MCP). Todo lo de esta guía que toca **producción** lo ejecutas tú, desde tu terminal y los dashboards. Ninguna credencial de prod debe pasar por el chat con Claude ni guardarse en el repo.

Decisión tomada: prod arranca **limpia**. Se migra estructura, políticas, triggers y el catálogo `games`. No se copian usuarios, perfiles, puntuaciones ni sesiones de dev.

## Qué se migra

| Qué | Cómo |
| --- | --- |
| Tablas `games`, `game_sessions`, `scores`, `profiles`, vista `leaderboard`, RLS, políticas, trigger `on_auth_user_created`, `revoke`s, índices | 11 migraciones de `supabase/migrations/` |
| Catálogo `games` (5 filas con `max_score_per_second`) | Las propias migraciones lo insertan |
| Configuración de Auth, SMTP, proveedores OAuth | A mano en el dashboard de prod (sección C) |
| Variables de entorno de la app | A mano en Vercel (sección D) |
| Usuarios, perfiles, scores, sesiones | **No se migran** |

## A. Aislamiento (antes de nada)

- [ ] Crea el proyecto de prod en una **organización de Supabase distinta** a la de dev (o muévelo a una). El token del MCP es de cuenta/organización: el `project_ref` de `.mcp.json` solo filtra. Con orgs separadas, Claude no puede llegar a prod aunque se configure mal.
- [ ] Al autorizar el MCP de Supabase, autoriza solo la organización de dev.
- [ ] `.mcp.json` apunta siempre al `project_ref` de dev. Nunca pongas el de prod.
- [ ] No crees `.env.production*` dentro del repo. Las claves de prod viven en el dashboard de Supabase, en Vercel y en tu gestor de contraseñas.
- [ ] `.claude/settings.json` ya bloquea a Claude `supabase link/db push/db reset/db dump`, `vercel env` y la lectura de `.env.prod*`. Es una segunda barrera, no la primera.

## B. Esquema (desde tu terminal)

1. En el dashboard de prod: **Connect** → cadena **Session pooler** (tipo URI). Sustituye `[YOUR-PASSWORD]` por la **contraseña de la base de datos Postgres** de prod: la que elegiste al crear el proyecto. No es la de tu cuenta de Supabase ni ninguna API key. Si no la recuerdas, pulsa **Reset database password** en esa misma pantalla y guarda la nueva en tu gestor de contraseñas. Si tiene caracteres especiales (`@`, `#`, `/`, `:`, `%`), codifícalos con porcentaje en la URL; una contraseña solo con letras y números lo evita. Guarda la cadena completa en una variable solo de tu shell, sin escribirla en ficheros:

   ```bash
   read -s PROD_DB_URL   # pega la cadena completa y pulsa Enter
   ```

2. Simulación. Debe listar las 11 migraciones:

   ```bash
   npx supabase db push --db-url "$PROD_DB_URL" --dry-run
   ```

3. Aplicar:

   ```bash
   npx supabase db push --db-url "$PROD_DB_URL"
   ```

   Si la CLI pide `supabase/config.toml`, ejecuta antes `npx supabase init` y versiona el fichero.

4. Alternativa sin CLI (no recomendada, no deja registro en `schema_migrations`): pegar cada `.sql` en el SQL Editor de prod, en orden de nombre de fichero.
5. Pega `supabase/verify-prod.sql` en el SQL Editor de prod y compara cada bloque con el resultado esperado que lleva en comentario.
6. Dashboard de prod → **Advisors** (Security y Performance). Solo deben quedar dos avisos, ambos aceptados:
   - `rls_enabled_no_policy` en `game_sessions`.
   - `auth_leaked_password_protection` (requiere plan Pro).

Nota: la migración `20261104110000_revoke_rls_auto_enable.sql` ahora comprueba que exista `rls_auto_enable()` antes de hacer el `revoke`, para no fallar en un proyecto que no la tenga.

## C. Auth y correo (dashboard de prod)

- [ ] **Authentication → URL Configuration**: Site URL `https://<tu-dominio>`. Redirect URLs: `https://<tu-dominio>/auth/callback`. Sin `localhost`.
- [ ] **Sign In / Providers → Email**: «Confirm email» activado, «Minimum password length» = `8`, «Password Requirements» = minúsculas, mayúsculas, dígitos y símbolos.
- [ ] **Rate Limits**: sign-ups y sign-ins ≈ `10` por hora y por IP.
- [ ] «Allow manual linking» **desactivado**.
- [ ] **SMTP propio** (bloqueante). El SMTP integrado solo envía a miembros del equipo en proyectos nuevos y con límites bajos; sin esto nadie podrá confirmar su cuenta. Con Resend y dominio verificado: host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña = API key de Resend de prod, remitente del dominio verificado.
- [ ] **Email templates**: si en dev personalizaste alguna plantilla (confirmación, recuperación), cópiala a mano; no viaja con las migraciones.
- [ ] **Google**: crea un cliente OAuth «Web» propio para prod en Google Cloud. URI de redirección autorizada: `https://<prod_ref>.supabase.co/auth/v1/callback`. Pega Client ID y Secret en Supabase prod.
- [ ] **GitHub**: crea una OAuth App propia para prod (solo admite una callback). «Authorization callback URL»: `https://<prod_ref>.supabase.co/auth/v1/callback`. Pega Client ID y Secret en Supabase prod.
- [ ] **Settings → API**: el esquema `public` está expuesto en la Data API.

## D. Variables de entorno de la app

Ejemplo con Vercel: **Project Settings → Environment Variables**, scope **Production**. En otro hosting, mismas variables con el mismo criterio.

| Variable | Valor en prod |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto prod |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clave publicable de prod |
| `SUPABASE_SERVICE_ROLE_KEY` | clave `service_role` de prod (o la secret key `sb_secret_...` si el dashboard ya no muestra la legacy). Solo servidor |
| `SITE_URL` | `https://<tu-dominio>`, sin barra final. Obligatoria fuera de development |
| `IP_HASH_SALT` | nueva: `openssl rand -hex 32`. No reutilices la de dev |
| `RESEND_API_KEY` | clave de Resend de prod |
| `CONTACT_FROM_EMAIL` | dirección del dominio verificado en Resend |

- `SUPABASE_DB_PASSWORD` no lo lee el código: **no** va a Vercel.
- Scope **Preview** y **Development**: apuntan a dev, nunca a prod.
- Ninguna de estas variables lleva prefijo `NEXT_PUBLIC_` salvo las dos primeras.

## E. Migraciones futuras

1. Claude escribe la migración y la aplica en dev con el MCP, como hasta ahora.
2. Al desplegar, tú ejecutas `npx supabase db push --db-url "$PROD_DB_URL" --dry-run` y, si todo cuadra, sin `--dry-run`.
3. Pasa `supabase/verify-prod.sql` y revisa Advisors.

## F. Verificación final

- [ ] `verify-prod.sql`: todo coincide con lo esperado.
- [ ] Drift dev ↔ prod (en tu máquina, fuera del repo):

  ```bash
  npx supabase db dump --db-url "<cadena dev>" --schema public -f /tmp/dev.sql
  npx supabase db dump --db-url "$PROD_DB_URL" --schema public -f /tmp/prod.sql
  diff /tmp/dev.sql /tmp/prod.sql
  ```

  Si hay diferencias, en dev se aplicó algo sin fichero de migración: conviértelo en migración y vuelve a la sección B.
- [ ] `curl https://<tu-dominio>/api/health/supabase` → `200 {"ok":true}`.
- [ ] `curl -I https://<tu-dominio>/` muestra `nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] Humo manual: registro con email (llega el correo), login con Google y GitHub, elegir username, jugar y guardar una puntuación, verla en `/hall`, enviar el formulario de `/about`.
