import type { Difficulty } from '@/game/types';

export interface AIParams {
  decideInterval: number;     // seconds between AI decision passes
  workerTarget: number;       // total workers wanted
  goldWorkers: number;        // of which on gold
  armyFoodAttack: number;     // army food before marching
  firstAttackTime: number;    // earliest attack (seconds)
  attackCooldown: number;     // seconds between offensives
  retreatLossPct: number;     // retreat when army HP share lost (0 = never)
  useAbilities: boolean;
  heroRetreatHpPct: number;   // pull hero out below this (0 = never)
  expand: boolean;
  expandMainGoldBelow: number;
  research: boolean;
  buildTowers: boolean;
  creeping: boolean;          // send hero+army to creep camps
  focusFire: 'none' | 'sometimes' | 'always';
  gatherMult: number;         // resource cheat
  buildMult: number;          // build speed cheat
  tier2Food: number;          // upgrade TH when food used >= this
  tier3Food: number;
}

export const AI_PARAMS: Record<Difficulty, AIParams> = {
  easy: {
    decideInterval: 4,
    workerTarget: 9, goldWorkers: 4,
    armyFoodAttack: 38, firstAttackTime: 480, attackCooldown: 150,
    retreatLossPct: 0,
    useAbilities: false, heroRetreatHpPct: 0,
    expand: false, expandMainGoldBelow: 0,
    research: false, buildTowers: false,
    creeping: false, focusFire: 'none',
    gatherMult: 1, buildMult: 1,
    tier2Food: 34, tier3Food: 60,
  },
  medium: {
    decideInterval: 2,
    workerTarget: 13, goldWorkers: 5,
    armyFoodAttack: 26, firstAttackTime: 330, attackCooldown: 100,
    retreatLossPct: 0.7,
    useAbilities: true, heroRetreatHpPct: 0,
    expand: true, expandMainGoldBelow: 3000,
    research: true, buildTowers: false,
    creeping: true, focusFire: 'sometimes',
    gatherMult: 1, buildMult: 1,
    tier2Food: 28, tier3Food: 52,
  },
  hard: {
    decideInterval: 0.5,
    workerTarget: 16, goldWorkers: 5,
    armyFoodAttack: 28, firstAttackTime: 300, attackCooldown: 75,
    retreatLossPct: 0.5,
    useAbilities: true, heroRetreatHpPct: 22,
    expand: true, expandMainGoldBelow: 6000,
    research: true, buildTowers: true,
    creeping: true, focusFire: 'always',
    gatherMult: 1.1, buildMult: 1.1,
    tier2Food: 24, tier3Food: 46,
  },
};
