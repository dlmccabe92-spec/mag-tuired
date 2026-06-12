// Units, buildings, mines, items: geometric/symbolic shapes per the art spec.
import type { Entity } from '@/game/types';
import type { GameState } from '@/simulation/GameState';
import { RACES } from '@/data/races';
import { ITEMS } from '@/data/items';
import { TILE } from '@/utils/Constants';

function raceColor(e: Entity): { fill: string; dark: string } {
  const race = e.unitDef?.race ?? e.bldDef?.race;
  if (race && race !== 'neutral') {
    const r = RACES[race];
    return { fill: r.color, dark: r.colorDark };
  }
  if (e.owner === 8) return { fill: '#b9a44c', dark: '#6e6128' };
  return { fill: '#9aa0a8', dark: '#565b61' };
}

function ownerColor(owner: number): string {
  return owner === 0 ? '#41a6ff' : owner === 1 ? '#ff4646' : '#d8c75a';
}

export function drawHealthBar(ctx: CanvasRenderingContext2D, e: Entity, rx: number, ry: number, viewerOwner: number) {
  if (e.hp >= e.maxHp && e.etype === 'unit' && !e.hero) return;
  const w = Math.max(20, e.radius * 2 + 4);
  const h = 3.5;
  const x = rx - w / 2;
  const y = ry - e.radius - 10;
  const frac = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 0.5, y - 0.5, w + 1, h + 1);
  ctx.fillStyle = e.owner === viewerOwner ? '#37d24a'
    : e.owner === 8 || e.owner === 9 ? '#e8d04c' : '#ef3b3b';
  ctx.fillRect(x, y, w * frac, h);
  if ((e.hero || (e.maxMana > 0 && e.etype === 'unit')) && e.maxMana > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 0.5, y + h + 0.5, w + 1, 3);
    ctx.fillStyle = '#3f8ef2';
    ctx.fillRect(x, y + h + 1, w * Math.max(0, e.mana / e.maxMana), 2);
  }
}

