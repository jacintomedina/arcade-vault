const UNAVAILABLE = { ok: false, error: "Supabase no disponible" } as const;

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      return Response.json(UNAVAILABLE, { status: 503 });
    }

    // Llamada real al servicio Auth: confirma que el proyecto es alcanzable.
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return Response.json(UNAVAILABLE, { status: 503 });
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json(UNAVAILABLE, { status: 503 });
  }
}
