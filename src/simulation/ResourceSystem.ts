// Worker gathering: walk-mining, ensnared mines (Aos Si), channel mining (Sluagh), lumber.
import type { Entity } from '@/game/types';
import type { GameState } from './GameState';
import {
  TILE, GOLD_PER_TRIP, MINE_TIME, CHANNEL_GOLD_RATE, MAX_MINE_WORKERS,
  LUMBER_PER_TRIP, CHOP_RATE, ENSNARE_RANGE, tributeMult,
} from '@/utils/Constants';
import { dist } from '@/utils/Vector2';
import { requestPath, clearOrder } from './OrderSystem';
import { killEntity } from './UnitManager';

function nearestDropoff(state: GameState, e: Entity, res: 'gold' | 'lumber'): Entity | null {
  let best: Entity | null = null;
  let bestD = Infinity;
  state.store.forEach(b => {
    if (b.etype !== 'building' || b.owner !== e.owner || b.constructing) return;
    const role = b.bldDef?.role;
    const ok = role === 'townhall' || (res === 'lumber' && role === 'forge' && b.bldDef?.race === 'sluagh');
    if (!ok) return;
    const d = dist(e.x, e.y, b.x, b.y);
    if (d < bestD) { bestD = d; best = b; }
  });
  return best;
}

function ensnaredBy(state: GameState, mine: Entity, owner: number): boolean {
  if (state.players[owner]?.race !== 'aossi') return false;
  let found = false;
  state.store.forEach(b => {
    if (found || b.etype !== 'building' || b.owner !== owner || b.constructing) return;
    if (b.bldDef?.role === 'townhall' && dist(b.x, b.y, mine.x, mine.y) < ENSNARE_RANGE + b.radius + mine.radius) {
      found = true;
    }
  });
  return found;
}

function depositGold(state: GameState, owner: number, amount: number) {
  const p = state.players[owner];
  if (!p) return;
  const gained = amount * tributeMult(p.foodUsed) * p.gatherMult;
  p.gold += gained;
  p.stats.goldMined += amount;
}

function ejectFromMine(state: GameState, mine: Entity) {
  state.store.forEach(w => {
    if (w.task && (w.task.kind === 'inMine' || w.task.kind === 'channelMine' || w.task.kind === 'toMine') && w.task.mineId === mine.id) {
      w.hidden = false;
      clearOrder(w);
      w.task = undefined;
    }
  });
}

function depleteMine(state: GameState, mine: Entity, amount: number): number {
  const take = Math.min(mine.goldLeft ?? 0, amount);
  mine.goldLeft = (mine.goldLeft ?? 0) - take;
  if ((mine.goldLeft ?? 0) <= 0) {
    ejectFromMine(state, mine);
    killEntity(state, mine, null);
    state.bus.emit({ type: 'toast', msg: 'A gold mine has collapsed — its seam is spent.' });
  }
  return take;
}

