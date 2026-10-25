"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createEngine, type Engine } from "../../_games/tetris/engine";
import type { InputKey } from "../../_games/tetris/input";
import { H, W } from "../../_games/tetris/constants";
import type { GameComponentProps, TouchControlsProps } from "./types";

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

function HoldButton({
	input,
	k,
	className,
	label,
	children,
}: {
	input: TouchControlsProps["input"];
	k: InputKey;
	className: string;
	label: string;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			tabIndex={-1}
			className={`tt-btn ${className}`}
			aria-label={label}
			onPointerDown={(e) => {
				e.preventDefault();
				e.currentTarget.setPointerCapture(e.pointerId);
				input.press(k, true);
			}}
			onPointerUp={() => input.press(k, false)}
			onPointerCancel={() => input.press(k, false)}
			onContextMenu={(e) => e.preventDefault()}
		>
			{children}
		</button>
	);
}

export function TetrisTouchControls({ input }: TouchControlsProps) {
	return (
		<div className="touch-controls tetris-touch" aria-label="Controles táctiles">
			<div className="tt-pad">
				<HoldButton input={input} k="left" className="tt-move" label="Mover a la izquierda">
					◀
				</HoldButton>
				<HoldButton input={input} k="down" className="tt-move" label="Bajar">
					▼
				</HoldButton>
				<HoldButton input={input} k="right" className="tt-move" label="Mover a la derecha">
					▶
				</HoldButton>
			</div>
			<div className="tt-actions">
				<HoldButton input={input} k="rotate" className="tt-rotate" label="Rotar">
					ROTAR
				</HoldButton>
				<HoldButton input={input} k="drop" className="tt-drop" label="Caída instantánea">
					CAÍDA
				</HoldButton>
			</div>
		</div>
	);
}
