import type { BlockColor } from "./levels";

export const SPRITESHEET_SRC = "/games/arkanoid/spritesheet-breakout.png";

export interface Block {
	x: number;
	y: number;
	w: number;
	h: number;
	color: BlockColor;
}

export interface Ball {
	x: number;
	y: number;
	w: number;
	h: number;
	vx: number;
	vy: number;
}

export interface Paddle {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Explosion {
	x: number;
	y: number;
	w: number;
	h: number;
	color: BlockColor;
	elapsed: number; // ms
}

export interface Frame {
	sx: number;
	sy: number;
	sw: number;
	sh: number;
}

// Fila del spritesheet por color; la columna 256 + 32·i son los 4 frames de explosión.
const BLOCK_ROW_Y: Record<BlockColor, number> = {
	red: 176,
	cyan: 192,
	green: 208,
	magenta: 224,
	yellow: 240,
	hotpink: 256,
	gray: 288,
};

function blockFrame(color: BlockColor): Frame {
	return { sx: 32, sy: BLOCK_ROW_Y[color], sw: 32, sh: 16 };
}

// El gris del original reutiliza la animación del rojo.
function explosionFrames(color: BlockColor): Frame[] {
	const y = color === "gray" ? BLOCK_ROW_Y.red : BLOCK_ROW_Y[color];
	return [0, 1, 2, 3].map((i) => ({ sx: 256 + i * 32, sy: y, sw: 32, sh: 16 }));
}

const COLORS: BlockColor[] = ["red", "cyan", "green", "magenta", "yellow", "hotpink", "gray"];

export const SPRITES = {
	paddle: { sx: 32, sy: 112, sw: 162, sh: 14 } as Frame,
	ball: { sx: 32, sy: 32, sw: 16, sh: 16 } as Frame,
	blocks: Object.fromEntries(COLORS.map((c) => [c, blockFrame(c)])) as Record<
		BlockColor,
		Frame
	>,
};

export const EXPLOSION_FRAMES = Object.fromEntries(
	COLORS.map((c) => [c, explosionFrames(c)]),
) as Record<BlockColor, Frame[]>;

// Colores del fallback sin spritesheet.
export const FALLBACK_COLORS: Record<BlockColor, string> = {
	red: "#ff3b3b",
	yellow: "#f5ff00",
	cyan: "#00f5ff",
	magenta: "#aa00ff",
	hotpink: "#ff006e",
	green: "#00ff88",
	gray: "#9e9e9e",
};

export function loadSpritesheet(): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("No se pudo cargar el spritesheet"));
		img.src = SPRITESHEET_SRC;
	});
}

export function drawFrame(
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement,
	frame: Frame,
	x: number,
	y: number,
	w: number,
	h: number,
) {
	ctx.drawImage(img, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

export type SpriteName = "paddle" | "ball" | `block_${BlockColor}`;

export function drawSprite(
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement,
	name: SpriteName,
	x: number,
	y: number,
	w: number,
	h: number,
) {
	const frame = name.startsWith("block_")
		? SPRITES.blocks[name.slice(6) as BlockColor]
		: SPRITES[name as "paddle" | "ball"];
	drawFrame(ctx, img, frame, x, y, w, h);
}
