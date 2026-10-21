"use client";

import { useEffect, useRef } from "react";
import { createEngine, type Engine } from "../../_games/asteroides/engine";
import type { InputKey } from "../../_games/asteroides/input";
import { H, W } from "../../_games/asteroides/constants";
import type { GameComponentProps } from "./types";

const TOUCH_BUTTONS: {
	key: InputKey;
	label: string;
	glyph: string;
	cls: string;
}[] = [
	{ key: "left", label: "Rotar a la izquierda", glyph: "◀", cls: "left" },
	{ key: "right", label: "Rotar a la derecha", glyph: "▶", cls: "right" },
	{ key: "thrust", label: "Propulsar", glyph: "▲", cls: "thrust" },
	{ key: "fire", label: "Disparar", glyph: "●", cls: "fire" },
];

export function AsteroidesGame({
	paused,
	runKey,
	onStats,
	onGameOver,
}: GameComponentProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const engineRef = useRef<Engine | null>(null);
	const onStatsRef = useRef(onStats);
	const onGameOverRef = useRef(onGameOver);
	const pausedRef = useRef(paused);

	useEffect(() => {
		onStatsRef.current = onStats;
		onGameOverRef.current = onGameOver;
		pausedRef.current = paused;
	});

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const engine = createEngine({
			canvas,
			onStats: (s) => onStatsRef.current(s),
			onGameOver: (score) => onGameOverRef.current(score),
		});
		engineRef.current = engine;
		engine.setPaused(pausedRef.current);
		engine.start();
		return () => {
			engine.stop();
			engineRef.current = null;
		};
		// runKey reinicia la partida: se recrea el motor
	}, [runKey]);

	useEffect(() => {
		engineRef.current?.setPaused(paused);
	}, [paused]);

	const press = (key: InputKey, down: boolean) => engineRef.current?.setInput(key, down);

	return (
		<>
			<canvas
				ref={canvasRef}
				className="asteroides-canvas"
				width={W}
				height={H}
				aria-label="Asteroides: área de juego"
			/>
			<div className="touch-controls" aria-label="Controles táctiles">
				{TOUCH_BUTTONS.map((b) => (
					<button
						key={b.key}
						type="button"
						tabIndex={-1}
						className={`touch-btn ${b.cls}`}
						aria-label={b.label}
						onPointerDown={(e) => {
							e.preventDefault();
							e.currentTarget.setPointerCapture(e.pointerId);
							press(b.key, true);
						}}
						onPointerUp={() => press(b.key, false)}
						onPointerCancel={() => press(b.key, false)}
						onContextMenu={(e) => e.preventDefault()}
					>
						{b.glyph}
					</button>
				))}
			</div>
		</>
	);
}

export function AsteroidesControlsHint() {
	return (
		<p className="controls-hint">
			<span>
				<kbd>←</kbd>
				<kbd>→</kbd> rotar
			</span>
			<span>
				<kbd>↑</kbd> propulsar
			</span>
			<span>
				<kbd>Espacio</kbd> disparar
			</span>
			<span>
				<kbd>P</kbd> pausa
			</span>
		</p>
	);
}
