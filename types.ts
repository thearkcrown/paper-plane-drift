
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Point {
  width: number;
  height: number;
  vx: number;
  vy: number;
  markedForDeletion?: boolean;
}

export enum ObstacleType {
  PENCIL = 'PENCIL',
  TAPE = 'TAPE',
  ERASER = 'ERASER',
  TORNADO = 'TORNADO'
}

export interface Obstacle extends Entity {
  type: ObstacleType;
  rotation: number;
}

export interface Particle extends Entity {
  life: number;
  color: string;
  hasTrail?: boolean;
}

export interface GameReport {
  grade: string;
  comment: string;
}

export enum PlaneSkin {
  DEFAULT = 'DEFAULT',
  CRANE = 'CRANE',
  NEWSPAPER = 'NEWSPAPER',
  FOIL = 'FOIL',
  COMIC = 'COMIC',
  GOLD = 'GOLD'
}

export enum PowerUpType {
  SHIELD_TAPE = 'SHIELD_TAPE',
  ERASER_BOMB = 'ERASER_BOMB',
  SLOW_MO_INK = 'SLOW_MO_INK',
  MAGNET_CLIP = 'MAGNET_CLIP',
  BOOST_ARROW = 'BOOST_ARROW'
}

export interface PowerUp extends Entity {
  type: PowerUpType;
  rotation: number;
}
