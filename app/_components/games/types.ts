export interface GameStats {
	score: number;
	lives: number;
	level: number;
}

export interface GameComponentProps {
	paused: boolean; // controlado por GamePlayer
	runKey: number; // al cambiar, reinicia la partida
	onStats: (s: GameStats) => void; // en cada cambio de score, lives o level
	onGameOver: (finalScore: number) => void; // al perder la última vida
}
