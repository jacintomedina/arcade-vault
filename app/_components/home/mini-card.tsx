import Link from "next/link";
import type { Game } from "../../data/games";

export function MiniCard({ game }: { game: Game }) {
  const href = `/games/${game.id}`;
  const btnColor =
    game.color === "magenta" ? "magenta" : game.color === "yellow" ? "yellow" : "";
  return (
    <div className="mini-card">
      <Link className="mini-link" href={href}>
        <div className="mini-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div className="mini-title">{game.title}</div>
      </Link>
      <Link className={("btn mini-btn " + btnColor).trim()} href={href}>
        JUGAR
      </Link>
    </div>
  );
}
