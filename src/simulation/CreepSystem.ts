// Neutral creep camps: aggro, leash, night sleep, respawn.
import type { Entity } from '@/game/types';
import type { GameState } from './GameState';
import { CREEP_AGGRO_RANGE, CREEP_LEASH_RANGE } from '@/utils/Constants';
import { dist } from '@/utils/Vector2';
import { spawnUnit } from './UnitManager';
import { issueMove, clearOrder } from './OrderSystem';
import { getUnitDef } from '@/data/races';

export interface CreepCamp {
  id: number;
  x: number; y: number; // world px
  creeps: string[];
  dropTier: number;
  aliveIds: number[];
  bossId: number;
  respawnAt: number; // 0 = not scheduled
}

export function spawnCamp(state: GameState, camp: CreepCamp) {
  camp.aliveIds = [];
  camp.bossId = 0;
  let bossLevel = -1;
  for (let i = 0; i < camp.creeps.length; i++) {
    const ang = (i / camp.creeps.length) * Math.PI * 2;
    const x = camp.x + Math.cos(ang) * 38;
    const y = camp.y + Math.sin(ang) * 38;
    const e = spawnUnit(state, camp.creeps[i], 8, x, y);
    e.campId = camp.id;
    e.homeX = x; e.homeY = y;
    camp.aliveIds.push(e.id);
    const lvl = getUnitDef(camp.creeps[i]).level ?? 1;
    if (lvl > bossLevel) { bossLevel = lvl; camp.bossId = e.id; }
  }
  camp.respawnAt = 0;
}

export function creepTick(state: GameState, e: Entity) {
  if (e.owner !== 8 || e.etype !== 'unit' || e.dead) return;
  const now = state.time;
  const night = state.isNight();

  // sleep at night when out of combat
  if (night && !e.targetId && e.order.type === 'idle') {
    e.sleeping = true;
  }
  if (!night) e.sleeping = false;
  if (e.sleeping) return;

  const hx = e.homeX ?? e.x, hy = e.homeY ?? e.y;
  const dHome = dist(e.x, e.y, hx, hy);

  // leash: return home and shrug off damage
  if (dHome > CREEP_LEASH_RANGE) {
    e.targetId = 0;
    issueMove(state, e, hx, hy, false);
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02); // fast heal while resetting
    return;
  }
  // returned home: heal up
  if (e.order.type === 'move' && !e.targetId) {
    if (dHome < 30) { clearOrder(e); }
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.01);
    return;
  }

  // day aggro scan
  if (!night && !e.targetId && (state.tick + e.id) % 30 === 0) {
    const foes = state.store.query(e.x, e.y, CREEP_AGGRO_RANGE, q =>
      q.etype === 'unit' && (q.owner === 0 || q.owner === 1) && !q.dead && !q.hidden && !q.invisible);
    if (foes.length) {
      const t = foes.reduce((a, b) => (dist(e.x, e.y, a.x, a.y) < dist(e.x, e.y, b.x, b.y) ? a : b));
      e.targetId = t.id;
      e.order = { type: 'attack', targetId: t.id };
    }
  }
}

export function campRespawnTick(state: GameState) {
  for (const camp of state.camps) {
    if (camp.aliveIds.length === 0 && camp.respawnAt > 0 && state.time >= camp.respawnAt) {
      // don't respawn on top of player units
      const nearby = state.store.query(camp.x, camp.y, 280, q =>
        (q.owner === 0 || q.owner === 1) && !q.dead);
      if (nearby.length) {
        camp.respawnAt = state.time + 30;
        continue;
      }
      spawnCamp(state, camp);
    }
  }
}
