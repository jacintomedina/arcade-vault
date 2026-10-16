# SPEC 03 — Página Acerca de y formulario de contacto con Resend

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-16
> **Objetivo:** Portar `references/templates/home-about/about.jsx` como página `/about` y hacer que su formulario de contacto envíe un correo real con Resend mediante una Server Action.

## Por qué existe esta spec

SPEC 02 dejó `about.jsx` fuera de alcance. Esta spec lo recupera: la página, su CSS (`.about*`, líneas ~1071+ de `home-about/styles.css`) y el enlace en Nav. El template solo simula el envío (`setSent`); aquí el envío es real.

## Alcance

**Dentro:**

- Ruta `/about` (`app/about/page.tsx`) idéntica al template: hero "ACERCA DE ARCADE VAULT", fila de 3 highlights con `HighlightIcon`, divisor de píxeles y sección de contacto con intro, 3 tips y formulario.
- Textos en español, igual que el template.
- Fusionar en `app/globals.css` el CSS exclusivo de about de `home-about/styles.css` (`.about*`, `.highlight*`, `.about-divider`, `.contact*`, `.field`, `.tip*`, `.terminal-success`, `.shake`, etc.), adaptado como en SPEC 02 (sin `#root`, variables de `next/font`).
- Revelado al hacer scroll reutilizando el hook/componente de reveal de SPEC 02.
- Formulario con tres campos (nombre, correo, mensaje), estado de éxito "terminal" y botón "ENVIAR OTRO MENSAJE", como el template.
- Envío con Server Action `sendContactMessage` en `app/about/actions.ts` y el paquete `resend`.
- Validación en servidor: campos no vacíos, formato de correo, longitudes máximas.
- Estado de error en la UI si Resend falla o la validación falla (el shake del template se mantiene para campos vacíos o inválidos, y el borde del campo con fallo se ilumina en magenta (`--magenta`)).
- Honeypot simple anti-spam.
- Enlace **Acerca de** (`/about`) en Nav (barra y panel móvil), activo en `/about`. Revierte la exclusión de SPEC 02.
- Variables de entorno `RESEND_API_KEY` y `CONTACT_FROM_EMAIL` en `.env.local`, con `.env.example` documentado.
- Destinatario fijo: `jmedinalba@gmail.com`, constante en `app/about/actions.ts`.

**Fuera de alcance (para futuras specs):**

- Verificar un dominio propio en Resend.
- Guardar los mensajes en base de datos.
- Rate limiting, CAPTCHA, auto-respuesta al remitente.
- Plantillas de correo con React Email.
- Tests automatizados, i18n.
- Cambios en otras pantallas, salvo Nav.

## Modelo de datos

Nuevo archivo `app/about/actions.ts`:

```ts
export interface ContactState {
  status: "idle" | "success" | "error";
  name?: string;      // nombre enviado, para el mensaje de éxito
  error?: string;     // mensaje legible para la UI
}
export async function sendContactMessage(prev: ContactState, formData: FormData): Promise<ContactState>;
```

Campos de `FormData`: `name`, `email`, `msg`, `website` (honeypot, debe llegar vacío).

Límites: `name` ≤ 80, `email` ≤ 254, `msg` ≤ 2000 caracteres.

Correo enviado con Resend: `from` = `CONTACT_FROM_EMAIL`, `to` = `jmedinalba@gmail.com`, `replyTo` = correo del visitante, `subject` = `[Arcade Vault] Mensaje de <name>`, cuerpo en texto plano con nombre, correo y mensaje.

Variables de entorno:

