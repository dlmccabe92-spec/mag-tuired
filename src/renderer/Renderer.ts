// Master renderer: composes terrain, entities, effects, fog, UI overlays.
import type { GameState } from '@/simulation/GameState';
import type { Camera } from '@/engine/Camera';
import { TILE } from '@/utils/Constants';
import { renderMap } from './MapRenderer';
import { drawUnit, drawBuilding, drawMine, drawItem } from './UnitRenderer';
import { renderProjectiles, renderEffects } from './EffectRenderer';
import { FogOfWar } from './FogOfWar';
import { getBldDef } from '@/data/races';

export interface RenderUI {
  selection: Set<number>;
  dragBox: { x0: number; y0: number; x1: number; y1: number } | null; // screen px
  placing: { bldId: string; tx: number; ty: number; valid: boolean } | null;
  targetingRange?: number; // show range circle around first selected hero
}

export class Renderer {
  ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  render(state: GameState, cam: Camera, alpha: number, ui: RenderUI, fog: FogOfWar) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#04060c';
    ctx.fillRect(0, 0, w, h);

    // world transform
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    ctx.imageSmoothingEnabled = false;

    renderMap(ctx, state, cam);

    const b = cam.bounds();
    const pad = 80;
    const inView = (x: number, y: number, r: number) =>
      x + r > b.x0 - pad && x - r < b.x1 + pad && y + r > b.y0 - pad && y - r < b.y1 + pad;

    // mines & buildings & items
    state.store.forEach(e => {
      if (e.dead || !inView(e.x, e.y, e.radius + 40)) return;
      if (e.etype === 'mine') {
        if (fog.isExplored(e.x, e.y)) drawMine(ctx, e, ui.selection.has(e.id));
      } else if (e.etype === 'building') {
        if (e.owner === 0 || fog.isExplored(e.x, e.y)) {
          drawBuilding(ctx, state, e, ui.selection.has(e.id), 0);
        }
      } else if (e.etype === 'item') {
        if (fog.isVisible(e.x, e.y)) drawItem(ctx, e, state.time);
      }
    });

    // ground units then flying
    const drawPass = (flying: boolean) => {
      state.store.forEach(e => {
        if (e.dead || e.etype !== 'unit' || e.hidden || e.flying !== flying) return;
        const rx = e.prevX + (e.x - e.prevX) * alpha;
        const ry = e.prevY + (e.y - e.prevY) * alpha;
        if (!inView(rx, ry, e.radius + 20)) return;
        if (e.owner !== 0) {
          if (!fog.isVisible(rx, ry)) return;
          if (e.invisible) return;
        }
        drawUnit(ctx, state, e, rx, ry, ui.selection.has(e.id), 0);
      });
    };
    drawPass(false);
    renderProjectiles(ctx, state);
    drawPass(true);
    renderEffects(ctx, state);

    // night tint
    const nb = state.nightBlend();
    if (nb > 0) {
      ctx.fillStyle = `rgba(12, 16, 48, ${0.32 * nb})`;
      ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    }

    // fog of war (smooth-scaled overlay)
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fog.canvas, 0, 0, fog.size, fog.size, 0, 0, fog.size * TILE, fog.size * TILE);
    ctx.imageSmoothingEnabled = false;

    // building placement ghost
    if (ui.placing) {
      const def = getBldDef(ui.placing.bldId);
      const x = ui.placing.tx * TILE;
      const y = ui.placing.ty * TILE;
      const size = def.size * TILE;
      ctx.fillStyle = ui.placing.valid ? 'rgba(80, 220, 120, 0.4)' : 'rgba(230, 70, 70, 0.4)';
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = ui.placing.valid ? '#50dc78' : '#e64646';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
    }

    ctx.restore();

    // drag box (screen space)
    if (ui.dragBox) {
      const d = ui.dragBox;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
      ctx.setLineDash([]);
    }
  }
}
