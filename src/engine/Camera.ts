import { clamp } from '@/utils/Vector2';
import { TILE } from '@/utils/Constants';

export class Camera {
  x = 0; // world px at viewport center
  y = 0;
  zoom = 1;
  viewW = 1280;
  viewH = 720;
  mapPx: number;

  constructor(mapTiles: number) {
    this.mapPx = mapTiles * TILE;
  }

  resize(w: number, h: number) {
    this.viewW = w;
    this.viewH = h;
    this.clampPos();
  }

  pan(dx: number, dy: number) {
    this.x += dx / this.zoom;
    this.y += dy / this.zoom;
    this.clampPos();
  }

  centerOn(wx: number, wy: number) {
    this.x = wx; this.y = wy;
    this.clampPos();
  }

  zoomAt(delta: number, sx: number, sy: number) {
    const before = this.screenToWorld(sx, sy);
    this.zoom = clamp(this.zoom * (delta > 0 ? 0.9 : 1.1111), 0.5, 2.0);
    const after = this.screenToWorld(sx, sy);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.clampPos();
  }

  private clampPos() {
    const hw = this.viewW / 2 / this.zoom;
    const hh = this.viewH / 2 / this.zoom;
    const padX = Math.min(hw, this.mapPx / 2);
    const padY = Math.min(hh, this.mapPx / 2);
    this.x = clamp(this.x, padX, this.mapPx - padX);
    this.y = clamp(this.y, padY, this.mapPx - padY);
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: this.x + (sx - this.viewW / 2) / this.zoom,
      y: this.y + (sy - this.viewH / 2) / this.zoom,
    };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: (wx - this.x) * this.zoom + this.viewW / 2,
      y: (wy - this.y) * this.zoom + this.viewH / 2,
    };
  }

  // visible world rect
  bounds(): { x0: number; y0: number; x1: number; y1: number } {
    const hw = this.viewW / 2 / this.zoom;
    const hh = this.viewH / 2 / this.zoom;
    return { x0: this.x - hw, y0: this.y - hh, x1: this.x + hw, y1: this.y + hh };
  }
}
