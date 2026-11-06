"use client";

import { useState, type FocusEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  checkUsernameAvailable,
  signIn,
  signInWithProvider,
  signUp,
  type AuthResult,
  type OAuthProvider,
} from "../access/actions";
import { useSession } from "./session-provider";
import { PasswordChecklist } from "./password-checklist";
import {
  MAX_PASSWORD,
  PASSWORD_ERROR,
  isStrongPassword,
} from "../_lib/password";

type Tab = "in" | "up";
type FieldName = "email" | "password" | "username";

const ERR_CALLBACK =
  "No se pudo completar el acceso. Vuelve a intentarlo o usa otro método.";
const ERR_NETWORK = "No se pudo conectar. Inténtalo de nuevo.";

export function AuthForm({ callbackError = false }: { callbackError?: boolean }) {
  const router = useRouter();
  const { logout, refresh } = useSession();
  const [tab, setTab] = useState<Tab>("in");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    callbackError ? ERR_CALLBACK : null,
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setFieldErrors({});
    setPassword("");
    setPasswordTouched(false);
  };

  const fail = (result: Extract<AuthResult, { ok: false }>) => {
    if (result.field) {
      setFieldErrors({ [result.field]: result.error });
    } else {
      setError(result.error);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    setFieldErrors({});
    // Ayuda de UX: la Server Action vuelve a validar. Evita la llamada si falta algún requisito.
    if (tab === "up" && !isStrongPassword(password)) {
      setPasswordTouched(true);
      setFieldErrors({ password: PASSWORD_ERROR });
      return;
    }
    setPending(true);
    try {
      if (tab === "in") {
        const result = await signIn(formData);
        if (!result.ok) return fail(result);
        // El login se hizo en servidor: se relee la cuenta antes de navegar.
        await refresh();
        router.push("/");
        router.refresh();
      } else {
        const result = await signUp(formData);
        if (!result.ok) return fail(result);
        setSentTo(String(formData.get("email") ?? ""));
      }
    } catch {
      setError(ERR_NETWORK);
    } finally {
      setPending(false);
    }
  };

  const checkUsername = async (e: FocusEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value.trim();
    if (!value) return;
    try {
      const result = await checkUsernameAvailable(value);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (result.ok) delete next.username;
        else next.username = result.error;
        return next;
      });
    } catch {
      // Solo ayuda de UX: la garantía es el índice único.
    }
  };

  const oauth = async (provider: OAuthProvider) => {
    if (pending) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await signInWithProvider(provider);
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError(ERR_NETWORK);
      setPending(false);
    }
  };

  const playAsGuest = async () => {
    await logout();
    router.push("/");
  };

  const err = (name: FieldName) => fieldErrors[name];

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        {sentTo !== null ? (
          <div className="auth-notice" role="status">
            <strong>Revisa tu correo para confirmar la cuenta.</strong>
            <p>
              Hemos enviado un enlace a <span className="mono">{sentTo}</span>.
              Hasta que lo abras no podrás iniciar sesión.
            </p>
            <button
              type="button"
              className="btn ghost"
              style={{ width: "100%" }}
              onClick={() => {
                setSentTo(null);
                switchTab("in");
              }}
            >
              VOLVER A INICIAR SESIÓN
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button
                type="button"
                className={tab === "in" ? "on" : ""}
                onClick={() => switchTab("in")}
              >
                INICIAR SESIÓN
              </button>
              <button
                type="button"
                className={tab === "up" ? "on" : ""}
                onClick={() => switchTab("up")}
              >
                CREAR CUENTA
              </button>
            </div>

            <form onSubmit={submit} noValidate>
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              {tab === "up" && (
                <div className={`field slide-in${err("username") ? " invalid" : ""}`}>
                  <label htmlFor="auth-user">Usuario</label>
                  <input
                    id="auth-user"
                    name="username"
                    autoComplete="username"
                    maxLength={10}
                    placeholder="px_kai"
                    aria-invalid={err("username") ? true : undefined}
                    aria-describedby={err("username") ? "auth-user-err" : undefined}
                    onBlur={checkUsername}
                    required
                  />
                  {err("username") && (
                    <p className="field-error" id="auth-user-err">
                      {err("username")}
                    </p>
                  )}
                </div>
              )}
              <div className={`field${err("email") ? " invalid" : ""}`}>
                <label htmlFor="auth-email">Correo electrónico</label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="jugador@vault.gg"
                  aria-invalid={err("email") ? true : undefined}
                  aria-describedby={err("email") ? "auth-email-err" : undefined}
                  required
                />
                {err("email") && (
                  <p className="field-error" id="auth-email-err">
                    {err("email")}
                  </p>
                )}
              </div>
              <div className={`field${err("password") ? " invalid" : ""}`}>
                <label htmlFor="auth-pass">Contraseña</label>
                <input
                  id="auth-pass"
                  name="password"
                  type="password"
                  autoComplete={tab === "in" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  maxLength={MAX_PASSWORD}
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  onFocus={() => setPasswordTouched(true)}
                  aria-invalid={err("password") ? true : undefined}
                  aria-describedby={
                    [
                      err("password") ? "auth-pass-err" : null,
                      tab === "up" && (passwordTouched || password)
                        ? "auth-pass-checks"
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  required
                />
                {err("password") && (
                  <p className="field-error" id="auth-pass-err">
                    {err("password")}
                  </p>
                )}
                {tab === "up" &&
                  (passwordTouched || password ? (
                    <PasswordChecklist
                      password={password}
                      id="auth-pass-checks"
                    />
                  ) : (
                    !err("password") && (
                      <p className="field-hint">
                        Mínimo 8 caracteres, con minúscula, mayúscula, número y
                        símbolo.
                      </p>
                    )
                  ))}
              </div>

              {tab === "in" && (
                <Link className="auth-link" href="/access/forgot">
                  ¿Olvidaste tu contraseña?
                </Link>
              )}

              <button
                className="btn lg"
                type="submit"
                disabled={pending}
                style={{ width: "100%", marginTop: 8 }}
              >
                {pending
                  ? "ENVIANDO…"
                  : tab === "in"
                    ? "ENTRAR AL VAULT"
                    : "CREAR CUENTA"}
              </button>
            </form>

            <button
              type="button"
              className="btn ghost"
              style={{ width: "100%", marginTop: 10 }}
              onClick={playAsGuest}
              disabled={pending}
            >
              JUGAR COMO INVITADO
            </button>

            <div className="auth-divider">O CONTINÚA CON</div>
            <div className="social">
              <button
                className="btn ghost"
                type="button"
                disabled={pending}
                onClick={() => oauth("google")}
              >
                ◆&nbsp; GOOGLE
              </button>
              <button
                className="btn ghost"
                type="button"
                disabled={pending}
                onClick={() => oauth("github")}
              >
                ▣&nbsp; GITHUB
              </button>
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
