import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../_lib/supabase/server";

// Solo rutas internas: empieza por "/", no por "//" ni "/\" y sin barras
// invertidas ni caracteres de control (el parser de URL elimina tab, CR y LF,
// así que "/\t/evil.com" saltaría a otro origen).
const SAFE_NEXT = /^\/(?![/\\])[^\\\x00-\x1f\x7f]*$/;

function safeNext(raw: string | null, base: string): string {
  if (!raw || !SAFE_NEXT.test(raw)) return "/";
  // Defensa en profundidad: el destino resuelto debe ser del mismo origen.
  try {
    if (new URL(raw, base).origin !== new URL(base).origin) return "/";
  } catch {
    return "/";
  }
  return raw;
}

function getBaseUrl(request: NextRequest): string {
  const { origin } = request.nextUrl;
  if (process.env.NODE_ENV === "development") return origin;
  // Detrás de un balanceador el origen interno no es el público.
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (!forwardedHost) return origin;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${forwardedHost}`;
}

export async function GET(request: NextRequest) {
  const base = getBaseUrl(request);
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), base);
  const fail = NextResponse.redirect(new URL("/access?error=callback", base));

  // Confirmación de correo, OAuth y recuperación llegan con ?code= (PKCE).
  // Si el proveedor devuelve ?error= o falta el code, no hay sesión que crear.
  if (!code || searchParams.get("error")) return fail;

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fail;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userData.user.id)
    .maybeSingle();

  // Sin username (primer login OAuth o colisión en el trigger): elegirlo.
  if (!profile?.username) {
    return NextResponse.redirect(new URL("/access/username", base));
  }

  return NextResponse.redirect(new URL(next, base));
}
