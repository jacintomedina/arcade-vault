"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import Link from "next/link";
import type { Game } from "../data/games";
import {
  AsteroidesControlsHint,
  AsteroidesGame,
  AsteroidesTouchControls,
} from "./games/asteroides-game";
import {
  ArkanoidControlsHint,
  ArkanoidGame,
} from "./games/arkanoid-game";
import {
  TetrisControlsHint,
  TetrisGame,
  TetrisTouchControls,
} from "./games/tetris-game";
import type {
  GameComponentProps,
  GameStats,
  GameInput,
  TouchControlsProps,
} from "./games/types";
import { HighlightIcon } from "./about/highlight-icon";
import { useSession } from "./session-provider";
import { startGameSession, submitScore } from "../_actions/scores";

const INITIAL_LIVES = 3;
const SAVE_ERROR = "No se pudo guardar la puntuación.";

// Motor de cada juego del catálogo.
const REAL_GAMES: Record<
  string,
  {
    Component: ComponentType<GameComponentProps>;
    Controls?: ComponentType;
    TouchControls?: ComponentType<TouchControlsProps>;
    initialLives?: number; // por defecto INITIAL_LIVES
  }
> = {
  asteroides: {
    Component: AsteroidesGame,
    Controls: AsteroidesControlsHint,
    TouchControls: AsteroidesTouchControls,
  },
  tetris: {
    Component: TetrisGame,
    Controls: TetrisControlsHint,
    TouchControls: TetrisTouchControls,
    initialLives: 1, // evita ver 3 corazones antes del primer onStats
  },
  arkanoid: {
    Component: ArkanoidGame,
    Controls: ArkanoidControlsHint,
  },
};

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const { Component, Controls, TouchControls, initialLives } =
    REAL_GAMES[game.id];
  const startLives = initialLives ?? INITIAL_LIVES;
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionFailed, setSessionFailed] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [lives, setLives] = useState(startLives);
  const [level, setLevel] = useState(1);

  const inputRef = useRef<GameInput | null>(null);
  const [touchInput] = useState<GameInput>(() => ({
    press: (key, down) => inputRef.current?.press(key, down),
    aim: (angle) => inputRef.current?.aim(angle),
  }));
  const name = nameEdit ?? user?.name ?? "PLAYER 1";

  const handleStats = useCallback((s: GameStats) => {
    setScore(s.score);
    setLives(s.lives);
    setLevel(s.level);
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setOver(true);
  }, []);

  // Una sesión de partida del servidor por cada partida.
  useEffect(() => {
    let cancelled = false;
    startGameSession(game.id)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setSessionId(r.sessionId);
        else setSessionFailed(true);
      })
      .catch(() => {
        if (!cancelled) setSessionFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [game.id, runKey]);

  useEffect(() => {
    const GAME_KEYS = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Space",
    ];
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable);

    const onKey = (e: KeyboardEvent) => {
      if (over || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey)
        return;
      if (GAME_KEYS.includes(e.code)) e.preventDefault();
      if (e.type === "keydown" && e.code === "KeyP" && !e.repeat) {
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [over]);

  const restart = () => {
    setScore(0);
    setLives(startLives);
    setLevel(1);
    setRunKey((k) => k + 1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaving(false);
    setRank(null);
    setSaveError(null);
    setSessionId(null);
    setSessionFailed(false);
  };

  const save = async () => {
    if (!sessionId || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const r = await submitScore(sessionId, name, score);
      if (r.ok) {
        setRank(r.rank);
        setSaved(true);
      } else {
        setSaveError(r.error);
      }
    } catch {
      setSaveError(SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v hearts" aria-label={`${lives} vidas`}>
              {lives > 0
                ? Array.from({ length: lives }, (_, i) => (
                    <HighlightIcon key={i} kind="HEART" />
                  ))
                : "—"}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={() => setOver(true)}>
            FIN
          </button>
          <Link className="btn ghost" href={`/games/${game.id}`}>
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <Component
            paused={paused || over}
            runKey={runKey}
            inputRef={inputRef}
            onStats={handleStats}
            onGameOver={handleGameOver}
          />
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {TouchControls && <TouchControls input={touchInput} />}
      {Controls && <Controls />}

      {over && (
        <div className="modal-bd">
          <div className="modal" role="dialog" aria-modal="true">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    onChange={(e) =>
                      setNameEdit(e.target.value.toUpperCase().slice(0, 10))
                    }
                    placeholder="TUS INICIALES"
                    aria-label="Tus iniciales"
                  />
                  <button
                    className="btn yellow"
                    onClick={save}
                    disabled={!sessionId || saving}
                  >
                    {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {(sessionFailed || saveError) && (
                  <p className="save-error" role="alert">
                    {sessionFailed
                      ? "No se pudo iniciar la partida en el servidor."
                      : saveError}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
                {rank !== null && (
                  <div className="save-rank">
                    RANGO #{String(rank).padStart(2, "0")}
                  </div>
                )}
              </>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link className="btn magenta" href="/games">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
