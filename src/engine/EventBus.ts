// Minimal typed pub/sub used to decouple sim events from audio/UI.

export type GameEvent =
  | { type: 'select' }
  | { type: 'attack' }
  | { type: 'build' }
  | { type: 'error'; msg?: string }
  | { type: 'cast' }
  | { type: 'death' }
  | { type: 'levelup' }
  | { type: 'victory' }
  | { type: 'defeat' }
  | { type: 'underAttack'; x: number; y: number }
  | { type: 'toast'; msg: string };

type Handler = (e: GameEvent) => void;

export class EventBus {
  private handlers: Handler[] = [];
  on(h: Handler): () => void {
    this.handlers.push(h);
    return () => {
      const i = this.handlers.indexOf(h);
      if (i >= 0) this.handlers.splice(i, 1);
    };
  }
  emit(e: GameEvent) {
    for (const h of this.handlers) h(e);
  }
  clear() { this.handlers = []; }
}
