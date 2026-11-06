"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "../access/actions";
import { PasswordChecklist } from "./password-checklist";
import {
  MAX_PASSWORD,
  PASSWORD_ERROR,
  isStrongPassword,
} from "../_lib/password";

/**
 * Nueva contraseña (reset y perfil). Con `redirectTo` navega al terminar;
 * sin él muestra la confirmación en el sitio.
 */
export function PasswordForm({
  redirectTo,
  saved,
  onSavedChange,
}: {
  redirectTo?: string;
  /** Opcional: el padre controla el aviso «guardado» (varios formularios en una página). */
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [localDone, setLocalDone] = useState(false);
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const done = saved ?? localDone;
  const setDone = onSavedChange ?? setLocalDone;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    setFieldError(null);
    setDone(false);
    // Ayuda de UX: la Server Action vuelve a validar. Evita la llamada si falta algún requisito.
    if (!isStrongPassword(password)) {
      setTouched(true);
      setFieldError(PASSWORD_ERROR);
      return;
    }
    setPending(true);
    try {
      const result = await updatePassword(formData);
      if (!result.ok) {
        if (result.field === "password") setFieldError(result.error);
        else setError(result.error);
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        form.reset();
        setPassword("");
        setTouched(false);
        setDone(true);
      }
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="auth-notice" role="status">
          <strong>Contraseña actualizada.</strong>
        </p>
      )}
      <div className={`field${fieldError ? " invalid" : ""}`}>
        <label htmlFor="pw-new">Contraseña nueva</label>
        <input
          id="pw-new"
          name="password"
          type="password"
          autoComplete="new-password"
          maxLength={MAX_PASSWORD}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          onFocus={() => setTouched(true)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={
            [
              fieldError ? "pw-new-err" : null,
              touched || password ? "pw-new-checks" : null,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          required
        />
        {fieldError && (
          <p className="field-error" id="pw-new-err">
            {fieldError}
          </p>
        )}
        {touched || password ? (
          <PasswordChecklist password={password} id="pw-new-checks" />
        ) : (
          !fieldError && (
            <p className="field-hint">
              Mínimo 8 caracteres, con minúscula, mayúscula, número y símbolo.
            </p>
          )
        )}
      </div>
      <div className="field">
        <label htmlFor="pw-confirm">Repite la contraseña</label>
        <input
          id="pw-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
        />
      </div>
      <button
        className="btn lg"
        type="submit"
        disabled={pending}
        style={{ width: "100%", marginTop: 8 }}
      >
        {pending ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}
      </button>
    </form>
  );
}
