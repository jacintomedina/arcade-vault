import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AuthShell } from "../_components/auth-shell";
import { ProfileForms } from "../_components/profile-forms";
import { createClient } from "../_lib/supabase/server";

export const metadata: Metadata = {
  title: "Perfil",
  description: "Cambia tu nombre de usuario y tu contraseña.",
};

interface ProfileData {
  email: string;
  username: string | null;
  hasPassword: boolean;
}

async function loadProfile(): Promise<ProfileData | null> {
  // Lectura de sesión: siempre en petición, nunca prerenderizada (Date.now del JWT).
  await connection();
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    return {
      email: user.email ?? "",
      username: profile?.username ?? null,
      // Las cuentas solo-OAuth no tienen contraseña que cambiar.
      hasPassword: (user.identities ?? []).some((i) => i.provider === "email"),
    };
  } catch {
    return null;
  }
}

async function ProfileContent() {
  // redirect() lanza: va fuera de try/catch.
  const profile = await loadProfile();
  if (!profile) redirect("/access");

  return (
    <AuthShell title="TU PERFIL" subtitle={profile.email}>
      <ProfileForms
        initialUsername={profile.username ?? ""}
        hasPassword={profile.hasPassword}
      />
    </AuthShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="av-auth-wrap" />}>
      <ProfileContent />
    </Suspense>
  );
}
