"use client";

import { useEffect, useRef } from "react";
import { createEngine, type Engine } from "../../_games/invasores/engine";
import type { InputKey } from "../../_games/invasores/input";
import { resolveSkin } from "../../_games/invasores/skins";
import { H, W } from "../../_games/invasores/constants";
import type { GameComponentProps } from "./types";

const INPUT_KEYS: readonly string[] = ["left", "right", "fire"];

export function InvasoresGame({
	paused,
	runKey,
	inputRef,
	onStats,
	onGameOver,
	skin,
}: GameComponentProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const engineRef = useRef<Engine | null>(null);
	const onStatsRef = useRef(onStats);
	const onGameOverRef = useRef(onGameOver);
	const pausedRef = useRef(paused);
	const skinRef = useRef(resolveSkin(skin));

	useEffect(() => {
		onStatsRef.current = onStats;
		onGameOverRef.current = onGameOver;
		pausedRef.current = paused;
		skinRef.current = resolveSkin(skin);
	});

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const engine = createEngine({
			canvas,
			onStats: (s) => onStatsRef.current(s),
			onGameOver: (score) => onGameOverRef.current(score),
			skin: skinRef.current,
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
		engineRef.current?.setSkin(resolveSkin(skin));
	}, [skin]);

	useEffect(() => {
		inputRef.current = {
			press: (key, down) => {
				if (INPUT_KEYS.includes(key)) {
					engineRef.current?.setInput(key as InputKey, down);
				}
			},
			aim: () => {},
		};
		return () => {
			inputRef.current = null;
		};
	}, [inputRef]);

	return (
		<canvas
			ref={canvasRef}
			className="invasores-canvas"
			width={W}
			height={H}
			aria-label="Invasores: área de juego"
		/>
	);
}

export function InvasoresControlsHint() {
	return (
		<p className="controls-hint">
			<span>
				<kbd>←</kbd>
				<kbd>→</kbd> mover
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
