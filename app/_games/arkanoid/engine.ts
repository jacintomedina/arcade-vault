import type { GameStats } from "@/app/_components/games/types";
import {
	BALL_SIZE,
	BASE_VX,
	BASE_VY,
	BLOCK_H,
	BLOCK_POINTS,
	BLOCK_W,
	EXPLOSION_MS,
	H,
	MAX_ANGLE,
	MAX_DT,
	MAX_LEVEL,
	ORIGIN_X,
	ORIGIN_Y,
	PADDLE_H,
	PADDLE_SPEED,
	PADDLE_W,
	PADDLE_Y,
	START_LIVES,
	STEP,
	W,
} from "./constants";
import {
	type Ball,
	type Block,
	type Explosion,
	type Paddle,
	EXPLOSION_FRAMES,
	FALLBACK_COLORS,
	drawFrame,
	drawSprite,
	loadSpritesheet,
} from "./entities";
import { createInput, type InputKey } from "./input";
import { LEVELS, speedOf } from "./levels";

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

type State = "loading" | "serving" | "playing" | "finished";

export function createEngine(opts: EngineOptions): Engine {
	const { canvas, onStats, onGameOver } = opts;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D no disponible");
	const g: CanvasRenderingContext2D = ctx;
	const input = createInput(canvas);

	const paddle: Paddle = {
		x: (W - PADDLE_W) / 2,
		y: PADDLE_Y,
		w: PADDLE_W,
		h: PADDLE_H,
	};
	const ball: Ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
	let blocks: Block[] = [];
	let explosions: Explosion[] = [];
	let score = 0;
	let lives = START_LIVES;
	let level = 1;
	let state: State = "loading";
	let img: HTMLImageElement | null = null;
	let acc = 0;

	let rafId: number | null = null;
	let lastTime: number | null = null;
	let running = false;
	let stopped = false;
	let paused = false;

	let lastStats = "";
	const emitStats = () => {
		const key = `${score}|${lives}|${level}`;
		if (key === lastStats) return;
		lastStats = key;
		onStats({ score, lives, level });
	};

	function serve() {
		state = "serving";
		ball.vx = 0;
		ball.vy = 0;
		followPaddle();
	}

	function followPaddle() {
		ball.x = paddle.x + (paddle.w - ball.w) / 2;
		ball.y = paddle.y - ball.h;
	}

	function loadLevel(n: number) {
		level = n;
		blocks = LEVELS[n - 1].blocks.map((b) => ({
			x: ORIGIN_X + b.col * BLOCK_W,
			y: ORIGIN_Y + b.row * BLOCK_H,
			w: BLOCK_W,
			h: BLOCK_H,
			color: b.color,
		}));
		explosions = [];
		serve();
		emitStats();
	}

	function initGame() {
		score = 0;
		lives = START_LIVES;
		paddle.x = (W - PADDLE_W) / 2;
		lastStats = "";
		loadLevel(1);
	}

	function finish() {
		state = "finished";
		input.clear();
		emitStats();
		onGameOver(score);
	}

	function launch() {
		const s = speedOf(level);
		ball.vx = BASE_VX * s;
		ball.vy = BASE_VY * s;
		state = "playing";
	}

	const clampPaddle = () => {
		paddle.x = Math.max(0, Math.min(W - PADDLE_W, paddle.x));
	};

	const overlaps = (b: Block) =>
		ball.x < b.x + b.w &&
		ball.x + ball.w > b.x &&
		ball.y < b.y + b.h &&
		ball.y + ball.h > b.y;

	// Un paso de física: como máximo un bloque roto.
	function step(dir: number) {
		paddle.x += dir * PADDLE_SPEED * STEP;
		clampPaddle();

		ball.x += ball.vx * STEP;
		ball.y += ball.vy * STEP;

		if (ball.x <= 0) {
			ball.x = 0;
			ball.vx = Math.abs(ball.vx);
		}
		if (ball.x + ball.w >= W) {
			ball.x = W - ball.w;
			ball.vx = -Math.abs(ball.vx);
		}
		if (ball.y <= 0) {
			ball.y = 0;
			ball.vy = Math.abs(ball.vy);
		}

		// Pala: el punto de impacto decide el ángulo y el módulo se conserva
		if (
			ball.vy > 0 &&
			ball.x + ball.w > paddle.x &&
			ball.x < paddle.x + paddle.w &&
			ball.y + ball.h >= paddle.y &&
			ball.y + ball.h <= paddle.y + paddle.h + 8
		) {
			const offset = Math.max(
				-1,
				Math.min(
					1,
					(ball.x + ball.w / 2 - (paddle.x + paddle.w / 2)) / (PADDLE_W / 2),
				),
			);
			const angle = offset * MAX_ANGLE;
			const speed = Math.hypot(ball.vx, ball.vy);
			ball.y = paddle.y - ball.h;
			ball.vx = speed * Math.sin(angle);
			ball.vy = -speed * Math.cos(angle);
		}

		const hit = blocks.findIndex(overlaps);
		if (hit !== -1) {
			const b = blocks[hit];
			blocks.splice(hit, 1);
			explosions.push({
				x: b.x,
				y: b.y,
				w: b.w,
				h: b.h,
				color: b.color,
				elapsed: 0,
			});
			score += BLOCK_POINTS;
			ball.vy = -ball.vy;
			emitStats();
			if (blocks.length === 0) {
				if (level >= MAX_LEVEL) finish();
				else loadLevel(level + 1);
				return;
			}
		}

		if (ball.y > H) {
			lives--;
			if (lives <= 0) {
				lives = 0;
				finish();
			} else {
				serve();
				emitStats();
			}
		}
	}

	function update(dt: number) {
		const { dir, pointerX, launch: wantsLaunch } = input.poll();

		if (pointerX !== null) {
			paddle.x = pointerX - PADDLE_W / 2;
			clampPaddle();
		}

		if (state === "serving") {
			paddle.x += dir * PADDLE_SPEED * dt;
			clampPaddle();
			followPaddle();
			if (wantsLaunch) launch();
		}

		if (state === "playing") {
			acc += dt;
			while (acc >= STEP && state === "playing") {
				step(dir);
				acc -= STEP;
			}
			if (state !== "playing") acc = 0;
		}

		for (const e of explosions) e.elapsed += dt * 1000;
		explosions = explosions.filter((e) => e.elapsed < EXPLOSION_MS);
	}

	function draw() {
		g.fillStyle = "#000";
		g.fillRect(0, 0, W, H);
		if (state === "loading") return;

		for (const b of blocks) {
			if (img) drawSprite(g, img, `block_${b.color}`, b.x, b.y, b.w, b.h);
			else {
				g.fillStyle = FALLBACK_COLORS[b.color];
				g.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
			}
		}

		for (const e of explosions) {
			const t = e.elapsed / EXPLOSION_MS;
			if (img) {
				const frames = EXPLOSION_FRAMES[e.color];
				const i = Math.min(frames.length - 1, Math.floor(t * frames.length));
				drawFrame(g, img, frames[i], e.x, e.y, e.w, e.h);
			} else {
				g.globalAlpha = 1 - t;
				g.fillStyle = "#fff";
				g.fillRect(e.x, e.y, e.w, e.h);
				g.globalAlpha = 1;
			}
		}

		if (img) {
			drawSprite(g, img, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
			drawSprite(g, img, "ball", ball.x, ball.y, ball.w, ball.h);
		} else {
			g.fillStyle = "#f5ff00";
			g.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
			g.fillStyle = "#fff";
			g.beginPath();
			g.arc(ball.x + ball.w / 2, ball.y + ball.h / 2, ball.w / 2, 0, Math.PI * 2);
			g.fill();
		}
	}

	function loop(ts: number) {
		rafId = null;
		if (!running || paused) return;
		const dt =
			lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
		lastTime = ts;
		update(dt);
		draw();
		if (state !== "finished") rafId = requestAnimationFrame(loop);
	}

	function schedule() {
		if (rafId === null && state !== "finished" && state !== "loading") {
			lastTime = null; // sin salto de dt al arrancar o reanudar
			acc = 0;
			rafId = requestAnimationFrame(loop);
		}
	}

	// Con spritesheet o, si falla la carga, con formas simples
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
			loadSpritesheet().then(begin, () => begin(null));
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
	};
}
