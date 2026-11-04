import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthShell } from "../../_components/auth-shell";
import { UsernameForm } from "../../_components/username-form";
import { createClient } from "../../_lib/supabase/server";

export const metadata: Metadata = {
  title: "Elige tu usuario",
  description: "Elige el nombre con el que aparecerás en el ranking.",
};

type Check = "anon" | "needs-username" | "has-username";

async function checkProfile(): Promise<Check> {
  // Lectura de sesión: siempre en petición, nunca prerenderizada (Date.now del JWT).
  await connection();
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return "anon";
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", data.user.id)
      .maybeSingle();
    return profile?.username ? "has-username" : "needs-username";
  } catch {
    return "anon";
  }
}

async function UsernameContent() {
  // redirect() lanza: va fuera de try/catch.
  const state = await checkProfile();
  if (state === "anon") redirect("/access");
  if (state === "has-username") redirect("/profile");
  return (
    <AuthShell
      title="ELIGE TU USUARIO"
      subtitle="Es el nombre que verán todos en el ranking. Necesitas uno para guardar puntuaciones."
    >
      <UsernameForm redirectTo="/" submitLabel="CONTINUAR" />
    </AuthShell>
  );
}

export default function UsernamePage() {
  return (
    <Suspense fallback={<div className="av-auth-wrap" />}>
      <UsernameContent />
    </Suspense>
  );
}
