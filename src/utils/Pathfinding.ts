// A* pathfinding on the tile grid with a binary heap open list.

class MinHeap {
  keys: Int32Array;
  costs: Float64Array;
  size = 0;
  constructor(cap: number) {
    this.keys = new Int32Array(cap);
    this.costs = new Float64Array(cap);
  }
  push(key: number, cost: number) {
    if (this.size >= this.keys.length) {
      const nk = new Int32Array(this.keys.length * 2);
      nk.set(this.keys); this.keys = nk;
      const nc = new Float64Array(this.costs.length * 2);
      nc.set(this.costs); this.costs = nc;
    }
    let i = this.size++;
    this.keys[i] = key; this.costs[i] = cost;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.costs[p] <= this.costs[i]) break;
      this.swap(i, p); i = p;
    }
  }
  pop(): number {
    const top = this.keys[0];
    this.size--;
    if (this.size > 0) {
      this.keys[0] = this.keys[this.size];
      this.costs[0] = this.costs[this.size];
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < this.size && this.costs[l] < this.costs[m]) m = l;
        if (r < this.size && this.costs[r] < this.costs[m]) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    const k = this.keys[a]; this.keys[a] = this.keys[b]; this.keys[b] = k;
    const c = this.costs[a]; this.costs[a] = this.costs[b]; this.costs[b] = c;
  }
}

const MAX_EXPAND = 9000;

export class Pathfinder {
  private w: number;
  private h: number;
  private gScore: Float64Array;
  private cameFrom: Int32Array;
  private closed: Uint8Array;
  private stamp: Int32Array;
  private curStamp = 0;
  private heap: MinHeap;

  constructor(w: number, h: number) {
    this.w = w; this.h = h;
    const n = w * h;
    this.gScore = new Float64Array(n);
    this.cameFrom = new Int32Array(n);
    this.closed = new Uint8Array(n);
    this.stamp = new Int32Array(n);
    this.heap = new MinHeap(4096);
  }

  // walkable: Uint8Array, 1 = walkable. Returns array of tile indices from start to goal (inclusive), or null.
  find(walkable: Uint8Array, sx: number, sy: number, gx: number, gy: number): number[] | null {
    const { w, h } = this;
    if (sx === gx && sy === gy) return [sy * w + sx];
    // If goal is blocked, find nearest walkable tile around goal
    if (!walkable[gy * w + gx]) {
      const g = this.nearestWalkable(walkable, gx, gy, 12);
      if (g === -1) return null;
      gx = g % w; gy = (g / w) | 0;
      if (sx === gx && sy === gy) return [sy * w + sx];
    }
    if (!walkable[sy * w + sx]) {
      const s = this.nearestWalkable(walkable, sx, sy, 6);
      if (s === -1) return null;
      sx = s % w; sy = (s / w) | 0;
    }

    this.curStamp++;
    const stamp = this.curStamp;
    const heap = this.heap;
    heap.size = 0;
    const start = sy * w + sx;
    const goal = gy * w + gx;
    this.gScore[start] = 0;
    this.cameFrom[start] = -1;
    this.stamp[start] = stamp;
    this.closed[start] = 0;
    heap.push(start, 0);

    let expanded = 0;
    let bestNode = start;
    let bestH = this.octile(sx, sy, gx, gy);

    while (heap.size > 0 && expanded < MAX_EXPAND) {
      const cur = heap.pop();
      if (this.closed[cur] && this.stamp[cur] === stamp) continue;
      this.closed[cur] = 1;
      expanded++;
      if (cur === goal) return this.rebuild(cur);
      const cx = cur % w, cy = (cur / w) | 0;
      const ch = this.octile(cx, cy, gx, gy);
      if (ch < bestH) { bestH = ch; bestNode = cur; }

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (!walkable[ni]) continue;
          // no corner cutting through blocked tiles
          if (dx !== 0 && dy !== 0) {
            if (!walkable[cy * w + nx] || !walkable[ny * w + cx]) continue;
          }
          const step = dx !== 0 && dy !== 0 ? 1.41421 : 1;
          const ng = this.gScore[cur] + step;
          if (this.stamp[ni] !== stamp || ng < this.gScore[ni]) {
            const wasStamped = this.stamp[ni] === stamp;
            if (wasStamped && this.closed[ni]) continue;
            this.stamp[ni] = stamp;
            this.closed[ni] = 0;
            this.gScore[ni] = ng;
            this.cameFrom[ni] = cur;
            heap.push(ni, ng + this.octile(nx, ny, gx, gy));
          }
        }
      }
    }
    // best-effort: path to closest reached node
    if (bestNode !== start) return this.rebuild(bestNode);
    return null;
  }

  private rebuild(node: number): number[] {
    const out: number[] = [];
    let cur = node;
    while (cur !== -1) {
      out.push(cur);
      cur = this.cameFrom[cur];
    }
    out.reverse();
    return out;
  }

  private octile(ax: number, ay: number, bx: number, by: number): number {
    const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
    return Math.max(dx, dy) + 0.41421 * Math.min(dx, dy);
  }

  nearestWalkable(walkable: Uint8Array, x: number, y: number, maxR: number): number {
    const { w, h } = this;
    if (x >= 0 && y >= 0 && x < w && y < h && walkable[y * w + x]) return y * w + x;
    for (let r = 1; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (walkable[ny * w + nx]) return ny * w + nx;
        }
      }
    }
    return -1;
  }
}

// Straight-line walkability check (for path smoothing), sampling every half tile.
export function lineWalkable(walkable: Uint8Array, w: number, ax: number, ay: number, bx: number, by: number): boolean {
  const dx = bx - ax, dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(len * 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const tx = Math.floor(ax + dx * t + 0.5);
    const ty = Math.floor(ay + dy * t + 0.5);
    if (!walkable[ty * w + tx]) return false;
  }
  return true;
}
