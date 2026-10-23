import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { GAMES } from "../data/games";
import type { Database } from "./supabase/database.types";

export interface LeaderboardRow {
  gameId: string;
  rank: number;
  playerName: string;
  score: number;
  createdAt: string;
}

// Cliente sin cookies: dentro de `use cache` no se puede leer `cookies()`.
// Usa la clave publicable; la lectura pública la autoriza RLS.
function createReadClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export interface GameScoreStats {
  best: number; // marca nº 1 del juego (0 sin marcas)
  plays: number; // marcas guardadas
}

// dd/mm/aaaa en UTC, igual en servidor y cliente.
export function formatScoreDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// Top 10 por juego. Sin `gameId` devuelve el de todos los juegos.
// `submitScore` invalida la etiqueta "leaderboard".
export async function getLeaderboard(
  gameId?: string,
): Promise<LeaderboardRow[]> {
  "use cache";
  cacheTag("leaderboard");
  cacheLife("hours");

  let query = createReadClient()
    .from("leaderboard")
    .select("game_id, rank, player_name, score, created_at")
    .order("game_id")
    .order("rank");
  if (gameId) query = query.eq("game_id", gameId);

  const { data, error } = await query;
  if (error) throw new Error("No se pudo leer el leaderboard.");

  return data.flatMap((r) =>
    r.game_id === null ||
    r.rank === null ||
    r.player_name === null ||
    r.score === null ||
    r.created_at === null
      ? []
      : [
          {
            gameId: r.game_id,
            rank: r.rank,
            playerName: r.player_name,
            score: r.score,
            createdAt: r.created_at,
          },
        ],
  );
}

// Mejor marca y marcas guardadas de cada juego del catálogo.
export async function getGameStats(): Promise<Record<string, GameScoreStats>> {
  "use cache";
  cacheTag("leaderboard");
  cacheLife("hours");

  const supabase = createReadClient();
  const entries = await Promise.all(
    GAMES.map(async (g) => {
      const [top, count] = await Promise.all([
        supabase
          .from("leaderboard")
          .select("score")
          .eq("game_id", g.id)
          .eq("rank", 1)
          .maybeSingle(),
        supabase
          .from("scores")
          .select("id", { count: "exact", head: true })
          .eq("game_id", g.id),
      ]);
      if (top.error || count.error) {
        throw new Error("No se pudieron leer las estadísticas.");
      }
      const stats: GameScoreStats = {
        best: top.data?.score ?? 0,
        plays: count.count ?? 0,
      };
      return [g.id, stats] as const;
    }),
  );
  return Object.fromEntries(entries);
}
