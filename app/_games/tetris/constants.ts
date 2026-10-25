// Canvas lógico 4:3; el tablero (300×600) se pinta dentro.
export const W = 800;
export const H = 600;

export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const BOARD_X = 150;

// Panel SIGUIENTE: caja de 4×4 celdas
export const NEXT_X = 520;
export const NEXT_Y = 60;

// Índice = tipo de pieza (posición 0 sin uso)
export const COLORS = [
	"",
	"#4dd0e1", // I - cyan
	"#ffd54f", // O - amarillo
	"#ba68c8", // T - morado
	"#81c784", // S - verde
	"#e57373", // Z - rojo
	"#90caf9", // J - azul pálido
	"#ffb74d", // L - naranja
	"#9e9e9e", // N - tuerca (gris metálico)
];

export const PIECES: number[][][] = [
	[],
	[[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
	[[2, 2], [2, 2]], // O
	[[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
	[[0, 4, 4], [4, 4, 0], [0, 0, 0]], // S
	[[5, 5, 0], [0, 5, 5], [0, 0, 0]], // Z
	[[6, 0, 0], [6, 6, 6], [0, 0, 0]], // J
	[[0, 0, 7], [7, 7, 7], [0, 0, 0]], // L
	[[8, 8, 8], [8, 0, 8], [8, 8, 8]], // N (tuerca)
];

export const LINE_SCORES = [0, 100, 300, 500, 800];

export const MAX_LEVEL = 15;
/** La tuerca solo se genera desde este nivel. */
export const NUT_MIN_LEVEL = 6;

export const MAX_DT = 0.05;

/** Auto-repeat de ← → ↓ (segundos). */
export const DAS = 0.17;
export const ARR = 0.05;

/** Duración del parpadeo al borrar líneas (segundos). */
export const CLEAR_TIME = 0.3;
