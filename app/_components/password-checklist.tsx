"use client";

import { MIN_PASSWORD, passwordChecks } from "../_lib/password";

const ITEMS = [
  { key: "length", label: `${MIN_PASSWORD} caracteres como mínimo` },
  { key: "lower", label: "Una minúscula" },
  { key: "upper", label: "Una mayúscula" },
  { key: "digit", label: "Un número" },
  { key: "symbol", label: "Un símbolo (por ejemplo ! @ # $ %)" },
] as const;

/**
 * Requisitos de contraseña con estado en vivo. El estado se indica con glyph
 * y texto oculto, no solo con color. La validación real vive en el servidor.
 */
export function PasswordChecklist({
  password,
  id,
}: {
  password: string;
  id: string;
}) {
  const checks = passwordChecks(password);
  return (
    <ul className="pw-checks" id={id} aria-live="polite">
      {ITEMS.map(({ key, label }) => {
        const ok = checks[key];
        return (
          <li key={key} className={ok ? "ok" : undefined}>
            <span aria-hidden="true">{ok ? "✓" : "○"}</span>
            {label}
            <span className="sr-only">{ok ? ": cumplido" : ": pendiente"}</span>
          </li>
        );
      })}
    </ul>
  );
}
