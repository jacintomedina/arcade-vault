"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { createEngine, type Engine } from "../../_games/asteroides/engine";
import type { InputKey } from "../../_games/asteroides/input";
import { H, W } from "../../_games/asteroides/constants";
import type { GameComponentProps, TouchControlsProps } from "./types";

export function AsteroidesGame({
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
		inputRef.current = (key, down) =>
			engineRef.current?.setInput(key as InputKey, down);
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

export function AsteroidesTouchControls({ onInput }: TouchControlsProps) {
	const knobRef = useRef<HTMLDivElement>(null);
	const active = useRef<Record<"left" | "right" | "thrust", boolean>>({
		left: false,
		right: false,
		thrust: false,
	});

	const apply = (next: typeof active.current) => {
		for (const k of ["left", "right", "thrust"] as const) {
			if (next[k] !== active.current[k]) onInput(k, next[k]);
		}
		active.current = next;
	};

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
		const t = JOY_RADIUS * JOY_DEADZONE;
		apply({ left: dx < -t, right: dx > t, thrust: dy < -t });
	};

	const release = () => {
		if (knobRef.current) knobRef.current.style.transform = "";
		apply({ left: false, right: false, thrust: false });
	};

	return (
		<div className="touch-controls" aria-label="Controles táctiles">
			<div
				className="joystick"
				role="group"
				aria-label="Joystick: rotar y propulsar"
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
					onInput("fire", true);
				}}
				onPointerUp={() => onInput("fire", false)}
				onPointerCancel={() => onInput("fire", false)}
				onContextMenu={(e) => e.preventDefault()}
			>
				FUEGO
			</button>
		</div>
	);
}
