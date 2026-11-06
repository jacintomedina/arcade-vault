"use server";

import { createClient } from "../_lib/supabase/server";
import { getSiteUrl } from "../_lib/site-url";
import {
  PASSWORD_ERROR,
  isStrongPassword,
  passwordBytes,
  MAX_PASSWORD,
} from "../_lib/password";

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string; field?: "email" | "password" | "username" };

export type OAuthResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type OAuthProvider = "google" | "github";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254;
// Debe coincidir con el `check` de profiles.username (SQL, solo ASCII).
// Se duplica a propósito: "use server" solo permite exportar funciones async,
// así que no se puede importar NAME_RE de scores.ts sin acoplar.
const USERNAME_RE = /^[A-Za-z0-9_ ]{1,10}$/;

const ERR_GENERIC = "No se pudo completar la operación. Inténtalo de nuevo.";
const ERR_EMAIL = "Introduce un correo electrónico válido.";
const ERR_PASSWORD = PASSWORD_ERROR;
const ERR_USERNAME =
  "El usuario admite 1-10 caracteres: letras, números, guion bajo y espacios.";
const ERR_USERNAME_TAKEN = "Ese nombre de usuario ya está en uso.";
const ERR_NO_SESSION = "Tu sesión no es válida o ha caducado. Inicia sesión de nuevo.";

function field(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function validEmail(email: string): boolean {
  return email.length > 0 && email.length <= MAX_EMAIL && EMAIL_RE.test(email);
}

function validPassword(password: string): boolean {
  return isStrongPassword(password);
}

async function isUsernameTaken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  username: string,
  exceptUserId?: string,
): Promise<boolean> {
  // ilike sin distinguir mayúsculas; `_` y `%` son comodines, se escapan.
  const pattern = username.replace(/[\\%_]/g, "\\$&");
  let query = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .ilike("username", pattern);
  if (exceptUserId) query = query.neq("id", exceptUserId);
  const { count, error } = await query;
  // Si la comprobación falla, el índice único sigue siendo la garantía.
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function checkUsernameAvailable(
  username: string,
): Promise<AuthResult> {
  if (typeof username !== "string") {
    return { ok: false, error: ERR_USERNAME, field: "username" };
  }
  const clean = username.trim();
  if (!USERNAME_RE.test(clean)) {
    return { ok: false, error: ERR_USERNAME, field: "username" };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (await isUsernameTaken(supabase, clean, data.user?.id)) {
    return { ok: false, error: ERR_USERNAME_TAKEN, field: "username" };
  }
  return { ok: true };
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  const username = field(formData, "username").trim();

  if (!validEmail(email)) return { ok: false, error: ERR_EMAIL, field: "email" };
  if (!validPassword(password)) {
    return { ok: false, error: ERR_PASSWORD, field: "password" };
  }
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: ERR_USERNAME, field: "username" };
  }

  const supabase = await createClient();
  if (await isUsernameTaken(supabase, username)) {
    return { ok: false, error: ERR_USERNAME_TAKEN, field: "username" };
  }

  const origin = await getSiteUrl();
  if (!origin) return { ok: false, error: ERR_GENERIC };
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  // Con "Confirm email" activo, un email ya registrado no devuelve error:
  // misma respuesta que un alta nueva, para no permitir enumerar cuentas.
  if (error) {
    if (error.code === "weak_password") {
      return { ok: false, error: ERR_PASSWORD, field: "password" };
    }
    return { ok: false, error: "No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo." };
  }
  return { ok: true };
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = field(formData, "email").trim();
  const password = field(formData, "password");

  if (!validEmail(email) || password.length === 0 || passwordBytes(password) > MAX_PASSWORD) {
    return { ok: false, error: "Credenciales incorrectas." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        ok: false,
        error: "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.",
      };
    }
    return { ok: false, error: "Credenciales incorrectas." };
  }
  return { ok: true };
}

export async function signInWithProvider(
  provider: OAuthProvider,
): Promise<OAuthResult> {
  if (provider !== "google" && provider !== "github") {
    return { ok: false, error: ERR_GENERIC };
  }
  const supabase = await createClient();
  const origin = await getSiteUrl();
  if (!origin) return { ok: false, error: ERR_GENERIC };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) return { ok: false, error: ERR_GENERIC };
  return { ok: true, url: data.url };
}

export async function signOutAction(): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: ERR_GENERIC };
  return { ok: true };
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthResult> {
  const email = field(formData, "email").trim();
  if (!validEmail(email)) return { ok: false, error: ERR_EMAIL, field: "email" };

  const supabase = await createClient();
  const origin = await getSiteUrl();
  if (!origin) return { ok: false, error: ERR_GENERIC };
  // Se ignora el resultado: misma respuesta exista o no el email.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/access/reset`,
  });
  return { ok: true };
}

export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const password = field(formData, "password");
  const confirm = field(formData, "confirm");

  if (!validPassword(password)) {
    return { ok: false, error: ERR_PASSWORD, field: "password" };
  }
  if (confirm && confirm !== password) {
    return { ok: false, error: "Las contraseñas no coinciden.", field: "password" };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: ERR_NO_SESSION };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "weak_password") {
      return { ok: false, error: ERR_PASSWORD, field: "password" };
    }
    if (error.code === "same_password") {
      return {
        ok: false,
        error: "La nueva contraseña debe ser distinta de la actual.",
        field: "password",
      };
    }
    return { ok: false, error: ERR_GENERIC };
  }
  return { ok: true };
}

export async function setUsername(formData: FormData): Promise<AuthResult> {
  const username = field(formData, "username").trim();
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: ERR_USERNAME, field: "username" };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: ERR_NO_SESSION };

  if (await isUsernameTaken(supabase, username, data.user.id)) {
    return { ok: false, error: ERR_USERNAME_TAKEN, field: "username" };
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", data.user.id)
    .select("id");
  if (error) {
    // 23505: el índice único gana la carrera si dos altas coinciden.
    if (error.code === "23505") {
      return { ok: false, error: ERR_USERNAME_TAKEN, field: "username" };
    }
    return { ok: false, error: ERR_GENERIC };
  }
  if (!updated || updated.length === 0) return { ok: false, error: ERR_GENERIC };
  return { ok: true };
}
