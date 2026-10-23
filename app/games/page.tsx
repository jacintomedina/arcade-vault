import type { Metadata } from "next";
import { Library } from "../_components/library";
import { getGameStats } from "../_lib/leaderboard";

export const metadata: Metadata = {
  title: "Biblioteca",
  description: "Todos los juegos del Vault, listos para jugar en tu navegador.",
};

export default async function GamesPage() {
  const stats = await getGameStats();
  const bests = Object.fromEntries(
    Object.entries(stats).map(([id, s]) => [id, s.best]),
  );
  return <Library bests={bests} />;
}