export function resourceTick(state: GameState, e: Entity, dt: number) {
  const task = e.task;
  if (!task || e.etype !== 'unit' || e.dead) return;
  const now = state.time;

  switch (task.kind) {
    case 'toMine': {
      const mine = task.mineId ? state.store.get(task.mineId) : undefined;
      if (!mine || (mine.goldLeft ?? 0) <= 0) { e.task = undefined; clearOrder(e); return; }
      const gap = dist(e.x, e.y, mine.x, mine.y) - mine.radius - e.radius;
      if (gap > 12) {
        if (!e.path || e.pathIdx >= (e.path?.length ?? 0)) {
          if (e.repath <= now) { e.repath = now + 1; requestPath(state, e, mine.x, mine.y); }
        }
        return; // movement done by orderTick? no: worker tasks drive their own movement via path
      }
      const race = state.players[e.owner]?.race;
      if (race === 'aossi') {
        if (ensnaredBy(state, mine, e.owner) && (mine.minersInside ?? 0) < MAX_MINE_WORKERS) {
          mine.minersInside = (mine.minersInside ?? 0) + 1;
          e.hidden = true;
          e.task = { kind: 'inMine', mineId: mine.id, timer: 0 };
          e.x = mine.x; e.y = mine.y;
        } else {
          // wait beside the mine until a slot opens (or no ensnaring hall)
        }
        return;
      }
      if (race === 'sluagh') {
        // take a channeling spot around the mine
        const channelers = countChannelers(state, mine);
        if (channelers < MAX_MINE_WORKERS) {
          const angle = (channelers / MAX_MINE_WORKERS) * Math.PI * 2;
          e.x = mine.x + Math.cos(angle) * (mine.radius + 14);
          e.y = mine.y + Math.sin(angle) * (mine.radius + 14);
          e.task = { kind: 'channelMine', mineId: mine.id, timer: 0 };
          e.path = null;
        }
        return;
      }
      // walk-in races
      e.hidden = true;
      e.task = { kind: 'inMine', mineId: mine.id, timer: 0, insideUntil: now + MINE_TIME };
      return;
    }
    case 'inMine': {
      const mine = task.mineId ? state.store.get(task.mineId) : undefined;
      if (!mine) { e.hidden = false; e.task = undefined; clearOrder(e); return; }
      const race = state.players[e.owner]?.race;
      if (race === 'aossi') {
        // gold flows automatically; generate per worker
        task.timer += dt;
        if (task.timer >= 1) {
          task.timer -= 1;
          const got = depleteMine(state, mine, CHANNEL_GOLD_RATE);
          if (got > 0) depositGold(state, e.owner, got);
        }
        return;
      }
      if (task.insideUntil !== undefined && now >= task.insideUntil) {
        e.hidden = false;
        const got = depleteMine(state, mine, GOLD_PER_TRIP);
        if (got <= 0) { e.task = undefined; clearOrder(e); return; }
        e.carry = { type: 'gold', amount: got };
        e.task = { kind: 'returning', mineId: mine.id, timer: 0 };
        const drop = nearestDropoff(state, e, 'gold');
        if (drop) requestPath(state, e, drop.x, drop.y);
      }
      return;
    }
    case 'channelMine': {
      const mine = task.mineId ? state.store.get(task.mineId) : undefined;
      if (!mine || (mine.goldLeft ?? 0) <= 0) { e.task = undefined; clearOrder(e); return; }
      task.timer += dt;
      if (task.timer >= 1) {
        task.timer -= 1;
        const got = depleteMine(state, mine, CHANNEL_GOLD_RATE);
        if (got > 0) depositGold(state, e.owner, got);
      }
      return;
    }
    case 'toTree': {
      const { tx, ty } = task;
      if (tx === undefined || ty === undefined) { e.task = undefined; return; }
      const i = state.map.idx(tx, ty);
      if (state.map.treeWood[i] <= 0) {
        const next = state.map.nearestTree(e.x, e.y);
        if (next) {
          e.task = { kind: 'toTree', tx: next.tx, ty: next.ty, timer: 0 };
          requestPath(state, e, next.tx * TILE + TILE / 2, next.ty * TILE + TILE / 2);
        } else { e.task = undefined; clearOrder(e); }
        return;
      }
      const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
      if (dist(e.x, e.y, cx, cy) < TILE * 1.25) {
        e.task = { kind: 'chopping', tx, ty, timer: 0 };
        e.path = null;
      } else if (!e.path || e.pathIdx >= (e.path?.length ?? 0)) {
        if (e.repath <= now) { e.repath = now + 1; requestPath(state, e, cx, cy); }
      }
      return;
    }
    case 'chopping': {
      const { tx, ty } = task;
      if (tx === undefined || ty === undefined) { e.task = undefined; return; }
      const i = state.map.idx(tx, ty);
      if (state.map.treeWood[i] <= 0 && state.players[e.owner]?.race !== 'aossi') {
        e.task = { kind: 'toTree', tx, ty, timer: 0 };
        return;
      }
      const carry = e.carry?.type === 'lumber' ? e.carry.amount : 0;
      const gain = CHOP_RATE * dt;
      const race = state.players[e.owner]?.race;
      if (race !== 'aossi') {
        const avail = state.map.treeWood[i];
        const take = Math.min(gain, avail);
        state.map.treeWood[i] = Math.max(0, avail - take);
        if (state.map.treeWood[i] <= 0) state.map.removeTree(tx, ty);
      }
      e.carry = { type: 'lumber', amount: Math.min(LUMBER_PER_TRIP, carry + gain) };
      if (e.carry.amount >= LUMBER_PER_TRIP) {
        e.task = { kind: 'returning', tx, ty, timer: 0 };
        const drop = nearestDropoff(state, e, 'lumber');
        if (drop) requestPath(state, e, drop.x, drop.y);
      }
      return;
    }
    case 'returning': {
      const drop = nearestDropoff(state, e, e.carry?.type === 'gold' ? 'gold' : 'lumber');
      if (!drop) { return; }
      const gap = dist(e.x, e.y, drop.x, drop.y) - drop.radius - e.radius;
      if (gap > 14) {
        if (!e.path || e.pathIdx >= (e.path?.length ?? 0)) {
          if (e.repath <= now) { e.repath = now + 1; requestPath(state, e, drop.x, drop.y); }
        }
        return;
      }
      // deposit
      if (e.carry) {
        const p = state.players[e.owner];
        if (e.carry.type === 'gold') depositGold(state, e.owner, e.carry.amount);
        else if (p) { p.lumber += e.carry.amount * p.gatherMult; p.stats.lumberHarvested += e.carry.amount; }
        e.carry = undefined;
      }
      // head back
      if (task.mineId) {
        const mine = state.store.get(task.mineId);
        if (mine && (mine.goldLeft ?? 0) > 0) {
          e.task = { kind: 'toMine', mineId: task.mineId, timer: 0 };
          requestPath(state, e, mine.x, mine.y);
        } else { e.task = undefined; clearOrder(e); }
      } else if (task.tx !== undefined && task.ty !== undefined) {
        const next = state.map.treeWood[state.map.idx(task.tx, task.ty)] > 0
          ? { tx: task.tx, ty: task.ty }
          : state.map.nearestTree(e.x, e.y);
        if (next) {
          e.task = { kind: 'toTree', tx: next.tx, ty: next.ty, timer: 0 };
          requestPath(state, e, next.tx * TILE + TILE / 2, next.ty * TILE + TILE / 2);
        } else { e.task = undefined; clearOrder(e); }
      } else { e.task = undefined; clearOrder(e); }
      return;
    }
    default:
      return;
  }
}

