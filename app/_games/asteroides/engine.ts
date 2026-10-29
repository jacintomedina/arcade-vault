import type { GameStats } from "@/app/_components/games/types";
import {
	H,
	MAX_DT,
	POWERUP_DROP_CHANCE,
	POWERUP_DURATION,
	W,
} from "./constants";
import {
	Asteroid,
	Bullet,
	Particle,
	PowerUp,
	Ship,
	dist,
	rand,
} from "./entities";
import { SKINS, type Skin, type SkinId } from "./skins";
import { createInput, type InputKey } from "./input";

export interface EngineOptions {
	canvas: HTMLCanvasElement;
	onStats: (s: GameStats) => void;
	onGameOver: (finalScore: number) => void;
	skin: SkinId;
}

export interface Engine {
	start(): void;
	stop(): void; // cancela rAF y quita listeners
	setPaused(p: boolean): void;
	setInput(k: InputKey, down: boolean): void; // táctil
	setAim(angle: number | null): void; // joystick: rumbo absoluto en rad
	setSkin(id: SkinId): void; // cambia la apariencia sin reiniciar
}

type State = "playing" | "dead" | "gameover";

export function createEngine(opts: EngineOptions): Engine {
	const { canvas, onStats, onGameOver } = opts;
	let skin: Skin = SKINS[opts.skin];
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D no disponible");
	const g: CanvasRenderingContext2D = ctx;
	const input = createInput();

	let ship = new Ship();
	let bullets: Bullet[] = [];
	let asteroids: Asteroid[] = [];
	let particles: Particle[] = [];
	let powerUps: PowerUp[] = [];
	let score = 0;
	let lives = 3;
	let level = 1;
	let state: State = "playing";
	let deadTimer = 0;
	let powerUpSpawned = false;
	let killsSinceSpawn = 0;

	let rafId: number | null = null;
	let lastTime: number | null = null;
	let running = false;
	let paused = false;

	let lastStats = "";
	const emitStats = () => {
		const key = `${score}|${lives}|${level}`;
		if (key === lastStats) return;
		lastStats = key;
		onStats({ score, lives, level });
	};

	function spawnAsteroids(count: number) {
		const SAFE_DIST = 130;
		for (let i = 0; i < count; i++) {
			let x: number;
			let y: number;
			do {
				x = rand(0, W);
				y = rand(0, H);
			} while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
			asteroids.push(new Asteroid(x, y, 3));
		}
	}

	function initGame() {
		ship = new Ship();
		bullets = [];
		asteroids = [];
		particles = [];
		powerUps = [];
		powerUpSpawned = false;
		killsSinceSpawn = 0;
		score = 0;
		lives = 3;
		level = 1;
		state = "playing";
		spawnAsteroids(4);
		emitStats();
	}

	function nextLevel() {
		level++;
		bullets = [];
		particles = [];
		powerUps = [];
		powerUpSpawned = false;
		killsSinceSpawn = 0;
		ship.reset();
		spawnAsteroids(3 + level);
		emitStats();
	}

	function explode(x: number, y: number, count = 8) {
		for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
	}

	function killShip() {
		explode(ship.x, ship.y, 14);
		ship.dead = true;
		lives--;
		emitStats();
		if (lives <= 0) {
			state = "gameover";
			onGameOver(score);
		} else {
			state = "dead";
			deadTimer = 2;
		}
	}

	function update(dt: number) {
		if (state === "gameover") {
			input.consumeFire();
			particles.forEach((p) => p.update(dt));
			particles = particles.filter((p) => !p.dead);
			return;
		}

		if (state === "dead") {
			input.consumeFire();
			deadTimer -= dt;
			particles.forEach((p) => p.update(dt));
			particles = particles.filter((p) => !p.dead);
			asteroids.forEach((a) => a.update(dt));
			if (deadTimer <= 0) {
				state = "playing";
				ship.reset();
			}
			return;
		}

		if (input.consumeFire()) bullets.push(...ship.tryShoot());

		ship.update(dt, input.controls());
		bullets.forEach((b) => b.update(dt));
		asteroids.forEach((a) => a.update(dt));
		particles.forEach((p) => p.update(dt));
		powerUps.forEach((p) => p.update(dt));

		bullets = bullets.filter((b) => !b.dead);
		particles = particles.filter((p) => !p.dead);
		powerUps = powerUps.filter((p) => !p.dead);

		for (const p of powerUps) {
			if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
				p.dead = true;
				ship.tripleShot = POWERUP_DURATION;
			}
		}

		// Bala vs asteroide
		const newAsteroids: Asteroid[] = [];
		for (const b of bullets) {
			for (const a of asteroids) {
				if (!a.dead && !b.dead && dist(b, a) < a.radius) {
					b.dead = true;
					a.dead = true;
					score += a.points;
					explode(a.x, a.y, a.size * 5);
					newAsteroids.push(...a.split());
					if (!powerUpSpawned) {
						killsSinceSpawn++;
						const guaranteed = killsSinceSpawn >= 5;
						if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
							powerUps.push(new PowerUp(a.x, a.y));
							powerUpSpawned = true;
						}
					}
				}
			}
		}
		asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
		bullets = bullets.filter((b) => !b.dead);
		emitStats();

		// Nave vs asteroide
		if (ship.invincible <= 0) {
			for (const a of asteroids) {
				if (dist(ship, a) < ship.radius + a.radius * 0.82) {
					killShip();
					break;
				}
			}
		}

		// Nivel completado
		if (state === "playing" && asteroids.length === 0) nextLevel();
	}

	function draw() {
		g.fillStyle = skin.background;
		g.fillRect(0, 0, W, H);

		particles.forEach((p) => p.draw(g, skin));
		asteroids.forEach((a) => a.draw(g, skin));
		powerUps.forEach((p) => p.draw(g, skin));
		bullets.forEach((b) => b.draw(g, skin));
		ship.draw(g, skin);
	}

	function loop(ts: number) {
		rafId = null;
		if (!running || paused) return;
		const dt =
			lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
		lastTime = ts;
		update(dt);
		draw();
		rafId = requestAnimationFrame(loop);
	}

	function schedule() {
		if (rafId === null) {
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
		setAim(angle) {
			if (!paused) input.setAim(angle);
		},
		setSkin(id) {
			skin = SKINS[id];
			if (running) draw(); // repinta también en pausa
		},
	};
}
