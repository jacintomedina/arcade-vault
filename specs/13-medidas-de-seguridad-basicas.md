# SPEC 13 — Medidas de seguridad básicas: headers HTTP, contraseña fuerte, Auth endurecido y verificación de RLS

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 06, SPEC 12
> **Fecha:** 2026-11-06
> **Revisión 1:** 2026-11-06 — la contraseña debe cumplir una regex (minúscula, mayúscula, dígito, símbolo y mínimo 8) validada en servidor, con checklist en vivo y mensaje de error en la UI.
> **Objetivo:** Aplicar el checklist de `references/security/security-checklist.md` (RLS verificado, contraseña fuerte de mínimo 8 con mensajes de error en la UI, límite de registros por IP, headers de seguridad en Next.js y revisión de avisos de Supabase) y dejar documentado lo que no se puede aplicar en el plan Free.

## Por qué existe esta spec

SPEC 12 dejó autenticación real y un leaderboard con cuentas. Antes de publicar conviene cerrar los mínimos de seguridad del checklist. Parte se hace en código (`next.config.ts`) y parte solo en el dashboard de Supabase, donde el MCP no llega: la configuración de Auth (longitud de contraseña, protección de contraseñas filtradas, límites de tasa) no se expone por herramienta ni por migración.

Estado de partida, comprobado el 2026-11-06 con `execute_sql` y `get_advisors`:

- RLS ya está activo en `games`, `scores`, `profiles` y `game_sessions`.
  - `games` y `scores`: política de lectura pública (`SELECT`); sin políticas de escritura.
  - `game_sessions`: RLS activo y **sin políticas** a propósito. Solo la usa el service role (`admin.ts`), que ignora RLS.
- `get_advisors` (seguridad) reporta dos avisos: `rls_enabled_no_policy` (INFO, `game_sessions`) y `auth_leaked_password_protection` (WARN).
- `next.config.ts` no define `headers`.
- `signUp` y `updatePassword` (`app/access/actions.ts`) solo exigen una longitud de 8 a 72 caracteres (`validPassword`, `ERR_PASSWORD`). No hay requisitos de composición. Falta imponer la política también en Supabase Auth, que es la barrera real.
- Los formularios con campo de contraseña son `app/_components/auth-form.tsx` (registro e inicio de sesión) y `app/_components/password-form.tsx` (usado en `/access/reset` y `/profile`).

Decisiones ya cerradas por el usuario:

- Plan de Supabase **Free**: la protección de contraseñas filtradas (HaveIBeenPwned) exige plan Pro, así que queda aplazada y documentada.
- Headers: los tres del checklist más `Strict-Transport-Security` y `Permissions-Policy`. **Sin CSP.**
- `game_sessions` se queda sin políticas y se documenta como intencional.
- Límite de registros: unos 10 por hora y por IP.
- (Revisión 1) Contraseña fuerte: al menos una minúscula, una mayúscula, un dígito y un símbolo, con mínimo 8 caracteres. Aplica a registro, restablecimiento y cambio de contraseña en `/profile`. **No** al inicio de sesión (las cuentas existentes deben poder entrar).
- (Revisión 1) UI: checklist en vivo bajo el campo más mensaje de error de campo al enviar sin cumplirlos. La Server Action sigue validando.
- (Revisión 1) Se refleja la misma política en Supabase Auth (Password Requirements) como ajuste manual.

## Alcance

**Dentro:**

- **Headers de seguridad** en `next.config.ts` mediante `headers()`, para `source: "/(.*)"`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains` (sin `preload`). Los navegadores lo ignoran en `http://localhost`, así que no afecta al desarrollo.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`. No se bloquean más capacidades (por ejemplo `vibrate`) para no romper el gamepad táctil.
  - Los headers se definen en una constante `securityHeaders` tipada y no tocan las demás claves de la config (`cacheComponents`, `turbopack`, `allowedDevOrigins`, etc.).
