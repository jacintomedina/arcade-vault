// Skins de Snake: solo apariencia. No afectan a reglas, velocidades ni puntuación.

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
export const DEFAULT_SKIN: SkinId = "clasico";

export interface Skin {
	background: string;
	boardLight: string;
	boardDark: string;
	/** Líneas de la cuadrícula; null = sin líneas. */
	gridLine: string | null;
	snakeBody: string;
	snakeHead: string;
	/** Margen de cada segmento dentro de su celda (px). */
	snakePad: number;
	bodyRadius: number;
	headRadius: number;
	eyeWhite: string;
	eyePupil: string;
	/** "sprite" usa el atlas de frutas; "block" dibuja un bloque plano. */
	fruitStyle: "sprite" | "block";
	fruitBlock: string;
	/** Color del brillo de la fruta; solo cuenta si glow > 0. */
	fruitGlow: string;
	/** shadowBlur de serpiente y fruta (0 = sin brillo). */
	glow: number;
}

export const SKINS: Record<SkinId, Skin> = {
	clasico: {
		background: "#000",
		boardLight: "#aad751",
		boardDark: "#a2d149",
		gridLine: null,
		snakeBody: "#4876ec",
		snakeHead: "#3a62d0",
		snakePad: 3,
		bodyRadius: 8,
		headRadius: 10,
		eyeWhite: "#fff",
		eyePupil: "#111",
		fruitStyle: "sprite",
		fruitBlock: "#e63946",
		fruitGlow: "transparent",
		glow: 0,
	},
	neon: {
		background: "#05050f",
		boardLight: "#080818",
		boardDark: "#05050f",
		gridLine: "rgba(0,245,255,0.09)",
		snakeBody: "#00ff88", // --green
		snakeHead: "#00f5ff", // --cyan
		snakePad: 6,
		bodyRadius: 6,
		headRadius: 8,
		eyeWhite: "#f5ff00", // --yellow
		eyePupil: "#05050f",
		fruitStyle: "sprite",
		fruitBlock: "#ff006e",
		fruitGlow: "#ff006e", // --magenta
		glow: 12,
	},
	retro: {
		// Paleta Game Boy: 0f380f, 306230, 8bac0f, 9bbc0f
		background: "#0f380f",
		boardLight: "#9bbc0f",
		boardDark: "#8bac0f",
		gridLine: null,
		snakeBody: "#306230",
		snakeHead: "#0f380f",
		snakePad: 2,
		bodyRadius: 0,
		headRadius: 0,
		eyeWhite: "#9bbc0f",
		eyePupil: "#0f380f",
		fruitStyle: "block",
		fruitBlock: "#0f380f",
		fruitGlow: "transparent",
		glow: 0,
	},
};

export function resolveSkin(id: string | undefined): SkinId {
	return SKIN_IDS.includes(id as SkinId) ? (id as SkinId) : DEFAULT_SKIN;
}
