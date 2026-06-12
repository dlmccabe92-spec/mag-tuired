// Unit movement, path following, order progression, smart orders.
import type { Entity } from '@/game/types';
import type { GameState } from './GameState';
import { TILE } from '@/utils/Constants';
import { dist, norm } from '@/utils/Vector2';
import { lineWalkable } from '@/utils/Pathfinding';
import { isRooted, isStunned, effectiveSpeed, isEnemy, canTarget } from './CombatSystem';
import { pickupItem } from './HeroSystem';

const ARRIVE_DIST = 6;

export function requestPath(state: GameState, e: Entity, tx: number, ty: number) {
  if (e.flying) {
    e.path = [{ x: tx, y: ty }];
    e.pathIdx = 0;
    return;
  }
  const map = state.map;
  const stx = Math.floor(e.x / TILE), sty = Math.floor(e.y / TILE);
  const gtx = Math.max(0, Math.min(map.size - 1, Math.floor(tx / TILE)));
  const gty = Math.max(0, Math.min(map.size - 1, Math.floor(ty / TILE)));
  const tiles = state.pathfinder.find(map.walkable, stx, sty, gtx, gty);
  if (!tiles || tiles.length === 0) {
    e.path = [{ x: tx, y: ty }];
    e.pathIdx = 0;
    return;
  }
  // waypoints at tile centers; replace final with exact target if close
  const pts = tiles.map(i => ({
    x: (i % map.size) * TILE + TILE / 2,
    y: Math.floor(i / map.size) * TILE + TILE / 2,
  }));
  // smooth: greedily skip waypoints with clear lines
  const smooth: { x: number; y: number }[] = [];
  let i = 0;
  while (i < pts.length) {
    let j = Math.min(pts.length - 1, i + 14);
    while (j > i + 1) {
      if (lineWalkable(map.walkable, map.size, pts[i].x / TILE - 0.5, pts[i].y / TILE - 0.5, pts[j].x / TILE - 0.5, pts[j].y / TILE - 0.5)) break;
      j--;
    }
    smooth.push(pts[j]);
    if (j === pts.length - 1) break;
    i = j;
  }
  const last = smooth[smooth.length - 1];
  if (last && dist(last.x, last.y, tx, ty) < TILE * 1.5) {
    const ttx = Math.floor(tx / TILE), tty = Math.floor(ty / TILE);
    if (map.inBounds(ttx, tty) && map.walkable[tty * map.size + ttx]) {
      smooth[smooth.length - 1] = { x: tx, y: ty };
    }
  }
  e.path = smooth;
  e.pathIdx = 0;
}

export function clearOrder(e: Entity) {
  e.order = { type: 'idle' };
  e.path = null;
  e.pathIdx = 0;
  e.targetId = 0;
}

export function issueMove(state: GameState, e: Entity, x: number, y: number, attackMove = false) {
  if (e.etype !== 'unit' || e.moveSpeed <= 0) return;
  e.order = attackMove ? { type: 'attackmove', x, y } : { type: 'move', x, y };
  e.targetId = 0;
  e.task = undefined;
  if (e.hero?.channel) e.hero.channel = undefined;
  requestPath(state, e, x, y);
}

export function issueAttack(state: GameState, e: Entity, targetId: number) {
  if (e.etype !== 'unit') return;
  e.order = { type: 'attack', targetId };
  e.targetId = targetId;
  e.task = undefined;
  if (e.hero?.channel) e.hero.channel = undefined;
  const t = state.store.get(targetId);
  if (t) requestPath(state, e, t.x, t.y);
}

// follow current path; returns true if path finished
function followPath(state: GameState, e: Entity, dt: number): boolean {
  if (!e.path || e.pathIdx >= e.path.length) return true;
  const wp = e.path[e.pathIdx];
  const d = dist(e.x, e.y, wp.x, wp.y);
  if (d < ARRIVE_DIST) {
    e.pathIdx++;
    return e.pathIdx >= e.path.length;
  }
  const speed = effectiveSpeed(e, state.time);
  const dir = norm(wp.x - e.x, wp.y - e.y);
  const step = Math.min(speed * dt, d);
  const nx = e.x + dir.x * step;
  const ny = e.y + dir.y * step;
  if (!e.flying) {
    const tx = Math.floor(nx / TILE), ty = Math.floor(ny / TILE);
    if (!state.map.inBounds(tx, ty) || !state.map.walkable[ty * state.map.size + tx]) {
      // blocked: repath occasionally
      if (e.repath <= state.time) {
        e.repath = state.time + 0.5;
        const tgt = e.path[e.path.length - 1];
        requestPath(state, e, tgt.x, tgt.y);
      }
      return false;
    }
  }
  e.x = nx; e.y = ny;
  return false;
}

