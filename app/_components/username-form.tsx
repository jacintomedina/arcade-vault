"use client";

import { useState, type FocusEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { checkUsernameAvailable, setUsername } from "../access/actions";
import { useSession } from "./session-provider";

/**
 * Elegir o cambiar el username (/access/username y /profile). Con
 * `redirectTo` navega al terminar; sin él muestra la confirmación.
 */
export function UsernameForm({
  initialUsername = "",
  redirectTo,
  submitLabel = "GUARDAR USUARIO",
}: {
  initialUsername?: string;
  redirectTo?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const { refresh } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const formData = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    setFieldError(null);
    setDone(false);
    try {
      const result = await setUsername(formData);
      if (!result.ok) {
        if (result.field === "username") setFieldError(result.error);
        else setError(result.error);
        return;
      }
      // setUsername no dispara eventos de auth: se relee la cuenta a mano.
      await refresh();
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        setDone(true);
      }
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  };

  const check = async (e: FocusEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value.trim();
    if (!value || value === initialUsername) return;
    try {
      const result = await checkUsernameAvailable(value);
      setFieldError(result.ok ? null : result.error);
    } catch {
      // Solo ayuda de UX: la garantía es el índice único.
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
          <strong>Usuario actualizado.</strong>
        </p>
      )}
      <div className={`field${fieldError ? " invalid" : ""}`}>
        <label htmlFor="username-input">Usuario</label>
        <input
          id="username-input"
          name="username"
          autoComplete="username"
          maxLength={10}
          defaultValue={initialUsername}
          placeholder="px_kai"
          aria-invalid={fieldError ? true : undefined}
          aria-describedby="username-help"
          onBlur={check}
          required
        />
        {fieldError ? (
          <p className="field-error" id="username-help">
            {fieldError}
          </p>
        ) : (
          <p className="field-hint" id="username-help">
            Letras sin tildes, números, guion bajo y espacios. Máximo 10.
            Aparecerá en el ranking.
          </p>
        )}
      </div>
      <button
        className="btn lg"
        type="submit"
        disabled={pending}
        style={{ width: "100%", marginTop: 8 }}
      >
        {pending ? "GUARDANDO…" : submitLabel}
      </button>
    </form>
  );
}
