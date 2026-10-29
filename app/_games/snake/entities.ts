import { CELL, COLS, ROWS, SPRITE_URL } from "./constants";
import type { Skin } from "./skins";

export interface Cell {
	col: number;
	row: number;
}

export type Direction = "up" | "down" | "left" | "right";

export interface Fruit {
	cell: Cell;
	kind: number; // índice en FRUITS
}

export interface FruitSprite {
	name: string;
	x: number;
	y: number;
	w: number;
	h: number;
	color: string; // círculo de respaldo si falla la carga del PNG
}

// Atlas portado de references/source-assets/snake-assets/sprites.js (hoja de 3790×442 px).
export const FRUITS: readonly FruitSprite[] = [
	{ name: "banana", x: 34, y: 136, w: 110, h: 160, color: "#f7d94c" },
	{ name: "orange", x: 186, y: 136, w: 150, h: 160, color: "#f28c28" },
	{ name: "grape", x: 378, y: 136, w: 110, h: 160, color: "#7b3fa0" },
	{ name: "garlic", x: 540, y: 136, w: 130, h: 160, color: "#ece6d6" },
	{ name: "eggplant", x: 712, y: 136, w: 130, h: 160, color: "#5b2a86" },
	{ name: "strawberry", x: 894, y: 136, w: 110, h: 160, color: "#e63946" },
	{ name: "cherry", x: 1066, y: 136, w: 110, h: 160, color: "#b5121b" },
	{ name: "carrot", x: 1228, y: 136, w: 130, h: 160, color: "#f4802a" },
	{ name: "mushroom", x: 1400, y: 136, w: 130, h: 160, color: "#c9a27a" },
	{ name: "broccoli", x: 1582, y: 136, w: 110, h: 160, color: "#3f9d45" },
	{ name: "watermelon", x: 1734, y: 136, w: 150, h: 160, color: "#e8505b" },
	{ name: "pepper", x: 1906, y: 136, w: 150, h: 160, color: "#d62828" },
	{ name: "kiwi", x: 2068, y: 136, w: 170, h: 160, color: "#8ab83a" },
	{ name: "lemon", x: 2250, y: 136, w: 140, h: 160, color: "#f4e04d" },
	{ name: "peach", x: 2432, y: 136, w: 130, h: 160, color: "#f9a977" },
	{ name: "peanut", x: 2604, y: 136, w: 130, h: 160, color: "#c79a5b" },
	{ name: "apple", x: 2786, y: 136, w: 110, h: 160, color: "#d7263d" },
	{ name: "tomato", x: 2948, y: 136, w: 130, h: 160, color: "#e03a2f" },
	{ name: "berries", x: 3110, y: 136, w: 150, h: 160, color: "#3d4a9c" },
	{ name: "grapes2", x: 3302, y: 136, w: 110, h: 160, color: "#8e5bb5" },
	{ name: "pineapple", x: 3454, y: 136, w: 150, h: 160, color: "#f2b630" },
	{ name: "melon", x: 3637, y: 136, w: 130, h: 160, color: "#b6d96b" },
];

export function loadSprites(): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`No se pudo cargar ${SPRITE_URL}`));
		img.src = SPRITE_URL;
	});
}

export function drawBoard(ctx: CanvasRenderingContext2D, skin: Skin): void {
	for (let row = 0; row < ROWS; row++) {
		for (let col = 0; col < COLS; col++) {
			ctx.fillStyle = (col + row) % 2 === 0 ? skin.boardLight : skin.boardDark;
			ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
		}
	}
	if (skin.gridLine) {
		ctx.strokeStyle = skin.gridLine;
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let col = 0; col <= COLS; col++) {
			ctx.moveTo(col * CELL + 0.5, 0);
			ctx.lineTo(col * CELL + 0.5, ROWS * CELL);
		}
		for (let row = 0; row <= ROWS; row++) {
			ctx.moveTo(0, row * CELL + 0.5);
			ctx.lineTo(COLS * CELL, row * CELL + 0.5);
		}
		ctx.stroke();
	}
}

function roundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
): void {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
	ctx.fill();
}

// body[0] es la cabeza. Los segmentos se unen rellenando el hueco con el vecino
// (salvo al cruzar un borde, donde el vecino queda al otro lado del tablero).
export function drawSnake(
	ctx: CanvasRenderingContext2D,
	skin: Skin,
	body: readonly Cell[],
	dir: Direction,
): void {
	const pad = skin.snakePad;
	ctx.shadowColor = skin.snakeBody;
	ctx.shadowBlur = skin.glow;
	const size = CELL - pad * 2;
	ctx.fillStyle = skin.snakeBody;
	for (let i = body.length - 1; i >= 0; i--) {
		const c = body[i];
		const x = c.col * CELL + pad;
		const y = c.row * CELL + pad;
		roundedRect(ctx, x, y, size, size, skin.bodyRadius);
		const next = body[i - 1];
		if (!next) continue;
		const dc = next.col - c.col;
		const dr = next.row - c.row;
		if (dc === 1 && dr === 0) ctx.fillRect(x + size - 4, y, pad * 2 + 4, size);
		else if (dc === -1 && dr === 0) ctx.fillRect(x - pad * 2, y, pad * 2 + 4, size);
		else if (dr === 1 && dc === 0) ctx.fillRect(x, y + size - 4, size, pad * 2 + 4);
		else if (dr === -1 && dc === 0) ctx.fillRect(x, y - pad * 2, size, pad * 2 + 4);
	}

	const head = body[0];
	const hx = head.col * CELL + CELL / 2;
	const hy = head.row * CELL + CELL / 2;
	ctx.shadowColor = skin.snakeHead;
	ctx.fillStyle = skin.snakeHead;
	roundedRect(ctx, head.col * CELL + pad, head.row * CELL + pad, size, size, skin.headRadius);
	ctx.shadowBlur = 0;
	ctx.shadowColor = "transparent";

	// Ojos en el lado hacia el que mira.
	const horizontal = dir === "left" || dir === "right";
	const fx = dir === "right" ? 6 : dir === "left" ? -6 : 0;
	const fy = dir === "down" ? 6 : dir === "up" ? -6 : 0;
	for (const s of [-1, 1]) {
		const ex = hx + fx + (horizontal ? 0 : s * 7);
		const ey = hy + fy + (horizontal ? s * 7 : 0);
		ctx.fillStyle = skin.eyeWhite;
		ctx.beginPath();
		ctx.arc(ex, ey, 5, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = skin.eyePupil;
		ctx.beginPath();
		ctx.arc(ex + fx / 3, ey + fy / 3, 2.5, 0, Math.PI * 2);
		ctx.fill();
	}
}

// Dibuja la fruta dentro de su celda, sin deformar y centrada. `scale` anima el pulso al comerla.
export function drawFruit(
	ctx: CanvasRenderingContext2D,
	skin: Skin,
	img: HTMLImageElement | null,
	fruit: Fruit,
	scale = 1,
): void {
	const sprite = FRUITS[fruit.kind];
	const cx = fruit.cell.col * CELL + CELL / 2;
	const cy = fruit.cell.row * CELL + CELL / 2;
	const box = (CELL - 4) * scale;
	if (skin.fruitStyle === "block") {
		const s = box * 0.7;
		ctx.fillStyle = skin.fruitBlock;
		ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
		return;
	}
	ctx.shadowColor = skin.fruitGlow;
	ctx.shadowBlur = skin.glow;
	if (!img) {
		ctx.fillStyle = sprite.color;
		ctx.beginPath();
		ctx.arc(cx, cy, box / 2, 0, Math.PI * 2);
		ctx.fill();
	} else {
		const k = Math.min(box / sprite.w, box / sprite.h);
		const dw = sprite.w * k;
		const dh = sprite.h * k;
		ctx.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, cx - dw / 2, cy - dh / 2, dw, dh);
	}
	ctx.shadowBlur = 0;
	ctx.shadowColor = "transparent";
}
