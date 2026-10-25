"use client";

import { useEffect, useRef } from "react";
import { createEngine, type Engine } from "../../_games/tetris/engine";
import type { InputKey } from "../../_games/tetris/input";
import { H, W } from "../../_games/tetris/constants";
import type { GameComponentProps } from "./types";

export function TetrisGame({
	paused,
	runKey,
	inputRef,
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

	useEffect(() => {
		inputRef.current = {
			press: (key, down) =>
				engineRef.current?.setInput(key as InputKey, down),
			aim: () => {}, // Tetris no usa joystick
		};
		return () => {
			inputRef.current = null;
		};
	}, [inputRef]);

	return (
		<canvas
			ref={canvasRef}
			className="tetris-canvas"
			width={W}
			height={H}
			aria-label="Tetris: área de juego"
		/>
	);
}

export function TetrisControlsHint() {
	return (
		<p className="controls-hint">
			<span>
				<kbd>←</kbd>
				<kbd>→</kbd> mover
			</span>
			<span>
				<kbd>↓</kbd> bajar
			</span>
			<span>
				<kbd>↑</kbd>
				<kbd>X</kbd> rotar
			</span>
			<span>
				<kbd>Espacio</kbd> caída
			</span>
			<span>
				<kbd>P</kbd> pausa
			</span>
		</p>
	);
}
