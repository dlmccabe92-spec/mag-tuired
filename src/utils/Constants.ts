import type { AttackType, ArmorType } from '@/game/types';

export const TILE = 32;            // px per tile
export const TICK_RATE = 60;       // updates per second
export const TICK_DT = 1 / TICK_RATE;

export const FOOD_CAP = 100;
export const START_GOLD = 500;
export const START_LUMBER = 150;
export const MINE_GOLD = 12500;
export const GOLD_PER_TRIP = 10;
export const MINE_TIME = 1.0;       // seconds inside mine
export const CHANNEL_GOLD_RATE = 2.5; // gold per second per channeling/inside worker (~walk-mining parity)
export const MAX_MINE_WORKERS = 5;
export const LUMBER_PER_TRIP = 10;
export const CHOP_RATE = 1.25;      // lumber per second while chopping
export const TREE_LUMBER = 150;     // lumber per tree tile

// Tribute (upkeep)
export function tributeTier(foodUsed: number): 'none' | 'low' | 'high' {
  if (foodUsed <= 50) return 'none';
  if (foodUsed <= 80) return 'low';
  return 'high';
}
export function tributeMult(foodUsed: number): number {
  const t = tributeTier(foodUsed);
  return t === 'none' ? 1 : t === 'low' ? 0.7 : 0.4;
}

// Day / night
export const DAY_LENGTH = 180;      // seconds of day
export const CYCLE_LENGTH = 360;    // full cycle
export const NIGHT_SIGHT_MULT = 0.67;

// Heroes
export const HERO_FOOD = 5;
export const HERO_XP_THRESHOLDS = [0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5400];
export const HERO_MAX_LEVEL = 10;
export const HERO_COSTS: { gold: number; lumber: number }[] = [
  { gold: 0, lumber: 0 },
  { gold: 425, lumber: 100 },
  { gold: 500, lumber: 150 },
];
export const HERO_HP_PER_STR = 22;
export const HERO_HP_BASE = 150;
export const HERO_REGEN_PER_STR = 0.06;
export const HERO_MANA_PER_INT = 13;
export const HERO_MANA_BASE = 90;
export const HERO_MANA_REGEN_PER_INT = 0.025;
export const HERO_MANA_REGEN_BASE = 0.35;
export const HERO_ARMOR_PER_AGI = 0.3;
export const HERO_ATKSPD_PER_AGI = 0.02;

export function reviveCost(level: number): number { return 100 + 55 * level; }
export function reviveTime(level: number): number { return 18 + 7 * level; }

// XP awards
export function unitKillXP(food: number): number { return 22 * Math.max(1, food); }
export function creepKillXP(level: number): number { return 28 * level; }
export function heroKillXP(level: number): number { return 100 + 50 * level; }
export const XP_SHARE_RANGE = 380; // px

// Damage matrix [attack][armor]
export const DAMAGE_MATRIX: Record<AttackType, Record<ArmorType, number>> = {
  blunt:      { robed: 1.0,  padded: 1.5,  plated: 1.0, fortified: 0.5,  heroic: 1.0, unshielded: 1.0 },
  barbed:     { robed: 2.0,  padded: 0.75, plated: 1.0, fortified: 0.35, heroic: 0.5, unshielded: 1.5 },
  crushing:   { robed: 0.5,  padded: 0.5,  plated: 1.0, fortified: 1.5,  heroic: 0.5, unshielded: 1.5 },
  arcane:     { robed: 1.25, padded: 0.75, plated: 2.0, fortified: 0.35, heroic: 0.5, unshielded: 1.0 },
  heroic:     { robed: 1.0,  padded: 1.0,  plated: 1.0, fortified: 0.5,  heroic: 1.0, unshielded: 1.0 },
  primordial: { robed: 1.0,  padded: 1.0,  plated: 1.0, fortified: 1.0,  heroic: 1.0, unshielded: 1.0 },
};

export function armorMult(armor: number): number {
  if (armor >= 0) return 1 - (armor * 0.06) / (1 + 0.06 * armor);
  return 2 - Math.pow(0.94, -armor);
}

// Creeps
export const CREEP_AGGRO_RANGE = 230;
export const CREEP_LEASH_RANGE = 480;
export const CREEP_RESPAWN = 180; // seconds

// Misc
export const MILITIA_DURATION = 60;
export const PILLAGE_GOLD = 3;
export const BLIGHT_RADIUS = 230; // px around sluagh buildings
export const SLUAGH_BLIGHT_REGEN = 1.5; // hp/s on blight
export const FAIRY_WELL_REGEN = 4;      // hp/s near Tobar na Si
export const FAIRY_WELL_MANA = 1.2;
export const ENSNARE_RANGE = 250; // px: Si town hall to mine for auto-harvest

export const AGGRO_SCAN_RANGE = 210;  // auto-acquire range
export const UPGRADE_COSTS = [
  { gold: 100, lumber: 50, time: 35 },
  { gold: 175, lumber: 100, time: 45 },
  { gold: 250, lumber: 150, time: 55 },
];
