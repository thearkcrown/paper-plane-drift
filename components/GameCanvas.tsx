import React, { useRef, useEffect } from 'react';
import {
  GameState,
  Entity,
  Obstacle,
  ObstacleType,
  Particle,
  PlaneSkin,
  PowerUp,
  PowerUpType
} from '../types';
import { PlayerUpgrades, PlayerInventory, getUpgradeEffect, UPGRADES, UpgradeType, ConsumableType } from '../types/shop';
import * as C from '../constants';
import { playCollectSound, playTapeSound, playPaperPuffSound, playCrashSound } from '../utils/sound';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  setEraserCount: (count: number) => void; // For UI display
  onGameOver: (finalScore: number, distance: number, cause: string) => void;
  eraserCountRef: React.MutableRefObject<number>; // Passed as ref for sync access in loop
  skin: PlaneSkin;
  upgrades: PlayerUpgrades; // Player's upgrade levels
  inventory: PlayerInventory; // Player's consumable inventory
  onUseConsumable: (consumableId: ConsumableType) => void; // Callback to decrement inventory
  gamesPlayed: number; // Number of games played (for unlocking power-ups)
}

interface BgDoodle {
  x: number;
  y: number;
  yBase: number;
  type: 'cloud' | 'math' | 'scribble' | 'star' | 'bolt' | 'face' | 'smudge';
  content?: string;
  parallax: number; // Speed multiplier (lower = further away)
  scale: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  phase: number;
}

interface BackgroundPlane {
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  rotation: number;
  skin: PlaneSkin;
  opacity: number;
  bobPhase: number;
}

