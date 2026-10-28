// Canvas lógico 4:3: rejilla de 20×15 celdas de 40 px, sin letterbox.
export const W = 800;
export const H = 600;

export const COLS = 20;
export const ROWS = 15;
export const CELL = 40;

export const START_LENGTH = 3;

export const FRUIT_POINTS = 10;
export const FRUITS_PER_LEVEL = 5;
export const MAX_LEVEL = 9;

// Casillas/s = BASE_SPEED + nivel: 8 en el nivel 1, 16 en el 9.
export const BASE_SPEED = 7;
export const MAX_DT = 0.05; // máximo 2 ticks por frame

export const EAT_MS = 150;
export const DEATH_MS = 600;

export const SPRITE_URL = "/games/snake/fruits.png";
