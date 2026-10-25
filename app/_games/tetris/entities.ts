import { BLOCK, COLORS, COLS, NUT_MIN_LEVEL, PIECES, ROWS } from "./constants";

export type Board = number[][];

export interface Piece {
	type: number;
	shape: number[][];
	x: number;
	y: number;
}

/** Hasta el nivel 5 solo las 7 clásicas; desde NUT_MIN_LEVEL también la tuerca. */
export function randomPiece(level: number): Piece {
	const kinds = level >= NUT_MIN_LEVEL ? 8 : 7;
	const type = Math.floor(Math.random() * kinds) + 1;
	const shape = PIECES[type].map((row) => [...row]);
	return {
		type,
		shape,
		x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
		y: 0,
	};
}

export function rotateCW(shape: number[][]): number[][] {
	const rows = shape.length;
	const cols = shape[0].length;
	const result = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
	for (let r = 0; r < rows; r++)
		for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
	return result;
}

export function collide(
	board: Board,
	shape: number[][],
	ox: number,
	oy: number,
): boolean {
	for (let r = 0; r < shape.length; r++) {
		for (let c = 0; c < shape[r].length; c++) {
			if (!shape[r][c]) continue;
			const nx = ox + c;
			const ny = oy + r;
			if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
			if (ny >= 0 && board[ny][nx]) return true;
		}
	}
	return false;
}

export function createBoard(): Board {
	return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

/** Pinta una celda en coordenadas de celda; (ox, oy) es el origen en píxeles. */
export function drawBlock(
	ctx: CanvasRenderingContext2D,
	ox: number,
	oy: number,
	x: number,
	y: number,
	colorIndex: number,
	alpha = 1,
) {
	if (!colorIndex) return;
	const px = ox + x * BLOCK;
	const py = oy + y * BLOCK;
	ctx.globalAlpha = alpha;
	ctx.fillStyle = COLORS[colorIndex];
	ctx.fillRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
	ctx.fillStyle = "rgba(255,255,255,0.12)";
	ctx.fillRect(px + 1, py + 1, BLOCK - 2, 4);
	ctx.globalAlpha = 1;
}