```
RESEND_API_KEY=re_xxx
CONTACT_FROM_EMAIL=onboarding@resend.dev
```

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` (`01-app`) lo relevante a Server Actions, `useActionState`, formularios y Cache Components. Sin cambios de código.
2. Instalar `resend`. Crear `.env.example` y confirmar que `.env*.local` está en `.gitignore`.
3. Fusionar en `app/globals.css` el CSS de about de `home-about/styles.css`. La app sigue arrancando.
4. Crear `app/about/page.tsx` (servidor) con hero, highlights, divisor y la sección de contacto con un formulario estático. Crear `HighlightIcon` en `app/_components/about/`. Metadata de `/about`.
5. Crear el componente cliente `app/_components/about/contact-form.tsx` con los estados del template (campos, shake, terminal de éxito, enviar otro) sin envío real.
6. Crear `app/about/actions.ts` con `sendContactMessage`: validación, honeypot y envío con Resend. Falta de `RESEND_API_KEY` devuelve error genérico sin lanzar excepción.
7. Conectar `contact-form.tsx` a la acción con `useActionState`; mostrar `error` en la UI.
8. Añadir enlace "Acerca de" en `app/_components/nav.tsx` (barra y panel móvil), activo en `/about`.
9. Pulido: responsive ≤ 768px, `prefers-reduced-motion`, `npm run lint` y `npm run build` limpios.

Cada paso deja la app arrancando con `npm run dev`.

## Criterios de aceptación

- [x] `npm run lint` termina sin errores.
- [x] `npm run build` termina sin errores ni advertencias de Cache Components.
- [x] `/about` muestra "ACERCA DE ARCADE VAULT", 3 highlights, divisor y "ENVÍANOS UN MENSAJE", en ese orden.
- [x] El aspecto de `/about` coincide con `home-about/arcade-vault-standalone.html` en escritorio y 375px.
- [x] Enviar el formulario con un campo vacío aplica el shake y no envía correo.
- [x] Enviar un correo con formato inválido muestra un error en la UI y no envía correo.
- [x] Enviar datos válidos entrega un correo a `jmedinalba@gmail.com` con asunto `[Arcade Vault] Mensaje de <name>` y `replyTo` igual al correo del visitante.
- [x] Tras el envío exitoso se muestra la terminal con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE>."
- [x] "ENVIAR OTRO MENSAJE" vuelve al formulario con los campos vacíos.
- [x] Con `RESEND_API_KEY` ausente o inválida la UI muestra un mensaje de error y no la terminal de éxito.
- [x] Un envío con el honeypot `website` relleno no envía correo.
- [x] `RESEND_API_KEY` no aparece en el bundle del cliente ni en el repositorio; `.env.example` existe sin secretos.
- [x] La Nav tiene 4 enlaces (Inicio, Biblioteca, Salón de la Fama, Acerca de) en barra y panel móvil de 375px; "Acerca de" activo en `/about`.
- [x] Con 375px de ancho no hay scroll horizontal en `/about`.
- [x] Las rutas de SPEC 01 y SPEC 02 siguen funcionando.

## Decisiones tomadas y descartadas

- **Sí:** Server Action. Sin API route extra y con `useActionState`. **No:** Route Handler `/api/contact` (más código, fetch manual).
- **Sí:** destinatario fijo `jmedinalba@gmail.com` en código. Petición explícita del usuario. **No:** variable de entorno (más configuración sin necesidad hoy).
- **Sí:** remitente por `CONTACT_FROM_EMAIL`, por defecto `onboarding@resend.dev`. Resend no permite otro remitente sin dominio verificado, y así el cambio futuro no toca código.
- **Sí:** validación en servidor y error en UI. El template siempre muestra éxito, lo que mentiría si Resend falla. **No:** copiar el éxito simulado.
- **Sí:** honeypot. Barato y suficiente para esta etapa. **No:** CAPTCHA ni rate limiting (spec propia si hay abuso).
- **Sí:** `replyTo` = correo del visitante, para responder desde el buzón. **No:** usarlo como `from` (Resend lo rechaza).
- **Sí:** enlace "Acerca de" en Nav. **No:** dejar la ruta oculta.
- **Sí:** correo en texto plano. **No:** React Email (dependencia extra).

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| `onboarding@resend.dev` solo entrega al correo de la cuenta de Resend | Usar como destinatario el correo de la cuenta de Resend (`jmedinalba@gmail.com`; Resend rechaza alias `+`) o verificar un dominio; documentarlo en `.env.example`. |
| Cache Components y Server Actions | Leer docs en el paso 1; la acción no usa APIs dinámicas en el render de la página. |
| CSS de about pisa estilos existentes (`.field`, `.btn`, `.shake`) | Comparar con diff antes de fusionar; revisar las pantallas existentes tras el paso 3. |
| Secreto expuesto | Variable sin prefijo `NEXT_PUBLIC_`; acción solo en servidor. |

## Lo que **no** está en esta spec

- Dominio propio verificado en Resend.
- Guardado de mensajes en base de datos.
- CAPTCHA, rate limiting, auto-respuesta.
- Plantillas React Email.
- Tests automatizados, i18n.
