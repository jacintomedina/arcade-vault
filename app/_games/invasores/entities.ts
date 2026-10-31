import {
	ALIEN_H,
	ALIEN_W,
	SHIELD_CELL,
	SHIELD_COLS,
	SHIELD_ROWS,
	SHIELD_BLAST,
	SHIP_H,
	SHIP_W,
	SHIP_Y,
	UFO_H,
	UFO_W,
} from "./constants";
import type { Skin } from "./skins";

// ───────────────────────── Tipos ─────────────────────────

export interface Alien {
	col: number;
	row: number;
	alive: boolean;
}

export interface Bullet {
	x: number; // esquina superior izquierda
	y: number;
	vy: number; // px/s; negativo sube
}

export interface Shield {
	x: number; // esquina superior izquierda en el canvas
	y: number;
	cells: Uint8Array; // SHIELD_COLS × SHIELD_ROWS; 1 = celda viva
}

export interface Ufo {
	x: number;
	dir: 1 | -1;
	points: number;
}

export interface Ship {
	x: number; // esquina superior izquierda; la y es fija (SHIP_Y)
}

// ───────────────────────── Sprites ─────────────────────────
// Bitmaps de texto: "X" pinta, "." no. Sin PNG ni Image.

export type Sprite = readonly string[];
export type Frames = readonly [Sprite, Sprite];

export const SPRITES: {
	squid: Frames;
	crab: Frames;
	octopus: Frames;
	cannon: Sprite;
	ufo: Sprite;
	explosion: Sprite;
} = {
	// Fila 0 (30 puntos).
	squid: [
		[
			"....XXX....",
			"...XXXXX...",
			"..XXXXXXX..",
			".XX.XXX.XX.",
			".XXXXXXXXX.",
			"...X...X...",
			"..X.XXX.X..",
			".X.X...X.X.",
		],
		[
			"....XXX....",
			"...XXXXX...",
			"..XXXXXXX..",
			".XX.XXX.XX.",
			".XXXXXXXXX.",
			"..XX...XX..",
			".X.XXXXX.X.",
			"X..X...X..X",
		],
	],
	// Filas 1 y 2 (20 puntos).
	crab: [
		[
			"..X.....X..",
			"...X...X...",
			"..XXXXXXX..",
			".XX.XXX.XX.",
			"XXXXXXXXXXX",
			"X.XXXXXXX.X",
			"X.X.....X.X",
			"...XX.XX...",
		],
		[
			"..X.....X..",
			"X..X...X..X",
			"X.XXXXXXX.X",
			"XXX.XXX.XXX",
			"XXXXXXXXXXX",
			".XXXXXXXXX.",
			"..X.....X..",
			".X.......X.",
		],
	],
	// Filas 3 y 4 (10 puntos).
	octopus: [
		[
			"...XXXXX...",
			".XXXXXXXXX.",
			"XXXXXXXXXXX",
			"XXX..X..XXX",
			"XXXXXXXXXXX",
			"..XX...XX..",
			".XX.XXX.XX.",
			"XX.......XX",
		],
		[
			"...XXXXX...",
			".XXXXXXXXX.",
			"XXXXXXXXXXX",
			"XXX..X..XXX",
			"XXXXXXXXXXX",
			"..XXX.XXX..",
			".XX.....XX.",
			"..XX...XX..",
		],
	],
	// 11×5 celdas de 4 px = 44×20.
	cannon: [
		".....X.....",
		"....XXX....",
		"XXXXXXXXXXX",
		"XXXXXXXXXXX",
		"XXXXXXXXXXX",
	],
	// 20×6 celdas de 2×3 px = 40×18.
	ufo: [
		"......XXXXXXXX......",
		"....XXXXXXXXXXXX....",
		"..XXXXXXXXXXXXXXXX..",
		"XX.XX.XX.XX.XX.XX.XX",
		"XXXXXXXXXXXXXXXXXXXX",
		"..XXX..........XXX..",
	],
	// Explosión de invasor y de cañón (11×8).
	explosion: [
		"X....X....X",
		".X...X...X.",
		"..X..X..X..",
		"...X...X...",
		"XXX.....XXX",
		"...X...X...",
		"..X..X..X..",
		".X...X...X.",
	],
};

