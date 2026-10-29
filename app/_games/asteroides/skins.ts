// Skins de Asteroides: solo apariencia. No afectan a reglas, velocidades ni puntuación.

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
export const DEFAULT_SKIN: SkinId = "clasico";

export interface Skin {
	background: string;
	shipStroke: string;
	shipFill: string | null; // null = solo contorno
	shipLineWidth: number;
	flame: string;
	bullet: string;
	asteroidStroke: string;
	asteroidFill: string | null; // null = solo contorno
	asteroidLineWidth: number;
	powerUp: string;
	/** Componentes "r,g,b" de las chispas de explosión (el alfa lo calcula la partícula). */
	particleRgb: string;
	/** shadowBlur de nave, asteroides, balas y power-ups (0 = sin brillo). */
	glow: number;
}

export const SKINS: Record<SkinId, Skin> = {
	clasico: {
		background: "#000",
		shipStroke: "#fff",
		shipFill: null,
		shipLineWidth: 1.5,
		flame: "rgba(255, 130, 0, 0.85)",
		bullet: "#fff",
		asteroidStroke: "#fff",
		asteroidFill: null,
		asteroidLineWidth: 1.5,
		powerUp: "#0ff",
		particleRgb: "255,255,255",
		glow: 0,
	},
	// Trazo fino con brillo; nave cian, asteroides magenta, balas amarillas
	neon: {
		background: "#05050f",
		shipStroke: "#00f5ff", // --cyan
		shipFill: null,
		shipLineWidth: 1.2,
		flame: "#f5ff00", // --yellow
		bullet: "#f5ff00",
		asteroidStroke: "#ff006e", // --magenta
		asteroidFill: null,
		asteroidLineWidth: 1.2,
		powerUp: "#00ff88", // --green
		particleRgb: "255,0,110",
		glow: 12,
	},
	// Paleta Game Boy (4 tonos), formas planas y sin brillo
	retro: {
		background: "#0f380f",
		shipStroke: "#9bbc0f",
		shipFill: "#9bbc0f",
		shipLineWidth: 2,
		flame: "#8bac0f",
		bullet: "#9bbc0f",
		asteroidStroke: "#8bac0f",
		asteroidFill: "#306230",
		asteroidLineWidth: 2,
		powerUp: "#9bbc0f",
		particleRgb: "139,172,15",
		glow: 0,
	},
};

export function resolveSkin(id: string | undefined): SkinId {
	return SKIN_IDS.includes(id as SkinId) ? (id as SkinId) : DEFAULT_SKIN;
}
