"use client";

import { useState } from "react";
import Link from "next/link";
import { GAMES } from "../data/games";

export interface HallRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

function PodiumSlot({
  row,
  tier,
  position,
}: {
  row: HallRow | undefined;
  tier: "gold" | "silver" | "bronze";
  position: string;
}) {
  const champion = tier === "gold";
  return (
    <div className={`podium-slot ${tier}`}>
      {champion && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={champion ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {position}
      </div>
      <div className="name">{row ? row.name : "—"}</div>
      <div className="score" style={champion ? { fontSize: 20 } : undefined}>
        {row ? row.score.toLocaleString("es-ES") : "—"}
      </div>
      <div className="date">{row ? row.date : "VACANTE"}</div>
    </div>
  );
}

export function HallOfFame({
  rowsByGame,
}: {
  rowsByGame: Record<string, HallRow[]>;
}) {
  const [tab, setTab] = useState(GAMES[0].id);
  const rows = rowsByGame[tab] ?? [];
  const game = GAMES.find((g) => g.id === tab) ?? GAMES[0];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1 className="flicker">SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="hall-empty">
          <div className="pixel neon-yellow">SÉ EL PRIMERO EN JUGAR!</div>
          <p className="mono">AÚN NO HAY MARCAS EN {game.title}</p>
          <Link className="btn yellow" href={`/games/${game.id}`}>
            VER {game.title}
          </Link>
        </div>
      ) : (
        <>
          <div className="podium">
            <PodiumSlot row={rows[1]} tier="silver" position="02" />
            <PodiumSlot row={rows[0]} tier="gold" position="01" />
            <PodiumSlot row={rows[2]} tier="bronze" position="03" />
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
                className={
                  "tr" +
                  (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="btn lg" href="/games">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
