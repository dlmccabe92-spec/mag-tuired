// Click and box selection helpers.
import type { Entity } from '@/game/types';
import type { GameState } from '@/simulation/GameState';
import type { FogOfWar } from '@/renderer/FogOfWar';
import { dist } from '@/utils/Vector2';
import { TILE } from '@/utils/Constants';

export function entityAt(state: GameState, fog: FogOfWar, wx: number, wy: number): Entity | null {
  let best: Entity | null = null;
  let bestD = Infinity;
  state.store.forEach(e => {
    if (e.dead || e.hidden || e.etype === 'item') return;
    if (e.owner !== 0) {
      if (e.etype === 'unit' && (!fog.isVisible(e.x, e.y) || e.invisible)) return;
      if ((e.etype === 'building' || e.etype === 'mine') && !fog.isExplored(e.x, e.y)) return;
    }
    let r: number;
    if (e.etype === 'building' || e.etype === 'mine') {
      const size = (e.bldDef?.size ?? 3) * TILE;
      const x0 = (e.homeX ?? 0) * TILE, y0 = (e.homeY ?? 0) * TILE;
      if (wx >= x0 && wx <= x0 + size && wy >= y0 && wy <= y0 + size) {
        const d = dist(wx, wy, e.x, e.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      return;
    } else {
      r = e.radius + 5;
    }
    const d = dist(wx, wy, e.x, e.y);
    if (d <= r && d < bestD) { bestD = d; best = e; }
  });
  return best;
}

export function entitiesInBox(state: GameState, x0: number, y0: number, x1: number, y1: number): Entity[] {
  const lx = Math.min(x0, x1), hx = Math.max(x0, x1);
  const ly = Math.min(y0, y1), hy = Math.max(y0, y1);
  const own: Entity[] = [];
  state.store.forEach(e => {
    if (e.dead || e.hidden || e.etype !== 'unit' || e.owner !== 0) return;
    if (e.x >= lx && e.x <= hx && e.y >= ly && e.y <= hy) own.push(e);
  });
  return own;
}

// heroes first, then army, then workers
export function sortSelection(state: GameState, ids: number[]): number[] {
  const rank = (id: number): number => {
    const e = state.store.get(id);
    if (!e) return 99;
    if (e.hero) return 0;
    if (e.etype === 'unit' && e.unitDef?.role !== 'worker') return 1;
    if (e.etype === 'unit') return 2;
    return 3;
  };
  return [...ids].sort((a, b) => rank(a) - rank(b));
}
