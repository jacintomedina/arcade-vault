import { W } from "./constants";

export type InputKey = "left" | "right" | "launch";

const KEY_MAP: Record<string, InputKey> = {
	ArrowLeft: "left",
	ArrowRight: "right",
	Space: "launch",
};

export interface InputState {
	/** dirección de la pala con teclado o botones: −1, 0 o 1 (0 si manda el puntero) */
	dir: -1 | 0 | 1;
	/** centro lógico de la pala bajo el puntero, o null si manda el teclado */
	pointerX: number | null;
	/** true una sola vez por pulsación de saque (Espacio, clic o botón) */
	launch: boolean;
}

export interface Input {
	attach(): void;
	detach(): void;
	set(k: InputKey, down: boolean): void;
	/** consume el saque pendiente y devuelve el estado de la pala */
	poll(): InputState;
	clear(): void;
}

export function createInput(canvas: HTMLCanvasElement): Input {
	const held: Record<InputKey, boolean> = {
		left: false,
		right: false,
		launch: false,
	};
	let launchPressed = false;
	let pointerX: number | null = null;
	// Si hay puntero y teclado a la vez, manda el último evento
	let mode: "keys" | "pointer" = "keys";

	const set = (k: InputKey, down: boolean) => {
		// Ignora el auto-repeat del navegador: solo cuenta el flanco de pulsación
		if (held[k] === down) return;
		held[k] = down;
		if (!down) return;
		if (k === "launch") launchPressed = true;
		else mode = "keys";
	};

	const toLogicalX = (e: PointerEvent) => {
		const rect = canvas.getBoundingClientRect();
		return ((e.clientX - rect.left) * W) / rect.width;
	};

	const onKeyDown = (e: KeyboardEvent) => {
		const k = KEY_MAP[e.code];
		if (k) set(k, true);
	};
	const onKeyUp = (e: KeyboardEvent) => {
		const k = KEY_MAP[e.code];
		if (k) set(k, false);
	};
	const onPointerMove = (e: PointerEvent) => {
		pointerX = toLogicalX(e);
		mode = "pointer";
	};
	const onPointerDown = (e: PointerEvent) => {
		e.preventDefault();
		pointerX = toLogicalX(e);
		mode = "pointer";
		launchPressed = true;
	};

	return {
		attach() {
			window.addEventListener("keydown", onKeyDown);
			window.addEventListener("keyup", onKeyUp);
			canvas.addEventListener("pointermove", onPointerMove);
			canvas.addEventListener("pointerdown", onPointerDown);
		},
		detach() {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			canvas.removeEventListener("pointermove", onPointerMove);
			canvas.removeEventListener("pointerdown", onPointerDown);
		},
		set,
		poll() {
			const keys = mode === "keys";
			const dir = keys ? (Number(held.right) - Number(held.left)) : 0;
			const state: InputState = {
				dir: dir as -1 | 0 | 1,
				pointerX: keys ? null : pointerX,
				launch: launchPressed,
			};
			launchPressed = false;
			return state;
		},
		clear() {
			held.left = false;
			held.right = false;
			held.launch = false;
			launchPressed = false;
			pointerX = null;
			mode = "keys";
		},
	};
}
