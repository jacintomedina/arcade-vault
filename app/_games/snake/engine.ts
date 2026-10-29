import type { GameStats } from "@/app/_components/games/types";
import {
	BASE_SPEED,
	COLS,
	DEATH_MS,
	EAT_MS,
	FRUIT_POINTS,
	FRUITS_PER_LEVEL,
	H,
	MAX_DT,
	MAX_LEVEL,
	ROWS,
	START_LENGTH,
	W,
} from "./constants";
import {
	type Cell,
	type Direction,
	type Fruit,
	FRUITS,
	drawBoard,
	drawFruit,
	drawSnake,
	loadSprites,
} from "./entities";
import { createInput, type InputKey } from "./input";
import { DEFAULT_SKIN, SKINS, type Skin, type SkinId } from "./skins";

export interface EngineOptions {
	canvas: HTMLCanvasElement;
	onStats: (s: GameStats) => void;
	onGameOver: (finalScore: number) => void;
	skin?: SkinId;
}

export interface Engine {
	start(): void;
	stop(): void; // cancela rAF y quita listeners
	setPaused(p: boolean): void;
	setInput(k: InputKey, down: boolean): void; // táctil
	setSkin(id: SkinId): void; // cambia la apariencia sin reiniciar
}

type State = "loading" | "ready" | "playing" | "dying" | "finished";

const MAX_PENDING_TURNS = 2;
const MAX_TICKS_PER_FRAME = 2;
const BLINK_MS = 100;

