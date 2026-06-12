// Shared stat templates for the standard unit/building skeleton each race fills in.
import type { UnitDef, BuildingDef, RaceId, UnitRole, BuildingRole, AttackType } from '@/game/types';

type UnitOverrides = Partial<UnitDef> & { id: string; name: string };
type BldOverrides = Partial<BuildingDef> & { id: string; name: string };

const UNIT_BASE: Record<string, Omit<UnitDef, 'id' | 'name' | 'race'>> = {
  worker: {
    role: 'worker', tier: 1, food: 1, gold: 70, lumber: 0, buildTime: 12,
    hp: 220, damage: 7, attackRange: 26, attackCooldown: 1.25,
    attackType: 'blunt', armorType: 'padded', armor: 0,
    moveSpeed: 82, sight: 280, radius: 9,
  },
  melee: {
    role: 'melee', tier: 1, food: 2, gold: 135, lumber: 0, buildTime: 18,
    hp: 430, damage: 13, attackRange: 28, attackCooldown: 1.15,
    attackType: 'blunt', armorType: 'plated', armor: 2,
    moveSpeed: 86, sight: 300, radius: 11,
  },
  ranged: {
    role: 'ranged', tier: 1, food: 2, gold: 145, lumber: 10, buildTime: 19,
    hp: 260, damage: 17, attackRange: 165, attackCooldown: 1.45,
    attackType: 'barbed', armorType: 'padded', armor: 0,
    moveSpeed: 84, sight: 330, radius: 10,
  },
  elite: {
    role: 'elite', tier: 3, food: 4, gold: 245, lumber: 60, buildTime: 32,
    hp: 980, damage: 34, attackRange: 30, attackCooldown: 1.5,
    attackType: 'blunt', armorType: 'plated', armor: 4,
    moveSpeed: 82, sight: 300, radius: 14,
  },
  caster: {
    role: 'caster', tier: 2, food: 2, gold: 150, lumber: 25, buildTime: 22,
    hp: 240, mana: 200, manaRegen: 0.7, damage: 9, attackRange: 150, attackCooldown: 1.6,
    attackType: 'arcane', armorType: 'robed', armor: 0,
    moveSpeed: 80, sight: 330, radius: 10,
  },
  siege: {
    role: 'siege', tier: 2, food: 3, gold: 195, lumber: 70, buildTime: 30,
    hp: 400, damage: 48, attackRange: 230, attackCooldown: 2.9,
    attackType: 'crushing', armorType: 'plated', armor: 1,
    moveSpeed: 64, sight: 290, radius: 13,
  },
  flyer: {
    role: 'flyer', tier: 3, food: 3, gold: 185, lumber: 40, buildTime: 26,
    hp: 330, damage: 16, attackRange: 145, attackCooldown: 1.3,
    attackType: 'barbed', armorType: 'robed', armor: 0,
    moveSpeed: 108, sight: 370, radius: 11, flying: true,
  },
  heavyflyer: {
    role: 'heavyflyer', tier: 3, food: 4, gold: 295, lumber: 90, buildTime: 38,
    hp: 820, damage: 38, attackRange: 135, attackCooldown: 1.9,
    attackType: 'blunt', armorType: 'robed', armor: 2,
    moveSpeed: 92, sight: 370, radius: 15, flying: true,
  },
};

export function unit(race: RaceId, template: keyof typeof UNIT_BASE, o: UnitOverrides): UnitDef {
  return { ...UNIT_BASE[template], race, ...o } as UnitDef;
}

const BLD_BASE: Record<string, Omit<BuildingDef, 'id' | 'name' | 'race'>> = {
  townhall: {
    role: 'townhall', tier: 1, gold: 385, lumber: 205, buildTime: 80,
    hp: 1400, armor: 5, size: 4, foodProvided: 10, sight: 340,
  },
  townhall2: {
    role: 'townhall', tier: 2, gold: 0, lumber: 0, buildTime: 0,
    hp: 1700, armor: 5, size: 4, foodProvided: 20, sight: 340,
  },
  townhall3: {
    role: 'townhall', tier: 3, gold: 0, lumber: 0, buildTime: 0,
    hp: 2100, armor: 5, size: 4, foodProvided: 20, sight: 340,
  },
  farm: {
    role: 'farm', tier: 1, gold: 80, lumber: 20, buildTime: 20,
    hp: 420, armor: 5, size: 2, foodProvided: 6, sight: 240,
  },
  barracks: {
    role: 'barracks', tier: 1, gold: 180, lumber: 50, buildTime: 36,
    hp: 950, armor: 5, size: 3, sight: 260,
  },
  altar: {
    role: 'altar', tier: 1, gold: 160, lumber: 40, buildTime: 30,
    hp: 720, armor: 5, size: 3, sight: 260,
  },
  tower: {
    role: 'tower', tier: 1, gold: 115, lumber: 80, buildTime: 32,
    hp: 520, armor: 5, size: 2, sight: 380,
    attack: { damage: 24, range: 240, cooldown: 0.95, attackType: 'barbed' as AttackType },
  },
  forge: {
    role: 'forge', tier: 1, gold: 140, lumber: 60, buildTime: 30,
    hp: 720, armor: 5, size: 3, sight: 260,
  },
  casterhall: {
    role: 'casterhall', tier: 2, gold: 150, lumber: 100, buildTime: 36,
    hp: 720, armor: 5, size: 3, sight: 260,
  },
  siegehall: {
    role: 'siegehall', tier: 2, gold: 145, lumber: 110, buildTime: 36,
    hp: 780, armor: 5, size: 3, sight: 260,
  },
  aerie: {
    role: 'aerie', tier: 3, gold: 160, lumber: 130, buildTime: 40,
    hp: 800, armor: 5, size: 3, sight: 260,
  },
  shop: {
    role: 'shop', tier: 1, gold: 100, lumber: 60, buildTime: 28,
    hp: 500, armor: 5, size: 2, sight: 260,
  },
};

export function bld(race: RaceId, template: keyof typeof BLD_BASE, o: BldOverrides): BuildingDef {
  return { ...BLD_BASE[template], race, ...o } as BuildingDef;
}
