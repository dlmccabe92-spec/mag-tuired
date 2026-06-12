// Lightweight entity store with a spatial hash for range queries.
import type { Entity } from '@/game/types';

const CELL = 128; // px per spatial bucket

export class EntityStore {
  entities = new Map<number, Entity>();
  private nextId = 1;
  private buckets = new Map<number, Entity[]>();
  private mapPx: number;
  private cols: number;

  constructor(mapPx: number) {
    this.mapPx = mapPx;
    this.cols = Math.ceil(mapPx / CELL);
  }

  create(partial: Omit<Entity, 'id'>): Entity {
    const e = partial as Entity;
    (e as { id: number }).id = this.nextId++;
    this.entities.set(e.id, e);
    return e;
  }

  get(id: number): Entity | undefined {
    const e = this.entities.get(id);
    return e && !e.dead ? e : undefined;
  }

  remove(id: number) {
    this.entities.delete(id);
  }

  rebuildSpatial() {
    this.buckets.clear();
    for (const e of this.entities.values()) {
      if (e.dead) continue;
      const k = this.key(e.x, e.y);
      let arr = this.buckets.get(k);
      if (!arr) { arr = []; this.buckets.set(k, arr); }
      arr.push(e);
    }
  }

  private key(x: number, y: number): number {
    const cx = Math.min(this.cols - 1, Math.max(0, (x / CELL) | 0));
    const cy = Math.min(this.cols - 1, Math.max(0, (y / CELL) | 0));
    return cy * this.cols + cx;
  }

  // All non-dead entities within radius r of (x, y), filtered by predicate.
  query(x: number, y: number, r: number, pred?: (e: Entity) => boolean): Entity[] {
    const out: Entity[] = [];
    const r2 = r * r;
    const c0x = Math.max(0, ((x - r) / CELL) | 0);
    const c0y = Math.max(0, ((y - r) / CELL) | 0);
    const c1x = Math.min(this.cols - 1, ((x + r) / CELL) | 0);
    const c1y = Math.min(this.cols - 1, ((y + r) / CELL) | 0);
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const arr = this.buckets.get(cy * this.cols + cx);
        if (!arr) continue;
        for (const e of arr) {
          if (e.dead) continue;
          const dx = e.x - x, dy = e.y - y;
          if (dx * dx + dy * dy <= r2 && (!pred || pred(e))) out.push(e);
        }
      }
    }
    return out;
  }

  forEach(fn: (e: Entity) => void) {
    for (const e of this.entities.values()) {
      if (!e.dead) fn(e);
    }
  }

  // Cleanup dead entities (call at end of tick)
  sweep() {
    for (const [id, e] of this.entities) {
      if (e.dead) this.entities.delete(id);
    }
  }
}
