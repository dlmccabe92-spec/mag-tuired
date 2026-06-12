// Tile map: terrain generation, walkability, trees, blight.
import type { MapDef } from '@/game/types';
import { TILE, TREE_LUMBER, BLIGHT_RADIUS } from '@/utils/Constants';

export const T_GRASS = 0;
export const T_DIRT = 1;
export const T_WATER = 2;
export const T_TREE = 3;

// deterministic rng
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class GameMap {
  size: number;
  tiles: Uint8Array;
  treeWood: Uint16Array;
  blight: Uint8Array;
  occupied: Int32Array;   // entity id occupying tile (buildings, mines); 0 = free
  walkable: Uint8Array;   // derived: 1 walkable for ground units
  def: MapDef;
  terrainDirty = true;    // signals renderer to redraw terrain cache

  constructor(def: MapDef) {
    this.def = def;
    this.size = def.size;
    const n = def.size * def.size;
    this.tiles = new Uint8Array(n);
    this.treeWood = new Uint16Array(n);
    this.blight = new Uint8Array(n);
    this.occupied = new Int32Array(n);
    this.walkable = new Uint8Array(n);
    this.generate();
  }

  idx(tx: number, ty: number): number { return ty * this.size + tx; }
  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.size && ty < this.size;
  }

  private generate() {
    const s = this.size;
    const rand = mulberry32(0xC31C + s);
    // base: grass with dirt patches
    for (let i = 0; i < s * s; i++) {
      this.tiles[i] = rand() < 0.12 ? T_DIRT : T_GRASS;
    }
    // border forest ring
    const ring = 3;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        if (x < ring || y < ring || x >= s - ring || y >= s - ring) {
          this.tiles[this.idx(x, y)] = T_TREE;
        }
      }
    }
    // forest blobs
    const blobs = Math.floor(s * s / 480);
    for (let b = 0; b < blobs; b++) {
      const cx = 4 + Math.floor(rand() * (s - 8));
      const cy = 4 + Math.floor(rand() * (s - 8));
      const r = 2 + Math.floor(rand() * 4);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          if (rand() < 0.82) {
            const x = cx + dx, y = cy + dy;
            if (this.inBounds(x, y)) this.tiles[this.idx(x, y)] = T_TREE;
          }
        }
      }
    }
    // water features per map
    if (this.def.id === 'bridge') {
      // vertical river with central bridge gap
      const mid = s >> 1;
      for (let y = 0; y < s; y++) {
        for (let x = mid - 6; x <= mid + 6; x++) {
          if (y >= mid - 6 && y <= mid + 6) continue; // bridge
          this.tiles[this.idx(x, y)] = T_WATER;
        }
      }
      // bridge is bare dirt
      for (let y = mid - 6; y <= mid + 6; y++) {
        for (let x = mid - 6; x <= mid + 6; x++) {
          this.tiles[this.idx(x, y)] = T_DIRT;
        }
      }
    } else {
      // lakes
      const lakes = this.def.id === 'plain' ? 5 : 3;
      for (let l = 0; l < lakes; l++) {
        const cx = 12 + Math.floor(rand() * (s - 24));
        const cy = 12 + Math.floor(rand() * (s - 24));
        const r = 3 + Math.floor(rand() * 4);
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy > r * r) continue;
            const x = cx + dx, y = cy + dy;
            if (this.inBounds(x, y)) this.tiles[this.idx(x, y)] = T_WATER;
          }
        }
      }
    }
    // clearings at key points
    const clear = (tx: number, ty: number, r: number) => {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const x = tx + dx, y = ty + dy;
          if (this.inBounds(x, y) && x >= 1 && y >= 1 && x < s - 1 && y < s - 1) {
            this.tiles[this.idx(x, y)] = T_GRASS;
          }
        }
      }
    };
    const carve = (ax: number, ay: number, bx: number, by: number, w: number) => {
      const len = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let i = 0; i <= len; i++) {
        const t = i / Math.max(1, len);
        clear(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t), w);
      }
    };
    const pts: { x: number; y: number }[] = [];
    for (const st of this.def.starts) { clear(st.x, st.y, 9); pts.push(st); }
    for (const m of this.def.mines) { clear(m.x, m.y, 6); pts.push(m); }
    for (const c of this.def.camps) { clear(c.x, c.y, 5); pts.push(c); }
    for (const sh of this.def.shops) { clear(sh.x, sh.y, 4); pts.push(sh); }
    // connect everything to nearest start and the two starts to each other through center
    const mid = { x: s >> 1, y: s >> 1 };
    if (this.def.id !== 'bridge') clear(mid.x, mid.y, 6);
    carve(this.def.starts[0].x, this.def.starts[0].y, mid.x, mid.y, 3);
    carve(this.def.starts[1].x, this.def.starts[1].y, mid.x, mid.y, 3);
    for (const p of pts) {
      const st = this.def.starts.reduce((a, b) =>
        (Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? a : b));
      carve(p.x, p.y, st.x, st.y, 3);
    }
    // restore bridge water (carving may have cut the river)
    if (this.def.id === 'bridge') {
      const c = s >> 1;
      for (let y = 0; y < s; y++) {
        for (let x = c - 6; x <= c + 6; x++) {
          const onBridge = y >= c - 6 && y <= c + 6;
          if (!onBridge) this.tiles[this.idx(x, y)] = T_WATER;
        }
      }
    }
    // keep outer ring solid
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        if (x < 2 || y < 2 || x >= s - 2 || y >= s - 2) this.tiles[this.idx(x, y)] = T_TREE;
      }
    }
    // tree wood amounts
    for (let i = 0; i < s * s; i++) {
      this.treeWood[i] = this.tiles[i] === T_TREE ? TREE_LUMBER : 0;
    }
    this.rebuildWalkable();
  }

  rebuildWalkable() {
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      this.walkable[i] = (t === T_GRASS || t === T_DIRT) && this.occupied[i] === 0 ? 1 : 0;
    }
  }

  removeTree(tx: number, ty: number) {
    const i = this.idx(tx, ty);
    if (this.tiles[i] === T_TREE) {
      this.tiles[i] = T_DIRT;
      this.treeWood[i] = 0;
      this.walkable[i] = this.occupied[i] === 0 ? 1 : 0;
      this.terrainDirty = true;
    }
  }

  stampOccupy(tx: number, ty: number, size: number, id: number) {
    for (let y = ty; y < ty + size; y++) {
      for (let x = tx; x < tx + size; x++) {
        if (!this.inBounds(x, y)) continue;
        const i = this.idx(x, y);
        this.occupied[i] = id;
        this.walkable[i] = 0;
      }
    }
  }

  unstamp(tx: number, ty: number, size: number) {
    for (let y = ty; y < ty + size; y++) {
      for (let x = tx; x < tx + size; x++) {
        if (!this.inBounds(x, y)) continue;
        const i = this.idx(x, y);
        this.occupied[i] = 0;
        const t = this.tiles[i];
        this.walkable[i] = t === T_GRASS || t === T_DIRT ? 1 : 0;
      }
    }
  }

  addBlight(cx: number, cy: number) {
    const r = Math.ceil(BLIGHT_RADIUS / TILE);
    const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = tx + dx, y = ty + dy;
        if (this.inBounds(x, y)) this.blight[this.idx(x, y)] = 1;
      }
    }
    this.terrainDirty = true;
  }

  isBlighted(wx: number, wy: number): boolean {
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    return this.inBounds(tx, ty) && this.blight[this.idx(tx, ty)] === 1;
  }

  // Can a building of `size` tiles be placed with NW corner at (tx, ty)?
  canPlace(tx: number, ty: number, size: number, needBlight: boolean): boolean {
    for (let y = ty; y < ty + size; y++) {
      for (let x = tx; x < tx + size; x++) {
        if (!this.inBounds(x, y)) return false;
        const i = this.idx(x, y);
        const t = this.tiles[i];
        if (t !== T_GRASS && t !== T_DIRT) return false;
        if (this.occupied[i] !== 0) return false;
        if (needBlight && this.blight[i] !== 1) return false;
      }
    }
    return true;
  }

  // find nearest tree tile to a world point
  nearestTree(wx: number, wy: number, maxR = 30): { tx: number; ty: number } | null {
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    for (let r = 0; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = tx + dx, y = ty + dy;
          if (this.inBounds(x, y) && this.tiles[this.idx(x, y)] === T_TREE && this.treeWood[this.idx(x, y)] > 0) {
            return { tx: x, ty: y };
          }
        }
      }
    }
    return null;
  }
}
