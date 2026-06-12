// Requirement validation for units, buildings, research.
import type { UnitDef, BuildingDef, PlayerState } from '@/game/types';
import type { GameState } from './GameState';
import { playerTier, hasBuilding } from './BuildingManager';
import { UPGRADE_COSTS } from '@/utils/Constants';

export interface ResearchDef {
  id: 'meleeAtk' | 'rangedAtk' | 'groundArmor' | 'airArmor';
  name: string;
  desc: string;
}

export const RESEARCH: ResearchDef[] = [
  { id: 'meleeAtk', name: 'Keen Blades', desc: 'Melee attack +1 per rank (3 ranks).' },
  { id: 'rangedAtk', name: 'Barbed Points', desc: 'Ranged attack +1 per rank (3 ranks).' },
  { id: 'groundArmor', name: 'Hardened Hide', desc: 'Ground armor +1 per rank (3 ranks).' },
  { id: 'airArmor', name: 'Sky Wards', desc: 'Air armor +1 per rank (3 ranks).' },
];

export function researchCost(rank: number) {
  return UPGRADE_COSTS[Math.min(rank, UPGRADE_COSTS.length - 1)];
}

export function canAfford(p: PlayerState, gold: number, lumber: number): boolean {
  return p.gold >= gold && p.lumber >= lumber;
}

export function unitRequirementsMet(state: GameState, owner: number, def: UnitDef): { ok: boolean; err?: string } {
  if (playerTier(state, owner) < def.tier) return { ok: false, err: `Requires Tier ${def.tier} hall` };
  for (const req of def.requires ?? []) {
    if (!hasBuilding(state, owner, req)) return { ok: false, err: 'Missing required building' };
  }
  return { ok: true };
}

export function buildingRequirementsMet(state: GameState, owner: number, def: BuildingDef): { ok: boolean; err?: string } {
  if (def.tier > 1 && playerTier(state, owner) < def.tier) {
    return { ok: false, err: `Requires Tier ${def.tier} hall` };
  }
  for (const req of def.requires ?? []) {
    if (!hasBuilding(state, owner, req)) return { ok: false, err: 'Missing required building' };
  }
  return { ok: true };
}