// gentle separation so units don't stack
function separate(state: GameState, e: Entity, dt: number) {
  if (e.etype !== 'unit' || e.hidden) return;
  const near = state.store.query(e.x, e.y, e.radius + 16, q =>
    q.id !== e.id && q.etype === 'unit' && !q.hidden && q.flying === e.flying);
  for (const q of near) {
    const d = dist(e.x, e.y, q.x, q.y);
    const overlap = e.radius + q.radius - d;
    if (overlap > 0 && d > 0.01) {
      const push = Math.min(overlap, 30 * dt);
      const dir = norm(e.x - q.x, e.y - q.y);
      let nx = e.x + dir.x * push;
      let ny = e.y + dir.y * push;
      if (!e.flying) {
        const tx = Math.floor(nx / TILE), ty = Math.floor(ny / TILE);
        if (!state.map.inBounds(tx, ty) || !state.map.walkable[ty * state.map.size + tx]) { nx = e.x; ny = e.y; }
      }
      e.x = nx; e.y = ny;
    }
  }
}

export function orderTick(state: GameState, e: Entity, dt: number) {
  if (e.etype !== 'unit' || e.dead || e.hidden) return;
  const now = state.time;
  if (isStunned(e, now)) return;
  if (e.hero?.channel) return; // channeling: stand still

  const o = e.order;

  // chase acquired target
  if (e.targetId && (o.type === 'attack' || o.type === 'idle' || o.type === 'attackmove' || o.type === 'hold' || o.type === 'patrol')) {
    const t = state.store.get(e.targetId);
    if (t && isEnemy(e, t) && canTarget(e, t, now)) {
      const gap = dist(e.x, e.y, t.x, t.y) - t.radius - e.radius;
      if (gap > e.attackRange) {
        if (o.type === 'hold') {
          e.targetId = 0; // hold position: don't chase
        } else if (!isRooted(e, now)) {
          // re-path toward moving target periodically
          if (e.repath <= now || !e.path || e.pathIdx >= e.path.length) {
            e.repath = now + 0.4;
            requestPath(state, e, t.x, t.y);
          }
          followPath(state, e, dt);
          separate(state, e, dt);
          pickupNearby(state, e);
          return;
        }
      } else {
        separate(state, e, dt);
        return; // in range: stand and fight
      }
    } else {
      e.targetId = 0;
      if (o.type === 'attack') e.order = { type: 'idle' };
    }
  }

  if (isRooted(e, now)) return;

  switch (o.type) {
    case 'move':
    case 'attackmove': {
      if (followPath(state, e, dt)) {
        e.order = { type: 'idle' };
        e.path = null;
      }
      break;
    }
    case 'patrol': {
      if (!e.path || e.pathIdx >= e.path.length) {
        const tx = o.leg === 0 ? o.x2 : o.x1;
        const ty = o.leg === 0 ? o.y2 : o.y1;
        requestPath(state, e, tx, ty);
      }
      if (followPath(state, e, dt)) {
        e.order = { ...o, leg: o.leg === 0 ? 1 : 0 };
        e.path = null;
      }
      break;
    }
    case 'castPoint':
    case 'castUnit': {
      // movement toward cast handled in HeroSystem
      break;
    }
    default:
      break;
  }
  separate(state, e, dt);
  pickupNearby(state, e);
}

function pickupNearby(state: GameState, e: Entity) {
  if (!e.hero) return;
  const items = state.store.query(e.x, e.y, e.radius + 14, q => q.etype === 'item');
  for (const it of items) {
    if (pickupItem(state, e, it)) break;
  }
}

// Smart right-click: returns description of action taken
export function smartOrder(state: GameState, units: Entity[], wx: number, wy: number, target: Entity | null) {
  const now = state.time;
  for (const e of units) {
    if (e.etype === 'building') {
      // set rally
      e.rallyX = wx; e.rallyY = wy;
      continue;
    }
    if (e.etype !== 'unit' || e.moveSpeed <= 0) continue;
    const isWorker = e.unitDef?.role === 'worker';
    const isTaise = e.unitDef?.id === 'slu_melee';

    if (target && target.etype === 'mine' && (isWorker)) {
      e.order = { type: 'gatherMine', mineId: target.id };
      e.task = { kind: 'toMine', mineId: target.id, timer: 0 };
      e.targetId = 0;
      requestPath(state, e, target.x, target.y);
      continue;
    }
    if (target && isEnemy(e, target) && canTarget(e, target, now)) {
      issueAttack(state, e, target.id);
      continue;
    }
    issueMove(state, e, wx, wy, false);
  }
  // tree gather: handled by caller checking tile (workers only)
  void 0;
}

export function orderGatherTree(state: GameState, e: Entity, tx: number, ty: number) {
  e.order = { type: 'gatherTree', tx, ty };
  e.task = { kind: 'toTree', tx, ty, timer: 0 };
  e.targetId = 0;
  requestPath(state, e, tx * TILE + TILE / 2, ty * TILE + TILE / 2);
}
