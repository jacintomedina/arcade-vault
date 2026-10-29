"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createEngine, type Engine } from "../../_games/arkanoid/engine";
import type { InputKey } from "../../_games/arkanoid/input";
import { H, W } from "../../_games/arkanoid/constants";
import { resolveSkin } from "../../_games/arkanoid/skins";
import type { GameComponentProps, TouchControlsProps } from "./types";

export function ArkanoidGame({
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
			aim: () => {}, // Arkanoid no usa joystick
		};
		return () => {
			inputRef.current = null;
		};
	}, [inputRef]);

	return (
		<canvas
			ref={canvasRef}
			className="arkanoid-canvas"
			width={W}
			height={H}
			aria-label="Arkanoid: área de juego"
		/>
	);
}

export function ArkanoidControlsHint() {
	return (
		<p className="controls-hint">
			<span>
				<kbd>←</kbd>
				<kbd>→</kbd> mover
			</span>
			<span>
				<kbd>Espacio</kbd> lanzar
			</span>
			<span>
				<kbd>Clic</kbd> lanzar
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

// El triángulo base apunta a la izquierda; rotate lo orienta.
const Arrow = ({ rotate }: { rotate: number }) => (
	<svg
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill="currentColor"
		aria-hidden="true"
		style={{ transform: `rotate(${rotate}deg)` }}
	>
		<polygon points="19,4 19,20 5,12" />
	</svg>
);

export function ArkanoidTouchControls({ input }: TouchControlsProps) {
	return (
		<div className="touch-controls" aria-label="Controles táctiles">
			<div className="tt-pad">
				<HoldButton input={input} k="left" className="tt-move" label="Mover a la izquierda">
					<Arrow rotate={0} />
				</HoldButton>
				<HoldButton input={input} k="right" className="tt-move" label="Mover a la derecha">
					<Arrow rotate={180} />
				</HoldButton>
			</div>
			<HoldButton input={input} k="launch" className="ak-launch" label="Lanzar la bola">
				LANZAR
			</HoldButton>
		</div>
	);
}
