import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { AuthShell } from "../../_components/auth-shell";
import { PasswordForm } from "../../_components/password-form";
import { createClient } from "../../_lib/supabase/server";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  description: "Elige una contraseña nueva para tu cuenta.",
};

async function hasSession(): Promise<boolean> {
  // Lectura de sesión: siempre en petición, nunca prerenderizada (Date.now del JWT).
  await connection();
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user !== null;
  } catch {
    return false;
  }
}

async function ResetContent() {
  if (!(await hasSession())) {
    return (
      <AuthShell title="ENLACE NO VÁLIDO">
        <div className="auth-error" role="alert">
          El enlace ha caducado o ya se ha usado. Pide uno nuevo para cambiar tu
          contraseña.
        </div>
        <Link className="btn lg" href="/access/forgot" style={{ width: "100%" }}>
          PEDIR OTRO ENLACE
        </Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="NUEVA CONTRASEÑA" subtitle="Elige una contraseña para tu cuenta.">
      <PasswordForm redirectTo="/" />
    </AuthShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="av-auth-wrap" />}>
      <ResetContent />
    </Suspense>
  );
}
