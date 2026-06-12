// Three-state fog of war for the human player, with an offscreen overlay canvas.
import type { GameState } from '@/simulation/GameState';
import { TILE } from '@/utils/Constants';

export const FOG_UNSEEN = 0;
export const FOG_EXPLORED = 1;
export const FOG_VISIBLE = 2;

export class FogOfWar {
  grid: Uint8Array;
  size: number;
  canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private img: ImageData;
  private owner: number;

  constructor(size: number, owner: number) {
    this.size = size;
    this.owner = owner;
    this.grid = new Uint8Array(size * size);
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d')!;
    this.img = this.ctx.createImageData(size, size);
  }

  update(state: GameState) {
    const g = this.grid;
    const s = this.size;
    // visible -> explored
    for (let i = 0; i < g.length; i++) {
      if (g[i] === FOG_VISIBLE) g[i] = FOG_EXPLORED;
    }
    const stamp = (wx: number, wy: number, sight: number) => {
      const r = Math.max(2, Math.ceil(sight / TILE));
      const cx = Math.floor(wx / TILE), cy = Math.floor(wy / TILE);
      const r2 = r * r;
      for (let dy = -r; dy <= r; dy++) {
        const y = cy + dy;
        if (y < 0 || y >= s) continue;
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const x = cx + dx;
          if (x < 0 || x >= s) continue;
          g[y * s + x] = FOG_VISIBLE;
        }
      }
    };
    state.store.forEach(e => {
      if (e.owner !== this.owner || e.dead || e.hidden) return;
      if (e.etype !== 'unit' && e.etype !== 'building') return;
      stamp(e.x, e.y, state.sightOf(e));
    });
    for (const r of state.reveals) {
      if (r.owner === this.owner && r.until > state.time) stamp(r.x, r.y, r.radius);
    }
    this.redraw();
  }

  isVisible(wx: number, wy: number): boolean {
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size) return false;
    return this.grid[ty * this.size + tx] === FOG_VISIBLE;
  }
  isExplored(wx: number, wy: number): boolean {
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size) return false;
    return this.grid[ty * this.size + tx] >= FOG_EXPLORED;
  }

  private redraw() {
    const d = this.img.data;
    const g = this.grid;
    for (let i = 0; i < g.length; i++) {
      const o = i * 4;
      d[o] = 4; d[o + 1] = 6; d[o + 2] = 12;
      d[o + 3] = g[i] === FOG_VISIBLE ? 0 : g[i] === FOG_EXPLORED ? 140 : 255;
    }
    this.ctx.putImageData(this.img, 0, 0);
  }
}
