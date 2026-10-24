import type { MutableRefObject } from "react";

export type InputHandler = (key: string, down: boolean) => void;

export interface TouchControlsProps {
	onInput: InputHandler;
}

export interface GameStats {
	score: number;
	lives: number;
	level: number;
}

export interface GameComponentProps {
	paused: boolean; // controlado por GamePlayer
	runKey: number; // al cambiar, reinicia la partida
	inputRef: MutableRefObject<InputHandler | null>; // GamePlayer envía aquí el input táctil
	onStats: (s: GameStats) => void; // en cada cambio de score, lives o level
	onGameOver: (finalScore: number) => void; // al perder la última vida
}
