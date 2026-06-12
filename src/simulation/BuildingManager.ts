// Construction, production queues, town-hall upgrades, research.
import type { Entity, QueueItem } from '@/game/types';
import type { GameState } from './GameState';
import { TILE } from '@/utils/Constants';
import { dist } from '@/utils/Vector2';
import { getBldDef, getUnitDef, getHeroDef } from '@/data/races';
import { spawnUnit, spawnHero, spawnBuilding, recomputeFood } from './UnitManager';
import { clearOrder, issueMove, requestPath } from './OrderSystem';

// find a free tile near a building to spawn a unit
export function spawnPointNear(state: GameState, b: Entity): { x: number; y: number } {
  const def = b.bldDef;
  const size = def?.size ?? 3;
  const tx = b.homeX ?? Math.floor(b.x / TILE);
  const ty = b.homeY ?? Math.floor(b.y / TILE);
  for (let r = 0; r < 8; r++) {
    for (let dy = -1 - r; dy <= size + r; dy++) {
      for (let dx = -1 - r; dx <= size + r; dx++) {
        const onRing = dx === -1 - r || dy === -1 - r || dx === size + r || dy === size + r;
        if (!onRing) continue;
        const x = tx + dx, y = ty + dy;
        if (!state.map.inBounds(x, y)) continue;
        if (state.map.walkable[y * state.map.size + x]) {
          return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
        }
      }
    }
  }
  return { x: b.x, y: b.y + b.radius + 16 };
}

// worker arriving at a build site
export function buildTaskTick(state: GameState, e: Entity) {
  if (e.order.type !== 'build' || e.etype !== 'unit') return;
  const o = e.order;
  const def = getBldDef(o.bldId);
  const cx = (o.tx + def.size / 2) * TILE;
  const cy = (o.ty + def.size / 2) * TILE;
  const gap = dist(e.x, e.y, cx, cy) - def.size * TILE * 0.5 - e.radius;
  if (e.task?.kind === 'building') {
    // ensure assigned building still alive
    const b = e.task.buildingId ? state.store.get(e.task.buildingId) : undefined;
    if (!b || !b.constructing) { e.task = undefined; clearOrder(e); }
    return;
  }
  if (gap > 20) {
    if (!e.path || e.pathIdx >= (e.path?.length ?? 0)) {
      if (e.repath <= state.time) { e.repath = state.time + 1; requestPath(state, e, cx, cy); }
    }
    return;
  }
  // try to place
  const p = state.players[e.owner];
  const needBlight = def.race === 'sluagh' && def.role !== 'townhall';
  if (!state.map.canPlace(o.tx, o.ty, def.size, needBlight)) {
    // refund
    if (p) { p.gold += def.gold; p.lumber += def.lumber; }
    state.bus.emit({ type: 'error', msg: 'Cannot build there.' });
    e.task = undefined;
    clearOrder(e);
    return;
  }
  const b = spawnBuilding(state, o.bldId, e.owner, o.tx, o.ty);
  b.builderId = e.id;
  state.bus.emit({ type: 'build' });
  if (p?.race === 'sluagh') {
    // summoned construction: worker freed
    e.task = undefined;
    clearOrder(e);
  } else {
    e.task = { kind: 'building', buildingId: b.id, timer: 0 };
    // park the worker against the site
    e.path = null;
  }
}

export function buildingTick(state: GameState, b: Entity, dt: number) {
  if (b.etype !== 'building' || b.dead) return;
  const def = b.bldDef!;
  const p = state.players[b.owner];

  // construction
  if (b.constructing) {
    let crewOk = def.race === 'sluagh'; // sluagh buildings raise themselves
    if (!crewOk && b.builderId) {
      const w = state.store.get(b.builderId);
      crewOk = !!w && w.task?.kind === 'building' && w.task.buildingId === b.id;
      if (!crewOk) {
        // any other worker assigned?
        const near = state.store.query(b.x, b.y, b.radius + 40, q =>
          q.owner === b.owner && q.task?.kind === 'building' && q.task.buildingId === b.id);
        if (near.length) { b.builderId = near[0].id; crewOk = true; }
      }
    }
    if (crewOk) {
      const mult = p?.buildMult ?? 1;
      b.buildProgress = (b.buildProgress ?? 0) + (dt * mult) / Math.max(1, def.buildTime);
      b.hp = Math.min(def.hp, Math.max(b.hp, def.hp * (0.1 + 0.9 * (b.buildProgress ?? 0))));
      if ((b.buildProgress ?? 0) >= 1) {
        b.constructing = false;
        b.buildProgress = 1;
        b.hp = def.hp;
        if (def.race === 'sluagh') state.map.addBlight(b.x, b.y);
        recomputeFood(state, b.owner);
        // release builder
        if (b.builderId) {
          const w = state.store.get(b.builderId);
          if (w && w.task?.kind === 'building') { w.task = undefined; clearOrder(w); }
        }
        if (b.owner === 0) state.bus.emit({ type: 'toast', msg: `${def.name} complete.` });
      }
    }
    return;
  }

  // production queue
  const q = b.trainQueue;
  if (q && q.length > 0) {
    const item = q[0];
    item.progress += dt * (p?.buildMult ?? 1);
    if (item.progress >= item.total) {
      q.shift();
      finishQueueItem(state, b, item);
    }
  }
}

