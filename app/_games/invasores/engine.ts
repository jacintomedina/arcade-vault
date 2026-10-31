import type { GameStats } from "@/app/_components/games/types";
import {
	ALIEN_H,
	ALIEN_POINTS,
	ALIEN_W,
	BULLET_H,
	BULLET_W,
	CLEARING_TIME,
	COLS,
	DROP_Y,
	DYING_TIME,
	ENEMY_BULLET_SPEED,
	ENEMY_FIRE_FLOOR,
	ENEMY_FIRE_MAX,
	ENEMY_FIRE_MIN,
	FIRE_COOLDOWN,
	FORM_X0,
	FORM_Y0,
	H,
	INTRO_TIME,
	INVASION_Y,
	MARCH_MIN,
	MARCH_RANGE,
	MARCH_STEP_X,
	MAX_DT,
	MAX_ENEMY_BULLETS,
	PITCH_X,
	PITCH_Y,
	PLAYER_BULLET_SPEED,
	ROWS,
	SHIELD_CENTER_Y,
	SHIELD_CENTERS_X,
	SHIELD_H,
	SHIELD_W,
	SHIP_H,
	SHIP_MAX_X,
	SHIP_MIN_X,
	SHIP_SPEED,
	SHIP_W,
	SHIP_Y,
	SIDE_MARGIN,
	START_LIVES,
	STEP,
	UFO_H,
	UFO_INTERVAL_MAX,
	UFO_INTERVAL_MIN,
	UFO_MIN_ALIENS,
	UFO_SCORES,
	UFO_SPEED,
	UFO_W,
	UFO_Y,
	W,
	WAVE_DROP_MAX,
	WAVE_DROP_Y,
	WAVE_SPEEDUP,
	WAVE_SPEEDUP_CAP,
} from "./constants";
import {
	type Alien,
	type Bullet,
	type Shield,
	type Ship,
	type Ufo,
	COLORS,
	createShield,
	drawAlien,
	drawBullet,
	drawExplosion,
	drawShield,
	drawShip,
	drawUfo,
	erodeShield,
	eraseShieldRect,
	shieldCollides,
} from "./entities";
import { createInput, type InputKey } from "./input";

export type { InputKey };

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

type State = "intro" | "playing" | "dying" | "clearing" | "finished";

interface Blast {
	x: number;
	y: number;
	t: number; // segundos restantes
}

