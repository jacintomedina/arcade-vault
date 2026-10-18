import { createClient } from "@/app/_lib/supabase/server";

const UNAVAILABLE = { ok: false, error: "Supabase no disponible" } as const;

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getUser();

    // Sin sesión es lo esperado: el servidor respondió, por tanto es alcanzable.
    if (error && error.name !== "AuthSessionMissingError") {
      return Response.json(UNAVAILABLE, { status: 503 });
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json(UNAVAILABLE, { status: 503 });
  }
}
