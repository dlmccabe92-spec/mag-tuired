// Fixed-timestep simulation (60 UPS) with variable-rate interpolated rendering.

export type LoopPhase = 'MENU' | 'LOADING' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export class GameLoop {
  private raf = 0;
  private last = 0;
  private acc = 0;
  private readonly step: number;
  running = false;
  paused = false;
  speed = 1;

  constructor(
    private update: (dt: number) => void,
    private render: (alpha: number) => void,
    ups = 60,
  ) {
    this.step = 1 / ups;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    const frame = (now: number) => {
      if (!this.running) return;
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.25) dt = 0.25; // tab was hidden; avoid spiral of death
      if (!this.paused) {
        this.acc += dt * this.speed;
        let steps = 0;
        while (this.acc >= this.step && steps < 8) {
          this.update(this.step);
          this.acc -= this.step;
          steps++;
        }
        if (steps >= 8) this.acc = 0;
      }
      this.render(this.paused ? 1 : this.acc / this.step);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
