"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "../_lib/supabase/admin";

export type StartSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string };

export type SubmitScoreResult =
  | { ok: true; rank: number }
  | { ok: false; error: string };

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_RE = /^[\p{L}\p{N}_ ]{1,10}$/u;

const ERR_START = "No se pudo iniciar la partida.";
const ERR_SESSION = "Sesión de partida no válida.";
const ERR_NAME = "Nombre no válido.";
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
  name: string,
  score: number,
): Promise<SubmitScoreResult> {
  if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
    return { ok: false, error: ERR_SESSION };
  }
  if (typeof name !== "string") return { ok: false, error: ERR_NAME };
  const playerName = name.trim().toUpperCase();
  if (!NAME_RE.test(playerName)) return { ok: false, error: ERR_NAME };
  if (!Number.isSafeInteger(score) || score < 1) {
    return { ok: false, error: ERR_SCORE };
  }

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
