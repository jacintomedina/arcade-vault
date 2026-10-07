import { notFound } from "next/navigation";
import { GamePlayer } from "../../../_components/game-player";
import { GAMES } from "../../../data/games";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export default async function PlayPage({
  params,
}: PageProps<"/games/[id]/play">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
