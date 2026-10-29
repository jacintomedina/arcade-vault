// Skins de Tetris: solo apariencia. No afectan a reglas, velocidades ni puntuación.

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
export const DEFAULT_SKIN: SkinId = "clasico";

export interface Skin {
	background: string;
	grid: string; // líneas de la cuadrícula
	gridWidth: number;
	frame: string; // borde del tablero
	panelFrame: string; // caja SIGUIENTE
	label: string;
	value: string;
	flash: string; // destello al borrar líneas
	ghostAlpha: number;
	/** Índice = tipo de pieza (posición 0 sin uso). */
	pieceColors: string[];
	blockStyle: "solid" | "outline";
	/** Franja superior de brillo; null = bloque plano. */
	blockHighlight: string | null;
	/** shadowBlur de bloques y marcos (0 = sin brillo). */
	glow: number;
	/** shadowBlur del texto del panel (0 = sin brillo). */
	textGlow: number;
}

export const SKINS: Record<SkinId, Skin> = {
	clasico: {
		background: "#000",
		grid: "rgba(255,255,255,0.06)",
		gridWidth: 0.5,
		frame: "rgba(255,255,255,0.25)",
		panelFrame: "rgba(255,255,255,0.25)",
		label: "rgba(255,255,255,0.6)",
		value: "#fff",
		flash: "#fff",
		ghostAlpha: 0.2,
		pieceColors: [
			"",
			"#4dd0e1",
			"#ffd54f",
			"#ba68c8",
			"#81c784",
			"#e57373",
			"#90caf9",
			"#ffb74d",
			"#9e9e9e",
		],
		blockStyle: "solid",
		blockHighlight: "rgba(255,255,255,0.12)",
		glow: 0,
		textGlow: 0,
	},
	neon: {
		background: "#05050f",
		grid: "rgba(0,245,255,0.07)",
		gridWidth: 0.5,
		frame: "#00f5ff",
		panelFrame: "#ff006e",
		label: "#8a8fb5",
		value: "#f5ff00",
		flash: "#e6e9ff",
		ghostAlpha: 0.35,
		pieceColors: [
			"",
			"#00f5ff", // cyan
			"#f5ff00", // yellow
			"#ff006e", // magenta
			"#00ff88", // green
			"#ff3d3d",
			"#4d7cff",
			"#ff9100",
			"#e6e9ff",
		],
		blockStyle: "outline",
		blockHighlight: null,
		glow: 10,
		textGlow: 8,
	},
	retro: {
		// Paleta Game Boy: 0f380f, 306230, 6f9a1f, 8bac0f, 9bbc0f
		background: "#0f380f",
		grid: "#1a4a1a",
		gridWidth: 1,
		frame: "#8bac0f",
		panelFrame: "#8bac0f",
		label: "#6f9a1f",
		value: "#9bbc0f",
		flash: "#9bbc0f",
		ghostAlpha: 0.3,
		pieceColors: [
			"",
			"#9bbc0f",
			"#9bbc0f",
			"#8bac0f",
			"#8bac0f",
			"#6f9a1f",
			"#6f9a1f",
			"#9bbc0f",
			"#8bac0f",
		],
		blockStyle: "solid",
		blockHighlight: null,
		glow: 0,
		textGlow: 0,
	},
};

export function resolveSkin(id: string | undefined): SkinId {
	return SKIN_IDS.includes(id as SkinId) ? (id as SkinId) : DEFAULT_SKIN;
}
