// Minimap: terrain cache + entity dots + fog + camera rect.
import type { GameState } from '@/simulation/GameState';
import type { Camera } from '@/engine/Camera';
import type { FogOfWar } from './FogOfWar';
import { TILE } from '@/utils/Constants';
import { T_WATER, T_TREE, T_DIRT } from '@/simulation/GameMap';

export class MinimapRenderer {
  private terrain: HTMLCanvasElement;
  private terrainCtx: CanvasRenderingContext2D;
  private dirty = true;

  constructor(private mapSize: number) {
    this.terrain = document.createElement('canvas');
    this.terrain.width = mapSize;
    this.terrain.height = mapSize;
    this.terrainCtx = this.terrain.getContext('2d')!;
  }

  markDirty() { this.dirty = true; }

  render(ctx: CanvasRenderingContext2D, outSize: number, state: GameState, cam: Camera, fog: FogOfWar) {
    if (this.dirty || state.map.terrainDirty) {
      this.redrawTerrain(state);
      this.dirty = false;
      state.map.terrainDirty = false;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, outSize, outSize);
    ctx.drawImage(this.terrain, 0, 0, outSize, outSize);

    const k = outSize / (this.mapSize * TILE);
    // entities
    state.store.forEach(e => {
      if (e.dead || e.hidden) return;
      if (e.etype === 'item') return;
      // hide enemies in fog
      if (e.owner !== 0 && e.etype !== 'mine') {
        if (e.etype === 'unit' && !fog.isVisible(e.x, e.y)) return;
        if (e.etype === 'building' && !fog.isExplored(e.x, e.y)) return;
        if (e.invisible) return;
      }
      let color: string;
      if (e.etype === 'mine') color = '#e8b423';
      else if (e.owner === 0) color = '#41a6ff';
      else if (e.owner === 1) color = '#ff4646';
      else if (e.owner === 9) color = '#d8c75a';
      else color = '#b9a44c';
      const s = e.etype === 'building' ? Math.max(3, (e.bldDef?.size ?? 2) * TILE * k)
        : e.etype === 'mine' ? 4 : e.hero ? 4 : 2.5;
      ctx.fillStyle = color;
      ctx.fillRect(e.x * k - s / 2, e.y * k - s / 2, s, s);
    });

    // fog overlay
    ctx.drawImage(fog.canvas, 0, 0, outSize, outSize);

    // camera viewport
    const b = cam.bounds();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k);
  }

  private redrawTerrain(state: GameState) {
    const c = this.terrainCtx;
    const s = this.mapSize;
    const img = c.createImageData(s, s);
    const d = img.data;
    for (let i = 0; i < s * s; i++) {
      const t = state.map.tiles[i];
      let r = 46, g = 93, b = 51; // grass
      if (t === T_WATER) { r = 39; g = 86; b = 127; }
      else if (t === T_TREE) { r = 24; g = 56; b = 31; }
      else if (t === T_DIRT) { r = 122; g = 103; b = 67; }
      if (state.map.blight[i] && t !== T_WATER) { r = 74; g = 36; b = 112; }
      const o = i * 4;
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }
}
