// Skins de Arkanoid: solo apariencia. No afectan a reglas, velocidades ni puntuación.
import type { BlockColor } from "./levels";

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
export const DEFAULT_SKIN: SkinId = "clasico";

export interface Skin {
	background: string;
	/** "sprite" usa el spritesheet (con formas simples si no carga); el resto dibuja formas. */
	style: "sprite" | "solid" | "outline";
	/** Colores de bloque para las formas (y para el fallback sin spritesheet). */
	blockColors: Record<BlockColor, string>;
	/** Hueco en px entre bloques en el dibujo con formas. */
	blockInset: number;
	/** Grosor del trazo en el estilo "outline". */
	lineWidth: number;
	explosion: string;
	paddle: string;
	ball: string;
	ballShape: "circle" | "square";
	/** shadowBlur de bloques, pala y bola (0 = sin brillo). */
	glow: number;
}

export const SKINS: Record<SkinId, Skin> = {
	// Réplica exacta del aspecto original (spritesheet; fallback original si falla la carga).
	clasico: {
		background: "#000",
		style: "sprite",
		blockColors: {
			red: "#ff3b3b",
			yellow: "#f5ff00",
			cyan: "#00f5ff",
			magenta: "#aa00ff",
			hotpink: "#ff006e",
			green: "#00ff88",
			gray: "#9e9e9e",
		},
		blockInset: 1,
		lineWidth: 1,
		explosion: "#fff",
		paddle: "#f5ff00",
		ball: "#fff",
		ballShape: "circle",
		glow: 0,
	},
	// Trazos finos con brillo sobre fondo oscuro; tokens --cyan, --magenta, --yellow, --green.
	neon: {
		background: "#05050f",
		style: "outline",
		blockColors: {
			red: "#ff006e",
			yellow: "#f5ff00",
			cyan: "#00f5ff",
			magenta: "#ff006e",
			hotpink: "#ff006e",
			green: "#00ff88",
			gray: "#8fa3ad",
		},
		blockInset: 2,
		lineWidth: 1.5,
		explosion: "#ffffff",
		paddle: "#00f5ff",
		ball: "#f5ff00",
		ballShape: "circle",
		glow: 12,
	},
	// Monocromo verde tipo Game Boy: #0f380f, #306230, #8bac0f, #9bbc0f, #e0f8d0. Sin brillo.
	retro: {
		background: "#0f380f",
		style: "solid",
		blockColors: {
			red: "#9bbc0f",
			yellow: "#9bbc0f",
			hotpink: "#9bbc0f",
			cyan: "#8bac0f",
			green: "#8bac0f",
			magenta: "#8bac0f",
			gray: "#306230",
		},
		blockInset: 2,
		lineWidth: 1,
		explosion: "#e0f8d0",
		paddle: "#e0f8d0",
		ball: "#e0f8d0",
		ballShape: "square",
		glow: 0,
	},
};

export function resolveSkin(id: string | undefined): SkinId {
	return SKIN_IDS.includes(id as SkinId) ? (id as SkinId) : DEFAULT_SKIN;
}
