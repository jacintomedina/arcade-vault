"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "../_lib/supabase/admin";
import { createClient } from "../_lib/supabase/server";

export type StartSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string };

export type SubmitScoreResult =
  | { ok: true; rank: number }
  | { ok: false; error: string };

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
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

  const supabase = createAdminClient();

  const { data: game } = await supabase
    .from("games")
    .select("max_score_per_second")
    .eq("id", gameId)
    .maybeSingle();
  if (!game || game.max_score_per_second === null) {
    return { ok: false, error: ERR_START };
  }

  const { data: session, error } = await supabase
    .from("game_sessions")
    .insert({ game_id: gameId })
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

  const { error: insertError } = await supabase.from("scores").insert({
    game_id: session.game_id,
    session_id: sessionId,
    player_name: playerName,
    score,
  });
  if (insertError) {
    // Libera la sesión para que el jugador pueda reintentar.
    await supabase
      .from("game_sessions")
      .update({ consumed_at: null })
      .eq("id", sessionId);
    return { ok: false, error: ERR_SAVE };
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

  if (rankError || count === null) return { ok: false, error: ERR_SAVE };
  return { ok: true, rank: count + 1 };
}
