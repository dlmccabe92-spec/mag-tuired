// Terrain tiles, trees, blight.
import type { GameState } from '@/simulation/GameState';
import type { Camera } from '@/engine/Camera';
import { TILE } from '@/utils/Constants';
import { T_GRASS, T_DIRT, T_WATER, T_TREE } from '@/simulation/GameMap';

const GRASS = ['#2e5d33', '#2a5830', '#316137'];
const DIRT = ['#7a6743', '#71603f'];
const WATER = '#27567f';
const WATER_DEEP = '#1f4566';
const TREE_BASE = '#23402a';

export function renderMap(ctx: CanvasRenderingContext2D, state: GameState, cam: Camera) {
  const b = cam.bounds();
  const map = state.map;
  const s = map.size;
  const x0 = Math.max(0, Math.floor(b.x0 / TILE));
  const y0 = Math.max(0, Math.floor(b.y0 / TILE));
  const x1 = Math.min(s - 1, Math.ceil(b.x1 / TILE));
  const y1 = Math.min(s - 1, Math.ceil(b.y1 / TILE));

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const i = ty * s + tx;
      const t = map.tiles[i];
      const hash = (tx * 7 + ty * 13) % 3;
      let color: string;
      if (t === T_WATER) color = (tx + ty) % 2 === 0 ? WATER : WATER_DEEP;
      else if (t === T_DIRT) color = DIRT[hash % 2];
      else if (t === T_TREE) color = TREE_BASE;
      else color = GRASS[hash];
      ctx.fillStyle = color;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      if (map.blight[i] && t !== T_WATER) {
        ctx.fillStyle = 'rgba(74, 36, 112, 0.45)';
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
  }
  // trees on top
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const i = ty * s + tx;
      if (map.tiles[i] !== T_TREE) continue;
      const ox = ((tx * 31 + ty * 17) % 7) - 3;
      const oy = ((tx * 13 + ty * 29) % 7) - 3;
      const cx = tx * TILE + TILE / 2 + ox;
      const cy = ty * TILE + TILE / 2 + oy;
      ctx.fillStyle = '#152e1a';
      ctx.beginPath();
      ctx.arc(cx + 2, cy + 3, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e4727';
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a5e35';
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 3, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