// Sprite de cada fila de la formación, de arriba abajo.
export const ROW_SPRITE: readonly Frames[] = [
	SPRITES.squid,
	SPRITES.crab,
	SPRITES.crab,
	SPRITES.octopus,
	SPRITES.octopus,
];

// ───────────────────────── Dibujo ─────────────────────────

/** Pinta un bitmap de texto con `fillRect`. (x, y) es la esquina superior izquierda. */
export function drawSprite(
	ctx: CanvasRenderingContext2D,
	sprite: Sprite,
	x: number,
	y: number,
	cellW: number,
	cellH: number,
	color: string,
	glow = 0,
): void {
	ctx.fillStyle = color;
	if (glow > 0) {
		ctx.shadowColor = color;
		ctx.shadowBlur = glow;
	}
	for (let r = 0; r < sprite.length; r++) {
		const line = sprite[r];
		let c = 0;
		while (c < line.length) {
			if (line[c] !== "X") {
				c++;
				continue;
			}
			const start = c;
			while (c < line.length && line[c] === "X") c++;
			ctx.fillRect(
				Math.round(x + start * cellW),
				Math.round(y + r * cellH),
				Math.round((c - start) * cellW),
				Math.ceil(cellH),
			);
		}
	}
	if (glow > 0) resetGlow(ctx);
}

/** Restaura shadowBlur y shadowColor tras un dibujo con brillo. */
export function resetGlow(ctx: CanvasRenderingContext2D): void {
	ctx.shadowBlur = 0;
	ctx.shadowColor = "transparent";
}

/** Invasor de la fila `row` en el frame 0/1. (x, y) es la esquina de su celda de 36×24. */
export function drawAlien(
	ctx: CanvasRenderingContext2D,
	row: number,
	frame: 0 | 1,
	x: number,
	y: number,
	skin: Skin,
): void {
	const sprite = ROW_SPRITE[row][frame];
	// Sprite de 11×8 celdas de 3 px = 33×24, centrado en la celda de 36×24.
	drawSprite(ctx, sprite, x + (ALIEN_W - 33) / 2, y, 3, ALIEN_H / 8, skin.rowColors[row], skin.glow);
}

export function drawExplosion(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	skin: Skin,
): void {
	drawSprite(ctx, SPRITES.explosion, x + (ALIEN_W - 33) / 2, y, 3, ALIEN_H / 8, skin.explosion, skin.glow);
}

export function drawShip(ctx: CanvasRenderingContext2D, ship: Ship, skin: Skin): void {
	drawSprite(ctx, SPRITES.cannon, ship.x, SHIP_Y, SHIP_W / 11, SHIP_H / 5, skin.ship, skin.glow);
}

export function drawUfo(ctx: CanvasRenderingContext2D, ufo: Ufo, y: number, skin: Skin): void {
	drawSprite(ctx, SPRITES.ufo, ufo.x, y, UFO_W / 20, UFO_H / 6, skin.ufo, skin.glow);
}

export function drawBullet(
	ctx: CanvasRenderingContext2D,
	b: Bullet,
	w: number,
	h: number,
	color: string,
	glow = 0,
): void {
	ctx.fillStyle = color;
	if (glow > 0) {
		ctx.shadowColor = color;
		ctx.shadowBlur = glow;
	}
	ctx.fillRect(Math.round(b.x), Math.round(b.y), w, h);
	if (glow > 0) resetGlow(ctx);
}

// ───────────────────────── Escudos ─────────────────────────

/** Escudo nuevo en (x, y): rectángulo con esquinas superiores cortadas y hueco abajo. */
export function createShield(x: number, y: number): Shield {
	const cells = new Uint8Array(SHIELD_COLS * SHIELD_ROWS);
	for (let r = 0; r < SHIELD_ROWS; r++) {
		for (let c = 0; c < SHIELD_COLS; c++) {
			let on = true;
			// Esquinas superiores en diagonal (4 celdas).
			const cut = 4 - r;
			if (cut > 0 && (c < cut || c >= SHIELD_COLS - cut)) on = false;
			// Hueco inferior central, más ancho a media altura.
			if (r >= 13 && c >= 6 && c < SHIELD_COLS - 6) on = false;
			else if (r >= 11 && c >= 8 && c < SHIELD_COLS - 8) on = false;
			cells[r * SHIELD_COLS + c] = on ? 1 : 0;
		}
	}
	return { x, y, cells };
}

