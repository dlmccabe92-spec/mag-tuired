// Mouse + keyboard capture for the game canvas.
import type { Camera } from '@/engine/Camera';

export interface InputCallbacks {
  onLeftClick(wx: number, wy: number): void;
  onBoxSelect(wx0: number, wy0: number, wx1: number, wy1: number): void;
  onRightClick(wx: number, wy: number): void;
  onHotkey(key: string, ctrl: boolean, shift: boolean): void;
  onEsc(): void;
  onMouseMove(wx: number, wy: number): void;
}

const DRAG_THRESHOLD = 6;
const EDGE = 24;
const PAN_SPEED = 900; // px/sec at zoom 1

export class InputManager {
  mouseX = 0;
  mouseY = 0;
  mouseInside = false;
  dragStart: { x: number; y: number } | null = null;
  dragging = false;
  private keys = new Set<string>();
  private disposers: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private cb: InputCallbacks,
  ) {
    this.attach();
  }

  get dragBox(): { x0: number; y0: number; x1: number; y1: number } | null {
    if (!this.dragging || !this.dragStart) return null;
    return { x0: this.dragStart.x, y0: this.dragStart.y, x1: this.mouseX, y1: this.mouseY };
  }

  // camera pan from held keys + edge scroll; call each frame
  panVector(dt: number): { dx: number; dy: number } {
    let dx = 0, dy = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('KeyS') && !this.keys.has('ShiftLeft')) { /* S reserved for stop; use arrows */ }
    if (this.keys.has('ArrowDown')) dy += 1;
    if (this.keys.has('KeyA') && false) dx -= 1; // A reserved for attack
    if (this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('KeyD') && false) dx += 1; // D unused
    if (this.keys.has('ArrowRight')) dx += 1;
    // edge scroll
    if (this.mouseInside && !this.dragging) {
      const r = this.canvas.getBoundingClientRect();
      const mx = this.mouseX, my = this.mouseY;
      if (mx < EDGE) dx -= 1;
      if (mx > r.width - EDGE) dx += 1;
      if (my < EDGE) dy -= 1;
      if (my > r.height - EDGE) dy += 1;
    }
    const k = PAN_SPEED * dt;
    return { dx: dx * k, dy: dy * k };
  }

  private toLocal(ev: MouseEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  private attach() {
    const c = this.canvas;

    const down = (ev: MouseEvent) => {
      const p = this.toLocal(ev);
      if (ev.button === 0) {
        this.dragStart = p;
        this.dragging = false;
      }
    };
    const move = (ev: MouseEvent) => {
      const p = this.toLocal(ev);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.mouseInside = true;
      if (this.dragStart && !this.dragging) {
        if (Math.abs(p.x - this.dragStart.x) + Math.abs(p.y - this.dragStart.y) > DRAG_THRESHOLD) {
          this.dragging = true;
        }
      }
      const w = this.camera.screenToWorld(p.x, p.y);
      this.cb.onMouseMove(w.x, w.y);
    };
    const up = (ev: MouseEvent) => {
      if (ev.button !== 0) return;
      const p = this.toLocal(ev);
      if (this.dragging && this.dragStart) {
        const a = this.camera.screenToWorld(this.dragStart.x, this.dragStart.y);
        const b = this.camera.screenToWorld(p.x, p.y);
        this.cb.onBoxSelect(a.x, a.y, b.x, b.y);
      } else if (this.dragStart) {
        const w = this.camera.screenToWorld(p.x, p.y);
        this.cb.onLeftClick(w.x, w.y);
      }
      this.dragStart = null;
      this.dragging = false;
    };
    const ctxMenu = (ev: MouseEvent) => {
      ev.preventDefault();
      const p = this.toLocal(ev);
      const w = this.camera.screenToWorld(p.x, p.y);
      this.cb.onRightClick(w.x, w.y);
    };
    const wheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const p = this.toLocal(ev);
      this.camera.zoomAt(ev.deltaY > 0 ? 1 : -1, p.x, p.y);
    };
    const leave = () => { this.mouseInside = false; };

    const keydown = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      this.keys.add(ev.code);
      if (ev.code === 'Escape') {
        ev.preventDefault();
        this.cb.onEsc();
        return;
      }
      // prevent browser shortcuts for game keys
      if (['Tab', 'Space'].includes(ev.code) || (ev.ctrlKey && /^Digit\d$/.test(ev.code))) {
        ev.preventDefault();
      }
      let key = ev.key.length === 1 ? ev.key.toUpperCase() : ev.key;
      if (/^Digit(\d)$/.test(ev.code)) key = ev.code.slice(5);
      this.cb.onHotkey(key, ev.ctrlKey || ev.metaKey, ev.shiftKey);
    };
    const keyup = (ev: KeyboardEvent) => { this.keys.delete(ev.code); };
    const blur = () => this.keys.clear();

    c.addEventListener('mousedown', down);
    c.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    c.addEventListener('contextmenu', ctxMenu);
    c.addEventListener('wheel', wheel, { passive: false });
    c.addEventListener('mouseleave', leave);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);

    this.disposers = [
      () => c.removeEventListener('mousedown', down),
      () => c.removeEventListener('mousemove', move),
      () => window.removeEventListener('mouseup', up),
      () => c.removeEventListener('contextmenu', ctxMenu),
      () => c.removeEventListener('wheel', wheel),
      () => c.removeEventListener('mouseleave', leave),
      () => window.removeEventListener('keydown', keydown),
      () => window.removeEventListener('keyup', keyup),
      () => window.removeEventListener('blur', blur),
    ];
  }

  dispose() {
    for (const d of this.disposers) d();
    this.disposers = [];
  }
}
