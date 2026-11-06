"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "../access/actions";

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
  const done = saved ?? localDone;
  const setDone = onSavedChange ?? setLocalDone;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    setPending(true);
    setError(null);
    setFieldError(null);
    setDone(false);
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
          minLength={8}
          maxLength={72}
          placeholder="••••••••"
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "pw-new-err" : undefined}
          required
        />
        {fieldError ? (
          <p className="field-error" id="pw-new-err">
            {fieldError}
          </p>
        ) : (
          <p className="field-hint">Mínimo 8 caracteres.</p>
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