const MATH_SYMBOLS = ['x', 'y', 'π', '2', '+', '%', '√', '≠', '∞', 'a²', 'sin'];

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  setGameState,
  setScore,
  setEraserCount,
  onGameOver,
  eraserCountRef,
  skin,
  upgrades,
  inventory,
  onUseConsumable,
  gamesPlayed
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const distanceRef = useRef<number>(0);

  // Game State Refs (Mutable for performance in game loop)
  const playerRef = useRef<Entity>({ x: 50, y: 200, width: C.PLAYER_WIDTH, height: C.PLAYER_HEIGHT, vx: 0, vy: 0 });
  const currentThrustRef = useRef<number>(0); // Tracks current upward force

  const obstaclesRef = useRef<Obstacle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bgDoodlesRef = useRef<BgDoodle[]>([]);
  const backgroundPlanesRef = useRef<BackgroundPlane[]>([]);

  const frameCountRef = useRef<number>(0);
  const gameSpeedRef = useRef<number>(C.GAME_SPEED_INITIAL);
  const isTapeSlowRef = useRef<boolean>(false); // Initialize with boolean false

  // Consumable State
  const magnetActiveRef = useRef<number>(0); // Remaining frames for magnet effect
  const slowMotionActiveRef = useRef<number>(0); // Remaining frames for slow motion
  const baseGameSpeedRef = useRef<number>(C.GAME_SPEED_INITIAL); // Store base speed before slow motion

  // Power-up State
  const shieldActiveRef = useRef<boolean>(false); // Shield from one hit
  const boostActiveRef = useRef<number>(0); // Remaining frames for boost effect
  
  // Texture Refs
  const paperPatternRef = useRef<CanvasPattern | null>(null);
  const comicPatternRef = useRef<CanvasPattern | null>(null);

  // Input State
  const isUpPressedRef = useRef<boolean>(false);

  // Helper: Create Particles
  const createExplosion = (x: number, y: number, color: string, count: number = 10, speedScale: number = 1) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10 * speedScale,
        vy: (Math.random() - 0.5) * 10 * speedScale,
        width: Math.random() * 3 + 2, 
        height: Math.random() * 3 + 2,
        life: 1.0,
        color
      });
    }
  };

  const createDust = (x: number, y: number) => {
    // Upward puff for floor impact
    for (let i = 0; i < 15; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 12, // Wide spread
        vy: (Math.random() * -6) - 1,   // Strictly upward
        width: Math.random() * 5 + 3,
        height: Math.random() * 5 + 3,
        life: 0.8 + Math.random() * 0.4,
        color: '#d1d5db', // Gray-300 dust
        hasTrail: false
      });
    }
  };

  const createConfetti = (x: number, y: number) => {
    const colors = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#ffffff']; // Pink, Blue, Green, Yellow, White
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Slight upward bias
        width: Math.random() * 5 + 4,
        height: Math.random() * 5 + 4,
        life: 1.5 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        hasTrail: false
      });
    }
  };

  const createPaperPuff = (x: number, y: number) => {
     // Create specific paper debris with trails (increased count)
     for (let i = 0; i < 20; i++) {
        particlesRef.current.push({
          x, y,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          width: Math.random() * 6 + 3,
          height: Math.random() * 6 + 3,
          life: 1.2,
          color: Math.random() > 0.5 ? C.COLOR_PAPER_PARTICLE : C.COLOR_PAPER_PARTICLE_DARK,
          hasTrail: true
        });
     }
     
     // Add distinct pencil tip debris (dark/lead)
     for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x, y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          width: 3,
          height: 3,
          life: 0.9,
          color: C.COLOR_PENCIL_TIP, 
          hasTrail: false
        });
     }

     createExplosion(x, y, '#ffffff', 8, 1.0); // Flash
  };

  // Consumable Activation Functions
  const useMagnet = () => {
    if (inventory.magnet <= 0 || magnetActiveRef.current > 0 || gameState !== GameState.PLAYING) return;
    onUseConsumable(ConsumableType.MAGNET);
    magnetActiveRef.current = 60 * 5; // 5 seconds at 60 FPS
  };

  const useSlowMotion = () => {
    if (inventory.slowMotion <= 0 || slowMotionActiveRef.current > 0 || gameState !== GameState.PLAYING) return;
    onUseConsumable(ConsumableType.SLOW_MOTION);
    slowMotionActiveRef.current = 60 * 3; // 3 seconds at 60 FPS
    baseGameSpeedRef.current = gameSpeedRef.current;
  };

  const getPowerUpColor = (type: PowerUpType): string => {
    switch (type) {
      case PowerUpType.SHIELD_TAPE:
        return '#60a5fa'; // Blue
      case PowerUpType.ERASER_BOMB:
        return '#fbbf24'; // Yellow/Gold
      case PowerUpType.SLOW_MO_INK:
        return '#8b5cf6'; // Purple
      case PowerUpType.MAGNET_CLIP:
        return '#3b82f6'; // Dark Blue
      case PowerUpType.BOOST_ARROW:
        return '#f97316'; // Orange
      default:
        return '#ffffff';
    }
  };

  const useEraserBomb = () => {
    if (inventory.eraserBomb <= 0 || gameState !== GameState.PLAYING) return;
    onUseConsumable(ConsumableType.ERASER_BOMB);

    // Clear all obstacles ahead of player
    const p = playerRef.current;
    obstaclesRef.current.forEach(obs => {
      if (obs.x > p.x && obs.type !== ObstacleType.ERASER) {
        // Create explosion effect
        createExplosion(obs.x + obs.width/2, obs.y + obs.height/2, '#fbbf24', 15, 1.5);
        obs.markedForDeletion = true;
      }
    });
    playCrashSound(); // Boom sound
  };

  const spawnDoodle = (canvasWidth: number, canvasHeight: number, xOverride?: number) => {
    const typeRoll = Math.random();
    let type: BgDoodle['type'] = 'math';
    
    // Expanded variety including Smudges
    if (typeRoll > 0.90) type = 'smudge';
    else if (typeRoll > 0.80) type = 'cloud';
    else if (typeRoll > 0.70) type = 'scribble';
    else if (typeRoll > 0.55) type = 'star';
    else if (typeRoll > 0.40) type = 'bolt';
    else if (typeRoll > 0.25) type = 'face';
    // else math

    // Depth determines speed, size, and opacity
    // 0.1 = Far away (slow, small, faint)
    // 0.5 = Closer (faster, larger, darker)
    const depth = Math.random() * 0.4 + 0.1; 
    const startY = Math.random() * canvasHeight;

    bgDoodlesRef.current.push({
      x: xOverride ?? canvasWidth + 50 + Math.random() * 100,
      y: startY,
      yBase: startY,
      type,
      content: type === 'math' ? MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)] : undefined,
      parallax: depth,
      scale: type === 'smudge' ? 1.5 + Math.random() : 0.5 + depth * 1.5,
      rotation: (Math.random() - 0.5) * 0.5,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      opacity: type === 'smudge' ? 0.05 + Math.random() * 0.05 : 0.1 + depth * 0.3,
      phase: Math.random() * Math.PI * 2
    });
  };

  const spawnBackgroundPlane = (canvasWidth: number, canvasHeight: number) => {
    const allSkins = [
      PlaneSkin.DEFAULT,
      PlaneSkin.NEWSPAPER,
      PlaneSkin.FOIL,
      PlaneSkin.COMIC,
      PlaneSkin.CRANE
    ];

    // Random depth for parallax effect
    const depth = Math.random() * 0.5 + 0.3; // 0.3 to 0.8
    const scale = 0.4 + depth * 0.6; // Smaller planes = further away

    backgroundPlanesRef.current.push({
      x: canvasWidth + 100,
      y: Math.random() * canvasHeight,
      vx: -(1 + depth * 3), // Slower = further away
      vy: (Math.random() - 0.5) * 0.5, // Slight vertical drift
      scale,
      rotation: -0.1 + (Math.random() - 0.5) * 0.2,
      skin: allSkins[Math.floor(Math.random() * allSkins.length)],
      opacity: 0.3 + depth * 0.4, // More transparent when further
      bobPhase: Math.random() * Math.PI * 2
    });
  };

  const spawnObstacle = (canvasWidth: number, canvasHeight: number) => {
    const typeRoll = Math.random();
    let type = ObstacleType.PENCIL;
    
    // Weighted probabilities
    // Pencil Rain Chance handled separately within PENCIL block
    // Tornado: Rare (5%)
    // Eraser: 10%
    // Tape: 20%
    // Pencil: 65%

    if (typeRoll > 0.95) type = ObstacleType.TORNADO;
    else if (typeRoll > 0.85) type = ObstacleType.ERASER;
    else if (typeRoll > 0.65) type = ObstacleType.TAPE;

    // Special Event: Pencil Rain (Burst spawn)
    if (type === ObstacleType.PENCIL && Math.random() > 0.8) {
      // Spawn 3 pencils in a rapid wave
      for (let i = 0; i < 3; i++) {
        obstaclesRef.current.push({
          type: ObstacleType.PENCIL,
          x: canvasWidth + 100 + (i * 150), // Spaced out horizontally
          y: -C.PENCIL_HEIGHT - (Math.random() * 100), // Slightly staggered heights
          width: C.PENCIL_WIDTH,
          height: C.PENCIL_HEIGHT,
          vx: -gameSpeedRef.current * 0.5, 
          vy: Math.random() * 4 + 3, // Faster fall
          rotation: 0
        });
      }
      return;
    }

    let obs: Obstacle;

    if (type === ObstacleType.TORNADO) {
      // Doodle Tornado
      obs = {
        type,
        x: canvasWidth + 50,
        y: Math.random() * (canvasHeight - 200) + 100,
        width: C.TORNADO_WIDTH,
        height: C.TORNADO_HEIGHT,
        vx: -gameSpeedRef.current * 1.2, // Moves fast
        vy: 0, // Vertical wobble calculated in render/update usually, or simple sine here
        rotation: 0
      };
    } else if (type === ObstacleType.PENCIL) {
      // Standard Pencil
      obs = {
        type,
        x: Math.random() * (canvasWidth - 100) + 100, 
        y: -C.PENCIL_HEIGHT,
        width: C.PENCIL_WIDTH,
        height: C.PENCIL_HEIGHT,
        vx: -gameSpeedRef.current * 0.5,
        vy: Math.random() * 3 + 2,
        rotation: 0
      };
    } else if (type === ObstacleType.TAPE) {
      // Tape floats mid-air
      obs = {
        type,
        x: canvasWidth + 50,
        y: Math.random() * (canvasHeight - 200) + 50,
        width: C.TAPE_WIDTH,
        height: C.TAPE_HEIGHT,
        vx: -gameSpeedRef.current,
        vy: 0,
        rotation: (Math.random() - 0.5) * 0.5
      };
    } else {
      // Eraser floats
      obs = {
        type,
        x: canvasWidth + 50,
        y: Math.random() * (canvasHeight - 100) + 50,
        width: C.ERASER_WIDTH,
        height: C.ERASER_HEIGHT,
        vx: -gameSpeedRef.current,
        vy: 0,
        rotation: 0
      };
    }
    obstaclesRef.current.push(obs);
  };

  const spawnPowerUp = (canvasWidth: number, canvasHeight: number) => {
    const typeRoll = Math.random();
    let type = PowerUpType.SHIELD_TAPE;

    // Weighted probabilities for power-ups
    // Shield Tape: 30%
    // Magnet Clip: 25%
    // Slow-Mo Ink: 20%
    // Boost Arrow: 15%
    // Eraser Bomb: 10%

    if (typeRoll > 0.90) type = PowerUpType.ERASER_BOMB;
    else if (typeRoll > 0.75) type = PowerUpType.BOOST_ARROW;
    else if (typeRoll > 0.55) type = PowerUpType.SLOW_MO_INK;
    else if (typeRoll > 0.30) type = PowerUpType.MAGNET_CLIP;
    // else defaults to SHIELD_TAPE

    const powerUp: PowerUp = {
      type,
      x: canvasWidth + 50,
      y: Math.random() * (canvasHeight - 150) + 75, // Float in safe zone
      width: 40,
      height: 40,
      vx: -gameSpeedRef.current * 0.8, // Slightly slower than obstacles
      vy: Math.sin(Date.now() * 0.001) * 2, // Gentle bobbing motion
      rotation: 0
    };

    powerUpsRef.current.push(powerUp);
  };

  const resetGame = () => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current;

    playerRef.current = { x: 50, y: height / 2, width: C.PLAYER_WIDTH, height: C.PLAYER_HEIGHT, vx: 0, vy: 0 };
    obstaclesRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    bgDoodlesRef.current = [];
    backgroundPlanesRef.current = [];

    // Pre-populate background doodles
    for (let i = 0; i < 20; i++) {
      spawnDoodle(width, height, Math.random() * width);
    }

    // Pre-populate background planes (for START screen)
    for (let i = 0; i < 7; i++) {
      const allSkins = [
        PlaneSkin.DEFAULT,
        PlaneSkin.NEWSPAPER,
        PlaneSkin.FOIL,
        PlaneSkin.COMIC,
        PlaneSkin.CRANE
      ];

      const depth = Math.random() * 0.5 + 0.3;
      const scale = 0.4 + depth * 0.6;

      backgroundPlanesRef.current.push({
        x: Math.random() * width, // Spread across screen initially
        y: Math.random() * height,
        vx: -(1 + depth * 3),
        vy: (Math.random() - 0.5) * 0.5,
        scale,
        rotation: -0.1 + (Math.random() - 0.5) * 0.2,
        skin: allSkins[Math.floor(Math.random() * allSkins.length)],
        opacity: 0.3 + depth * 0.4,
        bobPhase: Math.random() * Math.PI * 2
      });
    }

    scoreRef.current = 0;
    distanceRef.current = 0;

    // Apply Speed upgrade
    const speedBoost = getUpgradeEffect(UPGRADES[UpgradeType.SPEED], upgrades.speed);
    gameSpeedRef.current = C.GAME_SPEED_INITIAL + speedBoost;

    // Apply Shield Capacity upgrade (starting erasers)
    const startingErasers = Math.floor(getUpgradeEffect(UPGRADES[UpgradeType.SHIELD_CAPACITY], upgrades.shieldCapacity));
    eraserCountRef.current = startingErasers;
    setEraserCount(startingErasers);

    isUpPressedRef.current = false;
    currentThrustRef.current = 0;
    setScore(0);
    frameCountRef.current = 0;

    // Reset power-up states
    shieldActiveRef.current = false;
    boostActiveRef.current = 0;
    magnetActiveRef.current = 0;
    slowMotionActiveRef.current = 0;
    isTapeSlowRef.current = false;
  };

  const update = (time: number) => {
    if ((gameState !== GameState.PLAYING && gameState !== GameState.START) || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameCountRef.current++;

    if (gameState === GameState.PLAYING) {
        // Update consumable timers
        if (magnetActiveRef.current > 0) {
          magnetActiveRef.current--;
        }

        if (slowMotionActiveRef.current > 0) {
          slowMotionActiveRef.current--;
          // Apply slow motion effect (50% speed)
          gameSpeedRef.current = baseGameSpeedRef.current * 0.5;

          if (slowMotionActiveRef.current === 0) {
            // Restore normal speed when effect ends
            gameSpeedRef.current = baseGameSpeedRef.current;
          }
        } else {
          // Normal speed progression
          baseGameSpeedRef.current = gameSpeedRef.current;
        }

        // Update boost timer
        if (boostActiveRef.current > 0) {
          boostActiveRef.current--;
        }

        distanceRef.current += gameSpeedRef.current / 100;

        if (gameSpeedRef.current < C.MAX_SPEED && slowMotionActiveRef.current === 0) {
          gameSpeedRef.current += C.SPEED_INCREMENT;
        }

        const currentSpawnRate = Math.max(20, C.SPAWN_RATE_INITIAL - Math.floor(scoreRef.current / 100));
        if (frameCountRef.current % currentSpawnRate === 0) {
          spawnObstacle(canvas.width, canvas.height);
        }

        // Spawn power-ups less frequently than obstacles (only after 10 games played)
        if (gamesPlayed >= 10) {
          const powerUpSpawnRate = Math.max(120, 200 - Math.floor(scoreRef.current / 150));
          if (frameCountRef.current % powerUpSpawnRate === 0 && Math.random() > 0.5) {
            spawnPowerUp(canvas.width, canvas.height);
          }
        }

        // --- Eraser Snow (Weather Effect) ---
        // Spawn small white particles from the top/right
        if (frameCountRef.current % 5 === 0) {
           particlesRef.current.push({
             x: canvas.width + Math.random() * 50,
             y: Math.random() * canvas.height * 0.5, // Mostly top half
             vx: -gameSpeedRef.current * 0.8 - Math.random(),
             vy: Math.random() * 2 + 0.5, // Fall slowly
             width: 4,
             height: 4,
             life: 2.0, // Last a while
             color: '#ffffff',
             hasTrail: false
           });
        }
    } else if (gameState === GameState.START) {
        gameSpeedRef.current = 3;
    }

    // Spawn Background Doodles
    if (frameCountRef.current % 15 === 0) {
      spawnDoodle(canvas.width, canvas.height);
    }

    // --- Physics ---
    const p = playerRef.current;

    if (gameState === GameState.PLAYING) {
        // Apply Stability upgrade (reduces gravity)
        const stabilityMultiplier = getUpgradeEffect(UPGRADES[UpgradeType.STABILITY], upgrades.stability);
        let gravity = C.GRAVITY * stabilityMultiplier;
        let drag = C.AIR_RESISTANCE;

        const wasTapeSlow = isTapeSlowRef.current;
        isTapeSlowRef.current = false;
        obstaclesRef.current.forEach(obs => {
          if (obs.type === ObstacleType.TAPE && checkCollision(p, obs)) {
            isTapeSlowRef.current = true;
          }
        });

        if (isTapeSlowRef.current && !wasTapeSlow) {
          playTapeSound();
        }

        if (isTapeSlowRef.current) {
          // Apply Wind Resistance upgrade (reduces tape slowdown effect)
          const windResistance = getUpgradeEffect(UPGRADES[UpgradeType.WIND_RESISTANCE], upgrades.windResistance);
          const tapeGravityReduction = 0.5 + (windResistance * 0.4); // 0.5 base, up to 0.9 at max upgrade
          gravity *= tapeGravityReduction;
          drag = 0.92;
          
          if (frameCountRef.current % 4 === 0) {
            particlesRef.current.push({
              x: p.x,
              y: p.y + p.height / 2 + (Math.random() * 8 - 4),
              vx: -gameSpeedRef.current,
              vy: (Math.random() - 0.5) * 1,
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              life: 1.0,
              color: C.COLOR_STICKY_TRAIL
            });
          }
        }

        if (isUpPressedRef.current) {
          const targetMax = C.THRUST_MAX;
          const accelFactor = isTapeSlowRef.current ? C.THRUST_ACCEL * 0.5 : C.THRUST_ACCEL;
          currentThrustRef.current += (targetMax - currentThrustRef.current) * accelFactor;
        } else {
          currentThrustRef.current -= currentThrustRef.current * C.THRUST_DECAY;
          if (currentThrustRef.current < 0.01) currentThrustRef.current = 0;
          if (p.vy < 0) {
              drag *= 0.95; 
          }
        }

        p.vy -= currentThrustRef.current;
        p.vy += gravity;
        p.vy *= drag;

        const maxVel = 9;
        p.vy = Math.max(-maxVel, Math.min(maxVel, p.vy));
        p.y += p.vy;

        if (p.y + p.height > canvas.height) {
          createDust(p.x + p.width/2, canvas.height);
          handleGameOver("Crashed into the desk.");
          return;
        }
        if (p.y < 0) {
          p.y = 0;
          p.vy = 0;
        }
    } else if (gameState === GameState.START) {
        const hoverY = canvas.height / 2;
        p.y = hoverY + Math.sin(frameCountRef.current * 0.05) * 25;
        p.vy = Math.cos(frameCountRef.current * 0.05) * 1.5; 
        p.x = 50;
    }

    // Update background doodles
    bgDoodlesRef.current.forEach(bg => {
      bg.x -= gameSpeedRef.current * bg.parallax;
      bg.rotation += bg.rotationSpeed;
      bg.y = bg.yBase + Math.sin(frameCountRef.current * 0.02 + bg.phase) * (5 * bg.scale);
    });
    bgDoodlesRef.current = bgDoodlesRef.current.filter(bg => bg.x > -150); // Wider cleanup for smudges

    // Update background planes (only during START state)
    if (gameState === GameState.START) {
      backgroundPlanesRef.current.forEach(plane => {
        plane.x += plane.vx;
        plane.y += plane.vy;
        plane.bobPhase += 0.02;
        plane.y += Math.sin(plane.bobPhase) * 0.3; // Gentle bobbing

        // Respawn when off-screen
        if (plane.x < -100) {
          plane.x = canvas.width + 100;
          plane.y = Math.random() * canvas.height;
          // Randomize skin again for variety
          const allSkins = [
            PlaneSkin.DEFAULT,
            PlaneSkin.NEWSPAPER,
            PlaneSkin.FOIL,
            PlaneSkin.COMIC,
            PlaneSkin.CRANE
          ];
          plane.skin = allSkins[Math.floor(Math.random() * allSkins.length)];
        }
      });
    }

    obstaclesRef.current.forEach(obs => {
      obs.x += obs.vx;
      obs.y += obs.vy;

      // Update Tornado Specifics (Wobble)
      if (obs.type === ObstacleType.TORNADO) {
         obs.y += Math.sin(frameCountRef.current * 0.1) * 2;
         obs.rotation += 0.2; // Spin fast
      }

      if (obs.x < -100 || obs.y > canvas.height + 100) {
        obs.markedForDeletion = true;
      }

      // Magnet Effect: Pull erasers toward player
      if (gameState === GameState.PLAYING && magnetActiveRef.current > 0 && obs.type === ObstacleType.ERASER) {
        const dx = p.x - obs.x;
        const dy = p.y - obs.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Magnet range: 300 pixels
        if (dist < 300) {
          const pullStrength = 0.3;
          obs.vx += (dx / dist) * pullStrength * 5;
          obs.vy = (dy / dist) * pullStrength * 5;

          // Visual sparkle trail
          if (frameCountRef.current % 3 === 0) {
            particlesRef.current.push({
              x: obs.x + obs.width/2,
              y: obs.y + obs.height/2,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              width: 3,
              height: 3,
              life: 0.5,
              color: '#60a5fa', // Blue sparkle
              hasTrail: false
            });
          }
        }
      }

      if (gameState === GameState.PLAYING && checkCollision(p, obs)) {
        if (obs.type === ObstacleType.ERASER) {
          eraserCountRef.current += 1;
          setEraserCount(eraserCountRef.current);
          scoreRef.current += 50;
          setScore(scoreRef.current);
          createConfetti(obs.x + obs.width/2, obs.y + obs.height/2);
          playCollectSound();
          obs.markedForDeletion = true;
        } else if (obs.type === ObstacleType.PENCIL) {
          if (shieldActiveRef.current) {
            // Shield protects from one hit
            shieldActiveRef.current = false;
            createExplosion(p.x + p.width/2, p.y + p.height/2, '#60a5fa', 20, 2);
            obs.markedForDeletion = true;
            p.vy = -2;
          } else if (eraserCountRef.current > 0) {
            eraserCountRef.current -= 1;
            setEraserCount(eraserCountRef.current);
            createPaperPuff(obs.x, obs.y + obs.height/2);
            playPaperPuffSound();
            obs.markedForDeletion = true;
            p.vy = -2;
          } else {
            handleGameOver("Impaled by a falling pencil.");
          }
        } else if (obs.type === ObstacleType.TORNADO) {
          if (shieldActiveRef.current) {
            // Shield protects even from tornado
            shieldActiveRef.current = false;
            createExplosion(p.x + p.width/2, p.y + p.height/2, '#60a5fa', 25, 2.5);
            obs.markedForDeletion = true;
          } else {
            // Tornado is instant death without shield
            handleGameOver("Sucked into a chaotic doodle tornado.");
          }
        }
      }
    });

    obstaclesRef.current = obstaclesRef.current.filter(o => !o.markedForDeletion);

    // Update Power-ups
    powerUpsRef.current.forEach(powerUp => {
      powerUp.x += powerUp.vx;
      // Add bobbing motion
      powerUp.y += Math.sin(frameCountRef.current * 0.05 + powerUp.x * 0.01) * 0.5;
      powerUp.rotation += 0.05;

      if (powerUp.x < -100) {
        powerUp.markedForDeletion = true;
      }

      // Magnet Effect: Pull power-ups toward player
      if (gameState === GameState.PLAYING && magnetActiveRef.current > 0) {
        const dx = p.x - powerUp.x;
        const dy = p.y - powerUp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 300) {
          const pullStrength = 0.3;
          powerUp.vx += (dx / dist) * pullStrength * 5;
          powerUp.vy = (dy / dist) * pullStrength * 5;
        }
      }

      // Collision detection for power-up collection
      if (gameState === GameState.PLAYING && checkCollision(p, powerUp)) {
        // Apply power-up effect
        switch (powerUp.type) {
          case PowerUpType.SHIELD_TAPE:
            shieldActiveRef.current = true;
            createExplosion(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, '#60a5fa', 12, 1.2);
            break;
          case PowerUpType.ERASER_BOMB:
            // Clear all obstacles ahead
            obstaclesRef.current.forEach(obs => {
              if (obs.x > p.x && obs.type !== ObstacleType.ERASER) {
                createExplosion(obs.x + obs.width/2, obs.y + obs.height/2, '#fbbf24', 10, 1.2);
                obs.markedForDeletion = true;
              }
            });
            createExplosion(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, '#fbbf24', 15, 1.5);
            playCrashSound();
            break;
          case PowerUpType.SLOW_MO_INK:
            slowMotionActiveRef.current = 180; // 3 seconds at 60fps
            createExplosion(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, '#8b5cf6', 12, 1.2);
            break;
          case PowerUpType.MAGNET_CLIP:
            magnetActiveRef.current = 300; // 5 seconds at 60fps
            createExplosion(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, '#60a5fa', 12, 1.2);
            break;
          case PowerUpType.BOOST_ARROW:
            boostActiveRef.current = 90; // 1.5 seconds at 60fps
            p.vx = 15; // Forward boost
            createExplosion(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, '#f97316', 15, 2);
            break;
        }
        playCollectSound();
        powerUp.markedForDeletion = true;
        scoreRef.current += 25;
        setScore(scoreRef.current);
      }
    });

    powerUpsRef.current = powerUpsRef.current.filter(p => !p.markedForDeletion);

    particlesRef.current.forEach(pt => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      
      // Snow drifts differently
      if (pt.color === '#ffffff') {
         pt.vx = -gameSpeedRef.current * 0.6; // Constant wind
         pt.vy = 1; // Constant fall
         pt.life -= 0.01;
      } else {
         pt.vy += 0.15; // Gravity pull on debris
         pt.life -= 0.02;
      }
      
      // Golden Sparkles Logic
      if (skin === PlaneSkin.GOLD && Math.random() > 0.95 && gameState === GameState.PLAYING) {
         // Ambient sparkles for gold skin handled in render, but debris logic here
      }
    });
    particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);

    if (gameState === GameState.PLAYING && frameCountRef.current % 10 === 0) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
  };

  const checkCollision = (r1: Entity, r2: Entity) => {
    // Tighter hitbox for Tornado
    const isTornado = (r2 as any).type === ObstacleType.TORNADO;
    const pad = isTornado ? 10 : 4;
    return (
      r1.x + pad < r2.x + r2.width - pad &&
      r1.x + r1.width - pad > r2.x + pad &&
      r1.y + pad < r2.y + r2.height - pad &&
      r1.y + r1.height - pad > r2.y + pad
    );
  };

  const handleGameOver = (reason: string) => {
    playCrashSound();
    createExplosion(playerRef.current.x, playerRef.current.y, 'black', 30);
    onGameOver(scoreRef.current, distanceRef.current, reason);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Background ---
    ctx.fillStyle = C.COLOR_PAPER_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = C.COLOR_LINE_BLUE;
    ctx.lineWidth = 1;
    const lineHeight = 30;
    for (let y = lineHeight; y < canvas.height; y += lineHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = C.COLOR_LINE_RED;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 0);
    ctx.lineTo(80, canvas.height);
    ctx.stroke();

    // --- Background Planes (only during START state) ---
    if (gameState === GameState.START) {
      backgroundPlanesRef.current.forEach(plane => {
        ctx.save();
        ctx.globalAlpha = plane.opacity;
        ctx.translate(plane.x, plane.y);
        ctx.scale(plane.scale, plane.scale);
        ctx.rotate(plane.rotation);

        // Draw simplified plane based on skin
        const w = C.PLAYER_WIDTH;
        const h = C.PLAYER_HEIGHT;

        let strokeColor = '#9ca3af'; // Gray for background planes
        let farWingColor = '#e5e7eb';
        let nearWingColor = '#f3f4f6';

        // Apply skin-specific colors (muted for background)
        if (plane.skin === PlaneSkin.NEWSPAPER) {
          farWingColor = '#e5e7eb';
          nearWingColor = '#f9fafb';
        } else if (plane.skin === PlaneSkin.FOIL) {
          farWingColor = '#cbd5e1';
          nearWingColor = '#e2e8f0';
        } else if (plane.skin === PlaneSkin.COMIC) {
          farWingColor = '#dbeafe';
          nearWingColor = '#eff6ff';
        } else if (plane.skin === PlaneSkin.GOLD) {
          farWingColor = '#fef3c7';
          nearWingColor = '#fef9c3';
          strokeColor = '#d4d4d8';
        } else if (plane.skin === PlaneSkin.CRANE) {
          farWingColor = '#fce7f3';
          nearWingColor = '#fdf2f8';
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Draw simple dart plane (no complex patterns for performance)
        const noseX = w/2;
        const tailX = -w/2;
        const farWingTipY = -h * 0.8;
        const nearWingTipY = -h * 0.5;

        // Far wing
        ctx.beginPath();
        ctx.fillStyle = farWingColor;
        ctx.moveTo(noseX, 0);
        ctx.quadraticCurveTo(0, -h * 0.4, tailX - 5, farWingTipY);
        ctx.lineTo(tailX * 0.4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Near wing
        ctx.beginPath();
        ctx.fillStyle = nearWingColor;
        ctx.moveTo(noseX, 0);
        ctx.lineTo(tailX, nearWingTipY);
        ctx.lineTo(tailX + 5, h * 0.6);
        ctx.lineTo(noseX, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Center crease
        ctx.beginPath();
        ctx.moveTo(noseX, 0);
        ctx.lineTo(tailX + 2, 0);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      });
    }

    // --- Background Doodles ---
    ctx.save();
    bgDoodlesRef.current.forEach(bg => {
      ctx.save();
      ctx.translate(bg.x, bg.y);
      ctx.scale(bg.scale, bg.scale);
      ctx.rotate(bg.rotation);
      ctx.globalAlpha = bg.opacity;
      
      if (bg.type === 'smudge') {
        // Blurry smudge
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
        grad.addColorStop(0, 'rgba(50, 50, 50, 0.8)');
        grad.addColorStop(1, 'rgba(50, 50, 50, 0)');
        ctx.fillStyle = grad;
        ctx.filter = 'blur(4px)';
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = 'none'; // Reset filter
      } else {
        // Standard doodles
        ctx.fillStyle = '#9ca3af'; 
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (bg.type === 'cloud') {
          ctx.beginPath();
          ctx.arc(0, 0, 15, Math.PI * 0.5, Math.PI * 1.5);
          ctx.arc(15, -10, 20, Math.PI * 1, Math.PI * 2);
          ctx.arc(35, 0, 15, Math.PI * 1.5, Math.PI * 2.5);
          ctx.stroke();
        } else if (bg.type === 'math' && bg.content) {
          ctx.font = '24px "Patrick Hand", cursive';
          ctx.fillText(bg.content, 0, 0);
        } else if (bg.type === 'scribble') {
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.quadraticCurveTo(-5, -10, 0, 0);
          ctx.quadraticCurveTo(5, 10, 10, 0);
          ctx.quadraticCurveTo(15, -10, 20, 0);
          ctx.stroke();
        } else if (bg.type === 'star') {
          ctx.beginPath();
          const r = 12;
          const innerR = 5;
          for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            const innerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2 + Math.PI / 5;
            const ix = Math.cos(innerAngle) * innerR;
            const iy = Math.sin(innerAngle) * innerR;
            ctx.lineTo(ix, iy);
          }
          ctx.closePath();
          ctx.stroke();
        } else if (bg.type === 'bolt') {
          ctx.beginPath();
          ctx.moveTo(5, -15);
          ctx.lineTo(-3, -3);
          ctx.lineTo(4, -3);
          ctx.lineTo(-6, 15);
          ctx.stroke();
        } else if (bg.type === 'face') {
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2); 
          ctx.stroke();
          ctx.fillStyle = '#9ca3af';
          ctx.beginPath();
          ctx.arc(-4, -2, 1.5, 0, Math.PI * 2);
          ctx.arc(4, -2, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, 1, 6, 0.2, Math.PI - 0.2);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
    ctx.restore();

    // --- Obstacles ---
    obstaclesRef.current.forEach(obs => {
      ctx.save();
      ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
      ctx.rotate(obs.rotation);

      if (obs.type === ObstacleType.TORNADO) {
        // Draw chaotic tornado
        ctx.strokeStyle = '#4b5563'; // Gray-600
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            // Stacked ellipses
            const w = obs.width * (0.2 + (i/6)*0.8);
            const y = -obs.height/2 + (i * (obs.height/5));
            // Offset slightly based on spin for wobble visual
            const xOff = Math.sin(frameCountRef.current * 0.2 + i) * 5;
            ctx.moveTo(xOff + w/2, y);
            ctx.ellipse(xOff, y, w/2, 4, 0, 0, Math.PI * 2);
        }
        ctx.stroke();

        // Messy scribbles inside
        ctx.beginPath();
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 1;
        ctx.moveTo(0, -obs.height/2);
        ctx.lineTo(Math.random()*10 - 5, obs.height/2);
        ctx.stroke();

      } else if (obs.type === ObstacleType.PENCIL) {
        const hw = obs.width / 2;
        const hh = obs.height / 2;
        const paintEnd = hh - 15;
        ctx.fillStyle = C.COLOR_PENCIL_BODY;
        ctx.beginPath();
        ctx.moveTo(-hw, -hh);
        ctx.lineTo(hw, -hh);
        ctx.quadraticCurveTo(hw + 1, 0, hw, paintEnd);
        ctx.lineTo(hw * 0.3, paintEnd + 3);
        ctx.lineTo(-hw * 0.3, paintEnd - 2);
        ctx.lineTo(-hw, paintEnd);
        ctx.quadraticCurveTo(-hw - 1, 0, -hw, -hh);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(-hw * 0.35, -hh, hw * 0.7, hh + paintEnd); 
        ctx.beginPath();
        ctx.fillStyle = '#fde68a'; 
        ctx.moveTo(-hw, paintEnd);
        ctx.lineTo(-hw * 0.3, paintEnd - 2);
        ctx.lineTo(hw * 0.3, paintEnd + 3);
        ctx.lineTo(hw, paintEnd);
        ctx.lineTo(0, hh + 8); 
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = C.COLOR_PENCIL_TIP;
        ctx.moveTo(-2.5, hh + 1);
        ctx.lineTo(2.5, hh + 1);
        ctx.lineTo(0, hh + 8);
        ctx.fill();

      } else if (obs.type === ObstacleType.TAPE) {
        ctx.fillStyle = C.COLOR_TAPE;
        ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(-obs.width/2 + 5, -obs.height/2 + 5, obs.width-10, 5);
      } else if (obs.type === ObstacleType.ERASER) {
        ctx.transform(1, -0.2, 0, 1, 0, 0); 
        ctx.fillStyle = C.COLOR_ERASER_PINK;
        ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
        ctx.fillStyle = '#60a5fa'; 
        ctx.fillRect(-obs.width/2 + obs.width*0.6, -obs.height/2, obs.width*0.4, obs.height);
      }

      ctx.restore();
    });

    // --- Power-ups ---
    powerUpsRef.current.forEach(powerUp => {
      ctx.save();
      ctx.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
      ctx.rotate(powerUp.rotation);

      // Draw glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = getPowerUpColor(powerUp.type);

      // Draw power-up icon based on type
      ctx.fillStyle = getPowerUpColor(powerUp.type);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      switch (powerUp.type) {
        case PowerUpType.SHIELD_TAPE:
          // Shield icon - hexagon
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const x = Math.cos(angle) * 15;
            const y = Math.sin(angle) * 15;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case PowerUpType.ERASER_BOMB:
          // Bomb icon - circle with sparkle
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Sparkle
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-2, -20, 4, 8);
          ctx.fillRect(-6, -18, 12, 4);
          break;

        case PowerUpType.SLOW_MO_INK:
          // Clock/droplet icon
          ctx.beginPath();
          ctx.arc(0, 2, 12, 0, Math.PI * 2);
          ctx.moveTo(0, -10);
          ctx.lineTo(0, 2);
          ctx.lineTo(8, 2);
          ctx.fill();
          ctx.stroke();
          break;

        case PowerUpType.MAGNET_CLIP:
          // U-shaped magnet
          ctx.beginPath();
          ctx.moveTo(-12, -15);
          ctx.lineTo(-12, 5);
          ctx.quadraticCurveTo(-12, 15, 0, 15);
          ctx.quadraticCurveTo(12, 15, 12, 5);
          ctx.lineTo(12, -15);
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.stroke();
          // Poles
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-15, -15, 6, 10);
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(9, -15, 6, 10);
          break;

        case PowerUpType.BOOST_ARROW:
          // Arrow pointing right
          ctx.beginPath();
          ctx.moveTo(-15, -10);
          ctx.lineTo(5, -10);
          ctx.lineTo(5, -15);
          ctx.lineTo(15, 0);
          ctx.lineTo(5, 15);
          ctx.lineTo(5, 10);
          ctx.lineTo(-15, 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
      }

      ctx.restore();
    });

    // --- Particles ---
    particlesRef.current.forEach(pt => {
      ctx.save();
      
      if (pt.hasTrail) {
         const speed = Math.sqrt(pt.vx*pt.vx + pt.vy*pt.vy);
         const trailLength = Math.min(speed * 3, 30); 
         ctx.beginPath();
         ctx.moveTo(pt.x, pt.y);
         const nx = pt.vx / (speed || 1);
         const ny = pt.vy / (speed || 1);
         ctx.lineTo(pt.x - nx * trailLength, pt.y - ny * trailLength);
         ctx.strokeStyle = pt.color;
         ctx.lineWidth = Math.max(1, pt.width / 2);
         ctx.lineCap = 'round';
         ctx.globalAlpha = pt.life * 0.6; 
         ctx.stroke();
      }

      ctx.globalAlpha = pt.life;
      ctx.fillStyle = pt.color;
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.life * 5); 
      // Eraser Snow (simple squares) or standard particles
      ctx.fillRect(-pt.width/2, -pt.height/2, pt.width, pt.height);
      ctx.restore();
    });

    // --- Player (Paper Plane) ---
    const p = playerRef.current;
    if (gameState !== GameState.GAME_OVER) {
      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

      // Shield visual effect
      if (shieldActiveRef.current) {
        ctx.save();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#60a5fa';
        ctx.beginPath();
        const shieldRadius = 35 + Math.sin(frameCountRef.current * 0.1) * 3;
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Boost visual effect
      if (boostActiveRef.current > 0) {
        ctx.save();
        // Draw speed lines
        for (let i = 0; i < 5; i++) {
          ctx.strokeStyle = `rgba(249, 115, 22, ${0.6 - i * 0.1})`;
          ctx.lineWidth = 3 - i * 0.4;
          ctx.beginPath();
          const offsetX = -30 - i * 15;
          const offsetY = (Math.random() - 0.5) * 20;
          ctx.moveTo(offsetX, offsetY);
          ctx.lineTo(offsetX - 20, offsetY);
          ctx.stroke();
        }
        ctx.restore();
      }
      
      const tiltSensitivity = 0.12; 
      let rot = p.vy * tiltSensitivity;

      if (Math.abs(p.vy) < 2.5) {
        const slowSway = Math.sin(frameCountRef.current * 0.04) * 0.08;
        const fastJitter = Math.cos(frameCountRef.current * 0.2) * 0.03;
        rot += slowSway + fastJitter;
        const bob = Math.sin(frameCountRef.current * 0.08) * 1.5;
        ctx.translate(0, bob);
      }

      const minRot = -0.85; 
      const maxRot = 1.2; 
      rot = Math.max(minRot, Math.min(maxRot, rot));

      ctx.rotate(rot);

      const isSticky = isTapeSlowRef.current;
      const speed = gameSpeedRef.current;
      const thrust = currentThrustRef.current;

      // --- Skin Specific Colors & Styles ---
      let strokeColor = isSticky ? '#b45309' : '#374151'; 
      let farWingColor = isSticky ? '#fef3c7' : '#f3f4f6'; 
      let nearWingColor = isSticky ? '#fffbeb' : '#ffffff'; 

      if (skin === PlaneSkin.NEWSPAPER) {
        farWingColor = '#e5e7eb';
        nearWingColor = '#f3f4f6';
      } else if (skin === PlaneSkin.FOIL) {
        strokeColor = '#475569';
        // Metallic gradients applied later
      } else if (skin === PlaneSkin.COMIC) {
        strokeColor = '#000000';
        farWingColor = '#cffafe'; // Cyan light
        nearWingColor = '#ffffff';
      } else if (skin === PlaneSkin.GOLD) {
        strokeColor = '#854d0e';
        // Gold gradients applied later
      } else if (skin === PlaneSkin.CRANE) {
        strokeColor = '#be185d'; // Dark Pinkish Red
        farWingColor = '#fbcfe8';
        nearWingColor = '#fce7f3';
      }

      const flutterBase = Math.sin(frameCountRef.current * 0.8);
      const flutterJitter = Math.cos(frameCountRef.current * 2.2) * 0.4;
      const flutter = (flutterBase + flutterJitter) * (speed * 0.3);
      
      const w = p.width;
      const h = p.height;
      
      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.1)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 6;
      ctx.shadowOffsetX = 3;

      ctx.lineWidth = skin === PlaneSkin.COMIC ? 3 : 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = strokeColor;

      // --- Geometry Drawing based on Skin ---
      if (skin === PlaneSkin.CRANE) {
        // Origami Crane Geometry
        // Center is pivot
        const headX = w/2 + 5;
        const headY = -h/2;
        const tailX = -w/2 - 5;
        const tailY = -h/2 - 5;
        const bodyY = h/2;
        
        ctx.beginPath();
        ctx.fillStyle = farWingColor;
        // Far Wing
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -h + flutter);
        ctx.lineTo(10, 0);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = nearWingColor;
        // Body / Neck / Tail
        ctx.moveTo(10, 0);
        ctx.lineTo(headX, headY); // Neck
        ctx.lineTo(headX - 5, headY + 2); // Head beak
        ctx.lineTo(0, bodyY); // Body bottom
        ctx.lineTo(tailX, tailY); // Tail tip
        ctx.lineTo(-5, 0);
        ctx.lineTo(10, 0);
        ctx.fill();
        ctx.stroke();

        // Near Wing
        ctx.beginPath();
        ctx.fillStyle = nearWingColor; // lighter
        ctx.moveTo(0, 0);
        ctx.lineTo(5, -h * 0.8 + flutter);
        ctx.lineTo(15, 0);
        ctx.fill();
        ctx.stroke();

      } else {
        // Standard Dart Plane Geometry (used for Default, Newspaper, Foil, Gold, Comic)
        const noseX = w/2;
        const tailX = -w/2;
        const farWingTipY = -h * 0.8 + flutter;
        const nearWingTipY = -h * 0.5 + (flutter * 0.6);

        // -- FAR WING --
        ctx.beginPath();
        
        // Custom Fills per skin
        if (skin === PlaneSkin.FOIL) {
           const grad = ctx.createLinearGradient(tailX, 0, noseX, 0);
           grad.addColorStop(0, '#94a3b8');
           grad.addColorStop(0.5, '#f8fafc'); // Highlight
           grad.addColorStop(1, '#64748b');
           ctx.fillStyle = grad;
        } else if (skin === PlaneSkin.GOLD) {
           const grad = ctx.createLinearGradient(tailX, farWingTipY, noseX, 0);
           grad.addColorStop(0, '#facc15');
           grad.addColorStop(0.4, '#fef08a');
           grad.addColorStop(0.6, '#eab308');
           grad.addColorStop(1, '#a16207');
           ctx.fillStyle = grad;
        } else {
           ctx.fillStyle = farWingColor;
        }

        ctx.moveTo(noseX, 0); 
        ctx.quadraticCurveTo(0, -h * 0.4, tailX - 5, farWingTipY);
        ctx.lineTo(tailX * 0.4, 0); 
        ctx.closePath();
        ctx.fill();

        // Overlays
        if (skin === PlaneSkin.NEWSPAPER && paperPatternRef.current) {
          ctx.fillStyle = paperPatternRef.current;
          ctx.globalAlpha = 0.4; 
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
        if (skin === PlaneSkin.COMIC && comicPatternRef.current) {
          ctx.fillStyle = comicPatternRef.current;
          ctx.globalAlpha = 0.3;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        ctx.stroke();
        
        // Reset Shadow for near parts so they don't shadow far parts weirdly
        ctx.shadowBlur = 0; 
        ctx.shadowOffsetY = 0;
        ctx.shadowOffsetX = 0;

        // -- NEAR WING --
        ctx.beginPath();
        if (skin === PlaneSkin.FOIL) {
           const grad = ctx.createLinearGradient(tailX, 0, noseX, 0);
           grad.addColorStop(0, '#cbd5e1');
           grad.addColorStop(0.5, '#ffffff'); 
           grad.addColorStop(1, '#94a3b8');
           ctx.fillStyle = grad;
        } else if (skin === PlaneSkin.GOLD) {
           const grad = ctx.createLinearGradient(tailX, nearWingTipY, noseX, 0);
           grad.addColorStop(0, '#fde047');
           grad.addColorStop(0.5, '#ffffcc');
           grad.addColorStop(1, '#ca8a04');
           ctx.fillStyle = grad;
        } else {
           ctx.fillStyle = nearWingColor;
        }

        ctx.moveTo(noseX, 0); 
        ctx.lineTo(tailX, nearWingTipY); 
        ctx.lineTo(tailX + 5, h * 0.6); 
        ctx.lineTo(noseX, 0); 
        ctx.closePath();
        ctx.fill();

        // Overlays
        if (skin === PlaneSkin.NEWSPAPER && paperPatternRef.current) {
          ctx.fillStyle = paperPatternRef.current;
          ctx.globalAlpha = 0.4; 
          ctx.fill();
          ctx.globalAlpha = 1.0;
          
          // Draw "Text" lines
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tailX + 5, nearWingTipY + 5);
          ctx.lineTo(noseX - 10, nearWingTipY + 8);
          ctx.moveTo(tailX + 8, nearWingTipY + 10);
          ctx.lineTo(noseX - 5, nearWingTipY + 13);
          ctx.stroke();
          // Reset Stroke
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
        }
        if (skin === PlaneSkin.COMIC && comicPatternRef.current) {
           ctx.fillStyle = comicPatternRef.current;
           ctx.globalAlpha = 0.3;
           ctx.fill();
           ctx.globalAlpha = 1.0;
        }

        ctx.stroke();

        // Center Crease
        ctx.beginPath();
        ctx.moveTo(noseX, 0);
        ctx.lineTo(tailX + 2, 0);
        ctx.strokeStyle = isSticky ? '#d97706' : (skin === PlaneSkin.GOLD ? '#b45309' : '#9ca3af'); 
        if (skin === PlaneSkin.COMIC) ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Speed Lines (Visual Effect)
        if (speed > 5 && gameState === GameState.PLAYING) {
            ctx.beginPath();
            ctx.strokeStyle = skin === PlaneSkin.GOLD ? 'rgba(234, 179, 8, 0.5)' : 'rgba(148, 163, 184, 0.5)'; 
            ctx.lineWidth = 1.5;
            const lineLen = speed * 5;
            ctx.moveTo(tailX - 5, farWingTipY);
            ctx.lineTo(tailX - 5 - lineLen * 0.9 - Math.random()*15, farWingTipY);
            ctx.moveTo(tailX - 5, nearWingTipY);
            ctx.lineTo(tailX - 5 - lineLen - Math.random()*15, nearWingTipY);
            ctx.moveTo(tailX - 2, 0);
            ctx.lineTo(tailX - 2 - lineLen * 0.7 - Math.random()*10, 0);
            ctx.stroke();
        }

        // Thrust Effect
        if (thrust > 0.05) {
            ctx.save();
            const lineCount = Math.floor(thrust * 4) + 2; 
            ctx.strokeStyle = isSticky ? 'rgba(217, 119, 6, 0.5)' : 'rgba(156, 163, 175, 0.6)'; 
            if (skin === PlaneSkin.COMIC) ctx.strokeStyle = '#000000';
            if (skin === PlaneSkin.GOLD) ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';

            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            for(let i=0; i<lineCount; i++) {
               ctx.beginPath();
               const yBase = (Math.random() - 0.5) * 8; 
               const len = 10 + thrust * 25 + Math.random() * 15;
               ctx.moveTo(tailX, yBase);
               ctx.quadraticCurveTo(
                   tailX - len * 0.5, 
                   yBase + (Math.random() - 0.5) * 10, 
                   tailX - len, 
                   yBase + (Math.random() - 0.5) * 20
               );
               ctx.stroke();
            }
            ctx.restore();
        }
      } // End Geometry Switch

      // Gold Sparkle Emission
      if (skin === PlaneSkin.GOLD && gameState === GameState.PLAYING && Math.random() > 0.8) {
          ctx.fillStyle = '#fef08a';
          const sx = (Math.random() - 0.5) * w;
          const sy = (Math.random() - 0.5) * h;
          ctx.beginPath();
          ctx.arc(sx, sy, Math.random() * 2, 0, Math.PI*2);
          ctx.fill();
      }

      ctx.restore();
    }

    if (isTapeSlowRef.current) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Visual feedback for active consumables
    if (magnetActiveRef.current > 0) {
      // Blue glow overlay for magnet
      ctx.fillStyle = 'rgba(96, 165, 250, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Magnet indicator
      ctx.save();
      ctx.font = 'bold 18px "Patrick Hand", cursive';
      ctx.fillStyle = '#60a5fa';
      ctx.textAlign = 'center';
      const timeLeft = Math.ceil(magnetActiveRef.current / 60);
      ctx.fillText(`🧲 Magnet: ${timeLeft}s`, canvas.width / 2, 60);
      ctx.restore();
    }

    if (slowMotionActiveRef.current > 0) {
      // Purple slow motion overlay
      ctx.fillStyle = 'rgba(147, 51, 234, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Slow motion indicator
      ctx.save();
      ctx.font = 'bold 18px "Patrick Hand", cursive';
      ctx.fillStyle = '#a855f7';
      ctx.textAlign = 'center';
      const timeLeft = Math.ceil(slowMotionActiveRef.current / 60);
      ctx.fillText(`⏱️ Slow Motion: ${timeLeft}s`, canvas.width / 2, magnetActiveRef.current > 0 ? 85 : 60);
      ctx.restore();
    }

    if (gameState === GameState.PLAYING || gameState === GameState.PAUSED) {
        const progress = Math.max(0, Math.min(1, (gameSpeedRef.current - C.GAME_SPEED_INITIAL) / (C.MAX_SPEED - C.GAME_SPEED_INITIAL)));
        const multiplier = (gameSpeedRef.current / C.GAME_SPEED_INITIAL).toFixed(1);
        const barW = 100;
        const barH = 6;
        const cX = canvas.width / 2;
        const cY = 25;
        ctx.save();
        ctx.font = '16px "Patrick Hand", cursive';
        ctx.fillStyle = '#6b7280'; 
        ctx.textAlign = 'right';
        ctx.fillText("Velocity:", cX - barW/2 - 10, cY + 5);
        ctx.strokeStyle = '#9ca3af'; 
        ctx.lineWidth = 1;
        ctx.strokeRect(cX - barW/2, cY - barH/2, barW, barH);
        ctx.fillStyle = '#93c5fd'; 
        if (progress > 0.5) ctx.fillStyle = '#fcd34d'; 
        if (progress > 0.8) ctx.fillStyle = '#fca5a5'; 
        ctx.fillRect(cX - barW/2 + 1, cY - barH/2 + 1, (barW - 2) * progress, barH - 2);
        ctx.textAlign = 'left';
        ctx.font = 'bold 16px "Patrick Hand", cursive';
        ctx.fillStyle = '#4b5563'; 
        ctx.fillText(`${multiplier}x`, cX + barW/2 + 10, cY + 5);
        ctx.restore();
    }
  };

  const tick = (time: number) => {
    update(time);
    draw();
    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const resize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Initialize Textures (Paper noise + Comic Dots)
  useEffect(() => {
    // 1. Paper Noise
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      pCtx.fillStyle = '#ffffff';
      pCtx.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 64;
        const y = Math.random() * 64;
        pCtx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        pCtx.fillRect(x, y, 1, 1);
      }
      paperPatternRef.current = pCtx.createPattern(pCanvas, 'repeat');
    }

    // 2. Comic Dots
    const cCanvas = document.createElement('canvas');
    cCanvas.width = 8;
    cCanvas.height = 8;
    const cCtx = cCanvas.getContext('2d');
    if (cCtx) {
       cCtx.fillStyle = 'rgba(6, 182, 212, 0.4)'; // Cyan dots
       cCtx.beginPath();
       cCtx.arc(4, 4, 1.5, 0, Math.PI*2);
       cCtx.fill();
       comicPatternRef.current = cCtx.createPattern(cCanvas, 'repeat');
    }
  }, []);

  useEffect(() => {
     if (gameState === GameState.START) {
        resetGame();
     }
  }, []);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) {
      isUpPressedRef.current = false;
    }
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (gameState === GameState.START) {
          resetGame();
          setGameState(GameState.PLAYING);
        }
        if (gameState === GameState.PLAYING) {
            isUpPressedRef.current = true;
        }
      }

      // Consumable activation keys
      if (gameState === GameState.PLAYING) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          useMagnet();
        } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
          useSlowMotion();
        } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
          useEraserBomb();
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        isUpPressedRef.current = false;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (gameState === GameState.START) {
        resetGame();
        setGameState(GameState.PLAYING);
      }
      if (gameState === GameState.PLAYING) {
          isUpPressedRef.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      isUpPressedRef.current = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (gameState === GameState.START) {
        resetGame();
        setGameState(GameState.PLAYING);
      }
      if (gameState === GameState.PLAYING) {
          isUpPressedRef.current = true;
      }
    };

    const handleMouseUp = () => {
      isUpPressedRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const c = canvasRef.current;
    if (c) {
      c.addEventListener('touchstart', handleTouchStart, { passive: false });
      c.addEventListener('touchend', handleTouchEnd);
      c.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseup', handleMouseUp);
      if (c) {
        c.removeEventListener('touchstart', handleTouchStart);
        c.removeEventListener('touchend', handleTouchEnd);
        c.removeEventListener('mousedown', handleMouseDown);
      }
    };
  }, [gameState, setGameState]);

  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full h-full cursor-pointer touch-none"
    />
  );
};

export default GameCanvas;