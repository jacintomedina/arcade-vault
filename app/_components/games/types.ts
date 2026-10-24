import type { MutableRefObject } from "react";

export interface GameInput {
	press(key: string, down: boolean): void;
	aim(angle: number | null): void; // rumbo absoluto en rad; null = suelto
}

export interface TouchControlsProps {
	input: GameInput;
}

export interface GameStats {
	score: number;
	lives: number;
	level: number;
}

export interface GameComponentProps {
	paused: boolean; // controlado por GamePlayer
	runKey: number; // al cambiar, reinicia la partida
	inputRef: MutableRefObject<GameInput | null>; // GamePlayer envía aquí el input táctil
	onStats: (s: GameStats) => void; // en cada cambio de score, lives o level
	onGameOver: (finalScore: number) => void; // al perder la última vida
}
