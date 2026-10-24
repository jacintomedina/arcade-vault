import type { ShipControls } from "./entities";

export type InputKey = "left" | "right" | "thrust" | "fire";

const KEY_MAP: Record<string, InputKey> = {
	ArrowLeft: "left",
	ArrowRight: "right",
	ArrowUp: "thrust",
	Space: "fire",
};

export interface Input {
	attach(): void;
	detach(): void;
	set(k: InputKey, down: boolean): void;
	setAim(angle: number | null): void;
	controls(): ShipControls;
	/** true una sola vez por pulsación de disparo */
	consumeFire(): boolean;
	clear(): void;
}

export function createInput(): Input {
	const held: Record<InputKey, boolean> = {
		left: false,
		right: false,
		thrust: false,
		fire: false,
	};
	let firePressed = false;
	let aim: number | null = null;

	const set = (k: InputKey, down: boolean) => {
		if (k === "fire" && down && !held.fire) firePressed = true;
		held[k] = down;
	};

	const onKeyDown = (e: KeyboardEvent) => {
		const k = KEY_MAP[e.code];
		if (k) set(k, true);
	};
	const onKeyUp = (e: KeyboardEvent) => {
		const k = KEY_MAP[e.code];
		if (k) set(k, false);
	};

	return {
		attach() {
			window.addEventListener("keydown", onKeyDown);
			window.addEventListener("keyup", onKeyUp);
		},
		detach() {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		},
		set,
		setAim(angle) {
			aim = angle;
		},
		controls: () => ({
			left: held.left,
			right: held.right,
			thrust: held.thrust,
			aim,
		}),
		consumeFire() {
			const v = firePressed;
			firePressed = false;
			return v;
		},
		clear() {
			held.left = held.right = held.thrust = held.fire = false;
			firePressed = false;
			aim = null;
		},
	};
}
