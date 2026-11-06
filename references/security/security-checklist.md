## Checklist de seguridad básico

  - [x] RLS: Row Level Security habilitado en ambas tablas: `games` y `scores` (verificado también en `profiles` y `game_sessions`)
  - [x] Minimum password length — mínimo 8 caracteres (dashboard + `app/_lib/password.ts`, con minúscula, mayúscula, número y símbolo)
  - [ ] Leaked password protection — (el warning 4). **Aplazado**: exige plan Pro de Supabase; el warning está aceptado mientras el proyecto siga en Free.
  - [x] Max signup rate — limitar signups por IP (anti-bot): ~10/hora por IP en el dashboard
  - [x] Headers de seguridad en Next.js (`next.config.ts`: los tres del ejemplo + HSTS y Permissions-Policy)
  
  Ej:

```ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

// En la config de Next.js:
headers: async () => [
  { source: '/(.*)', headers: securityHeaders }
]
```

## Por el lado de Supabase:

- [x] Panel de warnings y errores revisado con `get_advisors`. Quedan dos avisos aceptados:
  - `rls_enabled_no_policy` (INFO) en `game_sessions`: intencional, solo la usa el service role.
  - `auth_leaked_password_protection` (WARN): requiere plan Pro.