- **Contraseña fuerte** (revisión 1):
  - Módulo nuevo `app/_lib/password.ts`, sin `"use server"` y sin tocar `document`/`window`, importable desde Server Actions y Client Components. Exporta la regex, las constantes y una función `passwordChecks(password)`.
  - Regex única, todo ASCII para que coincida con el conjunto de Supabase: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]).{8,72}$/`. El máximo de 72 se mantiene (límite de bcrypt).
  - `app/access/actions.ts`: `validPassword` pasa a usar la regex compartida y `ERR_PASSWORD` se reescribe con los requisitos. Aplica a `signUp` y `updatePassword`. `signIn` **no** cambia.
  - `auth-form.tsx` (solo pestaña CREAR CUENTA) y `password-form.tsx`: checklist en vivo bajo el campo con cinco requisitos (8+ caracteres, minúscula, mayúscula, dígito, símbolo), cada uno marcado como cumplido o pendiente mientras se escribe. Al enviar sin cumplirlos se muestra el error de campo (`field: "password"`) con el mensaje de la Server Action. El checklist aparece al enfocar o escribir y es accesible (`aria-live="polite"`, estado no solo por color). Estilos en `app/globals.css` reutilizando `.field`; usar `/frontend-design`.
  - Los mensajes de error siguen en español y sin filtrar detalles internos de Supabase. Si Supabase rechaza por política (`weak_password`), se traduce al mismo mensaje de requisitos.
- **Verificación de RLS** (solo lectura, sin migración): `execute_sql` sobre `pg_class` y `pg_policies` para confirmar RLS activo en las cuatro tablas y que ninguna tiene políticas de `INSERT`, `UPDATE` o `DELETE` abiertas al rol `anon` o `authenticated`, salvo `profiles` (`UPDATE` del propio perfil, SPEC 12). Prueba negativa: con la clave pública, un `insert` en `scores` y en `games` falla.
- **Configuración manual en el dashboard de Supabase** (la hace el usuario; se documenta en `README.md`):
  - Authentication → Sign In / Providers → Email: **Minimum password length = 8** y **Password Requirements = lowercase, uppercase letters, digits and symbols** (revisión 1).
  - Authentication → Rate Limits: bajar «Sign-ups and sign-ins» (por hora y por IP) a unos **10**.
  - Authentication → Attack Protection → **Leaked password protection**: no disponible en Free. Se documenta como pendiente para cuando el proyecto pase a Pro. Hasta entonces el warning `auth_leaked_password_protection` se acepta.
- **Documentación**: sección «Seguridad» en `README.md` (headers, ajustes manuales de Auth, motivo por el que `game_sessions` no tiene políticas, aviso aceptado de contraseñas filtradas) y actualización de `CLAUDE.md` en «Config and styling» (headers de seguridad en `next.config.ts`) y «Supabase» (nota de `game_sessions`).
- **Checklist**: marcar en `references/security/security-checklist.md` lo hecho y anotar lo aplazado.
- Protección de rutas con Proxy Next.js. Información sobre proxy aquí: https://nextjs.org/docs/app/getting-started/proxy

Ejemplo: proxy.ts

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}

// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }

export const config = {
  matcher: '/about/:path*',
}
```

**Fuera de alcance (para futuras specs):**

- Content-Security-Policy (exige nonces o `proxy.ts`, fuentes de Google, Supabase y canvas; riesgo alto de romper juegos).
- Protección de contraseñas filtradas (requiere plan Pro).
- HSTS con `preload` y registro en la lista de preload.
- Rate limiting propio en Server Actions (`submitScore`, `sendContactMessage`) o CAPTCHA (Turnstile, hCaptcha) en el registro.
- Política `deny-all` explícita en `game_sessions`.
- Migraciones SQL y cambios de esquema.
- SMTP propio, MFA, auditoría de dependencias, tests automatizados.
- Cambios en el código de auth distintos de la validación de contraseña, scores o juegos.
- Validar la contraseña en el inicio de sesión, medidor de fuerza (zxcvbn) y bloqueo de contraseñas comunes por lista propia.
- Forzar el cambio de contraseña a cuentas existentes.

## Modelo de datos

Sin tablas, columnas, políticas ni tipos nuevos. No hay migración y `database.types.ts` no se regenera.

Estructuras nuevas:

```ts
// app/_lib/password.ts (revisión 1)
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]).{8,72}$/;
export interface PasswordChecks { length: boolean; lower: boolean; upper: boolean; digit: boolean; symbol: boolean }
export function passwordChecks(password: string): PasswordChecks;
export function isStrongPassword(password: string): boolean; // equivale a PASSWORD_RE.test
```

Y en `next.config.ts`:

```ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
// headers: async () => [{ source: "/(.*)", headers: securityHeaders }]
```

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/01-app/` la guía de `headers` en `next.config.ts` y comprobar que sigue vigente en Next 16.4 con `cacheComponents` y `proxy.ts`. Con `grep`, confirmar que ningún código usa `<iframe>`, cámara, micrófono ni geolocalización. Sin cambios de código.
2. Verificar RLS con `execute_sql` (estado por tabla y políticas por rol) y repetir `get_advisors`. Anotar el resultado. Sin cambios en la base de datos.
3. `next.config.ts`: añadir `securityHeaders` y `headers()` sin alterar el resto de la configuración. Con `npm run dev`, comprobar con `curl -I http://localhost:3000/`, `/games`, `/access` y `/api/health/supabase` que las cinco cabeceras llegan.
4. Prueba funcional en navegador manual (el usuario; no usar Playwright sin pedirlo): landing, login, un juego completo con guardado de puntuación y formulario de contacto siguen funcionando con los headers activos.
5. (Revisión 1) Contraseña fuerte: crear `app/_lib/password.ts`; usarlo en `signUp` y `updatePassword` de `app/access/actions.ts` (con `signIn` intacto) y en `auth-form.tsx` y `password-form.tsx` con checklist en vivo y error de campo. Probar registro, `/access/reset` y `/profile` con contraseñas que incumplan cada requisito por separado y con una válida.
6. Configuración manual en el dashboard (la hace el usuario con la guía de `README.md`): longitud mínima 8, Password Requirements (minúscula, mayúscula, dígitos y símbolos) y límite de registros a ~10/hora. Confirmar visualmente y probar que una contraseña de 7 caracteres es rechazada por Supabase aunque se llame a `auth.signUp` sin pasar por la Server Action.
7. Documentación: sección «Seguridad» en `README.md`, ajustes en `CLAUDE.md` y checklist actualizado (hecho / aplazado por plan).
8. Pulido: `npx tsc --noEmit`, `npm run lint` y `npm run build` limpios; `get_advisors` final con solo los dos avisos aceptados.
9. Protección de rutas con Proxy Next.js

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores ni advertencias de Cache Components.
- [ ] `curl -I` a `/`, `/games`, `/access` y `/api/health/supabase` devuelve las cinco cabeceras con los valores indicados.
- [ ] `execute_sql` confirma RLS activo en `games`, `scores`, `profiles` y `game_sessions`, y que no existen políticas de escritura salvo `profiles` (`UPDATE` del propio perfil).
- [ ] Con la clave pública (`anon`), un `insert` en `scores` y en `games` es rechazado por RLS.
- [ ] En el dashboard, la longitud mínima de contraseña es 8, Password Requirements exige minúscula, mayúscula, dígitos y símbolos, y una contraseña de 7 caracteres o sin alguno de esos tipos es rechazada por Supabase Auth aunque se llame a `auth.signUp` sin pasar por la Server Action.
- [ ] (Rev. 1) `signUp` rechaza con `field: "password"` y mensaje en español una contraseña que incumpla cualquiera de estos requisitos, probado uno por uno: menos de 8 caracteres, sin minúscula, sin mayúscula, sin dígito, sin símbolo. `Abcdef1!` es aceptada.
- [ ] (Rev. 1) `updatePassword` aplica la misma regla en `/access/reset` y `/profile`.
- [ ] (Rev. 1) `signIn` no valida composición: una cuenta existente con contraseña antigua y débil sigue pudiendo entrar.
- [ ] (Rev. 1) En CREAR CUENTA, `/access/reset` y `/profile` aparece el checklist con cinco requisitos que se marcan en vivo al escribir; al enviar sin cumplirlos se ve el mensaje de error bajo el campo y no se llama a Supabase. El estado de cada requisito no depende solo del color y no hay avisos de hidratación en consola.
- [ ] (Rev. 1) La regex vive solo en `app/_lib/password.ts`; servidor y cliente la importan, sin duplicados.
- [ ] El límite de registros e inicios de sesión por IP está en ~10/hora.
- [ ] `get_advisors` (seguridad) reporta únicamente `rls_enabled_no_policy` de `game_sessions` y `auth_leaked_password_protection`, ambos documentados como aceptados.
- [ ] Landing, login, un juego completo con guardado de puntuación y el formulario de contacto funcionan con los headers activos y sin errores en consola.
- [ ] `README.md` tiene la sección «Seguridad» y `CLAUDE.md` refleja los headers y la nota de `game_sessions`.
- [ ] `references/security/security-checklist.md` marca los puntos hechos y anota que leaked password protection queda aplazado por el plan Free.
- [ ] Ningún archivo versionado contiene claves ni secretos.

## Decisiones tomadas y descartadas

