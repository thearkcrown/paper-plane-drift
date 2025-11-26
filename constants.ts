
export const GRAVITY = 0.4; // Heavier for more weight
export const AIR_RESISTANCE = 0.98; // Slightly more drag for stability

// Thrust / Physics
export const THRUST_MAX = 1.2;       // Stronger engine to counter heavier gravity
export const THRUST_ACCEL = 0.15;    // Coefficient for ease-out acceleration (0.0 - 1.0)
export const THRUST_DECAY = 0.1;     // Coefficient for exponential decay (0.0 - 1.0)

// Game Speed
export const GAME_SPEED_INITIAL = 4;
export const MAX_SPEED = 9;
export const SPEED_INCREMENT = 0.001;

// Dimensions relative to a base scale (assuming ~1080p height logic, scaled down)
export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 20;

export const PENCIL_WIDTH = 15;
export const PENCIL_HEIGHT = 120;

export const TAPE_WIDTH = 60;
export const TAPE_HEIGHT = 40;

export const ERASER_WIDTH = 30;
export const ERASER_HEIGHT = 30;

export const TORNADO_WIDTH = 50;
export const TORNADO_HEIGHT = 80;

export const SPAWN_RATE_INITIAL = 60; // Frames between spawns

// Colors
export const COLOR_PAPER_BG = '#fdfbf7';
export const COLOR_LINE_BLUE = '#a2d1f0';
export const COLOR_LINE_RED = '#f0a2a2';
export const COLOR_PENCIL_BODY = '#fbbf24'; // amber-400
export const COLOR_PENCIL_TIP = '#1f2937'; // gray-800
export const COLOR_ERASER_PINK = '#f472b6'; // pink-400
export const COLOR_TAPE = 'rgba(250, 204, 21, 0.4)'; // translucent yellow
export const COLOR_STICKY_TRAIL = 'rgba(234, 179, 8, 0.6)'; // sticky residue
export const COLOR_PAPER_PARTICLE = '#f3f4f6'; // gray-100
export const COLOR_PAPER_PARTICLE_DARK = '#d1d5db'; // gray-300

export const API_KEY_ENV = process.env.API_KEY;
