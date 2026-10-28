import type { Direction } from "./entities";

export type InputKey = Direction;

const KEY_MAP: Record<string, InputKey> = {
	ArrowUp: "up",
	ArrowDown: "down",
	ArrowLeft: "left",
	ArrowRight: "right",
	KeyW: "up",
	KeyS: "down",
	KeyA: "left",
	KeyD: "right",
};

export interface Input {
	attach(): void;
	detach(): void;
	set(k: InputKey, down: boolean): void;
	/** consume y devuelve las pulsaciones de dirección desde la última llamada, en orden */
	poll(): InputKey[];
	clear(): void;
}

function isTextField(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

export function createInput(): Input {
	const held: Record<InputKey, boolean> = {
		up: false,
		down: false,
		left: false,
		right: false,
	};
	let pressed: InputKey[] = [];

	const set = (k: InputKey, down: boolean) => {
		// Ignora el auto-repeat del navegador: solo cuenta el flanco de pulsación
		if (held[k] === down) return;
		held[k] = down;
		if (down) pressed.push(k);
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.ctrlKey || e.metaKey || e.altKey || isTextField(e.target)) return;
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
		poll() {
			const out = pressed;
			pressed = [];
			return out;
		},
		clear() {
			held.up = held.down = held.left = held.right = false;
			pressed = [];
		},
	};
}