const MAX_STEPS = 6; // 0,05 s / (1/120 s)
const BLAST_TIME = 0.15;
const GROUND_Y = SHIP_Y + SHIP_H + 8;
const TOTAL_ALIENS = COLS * ROWS;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const overlap = (
	ax: number,
	ay: number,
	aw: number,
	ah: number,
	bx: number,
	by: number,
	bw: number,
	bh: number,
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

export function createEngine(opts: EngineOptions): Engine {
	const { canvas, onStats, onGameOver } = opts;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D no disponible");
	const g: CanvasRenderingContext2D = ctx;
	const input = createInput();

	const ship: Ship = { x: (W - SHIP_W) / 2 };
	let aliens: Alien[] = [];
	let shields: Shield[] = [];
	let playerBullet: Bullet | null = null;
	let enemyBullets: Bullet[] = [];
	let ufo: Ufo | null = null;
	let blasts: Blast[] = [];

	let score = 0;
	let lives = START_LIVES;
	let wave = 1;
	let state: State = "intro";
	let stateTimer = 0;

	// Formación: posición de la celda (0, 0), sentido y frame de animación.
	let formX = FORM_X0;
	let formY = FORM_Y0;
	let dir: 1 | -1 = 1;
	let frame: 0 | 1 = 0;
	let marchAcc = 0;
	let fireCooldown = 0;
	let enemyFireTimer = 0;
	let ufoTimer = 0;
	let acc = 0;

	let rafId: number | null = null;
	let lastTime: number | null = null;
	let running = false;
	let stopped = false;
	let paused = false;

	let lastStats = "";
	const emitStats = () => {
		const key = `${score}|${lives}|${wave}`;
		if (key === lastStats) return;
		lastStats = key;
		onStats({ score, lives, level: wave });
	};

	// ───────────── Oleadas ─────────────

	const waveFactor = () => Math.pow(WAVE_SPEEDUP, Math.min(wave - 1, WAVE_SPEEDUP_CAP));

	function aliveCount() {
		let n = 0;
		for (const a of aliens) if (a.alive) n++;
		return n;
	}

	const alienX = (a: Alien) => formX + a.col * PITCH_X;
	const alienY = (a: Alien) => formY + a.row * PITCH_Y;

	function marchInterval() {
		return (MARCH_MIN + (MARCH_RANGE * aliveCount()) / TOTAL_ALIENS) * waveFactor();
	}

	function scheduleEnemyFire() {
		enemyFireTimer = Math.max(ENEMY_FIRE_FLOOR, rand(ENEMY_FIRE_MIN, ENEMY_FIRE_MAX) * waveFactor());
	}

	function scheduleUfo() {
		ufoTimer = rand(UFO_INTERVAL_MIN, UFO_INTERVAL_MAX);
	}

	function buildShields() {
		shields = SHIELD_CENTERS_X.map((cx) =>
			createShield(cx - SHIELD_W / 2, SHIELD_CENTER_Y - SHIELD_H / 2),
		);
	}

	function buildWave() {
		aliens = [];
		for (let row = 0; row < ROWS; row++) {
			for (let col = 0; col < COLS; col++) aliens.push({ col, row, alive: true });
		}
		formX = FORM_X0;
		formY = FORM_Y0 + WAVE_DROP_Y * Math.min(wave - 1, WAVE_DROP_MAX);
		dir = 1;
		frame = 0;
		marchAcc = 0;
		scheduleEnemyFire();
		buildShields();
	}

	function clearBullets() {
		playerBullet = null;
		enemyBullets = [];
	}

	function initGame() {
		score = 0;
		lives = START_LIVES;
		wave = 1;
		ship.x = (W - SHIP_W) / 2;
		clearBullets();
		ufo = null;
		blasts = [];
		fireCooldown = 0;
		scheduleUfo();
		buildWave();
		state = "intro";
		stateTimer = INTRO_TIME;
		lastStats = "";
		emitStats();
	}

	function finish() {
		state = "finished";
		input.clear();
		emitStats();
		onGameOver(score);
	}

	// ───────────── Marcha ─────────────

	function marchTick() {
		let minCol = COLS;
		let maxCol = -1;
		for (const a of aliens) {
			if (!a.alive) continue;
			if (a.col < minCol) minCol = a.col;
			if (a.col > maxCol) maxCol = a.col;
		}
		if (maxCol < 0) return;
		const left = formX + minCol * PITCH_X;
		const right = formX + maxCol * PITCH_X + ALIEN_W;
		const hitsEdge =
			dir > 0 ? right + MARCH_STEP_X > W - SIDE_MARGIN : left - MARCH_STEP_X < SIDE_MARGIN;
		if (hitsEdge) {
			formY += DROP_Y;
			dir = dir > 0 ? -1 : 1;
		} else {
			formX += dir * MARCH_STEP_X;
		}
		frame = frame === 0 ? 1 : 0;

		// Un invasor que cruza un escudo borra las celdas que toca.
		for (const a of aliens) {
			if (!a.alive) continue;
			const ax = alienX(a);
			const ay = alienY(a);
			for (const s of shields) {
				if (overlap(ax, ay, ALIEN_W, ALIEN_H, s.x, s.y, SHIELD_W, SHIELD_H)) {
					eraseShieldRect(s, ax, ay, ALIEN_W, ALIEN_H);
				}
			}
			if (ay + ALIEN_H >= INVASION_Y) {
				finish();
				return;
			}
		}
	}

	// ───────────── Disparos ─────────────

	function spawnEnemyBullet() {
		// Tirador: el invasor más bajo de una columna viva al azar.
		const bottoms = new Map<number, Alien>();
		for (const a of aliens) {
			if (!a.alive) continue;
			const cur = bottoms.get(a.col);
			if (!cur || a.row > cur.row) bottoms.set(a.col, a);
		}
		const shooters = Array.from(bottoms.values());
		if (shooters.length === 0) return;
		const s = shooters[Math.floor(Math.random() * shooters.length)];
		enemyBullets.push({
			x: alienX(s) + (ALIEN_W - BULLET_W) / 2,
			y: alienY(s) + ALIEN_H,
			vy: ENEMY_BULLET_SPEED,
		});
	}

	function hitShip() {
		lives -= 1;
		clearBullets();
		state = "dying";
		stateTimer = DYING_TIME;
		input.clear();
		emitStats();
	}

	function killAlien(a: Alien) {
		a.alive = false;
		score += ALIEN_POINTS[a.row];
		blasts.push({ x: alienX(a), y: alienY(a), t: BLAST_TIME });
		emitStats();
		if (aliveCount() === 0) {
			clearBullets();
			state = "clearing";
			stateTimer = CLEARING_TIME;
		}
	}

	function updatePlayerBullet() {
		const b = playerBullet;
		if (!b) return;
		b.y += b.vy * STEP;
		if (b.y + BULLET_H < 0) {
			playerBullet = null;
			return;
		}
		// Bala enemiga que se cruza: se destruyen entre sí, sin puntos.
		for (let i = 0; i < enemyBullets.length; i++) {
			const e = enemyBullets[i];
			if (overlap(b.x, b.y, BULLET_W, BULLET_H, e.x, e.y, BULLET_W, BULLET_H)) {
				enemyBullets.splice(i, 1);
				playerBullet = null;
				return;
			}
		}
		if (ufo && overlap(b.x, b.y, BULLET_W, BULLET_H, ufo.x, UFO_Y, UFO_W, UFO_H)) {
			score += ufo.points;
			ufo = null;
			playerBullet = null;
			emitStats();
			return;
		}
		// De abajo arriba: el primer invasor alcanzado es el más bajo.
		for (let i = aliens.length - 1; i >= 0; i--) {
			const a = aliens[i];
			if (!a.alive) continue;
			if (overlap(b.x, b.y, BULLET_W, BULLET_H, alienX(a), alienY(a), ALIEN_W, ALIEN_H)) {
				playerBullet = null;
				killAlien(a);
				return;
			}
		}
		for (const s of shields) {
			const hit = shieldCollides(s, b.x, b.y, BULLET_W, BULLET_H, true);
			if (hit) {
				erodeShield(s, hit.x, hit.y);
				playerBullet = null;
				return;
			}
		}
	}

	function updateEnemyBullets() {
		for (let i = enemyBullets.length - 1; i >= 0; i--) {
			const e = enemyBullets[i];
			e.y += e.vy * STEP;
			if (e.y > H) {
				enemyBullets.splice(i, 1);
				continue;
			}
			if (overlap(e.x, e.y, BULLET_W, BULLET_H, ship.x, SHIP_Y, SHIP_W, SHIP_H)) {
				hitShip();
				return;
			}
			for (const s of shields) {
				const hit = shieldCollides(s, e.x, e.y, BULLET_W, BULLET_H);
				if (hit) {
					erodeShield(s, hit.x, hit.y);
					enemyBullets.splice(i, 1);
					break;
				}
			}
		}
	}

	function updateUfo() {
		if (ufo) {
			ufo.x += ufo.dir * UFO_SPEED * STEP;
			if (ufo.x > W || ufo.x + UFO_W < 0) ufo = null;
			return;
		}
		ufoTimer -= STEP;
		if (ufoTimer > 0) return;
		scheduleUfo();
		if (aliveCount() < UFO_MIN_ALIENS) return;
		const d: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
		ufo = {
			x: d > 0 ? -UFO_W : W,
			dir: d,
			points: UFO_SCORES[Math.floor(Math.random() * UFO_SCORES.length)],
		};
	}

	// ───────────── Paso fijo ─────────────

	function step() {
		for (let i = blasts.length - 1; i >= 0; i--) {
			blasts[i].t -= STEP;
			if (blasts[i].t <= 0) blasts.splice(i, 1);
		}

		if (state === "intro") {
			stateTimer -= STEP;
			if (stateTimer <= 0) state = "playing";
			return;
		}
		if (state === "dying") {
			stateTimer -= STEP;
			if (stateTimer > 0) return;
			if (lives <= 0) {
				finish();
				return;
			}
			ship.x = (W - SHIP_W) / 2;
			fireCooldown = 0;
			state = "playing";
			return;
		}
		if (state === "clearing") {
			stateTimer -= STEP;
			if (stateTimer > 0) return;
			wave += 1;
			buildWave();
			fireCooldown = 0;
			state = "playing";
			emitStats();
			return;
		}
		if (state !== "playing") return;

		const { dir: move, fire } = input.poll();
		ship.x = Math.max(SHIP_MIN_X, Math.min(SHIP_MAX_X, ship.x + move * SHIP_SPEED * STEP));

		fireCooldown = Math.max(0, fireCooldown - STEP);
		if (fire && !playerBullet && fireCooldown === 0) {
			playerBullet = {
				x: ship.x + (SHIP_W - BULLET_W) / 2,
				y: SHIP_Y - BULLET_H,
				vy: -PLAYER_BULLET_SPEED,
			};
			fireCooldown = FIRE_COOLDOWN;
		}

		updatePlayerBullet();
		if (state !== "playing") return;

		updateEnemyBullets();
		if (state !== "playing") return;

		enemyFireTimer -= STEP;
		if (enemyFireTimer <= 0) {
			if (enemyBullets.length < MAX_ENEMY_BULLETS) spawnEnemyBullet();
			scheduleEnemyFire();
		}

		// Como máximo un tick de marcha por paso.
		marchAcc += STEP;
		const interval = marchInterval();
		if (marchAcc >= interval) {
			marchAcc -= interval;
			marchTick();
		}

		if (state === "playing") updateUfo();
	}

	// step() cambia `state`; la función evita que TS lo dé por fijo tras el return temprano.
	const isFinished = () => state === "finished";

	function update(dt: number) {
		if (isFinished()) return;
		acc += dt;
		let n = 0;
		while (acc >= STEP && n < MAX_STEPS && !isFinished()) {
			step();
			acc -= STEP;
			n++;
		}
		if (acc > STEP) acc = 0;
	}

	// ───────────── Dibujo ─────────────

	function draw() {
		g.fillStyle = COLORS.background;
		g.fillRect(0, 0, W, H);

		g.fillStyle = COLORS.ship;
		g.fillRect(0, GROUND_Y, W, 2);

		for (const s of shields) drawShield(g, s);
		for (const a of aliens) {
			if (a.alive) drawAlien(g, a.row, frame, alienX(a), alienY(a));
		}
		for (const b of blasts) drawExplosion(g, b.x, b.y);
		if (ufo) drawUfo(g, ufo, UFO_Y);

		if (state === "dying") {
			// Parpadeo de la explosión del cañón.
			if (Math.floor(stateTimer * 10) % 2 === 0) {
				drawExplosion(g, ship.x + (SHIP_W - ALIEN_W) / 2, SHIP_Y - 2);
			}
		} else if (lives > 0) {
			drawShip(g, ship);
		}

		if (playerBullet) drawBullet(g, playerBullet, BULLET_W, BULLET_H, COLORS.playerBullet);
		for (const e of enemyBullets) drawBullet(g, e, BULLET_W, BULLET_H, COLORS.enemyBullet);
	}

	// ───────────── Bucle ─────────────

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
		if (rafId === null && state !== "finished") {
			lastTime = null; // sin salto de dt al arrancar o reanudar
			acc = 0;
			rafId = requestAnimationFrame(loop);
		}
	}

	return {
		start() {
			if (running || stopped) return;
			running = true;
			input.attach();
			initGame();
			draw();
			if (!paused) schedule();
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
