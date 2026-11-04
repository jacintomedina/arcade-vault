"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { requestPasswordReset } from "../access/actions";

export function ForgotForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const formData = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const result = await requestPasswordReset(formData);
      if (result.ok) setSent(true);
      else setError(result.error);
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <>
        <div className="auth-notice" role="status">
          <strong>Revisa tu correo.</strong>
          <p>
            Si existe una cuenta con ese correo, te hemos enviado un enlace para
            elegir una contraseña nueva.
          </p>
        </div>
        <Link className="auth-link" href="/access">
          Volver a iniciar sesión
        </Link>
      </>
    );
  }

  return (
    <>
      <form onSubmit={submit} noValidate>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className={`field${error ? " invalid" : ""}`}>
          <label htmlFor="forgot-email">Correo electrónico</label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="jugador@vault.gg"
            required
          />
        </div>
        <button
          className="btn lg"
          type="submit"
          disabled={pending}
          style={{ width: "100%", marginTop: 8 }}
        >
          {pending ? "ENVIANDO…" : "ENVIAR ENLACE"}
        </button>
      </form>
      <Link className="auth-link" href="/access" style={{ marginTop: 14 }}>
        Volver a iniciar sesión
      </Link>
    </>
  );
}
