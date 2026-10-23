import type { Metadata } from "next";
import {
  HallOfFame,
  type HallRow,
} from "../_components/hall-of-fame";
import { formatScoreDate, getLeaderboard } from "../_lib/leaderboard";

export const metadata: Metadata = {
  title: "Salón de la Fama",
  description: "Los mejores puntajes de cada juego del Vault.",
};

export default async function HallPage() {
  const rows = await getLeaderboard();

  const rowsByGame: Record<string, HallRow[]> = {};
  for (const r of rows) {
    (rowsByGame[r.gameId] ??= []).push({
      rank: r.rank,
      name: r.playerName,
      score: r.score,
      date: formatScoreDate(r.createdAt),
    });
  }

  return <HallOfFame rowsByGame={rowsByGame} />;
}
