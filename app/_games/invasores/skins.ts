// Skins de Invasores: solo apariencia. No afectan a reglas, velocidades ni puntuación.

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
export const DEFAULT_SKIN: SkinId = "clasico";

export interface Skin {
	background: string;
	/** Color de cada fila de la formación, de arriba abajo (5 filas). */
	rowColors: readonly [string, string, string, string, string];
	ship: string;
	/** Línea de suelo bajo el cañón. */
	ground: string;
	shield: string;
	ufo: string;
	playerBullet: string;
	enemyBullet: string;
	explosion: string;
	/** shadowBlur de sprites y balas (0 = sin brillo). El color del brillo es el del propio elemento. */
	glow: number;
}

export const SKINS: Record<SkinId, Skin> = {
	// Aspecto original del juego.
	clasico: {
		background: "#000000",
		rowColors: ["#ff4fd8", "#00f5ff", "#00f5ff", "#e8fbff", "#e8fbff"],
		ship: "#00ff88",
		ground: "#00ff88",
		shield: "#00ff88",
		ufo: "#ff006e",
		playerBullet: "#ffffff",
		enemyBullet: "#f5ff00",
		explosion: "#ffffff",
		glow: 0,
	},
	// Fondo oscuro y colores de los tokens del tema con brillo.
	neon: {
		background: "#05050f",
		rowColors: ["#ff006e", "#00f5ff", "#00f5ff", "#f5ff00", "#f5ff00"],
		ship: "#00ff88",
		ground: "#00ff88",
		shield: "#00ff88",
		ufo: "#ff4fd8",
		playerBullet: "#ffffff",
		enemyBullet: "#ff4fd8",
		explosion: "#ffffff",
		glow: 10,
	},
	// Pantalla Game Boy: 4 tonos verdes, planos y sin brillo.
	retro: {
		background: "#9bbc0f",
		rowColors: ["#0f380f", "#306230", "#306230", "#0f380f", "#0f380f"],
		ship: "#0f380f",
		ground: "#0f380f",
		shield: "#306230",
		ufo: "#0f380f",
		playerBullet: "#0f380f",
		enemyBullet: "#306230",
		explosion: "#0f380f",
		glow: 0,
	},
};

export function resolveSkin(id: string | undefined): SkinId {
	return SKIN_IDS.includes(id as SkinId) ? (id as SkinId) : DEFAULT_SKIN;
}
