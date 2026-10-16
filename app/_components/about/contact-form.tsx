"use client";

import { useActionState, useState } from "react";
import { sendContactMessage, type ContactState } from "../../about/actions";

const EMPTY = { name: "", email: "", msg: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldName = keyof typeof EMPTY;

const INITIAL: ContactState = { status: "idle" };

// La key remonta el formulario y reinicia el estado de la acción.
export function ContactForm() {
  const [run, setRun] = useState(0);
  return <ContactFormInner key={run} onReset={() => setRun(run + 1)} />;
}

function ContactFormInner({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState(sendContactMessage, INITIAL);
  const [form, setForm] = useState(EMPTY);
  const [shake, setShake] = useState(false);
  const [invalid, setInvalid] = useState<FieldName[]>([]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const bad: FieldName[] = [];
    if (!form.name.trim()) bad.push("name");
    if (!EMAIL_RE.test(form.email.trim())) bad.push("email");
    if (!form.msg.trim()) bad.push("msg");
    if (bad.length) {
      setInvalid(bad);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      // Cancela la acción del formulario: no se envía nada al servidor.
      e.preventDefault();
    }
  };

  const update = (key: FieldName, value: string) => {
    setForm({ ...form, [key]: value });
    if (invalid.includes(key)) setInvalid(invalid.filter((k) => k !== key));
  };

  const fieldClass = (key: FieldName) => "field" + (invalid.includes(key) ? " invalid" : "");

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
    >
      {state.status !== "success" ? (
        <>
          <div className={fieldClass("name")}>
            <label htmlFor="name">NOMBRE</label>
            <input
              id="name"
              name="name"
              maxLength={80}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              aria-invalid={invalid.includes("name")}
              placeholder="px_kai"
            />
          </div>
          <div className={fieldClass("email")}>
            <label htmlFor="email">CORREO ELECTRÓNICO</label>
            <input
              id="email"
              name="email"
              maxLength={254}
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              aria-invalid={invalid.includes("email")}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className={fieldClass("msg")}>
            <label htmlFor="msg">MENSAJE</label>
            <textarea
              id="msg"
              name="msg"
              maxLength={2000}
              rows={5}
              value={form.msg}
              onChange={(e) => update("msg", e.target.value)}
              aria-invalid={invalid.includes("msg")}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>
          {/* Honeypot anti-spam: los humanos no lo ven ni lo rellenan. */}
          <input
            className="hp-field"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            defaultValue=""
          />
          {state.status === "error" && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}
          <button className="btn xl press" type="submit" disabled={pending} style={{ width: "100%" }}>
            {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {(state.name ?? "").toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={onReset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