const DELTA: Record<Direction, Cell> = {
	up: { col: 0, row: -1 },
	down: { col: 0, row: 1 },
	left: { col: -1, row: 0 },
	right: { col: 1, row: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
	up: "down",
	down: "up",
	left: "right",
	right: "left",
};

export function createEngine(opts: EngineOptions): Engine {
	const { canvas, onStats, onGameOver } = opts;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D no disponible");
	const g: CanvasRenderingContext2D = ctx;
	const input = createInput();
	let skin: Skin = SKINS[opts.skin ?? DEFAULT_SKIN];

	let body: Cell[] = []; // body[0] es la cabeza
	let dir: Direction = "right";
	let turns: Direction[] = [];
	let fruit: Fruit = { cell: { col: 0, row: 0 }, kind: 0 };
	let eaten: { fruit: Fruit; elapsed: number } | null = null;
	let score = 0;
	let eatenCount = 0;
	let state: State = "loading";
	let img: HTMLImageElement | null = null;
	let acc = 0;
	let dyingElapsed = 0;

	let rafId: number | null = null;
	let lastTime: number | null = null;
	let running = false;
	let stopped = false;
	let paused = false;

	const levelOf = () => Math.min(MAX_LEVEL, 1 + Math.floor(eatenCount / FRUITS_PER_LEVEL));

	let lastStats = "";
	const emitStats = () => {
		const level = levelOf();
		const key = `${score}|${level}`;
		if (key === lastStats) return;
		lastStats = key;
		onStats({ score, lives: 1, level });
	};

	const sameCell = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;

	// Devuelve false si no queda ninguna celda libre.
	function spawnFruit(): boolean {
		const taken = new Set(body.map((c) => c.row * COLS + c.col));
		const free: number[] = [];
		for (let i = 0; i < COLS * ROWS; i++) if (!taken.has(i)) free.push(i);
		if (free.length === 0) return false;
		const idx = free[Math.floor(Math.random() * free.length)];
		fruit = {
			cell: { col: idx % COLS, row: Math.floor(idx / COLS) },
			kind: Math.floor(Math.random() * FRUITS.length),
		};
		return true;
	}

	function initGame() {
		const headCol = Math.floor(COLS / 2);
		const row = Math.floor(ROWS / 2);
		body = Array.from({ length: START_LENGTH }, (_, i) => ({ col: headCol - i, row }));
		dir = "right";
		turns = [];
		eaten = null;
		score = 0;
		eatenCount = 0;
		acc = 0;
		dyingElapsed = 0;
		lastStats = "";
		state = "ready";
		spawnFruit();
		emitStats();
	}

	function finish() {
		state = "finished";
		input.clear();
		emitStats();
		onGameOver(score);
	}

	function enqueue(k: Direction) {
		const ref = turns.length > 0 ? turns[turns.length - 1] : dir;
		if (k === ref || k === OPPOSITE[ref]) return;
		if (turns.length >= MAX_PENDING_TURNS) return;
		turns.push(k);
	}

	function tick() {
		const next = turns.shift();
		if (next) dir = next;

		const d = DELTA[dir];
		const head = body[0];
		const target: Cell = {
			col: (head.col + d.col + COLS) % COLS,
			row: (head.row + d.row + ROWS) % ROWS,
		};
		const grows = sameCell(target, fruit.cell);

		// La cola se retira en este mismo tick, salvo que la serpiente crezca.
		const solid = grows ? body : body.slice(0, -1);
		if (solid.some((c) => sameCell(c, target))) {
			state = "dying";
			dyingElapsed = 0;
			turns = [];
			return;
		}

		body.unshift(target);
		if (!grows) {
			body.pop();
			return;
		}

		eaten = { fruit, elapsed: 0 };
		score += FRUIT_POINTS;
		eatenCount++;
		emitStats();
		if (!spawnFruit()) finish();
	}

	function update(dt: number) {
		const pressed = input.poll();

		if (state === "ready") {
			// Un giro de 180° sobre el cuerpo inicial no vale como primera dirección.
			const first = pressed.find((k) => k !== OPPOSITE[dir]);
			if (first) {
				dir = first;
				state = "playing";
				acc = 0;
			}
		} else if (state === "playing") {
			for (const k of pressed) enqueue(k);
			acc += dt;
			const interval = 1 / (BASE_SPEED + levelOf());
			for (let n = 0; n < MAX_TICKS_PER_FRAME && acc >= interval && state === "playing"; n++) {
				acc -= interval;
				tick();
			}
		} else if (state === "dying") {
			dyingElapsed += dt * 1000;
			if (dyingElapsed >= DEATH_MS) finish();
		}

		if (eaten) {
			eaten.elapsed += dt * 1000;
			if (eaten.elapsed >= EAT_MS) eaten = null;
		}
	}

	function draw() {
		g.fillStyle = skin.background;
		g.fillRect(0, 0, W, H);
		if (state === "loading") return;

		drawBoard(g, skin);

		if (eaten) {
			const t = eaten.elapsed / EAT_MS;
			g.globalAlpha = 1 - t;
			drawFruit(g, skin, img, eaten.fruit, 1 + 0.5 * t);
			g.globalAlpha = 1;
		}
		if (state !== "finished" || body.length < COLS * ROWS) drawFruit(g, skin, img, fruit);

		const blinkOff = state === "dying" && Math.floor(dyingElapsed / BLINK_MS) % 2 === 1;
		if (!blinkOff) drawSnake(g, skin, body, dir);
	}

	function loop(ts: number) {
		rafId = null;
		if (!running || paused) return;
		const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
		lastTime = ts;
		update(dt);
		draw();
		if (state !== "finished") rafId = requestAnimationFrame(loop);
	}

	function schedule() {
		if (rafId === null && state !== "finished" && state !== "loading") {
			lastTime = null; // sin salto de dt al arrancar o reanudar; el acumulador no cambia
			rafId = requestAnimationFrame(loop);
		}
	}

	// Con spritesheet o, si falla la carga, con círculos de color
	function begin(image: HTMLImageElement | null) {
		if (stopped) return;
		img = image;
		initGame();
		draw();
		if (!paused) schedule();
	}

	return {
		start() {
			if (running || stopped) return;
			running = true;
			input.attach();
			loadSprites().then(begin, () => begin(null));
		},
		stop() {
			stopped = true;
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
		setSkin(id) {
			skin = SKINS[id];
			// En pausa el rAF está parado: se redibuja un frame para ver el cambio.
			if (paused && !stopped && state !== "loading") draw();
		},
	};
}
