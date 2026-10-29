"use client";

import { useEffect, useRef } from "react";
import { createEngine, type Engine } from "../../_games/asteroides/engine";
import type { InputKey } from "../../_games/asteroides/input";
import { resolveSkin } from "../../_games/asteroides/skins";
import { H, W } from "../../_games/asteroides/constants";
import type { GameComponentProps } from "./types";

export function AsteroidesGame({
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
			press: (key, down) =>
				engineRef.current?.setInput(key as InputKey, down),
			aim: (angle) => engineRef.current?.setAim(angle),
		};
		return () => {
			inputRef.current = null;
		};
	}, [inputRef]);

	return (
		<canvas
			ref={canvasRef}
			className="asteroides-canvas"
			width={W}
			height={H}
			aria-label="Asteroides: área de juego"
		/>
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
