"use client";

import { useState } from "react";
import { PasswordForm } from "./password-form";
import { UsernameForm } from "./username-form";

type Saved = "username" | "password" | null;

/**
 * Formularios de /profile. Solo se muestra el aviso «guardado» del último
 * formulario enviado: al enviar cualquiera, el aviso anterior desaparece.
 */
export function ProfileForms({
  initialUsername,
  hasPassword,
}: {
  initialUsername: string;
  hasPassword: boolean;
}) {
  const [saved, setSaved] = useState<Saved>(null);

  return (
    <>
      <section className="auth-section" aria-labelledby="profile-user">
        <h2 id="profile-user">Nombre de usuario</h2>
        <UsernameForm
          initialUsername={initialUsername}
          saved={saved === "username"}
          onSavedChange={(v) => setSaved(v ? "username" : null)}
        />
      </section>
      {hasPassword && (
        <section className="auth-section" aria-labelledby="profile-pass">
          <h2 id="profile-pass">Cambiar contraseña</h2>
          <PasswordForm
            saved={saved === "password"}
            onSavedChange={(v) => setSaved(v ? "password" : null)}
          />
        </section>
      )}
    </>
  );
}
