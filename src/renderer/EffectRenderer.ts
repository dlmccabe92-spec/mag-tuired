// Spell effects, projectiles.
import type { GameState } from '@/simulation/GameState';

export function renderProjectiles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const p of state.projectiles) {
    if (p.dead) continue;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderEffects(ctx: CanvasRenderingContext2D, state: GameState) {
  const now = state.time;
  for (const f of state.effects) {
    const t = (now - f.start) / f.dur;
    if (t < 0 || t > 1) continue;
    const fade = 1 - t;
    ctx.save();
    ctx.globalAlpha = fade;
    switch (f.kind) {
      case 'ring': {
        const r = (f.r0 ?? 8) + ((f.r1 ?? 60) - (f.r0 ?? 8)) * t;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'burst': {
        const r = (f.r0 ?? 4) + ((f.r1 ?? 30) - (f.r0 ?? 4)) * t;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'beam': {
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 4 * fade;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x2 ?? f.x, f.y2 ?? f.y);
        ctx.stroke();
        break;
      }
      case 'heal': {
        const y = f.y - t * 20;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(f.x - 6, y);
        ctx.lineTo(f.x + 6, y);
        ctx.moveTo(f.x, y - 6);
        ctx.lineTo(f.x, y + 6);
        ctx.stroke();
        break;
      }
      case 'levelup': {
        const r = 10 + t * 28;
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffe066';
        ctx.font = 'bold 13px serif';
        ctx.textAlign = 'center';
        ctx.fillText('▲', f.x, f.y - r - 4);
        ctx.textAlign = 'left';
        break;
      }
      case 'text': {
        ctx.fillStyle = f.color;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(f.text ?? '', f.x, f.y - t * 24);
        ctx.textAlign = 'left';
        break;
      }
    }
    ctx.restore();
  }
}
