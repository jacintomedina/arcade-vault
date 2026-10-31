---
name: spec-impl-game
description: Implementa una spec aprobada de un juego siguiendo /spec-impl y, al terminar, lanza en serie los agentes skin-designer y mobile-porter sobre ese juego.
disable-model-invocation: true
argument-hint: '<NN-juego-id, p. ej. 12-juego-invasores>'
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(grep:*), Bash(npx tsc:*), Bash(npm run lint:*)
---

# /spec-impl-game — Implementar un juego y pasarle skins y auditoría móvil

## Contexto de sesión

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "No existe specs/"`

Configuración de creación de rama:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (por defecto, sin fichero de config)"`

Juegos ya en el catálogo (`id`):
!`grep -E '^\s+id: "' app/data/games.ts`

---

Argumento recibido: `$ARGUMENTS`

## Instrucciones

Sigue las fases en orden estricto. No avances si la anterior no terminó bien.

### Fase 0 — Comprobar que la spec es de un juego

1. Localiza el fichero en `specs/` con `$ARGUMENTS` (nombre completo, solo número o solo slug). Si `$ARGUMENTS` está vacío o no hay coincidencia, sigue la Fase 1 de `/spec-impl`: lista las specs y pide el nombre. Espera.
2. Deriva el `<id>` del juego del nombre `NN-juego-<id>.md`. Si el nombre no casa, búscalo en el cuerpo de la spec (campo `id` del juego).
3. Si la spec no es de un juego (p. ej. `10-gamepad-tactil-gameboy.md`), **para**: indica que este comando es solo para specs de juegos y recomienda `/spec-impl`. No sigas.

### Fases 1–4 — Implementar con /spec-impl

`/spec-impl` tiene `disable-model-invocation`, así que no puedes llamarla con `Skill`. Léela y síguela:

1. Lee `~/.claude/skills/spec-impl/SKILL.md`.
2. Ejecuta sus Fases 1 a 4 **tal cual**, con el mismo argumento: validación del estado "Aprobado", rama `spec-NN-slug` según `AutoCreateBranch`, resumen de la spec, implementación paso a paso con pausas y confirmación.
3. No cambies ninguna de sus reglas. En concreto: nunca hagas commit, implementa lo que dice la spec, y respeta las memorias del usuario (no preguntar por el working tree sucio al iniciar).
4. Si spec-impl se detiene (estado no aprobado, spec no encontrada, ambigüedad sin resolver, el usuario aborta), **este comando también se detiene**. No pases a la Fase 5.

### Fase 5 — Agentes en serie

Solo cuando spec-impl haya completado el último paso del plan:

1. Comprueba que `<id>` está en `GAMES` (`app/data/games.ts`) y en `REAL_GAMES` (`app/_components/game-player.tsx`). Si falta en alguno, para y avisa.
2. **Primero `skin-designer`.** Lanza `Agent` con `subagent_type: "skin-designer"` y como prompt solo el id (`<id>`). Primer plano. **Espera a que termine.** Resume al usuario: ficheros creados y modificados, tabla de skins, resultado de `tsc` y `lint`.
   - Si el agente para (p. ej. `app/_games/<id>/skins.ts` ya existe) o falla, cuéntalo y **continúa igualmente** con el siguiente agente.
3. **Después `mobile-porter`.** Solo con el primero terminado, lanza `Agent` con `subagent_type: "mobile-porter"` y como prompt el id (`<id>`). Primer plano. Espera. Resume: veredicto, tabla del checklist, fallos con arreglo propuesto y comprobaciones manuales pendientes.
4. **Nunca en paralelo ni en segundo plano.** Dos llamadas a `Agent` en mensajes distintos, la segunda después de recibir el resultado de la primera.
5. No apliques tú los arreglos de `mobile-porter`: ese agente solo audita.

### Cierre

Termina con este recordatorio, sin hacer commit:

```
✅ Juego <id> implementado, con skins y auditoría móvil.

Pendiente:
  1. Verificar los criterios de aceptación de la spec uno a uno y pasarla a "Implementado".
  2. Probar en el navegador: cada skin en /games/<id>/play, cambio de skin en pausa y en partida, persistencia tras recargar, y emulación táctil (320, 375, 768 px).
  3. Las skins se hicieron sin spec: ejecuta /spec si quieres documentarlas.
  4. Los fallos móviles que haya listado mobile-porter se arreglan con /spec + /spec-impl.
  5. Commit final antes de fusionar la rama.
```
