"use client";

import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Game } from "../data/games";

export function GameCard({ game }: { game: Game }) {
  const router = useRouter();
  const tiltRef = useRef<HTMLDivElement>(null);
  const href = `/games/${game.id}`;

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };

  const onLeave = () => {
    const el = tiltRef.current;
    if (el) el.style.transform = "";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.key === "Enter") router.push(href);
  };

  const btnColor =
    game.color === "magenta" ? "magenta" : game.color === "yellow" ? "yellow" : "";

  return (
    <div
      ref={tiltRef}
      className="card"
      role="link"
      tabIndex={0}
      aria-label={game.title}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={() => router.push(href)}
      onKeyDown={onKeyDown}
    >
      <div className="cover">
        <div className={"cover-bg " + game.cover}></div>
        <div className="label">{game.cat}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR PUNTUACIÓN</span>
            <b>{game.best.toLocaleString("es-ES")}</b>
          </div>
          <Link
            className={("btn " + btnColor).trim()}
            href={href}
            onClick={(e) => e.stopPropagation()}
          >
            JUGAR
          </Link>
        </div>
      </div>
    </div>
  );
}