function countChannelers(state: GameState, mine: Entity): number {
  let n = 0;
  state.store.forEach(w => {
    if (w.task?.kind === 'channelMine' && w.task.mineId === mine.id) n++;
  });
  return n;
}

// worker task movement (workers use their own pathing loop separate from orderTick combat chase)
export function workerMoveTick(state: GameState, e: Entity, dt: number) {
  if (!e.task || e.hidden) return;
  const k = e.task.kind;
  if (k === 'channelMine' || k === 'chopping' || k === 'inMine' || k === 'building') return;
  // follow current path
  if (e.path && e.pathIdx < e.path.length) {
    const wp = e.path[e.pathIdx];
    const d = dist(e.x, e.y, wp.x, wp.y);
    const speed = effectiveWorkerSpeed(state, e);
    if (d < 6) { e.pathIdx++; return; }
    const step = Math.min(speed * dt, d);
    e.x += ((wp.x - e.x) / d) * step;
    e.y += ((wp.y - e.y) / d) * step;
  }
}

function effectiveWorkerSpeed(state: GameState, e: Entity): number {
  let pct = 0;
  for (const b of e.buffs) if (b.until > state.time && b.msPct) pct += b.msPct;
  return Math.max(20, e.moveSpeed * (1 + pct / 100));
}