/**
 * Primera celda viva que solapa el rectángulo (x, y, w, h), o null.
 * Devuelve el centro de esa celda en coordenadas del canvas.
 * Recorre de arriba abajo (bala enemiga) o de abajo arriba con `fromBelow` (bala propia),
 * para que la primera celda sea la que la bala alcanza antes.
 */
export function shieldCollides(
	shield: Shield,
	x: number,
	y: number,
	w: number,
	h: number,
	fromBelow = false,
): { x: number; y: number } | null {
	const c0 = Math.max(0, Math.floor((x - shield.x) / SHIELD_CELL));
	const c1 = Math.min(SHIELD_COLS - 1, Math.floor((x + w - 1 - shield.x) / SHIELD_CELL));
	const r0 = Math.max(0, Math.floor((y - shield.y) / SHIELD_CELL));
	const r1 = Math.min(SHIELD_ROWS - 1, Math.floor((y + h - 1 - shield.y) / SHIELD_CELL));
	for (let i = 0; i <= r1 - r0; i++) {
		const r = fromBelow ? r1 - i : r0 + i;
		for (let c = c0; c <= c1; c++) {
			if (shield.cells[r * SHIELD_COLS + c]) {
				return {
					x: shield.x + (c + 0.5) * SHIELD_CELL,
					y: shield.y + (r + 0.5) * SHIELD_CELL,
				};
			}
		}
	}
	return null;
}

/** Borra las celdas en un radio de `SHIELD_BLAST` celdas alrededor del punto (px, py) del canvas. */
export function erodeShield(shield: Shield, px: number, py: number): void {
	const cc = Math.floor((px - shield.x) / SHIELD_CELL);
	const cr = Math.floor((py - shield.y) / SHIELD_CELL);
	for (let dr = -SHIELD_BLAST; dr <= SHIELD_BLAST; dr++) {
		for (let dc = -SHIELD_BLAST; dc <= SHIELD_BLAST; dc++) {
			if (dr * dr + dc * dc > SHIELD_BLAST * SHIELD_BLAST) continue;
			const r = cr + dr;
			const c = cc + dc;
			if (r < 0 || r >= SHIELD_ROWS || c < 0 || c >= SHIELD_COLS) continue;
			shield.cells[r * SHIELD_COLS + c] = 0;
		}
	}
}

/** Borra todas las celdas que solapan el rectángulo (un invasor que cruza el escudo). */
export function eraseShieldRect(shield: Shield, x: number, y: number, w: number, h: number): void {
	const c0 = Math.max(0, Math.floor((x - shield.x) / SHIELD_CELL));
	const c1 = Math.min(SHIELD_COLS - 1, Math.floor((x + w - 1 - shield.x) / SHIELD_CELL));
	const r0 = Math.max(0, Math.floor((y - shield.y) / SHIELD_CELL));
	const r1 = Math.min(SHIELD_ROWS - 1, Math.floor((y + h - 1 - shield.y) / SHIELD_CELL));
	for (let r = r0; r <= r1; r++) {
		for (let c = c0; c <= c1; c++) shield.cells[r * SHIELD_COLS + c] = 0;
	}
}

/** Pinta el escudo por filas contiguas de celdas vivas. */
export function drawShield(ctx: CanvasRenderingContext2D, shield: Shield, skin: Skin): void {
	ctx.fillStyle = skin.shield;
	if (skin.glow > 0) {
		ctx.shadowColor = skin.shield;
		ctx.shadowBlur = skin.glow * 0.5;
	}
	for (let r = 0; r < SHIELD_ROWS; r++) {
		let c = 0;
		while (c < SHIELD_COLS) {
			if (!shield.cells[r * SHIELD_COLS + c]) {
				c++;
				continue;
			}
			const start = c;
			while (c < SHIELD_COLS && shield.cells[r * SHIELD_COLS + c]) c++;
			ctx.fillRect(
				shield.x + start * SHIELD_CELL,
				shield.y + r * SHIELD_CELL,
				(c - start) * SHIELD_CELL,
				SHIELD_CELL,
			);
		}
	}
	if (skin.glow > 0) resetGlow(ctx);
}
