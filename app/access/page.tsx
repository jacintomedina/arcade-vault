import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = {
  title: "Acceso",
  description: "Inicia sesión, crea tu cuenta o juega como invitado.",
};

export default function AccessPage() {
  return <AuthForm />;
}