export function drawUnit(ctx: CanvasRenderingContext2D, state: GameState, e: Entity, rx: number, ry: number, selected: boolean, viewerOwner: number) {
  const { fill, dark } = raceColor(e);
  const r = e.radius;
  const role = e.unitDef?.role;
  const invisToViewer = e.invisible && e.owner === viewerOwner;

  ctx.save();
  if (invisToViewer) ctx.globalAlpha = 0.4;

  // selection circle under unit
  if (selected) {
    ctx.strokeStyle = '#7CFC8E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rx, ry, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // flying shadow
  if (e.flying) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(rx + 6, ry + 10, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // hero glow
  if (e.hero) {
    const grd = ctx.createRadialGradient(rx, ry, r * 0.4, rx, ry, r + 7);
    grd.addColorStop(0, 'rgba(255,230,120,0.0)');
    grd.addColorStop(1, 'rgba(255,230,120,0.55)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(rx, ry, r + 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // body
  ctx.fillStyle = fill;
  ctx.strokeStyle = e.hero ? '#ffe066' : ownerColor(e.owner);
  ctx.lineWidth = e.hero ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.arc(rx, ry, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // role glyphs
  ctx.fillStyle = dark;
  if (role === 'ranged' || (e.hero && e.attackRange > 60)) {
    ctx.beginPath();
    ctx.moveTo(rx, ry - r * 0.85);
    ctx.lineTo(rx + r * 0.45, ry);
    ctx.lineTo(rx - r * 0.45, ry);
    ctx.closePath();
    ctx.fill();
  } else if (role === 'caster') {
    drawStar(ctx, rx, ry, 4, r * 0.55, r * 0.2);
    ctx.fill();
  } else if (role === 'siege') {
    ctx.fillRect(rx - r * 0.45, ry - r * 0.45, r * 0.9, r * 0.9);
  } else if (role === 'worker') {
    ctx.beginPath();
    ctx.arc(rx, ry, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (role === 'elite' || role === 'heavyflyer') {
    drawStar(ctx, rx, ry, 3, r * 0.6, r * 0.25);
    ctx.fill();
  }
  if (e.flying) {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rx - r - 3, ry, r * 0.55, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rx + r + 3, ry, r * 0.55, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
  }
  if (e.hero) {
    ctx.fillStyle = '#fff7d0';
    drawStar(ctx, rx, ry, 5, r * 0.5, r * 0.22);
    ctx.fill();
  }

  // carry indicator
  if (e.carry) {
    ctx.fillStyle = e.carry.type === 'gold' ? '#ffd700' : '#8b5a2b';
    ctx.fillRect(rx + r * 0.4, ry - r - 3, 5, 5);
  }
  // militia indicator
  if ((e.militiaUntil ?? 0) > state.time) {
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rx, ry, r + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  // sleep zzz
  if (e.sleeping || e.buffs.some(b => b.sleep && b.until > state.time)) {
    ctx.fillStyle = '#cfd8ff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('z', rx + r * 0.5, ry - r - 2);
  }
  // channeling indicator
  if (e.hero?.channel) {
    ctx.strokeStyle = '#cfa9ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(rx, ry, r + 6, state.time * 3, state.time * 3 + Math.PI * 1.5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawHealthBar(ctx, e, rx, ry, viewerOwner);
  ctx.restore();
}

export function drawBuilding(ctx: CanvasRenderingContext2D, state: GameState, e: Entity, selected: boolean, viewerOwner: number) {
  const def = e.bldDef!;
  const size = def.size * TILE;
  const x = (e.homeX ?? 0) * TILE;
  const y = (e.homeY ?? 0) * TILE;
  const { fill, dark } = raceColor(e);

  ctx.save();
  if (e.constructing) ctx.globalAlpha = 0.55;

  // base
  ctx.fillStyle = dark;
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
  ctx.strokeStyle = selected ? '#7CFC8E' : ownerColor(e.owner);
  ctx.lineWidth = selected ? 2.5 : 2;
  ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);

  // role glyph
  ctx.fillStyle = dark;
  const cx = x + size / 2, cy = y + size / 2;
  switch (def.role) {
    case 'townhall':
      ctx.fillRect(cx - size * 0.18, cy - size * 0.18, size * 0.36, size * 0.36);
      ctx.fillStyle = fill;
      ctx.fillRect(cx - size * 0.08, cy - size * 0.3, size * 0.16, size * 0.2);
      break;
    case 'barracks':
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.2, cy + size * 0.18);
      ctx.lineTo(cx, cy - size * 0.22);
      ctx.lineTo(cx + size * 0.2, cy + size * 0.18);
      ctx.closePath();
      ctx.fill();
      break;
    case 'farm':
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'altar':
      drawStar(ctx, cx, cy, 5, size * 0.22, size * 0.1);
      ctx.fill();
      break;
    case 'tower':
      ctx.beginPath();
      ctx.arc(cx, cy - size * 0.08, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - size * 0.08, cy, size * 0.16, size * 0.26);
      break;
    case 'forge':
      ctx.fillRect(cx - size * 0.2, cy - size * 0.06, size * 0.4, size * 0.12);
      ctx.fillRect(cx - size * 0.06, cy - size * 0.2, size * 0.12, size * 0.4);
      break;
    case 'casterhall':
      drawStar(ctx, cx, cy, 4, size * 0.22, size * 0.08);
      ctx.fill();
      break;
    case 'siegehall':
      ctx.fillRect(cx - size * 0.18, cy - size * 0.12, size * 0.36, size * 0.24);
      break;
    case 'aerie':
      ctx.beginPath();
      ctx.arc(cx - size * 0.12, cy, size * 0.12, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(cx + size * 0.12, cy, size * 0.12, Math.PI * 1.5, Math.PI * 0.5);
      ctx.fill();
      break;
    case 'shop':
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.floor(size * 0.4)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◆', cx, cy);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      break;
  }

  // construction progress
  if (e.constructing) {
    ctx.globalAlpha = 1;
    const w = size - 8;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x + 4, y + size - 9, w, 5);
    ctx.fillStyle = '#37d24a';
    ctx.fillRect(x + 4, y + size - 9, w * (e.buildProgress ?? 0), 5);
  } else {
    // hp bar when damaged or selected
    if (e.hp < e.maxHp || selected) {
      const w = size - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x + 4, y - 8, w, 4);
      ctx.fillStyle = e.owner === viewerOwner ? '#37d24a' : e.owner === 9 ? '#e8d04c' : '#ef3b3b';
      ctx.fillRect(x + 4, y - 8, w * Math.max(0, e.hp / e.maxHp), 4);
    }
    // production progress
    const q = e.trainQueue;
    if (q && q.length > 0 && e.owner === viewerOwner) {
      const w = size - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x + 4, y + size - 9, w, 5);
      ctx.fillStyle = '#e8c54c';
      ctx.fillRect(x + 4, y + size - 9, w * (q[0].progress / q[0].total), 5);
    }
  }

  // rally point
  if (selected && e.rallyX !== undefined && e.rallyY !== undefined && e.owner === viewerOwner) {
    ctx.strokeStyle = 'rgba(255, 230, 100, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(e.rallyX, e.rallyY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffe064';
    ctx.beginPath();
    ctx.moveTo(e.rallyX, e.rallyY);
    ctx.lineTo(e.rallyX + 8, e.rallyY - 12);
    ctx.lineTo(e.rallyX, e.rallyY - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffe064';
    ctx.beginPath();
    ctx.moveTo(e.rallyX, e.rallyY);
    ctx.lineTo(e.rallyX, e.rallyY - 16);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawMine(ctx: CanvasRenderingContext2D, e: Entity, selected: boolean) {
  const size = 3 * TILE;
  const x = (e.homeX ?? 0) * TILE;
  const y = (e.homeY ?? 0) * TILE;
  ctx.fillStyle = '#5d4a1e';
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
  ctx.fillStyle = '#e8b423';
  ctx.fillRect(x + 8, y + 8, size - 16, size - 16);
  ctx.fillStyle = '#7a611c';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = selected ? '#7CFC8E' : '#3d3110';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
  if ((e.minersInside ?? 0) > 0) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`⛏${e.minersInside}`, x + size / 2, y - 4);
    ctx.textAlign = 'left';
  }
}

export function drawItem(ctx: CanvasRenderingContext2D, e: Entity, t: number) {
  const bob = Math.sin(t * 3 + e.id) * 2;
  const item = e.itemId ? ITEMS[e.itemId] : null;
  const color = item?.kind === 'artifact' ? '#ff9d2e' : item?.kind === 'permanent' ? '#c9a9ff' : '#9adcff';
  ctx.save();
  ctx.translate(e.x, e.y + bob);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-6, -6, 12, 12);
  ctx.restore();
}

export function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, points: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