- **Sí:** tres ajustes de Auth solo por dashboard, guiados desde `README.md`. **No:** intentar automatizarlos con el MCP o migraciones, que no los exponen.
- **Sí:** aplazar la protección de contraseñas filtradas por el plan Free y aceptar el warning. **No:** subir de plan solo por esto, ni fingir que está resuelto.
- **Sí:** headers del checklist más HSTS y Permissions-Policy. Son de bajo riesgo y no rompen nada. **No:** CSP, porque con Next 16, `next/font/google`, Supabase y canvas exige nonces y puede romper los juegos; merece su propia spec.
- **Sí:** HSTS sin `preload`. Entrar en la lista de preload es casi irreversible. **No:** `preload` hasta tener dominio de producción estable.
- **Sí:** `Permissions-Policy` solo con cámara, micrófono y geolocalización, que la app no usa. **No:** bloquear `vibrate` u otras capacidades que el gamepad táctil pudiera usar.
- **Sí:** `game_sessions` queda sin políticas (deny-all implícito, solo service role). **No:** crear una política `using (false)` solo para silenciar el aviso INFO.
- **Sí:** límite de ~10 registros/hora por IP. Frena bots sin penalizar redes compartidas. **No:** 5/hora, que arriesga bloquear colegios u oficinas.
- **Sí:** la política de contraseña se impone en Supabase (barrera real) además de en la Server Action. **No:** depender solo de la validación del cliente o del servidor de Next.
- **Sí (revisión 1):** regex única en `app/_lib/password.ts`, compartida por Server Actions y UI. **No:** duplicarla en cada formulario, que acabaría desincronizada. Un archivo `"use server"` solo exporta funciones async, así que no sirve para compartirla.
- **Sí (revisión 1):** regex ASCII con el mismo conjunto de símbolos que Supabase. **No:** `\p{L}`/`\p{Lu}` ni «cualquier carácter no alfanumérico», porque una contraseña aceptada por la app podría ser rechazada por Supabase y dar un error confuso.
- **Sí (revisión 1):** la regla aplica a registro, restablecimiento y cambio en `/profile`. **No:** solo al registro, porque se esquivaría cambiando la contraseña después.
- **Sí (revisión 1):** `signIn` no valida composición. **No:** exigirla al entrar, que bloquearía a cuentas anteriores a esta spec.
- **Sí (revisión 1):** checklist en vivo y error al enviar. **No:** solo mensaje tras enviar, que obliga a adivinar qué falta.
- **Sí (revisión 1):** validar siempre en servidor; el checklist del cliente es solo ayuda de UX.
- **Sí:** verificación de RLS solo lectura, sin migración. **No:** reescribir políticas que ya cumplen.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| `X-Frame-Options: DENY` rompe un embebido futuro o un preview que use iframe | `grep` previo confirma que no hay iframes; si aparece uno, se relaja a `SAMEORIGIN` en otra spec. |
| HSTS fuerza HTTPS en el dominio durante dos años; un error de certificado deja el sitio inaccesible | Sin `preload`; confirmar que producción sirve HTTPS válido antes de desplegar. |
| `Permissions-Policy` bloquea una API que algún juego use sin saberlo | El `grep` del paso 1 y la prueba funcional del paso 4 cubren los cinco juegos. |
| Los headers no se aplican a rutas con `cacheComponents` o a respuestas de `proxy.ts` | Comprobar con `curl -I` en rutas estáticas, dinámicas y de API (criterio explícito). |
| Subir el mínimo de contraseña en Supabase a 8 invalida el registro de cuentas con contraseñas de menos longitud | Solo afecta a registros y cambios nuevos; las cuentas existentes siguen entrando. |
| Un límite de registros por IP muy bajo bloquea a usuarios legítimos detrás de la misma IP | Valor de ~10/hora; ajustable en el dashboard sin código. |
| (Rev. 1) La regex del código y Password Requirements de Supabase difieren en el conjunto de símbolos y dan errores distintos | Mismo conjunto ASCII en ambos; traducir `weak_password` de Supabase al mismo mensaje; probar un símbolo de cada extremo del conjunto. |
| (Rev. 1) Contraseñas que cumplen la regex pero son débiles (`Password1!`) | Fuera de alcance: medidor y listas de contraseñas comunes; la protección de filtradas queda aplazada por el plan. |
| (Rev. 1) El checklist en vivo causa desajuste de hidratación o filtra la contraseña (logs, `value` en el DOM de otro componente) | Estado local del componente tras montar, sin enviarla a ningún sitio ni registrarla; sin avisos de hidratación en consola. |
| (Rev. 1) Usuarios con contraseña antigua no pueden cambiarla por la regla nueva | Solo se exige al fijar una nueva; el inicio de sesión no cambia. |
| Contraseñas filtradas siguen permitidas en Free | Warning aceptado y documentado; revisar al pasar a Pro. |
| Sin CSP, un XSS futuro tendría más margen | Fuera de alcance explícito; React escapa por defecto y no hay `dangerouslySetInnerHTML`. Spec propia si se quiere. |

## Lo que **no** está en esta spec

- Content-Security-Policy.
- Protección de contraseñas filtradas (plan Pro).
- HSTS `preload`.
- Rate limiting propio o CAPTCHA.
- Migraciones, política explícita en `game_sessions`.
- Cambios en auth, scores o juegos.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
