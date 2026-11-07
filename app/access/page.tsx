import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthForm } from "../_components/auth-form";
import { createClient } from "../_lib/supabase/server";

export const metadata: Metadata = {
  title: "Acceso",
  description: "Inicia sesión o crea tu cuenta.",
};

async function hasSession(): Promise<boolean> {
  // Lectura de sesión: siempre en petición, nunca prerenderizada (Date.now del JWT).
  await connection();
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user !== null;
  } catch {
    // Configuración de Supabase inválida: se muestra el formulario igualmente.
    return false;
  }
}

async function AccessContent({
  searchParams,
}: {
  searchParams: PageProps<"/access">["searchParams"];
}) {
  const { error } = await searchParams;
  // redirect() lanza: va fuera de try/catch.
  if (await hasSession()) redirect("/");
  return <AuthForm callbackError={error === "callback"} />;
}

export default function AccessPage(props: PageProps<"/access">) {
  return (
    <Suspense fallback={<div className="av-auth-wrap" />}>
      <AccessContent searchParams={props.searchParams} />
    </Suspense>
  );
}
