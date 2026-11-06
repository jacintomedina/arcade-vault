---
name: findings
description: Historial de hallazgos de seguridad con fecha, severidad y estado
metadata:
  type: project
---

Formato: `- AAAA-MM-DD · <id> · <severidad> · <abierto|resuelto|aceptado> · <resumen> · <evidencia>`

## Auditoría 2026-11-06 (completa, rama spec-13-medidas-de-seguridad-basicas) — SEGURO CON AVISOS

- 2026-11-06 · F01 · media · resuelto · Open redirect en /auth/callback: safeNext no bloquea tab/CR/LF; next=/%09/evil.com se resuelve a https://evil.com/ (verificado con node) · app/auth/callback/route.ts:6-12,53
- 2026-11-06 · F02 · media · resuelto · .mcp.json versionado pese a .gitignore (commit d886e94) · git ls-files .mcp.json
- 2026-11-06 · F03 · media · abierto · SPEC 13 paso 9 (protección de rutas en proxy) sin implementar; las páginas protegen en servidor, sin fuga · app/_lib/supabase/proxy.ts:31
- 2026-11-06 · F04 · baja · abierto · auth_rls_initplan (WARN) en policy "profiles actualiza el propio" · pg_policies
- 2026-11-06 · F05 · baja · abierto · unindexed_foreign_keys (INFO) en game_sessions.game_id · get_advisors
- 2026-11-06 · F06 · baja · abierto · anon/authenticated con todos los privilegios (incl. TRUNCATE) en tablas public; solo RLS protege · role_table_grants
- 2026-11-06 · F07 · baja · abierto · startGameSession sin auth ni rate limit (fuera de alcance de SPEC 13) · app/_actions/scores.ts:26
- 2026-11-06 · F08 · baja · aceptado · USERNAME_RE duplicado a propósito, documentado · app/access/actions.ts:26
