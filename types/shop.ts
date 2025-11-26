// Shop and Upgrade System Types

export enum UpgradeType {
  SPEED = 'speed',
  STABILITY = 'stability',
  WIND_RESISTANCE = 'windResistance',
  SHIELD_CAPACITY = 'shieldCapacity'
}

export enum ConsumableType {
  MAGNET = 'magnet',
  SLOW_MOTION = 'slowMotion',
  ERASER_BOMB = 'eraserBomb'
}

export interface Upgrade {
  id: UpgradeType;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number; // Cost increases per level
  effect: {
    base: number;
    perLevel: number;
  };
}

export interface Consumable {
  id: ConsumableType;
  name: string;
  description: string;
  icon: string;
  cost: number;
  duration?: number; // For timed effects (in seconds)
  cooldown?: number; // Cooldown between uses (in seconds)
}

export interface PlayerUpgrades {
  [UpgradeType.SPEED]: number;
  [UpgradeType.STABILITY]: number;
  [UpgradeType.WIND_RESISTANCE]: number;
  [UpgradeType.SHIELD_CAPACITY]: number;
}

export interface PlayerInventory {
  [ConsumableType.MAGNET]: number;
  [ConsumableType.SLOW_MOTION]: number;
  [ConsumableType.ERASER_BOMB]: number;
}

export interface PlayerProgress {
  coins: number;
  totalCoinsEarned: number;
  upgrades: PlayerUpgrades;
  inventory: PlayerInventory;
  gamesPlayed: number;
  bestScore: number;
}

// Shop Configuration
export const UPGRADES: Record<UpgradeType, Upgrade> = {
  [UpgradeType.SPEED]: {
    id: UpgradeType.SPEED,
    name: 'Speed Boost',
    description: 'Increase base game speed',
    icon: '⚡',
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 1.5,
    effect: {
      base: 0,
      perLevel: 0.5 // +0.5 speed per level
    }
  },
  [UpgradeType.STABILITY]: {
    id: UpgradeType.STABILITY,
    name: 'Stability',
    description: 'Reduce wobble and drift',
    icon: '🎯',
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.5,
    effect: {
      base: 1,
      perLevel: -0.1 // -10% gravity per level
    }
  },
  [UpgradeType.WIND_RESISTANCE]: {
    id: UpgradeType.WIND_RESISTANCE,
    name: 'Wind Resistance',
    description: 'Better control in tape zones',
    icon: '🌪️',
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.5,
    effect: {
      base: 0,
      perLevel: 0.15 // +15% resistance per level
    }
  },
  [UpgradeType.SHIELD_CAPACITY]: {
    id: UpgradeType.SHIELD_CAPACITY,
    name: 'Shield Capacity',
    description: 'Start with more erasers',
    icon: '🛡️',
    maxLevel: 3,
    baseCost: 300,
    costMultiplier: 2,
    effect: {
      base: 0,
      perLevel: 1 // +1 starting eraser per level
    }
  }
};

export const CONSUMABLES: Record<ConsumableType, Consumable> = {
  [ConsumableType.MAGNET]: {
    id: ConsumableType.MAGNET,
    name: 'Magnet',
    description: 'Attracts erasers automatically for 5 seconds',
    icon: '🧲',
    cost: 50,
    duration: 5
  },
  [ConsumableType.SLOW_MOTION]: {
    id: ConsumableType.SLOW_MOTION,
    name: 'Slow Motion',
    description: 'Slows time for 3 seconds',
    icon: '⏱️',
    cost: 75,
    duration: 3
  },
  [ConsumableType.ERASER_BOMB]: {
    id: ConsumableType.ERASER_BOMB,
    name: 'Eraser Bomb',
    description: 'Clears all obstacles ahead',
    icon: '💣',
    cost: 100
  }
};

// Helper Functions
export const calculateUpgradeCost = (upgrade: Upgrade, currentLevel: number): number => {
  if (currentLevel >= upgrade.maxLevel) return 0;
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
};

export const getUpgradeEffect = (upgrade: Upgrade, level: number): number => {
  return upgrade.effect.base + (upgrade.effect.perLevel * level);
};

export const canAfford = (cost: number, coins: number): boolean => {
  return coins >= cost;
};

export const canUpgrade = (upgrade: Upgrade, currentLevel: number, coins: number): boolean => {
  if (currentLevel >= upgrade.maxLevel) return false;
  const cost = calculateUpgradeCost(upgrade, currentLevel);
  return canAfford(cost, coins);
};
