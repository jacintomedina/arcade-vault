"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "../_lib/supabase/admin";
import { createClient } from "../_lib/supabase/server";
import { getIpHash } from "../_lib/client-ip";

export type StartSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string };

export type SubmitScoreResult =
  | { ok: true; rank: number | null }
  | { ok: false; error: string };

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
// Máximo de sesiones nuevas por IP (hash) y minuto.
const MAX_SESSIONS_PER_MINUTE = 20;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ERR_START = "No se pudo iniciar la partida.";
const ERR_SESSION = "Sesión de partida no válida.";
const ERR_LOGIN = "Inicia sesión para guardar tu puntuación.";
const ERR_USERNAME = "Elige un nombre de usuario para guardar tu puntuación.";
const ERR_SCORE = "Puntuación no válida.";
const ERR_SAVE = "No se pudo guardar la puntuación.";

export async function startGameSession(
  gameId: string,
): Promise<StartSessionResult> {
  if (typeof gameId !== "string" || gameId.length === 0 || gameId.length > 64) {
    return { ok: false, error: ERR_START };
  }

  // `games` es de lectura pública (RLS): no hace falta service_role para leerla.
  const publicClient = await createClient();
  const { data: game } = await publicClient
    .from("games")
    .select("max_score_per_second")
    .eq("id", gameId)
    .maybeSingle();
  if (!game || game.max_score_per_second === null) {
    return { ok: false, error: ERR_START };
  }

  // Solo el insert necesita service_role (game_sessions no tiene policies).
  const supabase = createAdminClient();

  const ipHash = await getIpHash();
  if (ipHash) {
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from("game_sessions")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("started_at", since);
    if ((count ?? 0) >= MAX_SESSIONS_PER_MINUTE) {
      return { ok: false, error: ERR_START };
    }
  }

  // Limpieza: las sesiones sin consumir y caducadas ya no se pueden usar.
  // Las consumidas se conservan (scores.session_id apunta a ellas).
  await supabase
    .from("game_sessions")
    .delete()
    .is("consumed_at", null)
    .lt("started_at", new Date(Date.now() - SESSION_TTL_MS).toISOString());

  const { data: session, error } = await supabase
    .from("game_sessions")
    .insert({ game_id: gameId, ip_hash: ipHash })
    .select("id")
    .single();
  if (error || !session) return { ok: false, error: ERR_START };

  return { ok: true, sessionId: session.id };
}

export async function submitScore(
  sessionId: string,
  score: number,
): Promise<SubmitScoreResult> {
  if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
    return { ok: false, error: ERR_SESSION };
  }
  if (!Number.isSafeInteger(score) || score < 1) {
    return { ok: false, error: ERR_SCORE };
  }

  // Cuenta y username se comprueban ANTES de consumir la sesión de juego:
  // un rechazo por falta de cuenta no quema la partida. El nombre sale del
  // perfil en servidor, nunca del cliente. getUser valida el JWT (no getSession).
  const authClient = await createClient();
  const { data: authData } = await authClient.auth.getUser();
  if (!authData.user) return { ok: false, error: ERR_LOGIN };
  const { data: profile } = await authClient
    .from("profiles")
    .select("username")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (!profile?.username) return { ok: false, error: ERR_USERNAME };
  const playerName = profile.username.toUpperCase();

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("game_sessions")
    .select("game_id, started_at, consumed_at, games(max_score_per_second)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.consumed_at !== null) {
    return { ok: false, error: ERR_SESSION };
  }

  const maxPerSecond = session.games?.max_score_per_second;
  if (!maxPerSecond) return { ok: false, error: ERR_SESSION };

  const now = Date.now();
  const elapsedMs = now - Date.parse(session.started_at);
  if (!(elapsedMs >= 0) || elapsedMs > SESSION_TTL_MS) {
    return { ok: false, error: ERR_SESSION };
  }
  if (score > Math.floor((elapsedMs / 1000) * maxPerSecond)) {
    return { ok: false, error: ERR_SCORE };
  }

  // El UPDATE condicional consume la sesión; si no afecta a ninguna fila,
  // otra llamada ya la consumió.
  const { data: consumed } = await supabase
    .from("game_sessions")
    .update({ consumed_at: new Date(now).toISOString() })
    .eq("id", sessionId)
    .is("consumed_at", null)
    .select("id");
  if (!consumed || consumed.length === 0) {
    return { ok: false, error: ERR_SESSION };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("scores")
    .insert({
      game_id: session.game_id,
      session_id: sessionId,
      player_name: playerName,
      user_id: authData.user.id,
      score,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    // Libera la sesión para que el jugador pueda reintentar.
    await supabase
      .from("game_sessions")
      .update({ consumed_at: null })
      .eq("id", sessionId);
    return { ok: false, error: ERR_SAVE };
  }

  // Sesiones secuenciales por usuario y juego: si ya hay una puntuación suya
  // guardada después de empezar esta sesión, la partida se solapaba con otra
  // (sesiones abiertas en paralelo). Se comprueba tras insertar, ordenando por
  // id, para que dos envíos simultáneos no pasen ambos. La sesión queda consumida.
  const { count: overlapping } = await supabase
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("user_id", authData.user.id)
    .eq("game_id", session.game_id)
    .gte("created_at", session.started_at)
    .lt("id", inserted.id);
  if (overlapping === null || overlapping > 0) {
    await supabase.from("scores").delete().eq("id", inserted.id);
    return { ok: false, error: ERR_SESSION };
  }

  const { count, error: rankError } = await supabase
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("game_id", session.game_id)
    .gt("score", score);

  updateTag("leaderboard");
  // Invalida también la caché del router del cliente: sin esto, /hall y la
  // ficha del juego siguen mostrando la lista anterior al navegar a ellas.
  revalidatePath("/hall");
  revalidatePath("/games");
  revalidatePath(`/games/${session.game_id}`);

  // La puntuación ya está guardada y la sesión consumida: un fallo al calcular
  // el rango no debe presentarse como fallo de guardado (el reintento daría
  // "sesión no válida" y el jugador creería haber perdido la puntuación).
  return { ok: true, rank: rankError || count === null ? null : count + 1 };
}
