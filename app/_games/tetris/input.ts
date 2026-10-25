import { ARR, DAS } from "./constants";

export type InputKey = "left" | "right" | "down" | "rotate" | "drop";

const KEY_MAP: Record<string, InputKey> = {
	ArrowLeft: "left",
	ArrowRight: "right",
	ArrowDown: "down",
	ArrowUp: "rotate",
	KeyX: "rotate",
	Space: "drop",
};

type RepeatKey = "left" | "right" | "down";
const REPEAT_KEYS: RepeatKey[] = ["left", "right", "down"];

export interface InputActions {
	/** pasos a ejecutar en este frame (pulsación inicial + repeticiones) */
	left: number;
	right: number;
	down: number;
	rotate: boolean;
	drop: boolean;
}

export interface Input {
	attach(): void;
	detach(): void;
	set(k: InputKey, down: boolean): void;
	/** consume las acciones pendientes y avanza el auto-repeat */
	poll(dt: number): InputActions;
	clear(): void;
}

export function createInput(): Input {
	const held: Record<InputKey, boolean> = {
		left: false,
		right: false,
		down: false,
		rotate: false,
		drop: false,
	};
	// Pasos pendientes de la pulsación inicial y tiempo hasta la próxima repetición
	const pending: Record<RepeatKey, number> = { left: 0, right: 0, down: 0 };
	const timer: Record<RepeatKey, number> = { left: 0, right: 0, down: 0 };
	let rotatePressed = false;
	let dropPressed = false;

	const set = (k: InputKey, down: boolean) => {
		// Ignora el auto-repeat del navegador: solo cuenta el flanco de pulsación
		if (held[k] === down) return;
		held[k] = down;
		if (!down) return;
		if (k === "rotate") rotatePressed = true;
		else if (k === "drop") dropPressed = true;
		else {
			pending[k]++;
			timer[k] = DAS;
		}
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
		poll(dt) {
			const steps: Record<RepeatKey, number> = { left: 0, right: 0, down: 0 };
			for (const k of REPEAT_KEYS) {
				steps[k] = pending[k];
				pending[k] = 0;
				if (!held[k]) continue;
				timer[k] -= dt;
				while (timer[k] <= 0) {
					steps[k]++;
					timer[k] += ARR;
				}
			}
			const actions: InputActions = {
				...steps,
				rotate: rotatePressed,
				drop: dropPressed,
			};
			rotatePressed = false;
			dropPressed = false;
			return actions;
		},
		clear() {
			for (const k of Object.keys(held) as InputKey[]) held[k] = false;
			for (const k of REPEAT_KEYS) {
				pending[k] = 0;
				timer[k] = 0;
			}
			rotatePressed = false;
			dropPressed = false;
		},
	};
}
