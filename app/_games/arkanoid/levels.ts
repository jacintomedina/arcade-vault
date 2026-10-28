import { COLS, ROWS, SPEED_STEP } from "./constants";

export type BlockColor =
	| "red"
	| "yellow"
	| "cyan"
	| "magenta"
	| "hotpink"
	| "green"
	| "gray";

export interface LevelBlock {
	col: number;
	row: number;
	color: BlockColor;
}

export interface Level {
	blocks: LevelBlock[];
}

// Multiplicador de velocidad: 1,1^(nivel − 1). Nivel 5 = ×1,4641, nivel 10 = ×2,3579.
export function speedOf(level: number): number {
	return SPEED_STEP ** (level - 1);
}

// Recorre la rejilla completa y se queda con las celdas que cumplen `keep`.
function grid(
	keep: (col: number, row: number) => boolean,
	color: (col: number, row: number) => BlockColor,
): LevelBlock[] {
	const blocks: LevelBlock[] = [];
	for (let row = 0; row < ROWS; row++) {
		for (let col = 0; col < COLS; col++) {
			if (keep(col, row)) blocks.push({ col, row, color: color(col, row) });
		}
	}
	return blocks;
}

const rowColors1: BlockColor[] = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
const rowColors2: BlockColor[] = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
const rowColors4: BlockColor[] = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];
const rowColors6: BlockColor[] = ["yellow", "cyan", "magenta", "green", "hotpink", "red"];
const rowColors7: BlockColor[] = ["green", "hotpink", "red", "yellow", "cyan", "magenta"];
const rowColors8: BlockColor[] = ["magenta", "hotpink", "red", "yellow", "cyan", "green"];
const rowColors10: BlockColor[] = ["red", "hotpink", "magenta", "cyan", "green", "yellow"];

// Nivel 2: columna inicial y final de la pirámide, por fila.
const pyStart = [4, 3, 2, 1, 0, 0];
const pyEnd = [5, 6, 7, 8, 9, 9];

// Nivel 4: huecos por fila.
const gaps4 = [
	[2, 5, 8],
	[0, 4, 7, 9],
	[1, 3, 6],
	[2, 5, 8, 9],
	[0, 4, 7],
	[1, 3, 6, 9],
];

const isFrame = (col: number, row: number) =>
	col === 0 || col === COLS - 1 || row === 0 || row === ROWS - 1;

export const LEVELS: Level[] = [
	// 1: muro completo (60)
	{ blocks: grid(() => true, (_c, r) => rowColors1[r]) },
	// 2: pirámide (40)
	{
		blocks: grid(
			(c, r) => c >= pyStart[r] && c <= pyEnd[r],
			(_c, r) => rowColors2[r],
		),
	},
	// 3: tablero de ajedrez (30)
	{
		blocks: grid(
			(c, r) => (c + r) % 2 === 0,
			(_c, r) => (r < 3 ? "yellow" : "magenta"),
		),
	},
	// 4: huecos por fila (39)
	{
		blocks: grid(
			(c, r) => !gaps4[r].includes(c),
			(_c, r) => rowColors4[r],
		),
	},
	// 5: marco con cruz (39)
	{
		blocks: grid(
			(c, r) => isFrame(c, r) || c === 4 || r === 2,
			(c, r) => (!isFrame(c, r) ? "hotpink" : "cyan"),
		),
	},
	// 6: columnas alternas (30)
	{ blocks: grid((c) => c % 2 === 0, (_c, r) => rowColors6[r]) },
	// 7: diagonales (40)
	{
		blocks: grid(
			(c, r) => (c + r) % 3 !== 0,
			(_c, r) => rowColors7[r],
		),
	},
	// 8: pirámide invertida (30)
	{
		blocks: grid(
			(c, r) => r <= 4 && c >= r && c <= COLS - 1 - r,
			(_c, r) => rowColors8[r],
		),
	},
	// 9: marco doble (40)
	{
		blocks: grid(
			(c, r) => isFrame(c, r) || ((r === 2 || r === 3) && c >= 2 && c <= 7),
			(c, r) => (isFrame(c, r) ? "cyan" : "magenta"),
		),
	},
	// 10: parrilla con hueco central (56)
	{
		blocks: grid(
			(c, r) => !((r === 2 || r === 3) && (c === 4 || c === 5)),
			(_c, r) => rowColors10[r],
		),
	},
];
