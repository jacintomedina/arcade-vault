"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ComponentType,
} from "react";
import Link from "next/link";
import type { Game } from "../data/games";
import {
	AsteroidesControlsHint,
	AsteroidesGame,
} from "./games/asteroides-game";
import {
	ArkanoidControlsHint,
	ArkanoidGame,
} from "./games/arkanoid-game";
import {
	InvasoresControlsHint,
	InvasoresGame,
} from "./games/invasores-game";
import {
	SnakeControlsHint,
	SnakeGame,
} from "./games/snake-game";
import {
	TetrisControlsHint,
	TetrisGame,
} from "./games/tetris-game";
import { SKIN_IDS as TETRIS_SKIN_IDS } from "../_games/tetris/skins";
import { SKIN_IDS as ASTEROIDES_SKIN_IDS } from "../_games/asteroides/skins";
import { SKIN_IDS as SNAKE_SKIN_IDS } from "../_games/snake/skins";
import { SKIN_IDS as ARKANOID_SKIN_IDS } from "../_games/arkanoid/skins";
import { SKIN_IDS as INVASORES_SKIN_IDS } from "../_games/invasores/skins";
import type {
	GameComponentProps,
	GameStats,
	GameInput,
} from "./games/types";
import { GameBoyPad, type PadMapping } from "./gameboy-pad";
import { HighlightIcon } from "./about/highlight-icon";
import { useSession } from "./session-provider";
import { startGameSession, submitScore } from "../_actions/scores";

const INITIAL_LIVES = 3;
const SKIN_LABELS: Record<string, string> = {
	clasico: "Clásico",
	neon: "Neón",
	retro: "Retro",
};
const DEFAULT_SKIN_ID = "clasico";

const SAVE_ERROR = "No se pudo guardar la puntuación.";

// Motor de cada juego del catálogo.
const REAL_GAMES: Record<
	string,
	{
		Component: ComponentType<GameComponentProps>;
		Controls?: ComponentType;
		pad?: PadMapping; // mapeo del gamepad táctil; sin él no hay gamepad
		initialLives?: number; // por defecto INITIAL_LIVES
		skins?: readonly string[]; // skins disponibles; sin ellas no hay selector
	}
> = {
	asteroides: {
		Component: AsteroidesGame,
		Controls: AsteroidesControlsHint,
		pad: { left: "left", right: "right", up: "thrust", a: "fire" },
		skins: ASTEROIDES_SKIN_IDS,
	},
	tetris: {
		Component: TetrisGame,
		Controls: TetrisControlsHint,
		pad: { left: "left", right: "right", down: "down", a: "rotate", b: "drop" },
		initialLives: 1, // evita ver 3 corazones antes del primer onStats
		skins: TETRIS_SKIN_IDS,
	},
	arkanoid: {
		Component: ArkanoidGame,
		Controls: ArkanoidControlsHint,
		pad: { left: "left", right: "right", a: "launch" },
		skins: ARKANOID_SKIN_IDS,
	},
	snake: {
		Component: SnakeGame,
		Controls: SnakeControlsHint,
		pad: { up: "up", down: "down", left: "left", right: "right" },
		initialLives: 1, // sin vidas: evita ver 3 corazones antes del primer onStats
		skins: SNAKE_SKIN_IDS,
	},
	invasores: {
		Component: InvasoresGame,
		Controls: InvasoresControlsHint,
		pad: { left: "left", right: "right", a: "fire" },
		skins: INVASORES_SKIN_IDS,
	},
};

export function GamePlayer({ game }: { game: Game }) {
	const { user } = useSession();
	const { Component, Controls, pad, initialLives, skins } =
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
	const [skin, setSkin] = useState(DEFAULT_SKIN_ID);

	const inputRef = useRef<GameInput | null>(null);
	const [touchInput] = useState<GameInput>(() => ({
		press: (key, down) => inputRef.current?.press(key, down),
		aim: (angle) => inputRef.current?.aim(angle),
	}));
	// Pausado o terminado no se aceptan pulsaciones nuevas; soltar siempre pasa.
	const padInput = useMemo<GameInput>(
		() => ({
			press: (key, down) => {
				if (down && (paused || over)) return;
				touchInput.press(key, down);
			},
			aim: touchInput.aim,
		}),
		[touchInput, paused, over],
	);
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

	// Skin guardada: se lee una sola vez tras montar (evita hydration mismatch).
	useEffect(() => {
		if (!skins) return;
		try {
			const saved = localStorage.getItem(`av_skin_${game.id}`);
			// eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única tras montar, evita desajuste de hidratación
			if (saved && skins.includes(saved)) setSkin(saved);
		} catch {
			// localStorage no disponible: se mantiene la skin por defecto
		}
	}, [game.id, skins]);

	const changeSkin = (id: string) => {
		setSkin(id);
		try {
			localStorage.setItem(`av_skin_${game.id}`, id);
		} catch {
			// sin persistencia
		}
	};

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
				<div className="hud-data">
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
						<div className="v">
							<span className="nv">NV </span>
							{String(level).padStart(2, "0")}
						</div>
					</div>
				</div>
				<div className="hud-actions skin-wrap">
					{skins && (
						<label className="skin-select">
							<span className="skin-select-l">Skin</span>
							<select
								value={skin}
								onChange={(e) => changeSkin(e.target.value)}
								aria-label="Skin del juego"
							>
								{skins.map((id) => (
									<option key={id} value={id}>
										{SKIN_LABELS[id] ?? id}
									</option>
								))}
							</select>
						</label>
					)}
					<button className="btn yellow" onClick={() => setPaused((p) => !p)}>
						{paused ? "REANUDAR" : "PAUSA"}
					</button>
					<button className="btn magenta" onClick={() => setOver(true)}>
						SALIR
					</button>
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
						skin={skin}
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
			{pad && <GameBoyPad input={padInput} mapping={pad} />}
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
										placeholder="NOMBRE"
										aria-label="Nombre"
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
