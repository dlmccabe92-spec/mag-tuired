// AI army production, offense/defense/retreat, focus fire.
import type { Entity } from '@/game/types';
import type { GameState } from '@/simulation/GameState';
import type { AIParams } from './AIDifficulty';
import { RACES } from '@/data/races';
import { dist } from '@/utils/Vector2';
import { trainUnit, recruitHero, reviveHero } from '@/simulation/Actions';
import { issueMove, issueAttack } from '@/simulation/OrderSystem';
import { isEnemy, canTarget } from '@/simulation/CombatSystem';
import { playerTier } from '@/simulation/BuildingManager';
import { ownEntities } from './AIEconomy';

export type AIMode = 'build' | 'attack' | 'defend' | 'creep';

export interface MilitaryState {
  mode: AIMode;
  attackWaveAt: number;
  waveStartFood: number;
  creepCampId: number;
  lastOrderAt: number;
}

function armyFood(army: Entity[], heroes: Entity[]): number {
  let f = heroes.length * 5;
  for (const a of army) f += a.unitDef?.food ?? 2;
  return f;
}

export function militaryDecide(
  state: GameState, pid: number, params: AIParams, ms: MilitaryState,
  baseX: number, baseY: number, enemyX: number, enemyY: number,
) {
  const p = state.players[pid];
  const race = RACES[p.race];
  const { army, heroes, buildings } = ownEntities(state, pid);
  const now = state.time;
  const tier = playerTier(state, pid);

  // ---- production ----
  for (const b of buildings) {
    if (b.constructing || !b.bldDef?.trains?.length) continue;
    if ((b.trainQueue?.length ?? 0) >= (b.bldDef.role === 'townhall' ? 2 : 2)) continue;
    if (b.bldDef.role === 'townhall') continue; // workers handled by economy
    if (b.bldDef.role === 'barracks') {
      const melee = army.filter(a => a.unitDef?.role === 'melee').length;
      const ranged = army.filter(a => a.unitDef?.role === 'ranged').length;
      const elites = army.filter(a => a.unitDef?.role === 'elite').length;
      const eliteId = b.bldDef.trains.find(t => t.includes('elite'));
      const meleeId = b.bldDef.trains[0];
      const rangedId = b.bldDef.trains[1];
      if (tier >= 3 && eliteId && elites < 3 && p.gold > 420) trainUnit(state, b, eliteId);
      else if (ranged * 2 < melee && rangedId) trainUnit(state, b, rangedId);
      else trainUnit(state, b, meleeId);
    } else if (b.bldDef.role === 'casterhall') {
      const casters = army.filter(a => a.unitDef?.role === 'caster').length;
      if (casters < 4) {
        const id = b.bldDef.trains[casters % b.bldDef.trains.length];
        trainUnit(state, b, id);
      }
    } else if (b.bldDef.role === 'siegehall') {
      const siege = army.filter(a => a.unitDef?.role === 'siege').length;
      if (siege < 2) trainUnit(state, b, b.bldDef.trains[0]);
    }
  }

  // ---- heroes: recruit & revive ----
  const altar = buildings.find(b => b.bldDef?.role === 'altar' && !b.constructing);
  if (altar) {
    if (p.fallenHeroes.length > 0) {
      reviveHero(state, altar, p.fallenHeroes[0].state.defId);
    } else if (p.heroesRecruited.length === 0) {
      recruitHero(state, altar, race.heroes[Math.floor(Math.random() * race.heroes.length)].id);
    } else if (p.heroesRecruited.length === 1 && tier >= 2 && p.gold > 700) {
      const next = race.heroes.find(h => !p.heroesRecruited.includes(h.id));
      if (next) recruitHero(state, altar, next.id);
    }
  }

  // ---- mode transitions ----
  const aFood = armyFood(army, heroes);
  const underAttack = now - state.lastDamageAt[pid] < 8;

  if (underAttack && ms.mode !== 'defend') {
    ms.mode = 'defend';
    ms.lastOrderAt = 0;
  }

  if (ms.mode === 'defend') {
    if (!underAttack) {
      ms.mode = 'build';
    } else if (now - ms.lastOrderAt > 5) {
      ms.lastOrderAt = now;
      const pos = state.lastDamagePos[pid];
      for (const u of [...army, ...heroes]) {
        issueMove(state, u, pos.x, pos.y, true);
      }
    }
    return;
  }

  if (ms.mode === 'attack') {
    // check for retreat
    if (params.retreatLossPct > 0 && aFood < ms.waveStartFood * params.retreatLossPct) {
      ms.mode = 'build';
      ms.attackWaveAt = now + params.attackCooldown;
      for (const u of [...army, ...heroes]) issueMove(state, u, baseX, baseY, false);
      return;
    }
    // re-issue advance for idle attackers
    if (now - ms.lastOrderAt > 12) {
      ms.lastOrderAt = now;
      for (const u of [...army, ...heroes]) {
        if (u.order.type === 'idle') issueMove(state, u, enemyX, enemyY, true);
      }
    }
    // wave wiped?
    if (aFood < 8) {
      ms.mode = 'build';
      ms.attackWaveAt = now + params.attackCooldown;
    }
    applyFocusFire(state, pid, params, army);
    return;
  }

  if (ms.mode === 'creep') {
    const camp = state.camps[ms.creepCampId];
    // give up on a camp after 75s (unreachable or too strong)
    if (!camp || camp.aliveIds.length === 0 || now - ms.lastOrderAt > 75) {
      ms.mode = 'build';
      ms.lastOrderAt = now;
      for (const u of [...army, ...heroes]) issueMove(state, u, baseX, baseY, false);
    }
    return;
  }

  // mode: build — decide to attack or creep
  const canAttack = now >= params.firstAttackTime && now >= ms.attackWaveAt && aFood >= params.armyFoodAttack;
  if (canAttack) {
    ms.mode = 'attack';
    ms.waveStartFood = aFood;
    ms.lastOrderAt = now;
    for (const u of [...army, ...heroes]) issueMove(state, u, enemyX, enemyY, true);
    return;
  }

  if (params.creeping && heroes.length > 0 && army.length >= 4 && now - ms.lastOrderAt > 25) {
    const hero = heroes[0];
    const heroLvl = hero.hero?.level ?? 1;
    let best = -1;
    let bestD = Infinity;
    for (const camp of state.camps) {
      if (camp.aliveIds.length === 0) continue;
      if (camp.dropTier >= 3 && heroLvl < 5) continue;
      const d = dist(baseX, baseY, camp.x, camp.y);
      if (d < bestD) { bestD = d; best = camp.id; }
    }
    if (best >= 0) {
      ms.mode = 'creep';
      ms.creepCampId = best;
      ms.lastOrderAt = now;
      const camp = state.camps[best];
      for (const u of [...army, ...heroes]) issueMove(state, u, camp.x, camp.y, true);
    }
  }
}

function applyFocusFire(state: GameState, pid: number, params: AIParams, army: Entity[]) {
  if (params.focusFire === 'none') return;
  if (params.focusFire === 'sometimes' && Math.random() < 0.5) return;
  // find an engaged cluster; retarget everyone to the weakest enemy nearby
  const engaged = army.filter(a => a.targetId);
  if (engaged.length < 3) return;
  const c = engaged[0];
  const foes = state.store.query(c.x, c.y, 260, q => isEnemy(c, q) && canTarget(c, q, state.time) && q.etype === 'unit');
  if (!foes.length) return;
  const weakest = foes.reduce((a, b) => (a.hp < b.hp ? a : b));
  for (const u of engaged) {
    if (dist(u.x, u.y, weakest.x, weakest.y) < u.attackRange + 180) {
      issueAttack(state, u, weakest.id);
    }
  }
}
