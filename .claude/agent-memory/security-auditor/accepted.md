---
name: accepted
description: Avisos y decisiones de seguridad aceptados; no reportar como hallazgo
metadata:
  type: project
---

- `rls_enabled_no_policy` (INFO) en `game_sessions`: intencional, solo la usa el service role. No añadir políticas para silenciarlo. (SPEC 13)
- `auth_leaked_password_protection` (WARN): requiere plan Pro de Supabase. Revisar al pasar a Pro. (SPEC 13)
- Sin Content-Security-Policy: fuera de alcance de SPEC 13; riesgo alto de romper juegos. Spec propia si se quiere.
- HSTS sin `preload`: deliberado hasta tener dominio de producción estable. (SPEC 13)
- Contraseñas débiles que cumplen la regex (`Password1!`): fuera de alcance. (SPEC 13)

**Why:** decisiones cerradas por el usuario en SPEC 12 y 13.
**How to apply:** marcar como AVISO aceptado, no como hallazgo. Añadir entradas solo si el usuario lo indica.
