import type { GameStats } from "@/app/_components/games/types";
import {
	BLOCK,
	BOARD_X,
	CLEAR_TIME,
	COLS,
	H,
	LINE_SCORES,
	MAX_DT,
	MAX_LEVEL,
	NEXT_X,
	NEXT_Y,
	ROWS,
	W,
} from "./constants";
import {
	type Board,
	type Piece,
	collide,
	createBoard,
	drawBlock,
	randomPiece,
	rotateCW,
} from "./entities";
import { createInput, type InputKey } from "./input";

export interface EngineOptions {
	canvas: HTMLCanvasElement;
	onStats: (s: GameStats) => void;
	onGameOver: (finalScore: number) => void;
}

export interface Engine {
	start(): void;
	stop(): void; // cancela rAF y quita listeners
	setPaused(p: boolean): void;
	setInput(k: InputKey, down: boolean): void; // táctil
}

type State = "playing" | "clearing" | "gameover";

const KICKS = [0, -1, 1, -2, 2];
const BLINK_PERIOD = 0.075;
const PANEL_CX = NEXT_X + 2 * BLOCK; // centro de la columna derecha

export function createEngine(opts: EngineOptions): Engine {
	const { canvas, onStats, onGameOver } = opts;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D no disponible");
	const g: CanvasRenderingContext2D = ctx;
	const input = createInput();

	let board: Board = createBoard();
	let current: Piece = randomPiece(1);
	let next: Piece = randomPiece(1);
	let score = 0;
	let lines = 0;
	let level = 1;
	let state: State = "playing";
	let dropAccum = 0;
	let clearTimer = 0;
	let clearingRows: number[] = [];

	let rafId: number | null = null;
	let lastTime: number | null = null;
	let running = false;
	let paused = false;

	let lastStats = "";
	const emitStats = () => {
		const key = `${score}|${level}`;
		if (key === lastStats) return;
		lastStats = key;
		onStats({ score, lives: 1, level });
	};

	const dropInterval = () => Math.max(0.1, 1 - (level - 1) * 0.09);

	function initGame() {
		board = createBoard();
		score = 0;
		lines = 0;
		level = 1;
		state = "playing";
		dropAccum = 0;
		clearTimer = 0;
		clearingRows = [];
		current = randomPiece(level);
		next = randomPiece(level);
		lastStats = "";
		emitStats();
	}

	function ghostY(): number {
		let gy = current.y;
		while (!collide(board, current.shape, current.x, gy + 1)) gy++;
		return gy;
	}

	function tryRotate() {
		const rotated = rotateCW(current.shape);
		for (const kick of KICKS) {
			if (!collide(board, rotated, current.x + kick, current.y)) {
				current.shape = rotated;
				current.x += kick;
				return;
			}
		}
	}

	function spawn() {
		current = next;
		next = randomPiece(level);
		dropAccum = 0;
		if (collide(board, current.shape, current.x, current.y)) {
			state = "gameover";
			input.clear();
			onGameOver(score);
		}
	}

	function lockPiece() {
		for (let r = 0; r < current.shape.length; r++)
			for (let c = 0; c < current.shape[r].length; c++)
				if (current.shape[r][c])
					board[current.y + r][current.x + c] = current.shape[r][c];

		clearingRows = [];
		for (let r = 0; r < ROWS; r++)
			if (board[r].every((v) => v !== 0)) clearingRows.push(r);

		if (clearingRows.length > 0) {
			state = "clearing";
			clearTimer = 0;
			input.clear();
		} else {
			spawn();
		}
	}

	function finishClearing() {
		const cleared = clearingRows.length;
		board = board.filter((_, r) => !clearingRows.includes(r));
		while (board.length < ROWS) board.unshift(new Array<number>(COLS).fill(0));
		clearingRows = [];

		lines += cleared;
		score += (LINE_SCORES[cleared] ?? 0) * level;
		level = Math.min(MAX_LEVEL, Math.floor(lines / 10) + 1);
		emitStats();

		state = "playing";
		spawn();
	}

	function softDrop() {
		if (!collide(board, current.shape, current.x, current.y + 1)) {
			current.y++;
			score++;
		} else {
			lockPiece();
		}
	}

	function hardDrop() {
		const gy = ghostY();
		score += (gy - current.y) * 2;
		current.y = gy;
		lockPiece();
	}

	function update(dt: number) {
		if (state === "gameover") return;

		const actions = input.poll(dt);

		if (state === "clearing") {
			clearTimer += dt;
			if (clearTimer >= CLEAR_TIME) finishClearing();
			emitStats();
			return;
		}

		for (let i = 0; i < actions.left && state === "playing"; i++)
			if (!collide(board, current.shape, current.x - 1, current.y)) current.x--;
		for (let i = 0; i < actions.right && state === "playing"; i++)
			if (!collide(board, current.shape, current.x + 1, current.y)) current.x++;
		if (actions.rotate) tryRotate();
		for (let i = 0; i < actions.down && state === "playing"; i++) softDrop();
		if (actions.drop && state === "playing") hardDrop();

		if (state === "playing") {
			dropAccum += dt;
			if (dropAccum >= dropInterval()) {
				dropAccum = 0;
				if (!collide(board, current.shape, current.x, current.y + 1)) {
					current.y++;
				} else {
					lockPiece();
				}
			}
		}
		emitStats();
	}

	function drawGrid() {
		g.strokeStyle = "rgba(255,255,255,0.06)";
		g.lineWidth = 0.5;
		g.beginPath();
		for (let c = 1; c < COLS; c++) {
			g.moveTo(BOARD_X + c * BLOCK, 0);
			g.lineTo(BOARD_X + c * BLOCK, ROWS * BLOCK);
		}
		for (let r = 1; r < ROWS; r++) {
			g.moveTo(BOARD_X, r * BLOCK);
			g.lineTo(BOARD_X + COLS * BLOCK, r * BLOCK);
		}
		g.stroke();
	}

	function drawPiece(piece: Piece, y: number, alpha: number) {
		for (let r = 0; r < piece.shape.length; r++)
			for (let c = 0; c < piece.shape[r].length; c++)
				drawBlock(g, BOARD_X, 0, piece.x + c, y + r, piece.shape[r][c], alpha);
	}

	function drawLabel(text: string, y: number) {
		g.fillStyle = "rgba(255,255,255,0.6)";
		g.font = "bold 14px monospace";
		g.fillText(text, PANEL_CX, y);
	}

	function drawValue(text: string, y: number) {
		g.fillStyle = "#fff";
		g.font = "bold 28px monospace";
		g.fillText(text, PANEL_CX, y);
	}

	function drawSidePanel() {
		g.textAlign = "center";
		g.textBaseline = "alphabetic";
		drawLabel("NIVEL", NEXT_Y - 240);
		drawValue(String(level), NEXT_Y - 208);
		drawLabel("LÍNEAS", NEXT_Y - 160);
		drawValue(String(lines), NEXT_Y - 128);
		drawLabel("PUNTUACIÓN", NEXT_Y - 80);
		drawValue(String(score), NEXT_Y - 48);
		drawLabel("SIGUIENTE", NEXT_Y - 12);
		g.textAlign = "start";

		g.strokeStyle = "rgba(255,255,255,0.25)";
		g.lineWidth = 1;
		g.strokeRect(NEXT_X, NEXT_Y, 4 * BLOCK, 4 * BLOCK);

		// Centra la pieza por su caja real (la I, por ejemplo, ocupa una sola fila)
		const shape = next.shape;
		let minR = shape.length, maxR = -1, minC = shape[0].length, maxC = -1;
		for (let r = 0; r < shape.length; r++)
			for (let c = 0; c < shape[r].length; c++)
				if (shape[r][c]) {
					minR = Math.min(minR, r);
					maxR = Math.max(maxR, r);
					minC = Math.min(minC, c);
					maxC = Math.max(maxC, c);
				}
		const offX = (4 - (maxC - minC + 1)) / 2 - minC;
		const offY = (4 - (maxR - minR + 1)) / 2 - minR;
		for (let r = 0; r < shape.length; r++)
			for (let c = 0; c < shape[r].length; c++)
				drawBlock(g, NEXT_X, NEXT_Y, offX + c, offY + r, shape[r][c]);
	}

	function draw() {
		g.fillStyle = "#000";
		g.fillRect(0, 0, W, H);

		drawGrid();
		g.strokeStyle = "rgba(255,255,255,0.25)";
		g.lineWidth = 1;
		g.strokeRect(BOARD_X, 0, COLS * BLOCK, ROWS * BLOCK);

		for (let r = 0; r < ROWS; r++)
			for (let c = 0; c < COLS; c++)
				drawBlock(g, BOARD_X, 0, c, r, board[r][c]);

		if (state === "clearing") {
			// Parpadeo: las filas completas alternan con un destello blanco
			if (Math.floor(clearTimer / BLINK_PERIOD) % 2 === 0) {
				g.fillStyle = "#fff";
				for (const r of clearingRows)
					g.fillRect(BOARD_X, r * BLOCK, COLS * BLOCK, BLOCK);
			}
		} else {
			drawPiece(current, ghostY(), 0.2);
			drawPiece(current, current.y, 1);
		}

		drawSidePanel();
	}

	function loop(ts: number) {
		rafId = null;
		if (!running || paused) return;
		const dt =
			lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
		lastTime = ts;
		update(dt);
		draw();
		if (state !== "gameover") rafId = requestAnimationFrame(loop);
	}

	function schedule() {
		if (rafId === null && state !== "gameover") {
			lastTime = null; // sin salto de dt al arrancar o reanudar
			rafId = requestAnimationFrame(loop);
		}
	}

	return {
		start() {
			if (running) return;
			running = true;
			input.attach();
			initGame();
			draw();
			if (!paused) schedule();
		},
		stop() {
			running = false;
			input.detach();
			input.clear();
			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = null;
		},
		setPaused(p) {
			if (p === paused) return;
			paused = p;
			if (p) {
				if (rafId !== null) cancelAnimationFrame(rafId);
				rafId = null;
				input.clear();
			} else if (running) {
				schedule();
			}
		},
		setInput(k, down) {
			if (!paused) input.set(k, down);
		},
	};
}
