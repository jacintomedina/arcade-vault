// Canvas lógico 4:3, igual que el original: no hace falta letterbox.
export const W = 800;
export const H = 600;

// Rejilla de bloques: 10×6 celdas de 64×24 centrada en horizontal.
export const COLS = 10;
export const ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const ORIGIN_X = (W - COLS * BLOCK_W) / 2;
export const ORIGIN_Y = 80;

export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_SPEED = 400; // px/s con teclado

export const BALL_SIZE = 16;
// Velocidad base (px/s); el módulo se multiplica por speedOf(nivel).
export const BASE_VX = 200;
export const BASE_VY = -300;
export const SPEED_STEP = 1.1; // ×1,1 por nivel
export const MAX_LEVEL = 10;

// Rebote en la pala: ángulo máximo respecto a la vertical.
export const MAX_ANGLE = (60 * Math.PI) / 180;

export const BLOCK_POINTS = 10;
export const START_LIVES = 3;

// Física en pasos fijos: a ×2,36 la bola recorre 7,1 px por paso.
export const STEP = 1 / 120;
export const MAX_DT = 0.05; // máximo 6 pasos por frame
export const EXPLOSION_MS = 150;
