"use client";

import type { GameInput } from "./games/types";

export type PadButton = "up" | "down" | "left" | "right" | "a" | "b";

export interface PadMapping {
	// tecla de GameInput.press por botón; sin entrada = botón desactivado
	up?: string;
	down?: string;
	left?: string;
	right?: string;
	a?: string;
	b?: string;
}

const LABELS: Record<PadButton, string> = {
	up: "Arriba",
	down: "Abajo",
	left: "Izquierda",
	right: "Derecha",
	a: "Botón A",
	b: "Botón B",
};

// El triángulo base apunta arriba; rotate lo orienta.
const ROTATE: Record<"up" | "down" | "left" | "right", number> = {
	up: 0,
	right: 90,
	down: 180,
	left: 270,
};

function HoldButton({
	input,
	button,
	mapping,
	className,
}: {
	input: GameInput;
	button: PadButton;
	mapping: PadMapping;
	className: string;
}) {
	const key = mapping[button];
	const enabled = key !== undefined;
	const isDir = button !== "a" && button !== "b";

	const press = (down: boolean) => {
		if (key !== undefined) input.press(key, down);
	};

	return (
		<button
			type="button"
			tabIndex={-1}
			className={`gb-btn ${className}`}
			aria-label={LABELS[button]}
			aria-disabled={!enabled}
			onPointerDown={(e) => {
				e.preventDefault();
				if (!enabled) return;
				e.currentTarget.setPointerCapture(e.pointerId);
				press(true);
			}}
			onPointerUp={() => press(false)}
			onPointerCancel={() => press(false)}
			onContextMenu={(e) => e.preventDefault()}
		>
			{isDir ? (
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
					style={{ transform: `rotate(${ROTATE[button]}deg)` }}
				>
					<polygon points="12,5 20,18 4,18" />
				</svg>
			) : (
				<span aria-hidden="true">{button.toUpperCase()}</span>
			)}
		</button>
	);
}

export function GameBoyPad({
	input,
	mapping,
}: {
	input: GameInput;
	mapping: PadMapping;
}) {
	const props = { input, mapping };
	return (
		<div className="gb-pad" role="group" aria-label="Gamepad táctil">
			<div className="gb-body">
				<div className="gb-dpad">
					<HoldButton {...props} button="up" className="gb-dir gb-up" />
					<HoldButton {...props} button="left" className="gb-dir gb-left" />
					<span className="gb-hub" aria-hidden="true" />
					<HoldButton {...props} button="right" className="gb-dir gb-right" />
					<HoldButton {...props} button="down" className="gb-dir gb-down" />
				</div>
				<div className="gb-actions">
					<HoldButton {...props} button="b" className="gb-act gb-b" />
					<HoldButton {...props} button="a" className="gb-act gb-a" />
				</div>
			</div>
			<div className="gb-speaker" aria-hidden="true">
				<span />
				<span />
				<span />
				<span />
			</div>
		</div>
	);
}
