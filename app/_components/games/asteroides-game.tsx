"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { createEngine, type Engine } from "../../_games/asteroides/engine";
import type { InputKey } from "../../_games/asteroides/input";
import { resolveSkin } from "../../_games/asteroides/skins";
import { H, W } from "../../_games/asteroides/constants";
import type { GameComponentProps, TouchControlsProps } from "./types";

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

const JOY_RADIUS = 44;
const JOY_DEADZONE = 0.35;

export function AsteroidesTouchControls({ input }: TouchControlsProps) {
	const knobRef = useRef<HTMLDivElement>(null);

	const move = (e: PointerEvent<HTMLDivElement>) => {
		const r = e.currentTarget.getBoundingClientRect();
		let dx = e.clientX - (r.left + r.width / 2);
		let dy = e.clientY - (r.top + r.height / 2);
		const len = Math.hypot(dx, dy);
		if (len > JOY_RADIUS) {
			dx = (dx / len) * JOY_RADIUS;
			dy = (dy / len) * JOY_RADIUS;
		}
		if (knobRef.current)
			knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
		// Arriba del joystick = arriba del canvas (-π/2), sea cual sea la orientación de la nave
		input.aim(len > JOY_RADIUS * JOY_DEADZONE ? Math.atan2(dy, dx) : null);
	};

	const release = () => {
		if (knobRef.current) knobRef.current.style.transform = "";
		input.aim(null);
	};

	return (
		<div className="touch-controls" aria-label="Controles táctiles">
			<div
				className="joystick"
				role="group"
				aria-label="Joystick: dirección de la nave"
				onPointerDown={(e) => {
					e.preventDefault();
					e.currentTarget.setPointerCapture(e.pointerId);
					move(e);
				}}
				onPointerMove={(e) => {
					if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e);
				}}
				onPointerUp={release}
				onPointerCancel={release}
				onContextMenu={(e) => e.preventDefault()}
			>
				<div ref={knobRef} className="joystick-knob" />
			</div>
			<button
				type="button"
				tabIndex={-1}
				className="fire-btn"
				aria-label="Disparar"
				onPointerDown={(e) => {
					e.preventDefault();
					e.currentTarget.setPointerCapture(e.pointerId);
					input.press("fire", true);
				}}
				onPointerUp={() => input.press("fire", false)}
				onPointerCancel={() => input.press("fire", false)}
				onContextMenu={(e) => e.preventDefault()}
			>
				FUEGO
			</button>
		</div>
	);
}
