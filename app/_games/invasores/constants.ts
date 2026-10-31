// Canvas lógico 4:3, igual que el resto de juegos: no hace falta letterbox.
export const W = 800;
export const H = 600;

// Formación: 11 columnas × 5 filas. Cada invasor ocupa una celda de 36×24
// dentro de una rejilla con paso de 48 px en horizontal y 36 px en vertical.
export const COLS = 11;
export const ROWS = 5;
export const ALIEN_W = 36;
export const ALIEN_H = 24;
export const PITCH_X = 48;
export const PITCH_Y = 36;
// Formación centrada: ancho = (COLS − 1) × PITCH_X + ALIEN_W = 516.
export const FORM_X0 = (W - ((COLS - 1) * PITCH_X + ALIEN_W)) / 2;
export const FORM_Y0 = 90; // oleada 1; cada oleada baja 24 px más hasta 96 px
export const WAVE_DROP_Y = 24;
export const WAVE_DROP_MAX = 4; // máximo de escalones de 24 px

// Marcha: cada tick mueve 8 px en horizontal; al tocar el margen baja 24 px.
export const MARCH_STEP_X = 8;
export const DROP_Y = 24;
export const SIDE_MARGIN = 20;
export const INVASION_Y = 500; // un invasor que llega aquí termina la partida
// Intervalo de marcha (s) = (MARCH_MIN + MARCH_RANGE × vivos / total) × 0,95^min(oleada − 1, 8)
export const MARCH_MIN = 0.03;
export const MARCH_RANGE = 0.6;
export const WAVE_SPEEDUP = 0.95;
export const WAVE_SPEEDUP_CAP = 8; // la dificultad deja de crecer en la oleada 9

// Cañón.
export const SHIP_W = 44;
export const SHIP_H = 20;
export const SHIP_Y = 548;
export const SHIP_SPEED = 300; // px/s
export const SHIP_MIN_X = 20;
export const SHIP_MAX_X = 736;

// Balas.
export const BULLET_W = 4;
export const BULLET_H = 14;
export const PLAYER_BULLET_SPEED = 600; // px/s
export const FIRE_COOLDOWN = 0.25; // s entre disparos
export const ENEMY_BULLET_SPEED = 260; // px/s
export const MAX_ENEMY_BULLETS = 3;
export const ENEMY_FIRE_MIN = 0.5; // s, intervalo aleatorio entre disparos enemigos
export const ENEMY_FIRE_MAX = 1.2;
export const ENEMY_FIRE_FLOOR = 0.35; // s, mínimo tras aplicar la oleada

// Escudos: 4 bitmaps de 22×16 celdas de 3 px (66×48 px).
export const SHIELD_COUNT = 4;
export const SHIELD_CELL = 3;
export const SHIELD_COLS = 22;
export const SHIELD_ROWS = 16;
export const SHIELD_W = SHIELD_COLS * SHIELD_CELL;
export const SHIELD_H = SHIELD_ROWS * SHIELD_CELL;
export const SHIELD_CENTERS_X = [160, 320, 480, 640];
export const SHIELD_CENTER_Y = 440;
export const SHIELD_BLAST = 2; // radio de borrado en celdas

// Platillo bonus.
export const UFO_W = 40;
export const UFO_H = 18;
export const UFO_Y = 50;
export const UFO_SPEED = 140; // px/s
export const UFO_MIN_ALIENS = 8; // solo aparece con 8 o más invasores vivos
export const UFO_INTERVAL_MIN = 20; // s entre apariciones
export const UFO_INTERVAL_MAX = 30;
export const UFO_SCORES = [50, 100, 150, 300];

// Puntos por fila de invasor (de arriba abajo): calamar, 2 cangrejos, 2 pulpos.
export const ALIEN_POINTS = [30, 20, 20, 10, 10];

export const START_LIVES = 3;

// Duraciones de estado (s).
export const INTRO_TIME = 0.8;
export const DYING_TIME = 1.2;
export const CLEARING_TIME = 1.2;

// Física en pasos fijos: la bala del jugador recorre 5 px por paso,
// menos que el alto de un invasor (24 px).
export const STEP = 1 / 120;
export const MAX_DT = 0.05; // máximo 6 pasos por frame