function finishQueueItem(state: GameState, b: Entity, item: QueueItem) {
  const p = state.players[b.owner];
  const pt = spawnPointNear(state, b);
  if (item.kind === 'unit') {
    const u = spawnUnit(state, item.id, b.owner, pt.x, pt.y);
    if (b.rallyX !== undefined && b.rallyY !== undefined) {
      issueMove(state, u, b.rallyX, b.rallyY, false);
    }
    recomputeFood(state, b.owner);
  } else if (item.kind === 'hero') {
    const h = spawnHero(state, item.id, b.owner, pt.x, pt.y);
    if (p && !p.heroesRecruited.includes(item.id)) p.heroesRecruited.push(item.id);
    if (b.rallyX !== undefined && b.rallyY !== undefined) issueMove(state, h, b.rallyX, b.rallyY, false);
    recomputeFood(state, b.owner);
    if (b.owner === 0) state.bus.emit({ type: 'toast', msg: `${heroDisplayName(item.id)} has answered the call.` });
  } else if (item.kind === 'revive') {
    if (p) {
      const idx = p.fallenHeroes.findIndex(f => f.state.defId === item.id);
      if (idx >= 0) {
        const fallen = p.fallenHeroes.splice(idx, 1)[0];
        spawnHero(state, item.id, b.owner, pt.x, pt.y, fallen.state);
        recomputeFood(state, b.owner);
        if (b.owner === 0) state.bus.emit({ type: 'toast', msg: `${heroDisplayName(item.id)} walks again.` });
      }
    }
  } else if (item.kind === 'upgrade') {
    if (p) {
      const u = p.upgrades as unknown as Record<string, number>;
      u[item.id] = (u[item.id] ?? 0) + 1;
      if (b.owner === 0) state.bus.emit({ type: 'toast', msg: 'Research complete.' });
    }
  } else if (item.kind === 'tech') {
    // town hall upgrade
    const newDef = getBldDef(item.id);
    const hpFrac = b.hp / b.maxHp;
    b.bldDef = newDef;
    b.maxHp = newDef.hp;
    b.hp = newDef.hp * hpFrac;
    b.sight = newDef.sight;
    recomputeFood(state, b.owner);
    if (b.owner === 0) state.bus.emit({ type: 'toast', msg: `${newDef.name} risen — Tier ${newDef.tier} unlocked.` });
  }
}

function heroDisplayName(id: string): string {
  try { return getHeroDef(id).name; } catch { return 'A hero'; }
}

// highest completed town hall tier for a player
export function playerTier(state: GameState, owner: number): number {
  let tier = 0;
  state.store.forEach(b => {
    if (b.etype === 'building' && b.owner === owner && !b.constructing && b.bldDef?.role === 'townhall') {
      tier = Math.max(tier, b.bldDef.tier);
    }
  });
  return tier;
}

export function hasBuilding(state: GameState, owner: number, defId: string): boolean {
  let found = false;
  state.store.forEach(b => {
    if (!found && b.etype === 'building' && b.owner === owner && !b.constructing && b.bldDef?.id === defId) found = true;
  });
  return found;
}

export function countUnits(state: GameState, owner: number, pred?: (e: Entity) => boolean): number {
  let n = 0;
  state.store.forEach(e => {
    if (e.etype === 'unit' && e.owner === owner && (!pred || pred(e))) n++;
  });
  return n;
}

export function queueLength(b: Entity): number {
  return b.trainQueue?.length ?? 0;
}

export function cancelQueueItem(state: GameState, b: Entity, index: number) {
  const q = b.trainQueue;
  if (!q || index >= q.length) return;
  const item = q.splice(index, 1)[0];
  const p = state.players[b.owner];
  if (!p) return;
  // refund
  if (item.kind === 'unit') {
    const d = getUnitDef(item.id);
    p.gold += d.gold; p.lumber += d.lumber;
  } else if (item.kind === 'tech') {
    const cur = b.bldDef!;
    p.gold += cur.upgradeGold ?? 0; p.lumber += cur.upgradeLumber ?? 0;
  }
  recomputeFood(state, b.owner);
}
