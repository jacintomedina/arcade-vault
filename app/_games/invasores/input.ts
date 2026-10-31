export type InputKey = "left" | "right" | "fire";

const KEY_MAP: Record<string, InputKey> = {
	ArrowLeft: "left",
	ArrowRight: "right",
	Space: "fire",
};

export interface InputState {
	/** dirección del cañón: −1, 0 o 1 (ambas teclas a la vez se anulan) */
	dir: -1 | 0 | 1;
	/** true mientras Espacio o FUEGO están pulsados; el enfriamiento lo aplica el motor */
	fire: boolean;
}

export interface Input {
	attach(): void;
	detach(): void;
	set(k: InputKey, down: boolean): void;
	poll(): InputState;
	clear(): void;
}

export function createInput(): Input {
	const held: Record<InputKey, boolean> = {
		left: false,
		right: false,
		fire: false,
	};

	const set = (k: InputKey, down: boolean) => {
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
		poll() {
			const dir = Number(held.right) - Number(held.left);
			return { dir: dir as -1 | 0 | 1, fire: held.fire };
		},
		clear() {
			held.left = false;
			held.right = false;
			held.fire = false;
		},
	};
}
