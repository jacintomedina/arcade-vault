import type { Metadata } from "next";
import { AuthShell } from "../../_components/auth-shell";
import { ForgotForm } from "../../_components/forgot-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Pide un enlace para elegir una contraseña nueva.",
};

export default function ForgotPage() {
  return (
    <AuthShell
      title="RECUPERAR CONTRASEÑA"
      subtitle="Te enviaremos un enlace al correo de tu cuenta."
    >
      <ForgotForm />
    </AuthShell>
  );
}
