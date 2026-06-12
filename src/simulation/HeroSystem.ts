// Hero XP, leveling, ability execution, items, auras, buffs, channels.
import type { Entity, AbilityDef, HeroState } from '@/game/types';
import type { GameState } from './GameState';
import { getHeroDef } from '@/data/races';
import { ITEMS } from '@/data/items';
import { HERO_XP_THRESHOLDS, HERO_MAX_LEVEL, TILE } from '@/utils/Constants';
import { dist } from '@/utils/Vector2';
import { refreshHeroStats, spawnUnit, killEntity } from './UnitManager';
import { dealDamage, addBuff, isStunned, isSilenced, isEnemy, canTarget } from './CombatSystem';
import { requestPath, clearOrder } from './OrderSystem';

export function xpToNext(level: number): number {
  if (level >= HERO_MAX_LEVEL) return Infinity;
  return HERO_XP_THRESHOLDS[level] - HERO_XP_THRESHOLDS[level - 1];
}

export function grantXPToHero(state: GameState, e: Entity, xp: number) {
  const h = e.hero;
  if (!h || h.level >= HERO_MAX_LEVEL) return;
  h.xp += xp;
  while (h.level < HERO_MAX_LEVEL && h.xp >= HERO_XP_THRESHOLDS[h.level]) {
    h.level++;
    h.skillPoints++;
    refreshHeroStats(e);
    e.hp = Math.min(e.maxHp, e.hp + 80);
    state.addEffect({ kind: 'levelup', x: e.x, y: e.y, color: '#ffe066', dur: 1.2 });
    state.bus.emit({ type: 'levelup' });
    const p = state.players[e.owner];
    if (p) p.stats.highestHeroLevel = Math.max(p.stats.highestHeroLevel, h.level);
    if (e.owner === 0) state.bus.emit({ type: 'toast', msg: `${getHeroDef(h.defId).name} reaches level ${h.level}!` });
  }
}

export function canLearn(h: HeroState, idx: number): boolean {
  if (h.skillPoints <= 0) return false;
  const def = getHeroDef(h.defId);
  const ab = def.abilities[idx];
  const cur = h.abilityLevels[idx];
  if (cur >= ab.maxLevel) return false;
  if (ab.ultimate) return h.level >= 6;
  // normal abilities: level 1 at hero 1, level 2 at hero 3, level 3 at hero 5
  return h.level >= cur * 2 + 1;
}

export function learnAbility(state: GameState, e: Entity, idx: number): boolean {
  const h = e.hero;
  if (!h || !canLearn(h, idx)) return false;
  h.abilityLevels[idx]++;
  h.skillPoints--;
  return true;
}

// ---------------------------------------------------------------- casting

export interface CastTarget { x: number; y: number; entity?: Entity }

export function canCast(state: GameState, e: Entity, idx: number): { ok: boolean; err?: string } {
  const h = e.hero;
  if (!h) return { ok: false };
  const def = getHeroDef(h.defId);
  const ab = def.abilities[idx];
  const lvl = h.abilityLevels[idx];
  if (lvl <= 0) return { ok: false, err: 'Not learned' };
  if (ab.target === 'passive') return { ok: false };
  if (state.time < h.cooldownReady[idx]) return { ok: false, err: 'Not ready' };
  const cost = ab.manaCost[Math.min(lvl - 1, ab.manaCost.length - 1)];
  if (e.mana < cost) return { ok: false, err: 'Not enough mana' };
  if (isStunned(e, state.time) || isSilenced(e, state.time)) return { ok: false, err: 'Cannot cast now' };
  return { ok: true };
}

export function orderCast(state: GameState, e: Entity, idx: number, x: number, y: number, targetId?: number) {
  if (!canCast(state, e, idx).ok) return;
  e.task = undefined;
  if (e.hero?.channel) e.hero.channel = undefined;
  if (targetId !== undefined) e.order = { type: 'castUnit', abilityIdx: idx, targetId };
  else e.order = { type: 'castPoint', abilityIdx: idx, x, y };
  e.targetId = 0;
  e.path = null;
}

// movement toward cast target + execution when in range; called each tick for hero entities
export function heroCastTick(state: GameState, e: Entity, dt: number) {
  const h = e.hero;
  if (!h) return;
  const now = state.time;

  // channel pulses
  if (h.channel) {
    const ch = h.channel;
    if (now >= ch.until || isStunned(e, now)) {
      h.channel = undefined;
    } else if (now - ch.lastPulse >= 1) {
      ch.lastPulse = now;
      channelPulse(state, e, ch.abilityIdx);
    }
    return;
  }

  const o = e.order;
  if (o.type !== 'castPoint' && o.type !== 'castUnit') return;
  const def = getHeroDef(h.defId);
  const ab = def.abilities[o.abilityIdx];
  const lvl = h.abilityLevels[o.abilityIdx];
  if (lvl <= 0) { clearOrder(e); return; }

  let tx: number, ty: number;
  let targetEnt: Entity | undefined;
  if (o.type === 'castUnit') {
    targetEnt = state.store.get(o.targetId);
    if (!targetEnt || targetEnt.dead) { clearOrder(e); return; }
    tx = targetEnt.x; ty = targetEnt.y;
  } else {
    tx = o.x; ty = o.y;
  }
  const range = ab.castRange >= 9999 ? Infinity : ab.castRange;
  const d = dist(e.x, e.y, tx, ty);
  if (d > range && range !== Infinity) {
    // walk into range
    if (!e.path || e.pathIdx >= e.path.length) {
      if (e.repath <= now) { e.repath = now + 0.5; requestPath(state, e, tx, ty); }
    }
    // movement handled here directly (cast orders not covered by orderTick)
    moveAlongPath(state, e, dt);
    return;
  }
  // cast!
  const check = canCast(state, e, o.abilityIdx);
  if (!check.ok) { clearOrder(e); return; }
  const cost = ab.manaCost[Math.min(lvl - 1, ab.manaCost.length - 1)];
  const cd = ab.cooldown[Math.min(lvl - 1, ab.cooldown.length - 1)];
  e.mana -= cost;
  h.cooldownReady[o.abilityIdx] = now + cd;
  executeAbility(state, e, o.abilityIdx, { x: tx, y: ty, entity: targetEnt });
  state.bus.emit({ type: 'cast' });
  if (e.order === o) clearOrder(e); // executeAbility may set channel; order cleared regardless
}

function moveAlongPath(state: GameState, e: Entity, dt: number) {
  if (!e.path || e.pathIdx >= e.path.length) return;
  const wp = e.path[e.pathIdx];
  const d = dist(e.x, e.y, wp.x, wp.y);
  if (d < 6) { e.pathIdx++; return; }
  const step = Math.min(e.moveSpeed * dt, d);
  e.x += ((wp.x - e.x) / d) * step;
  e.y += ((wp.y - e.y) / d) * step;
}

function lv<T>(arr: T[] | undefined, lvl: number, fallback: T): T {
  if (!arr || arr.length === 0) return fallback;
  return arr[Math.min(lvl - 1, arr.length - 1)];
}

export function executeAbility(state: GameState, e: Entity, idx: number, target: CastTarget) {
  const h = e.hero!;
  const def = getHeroDef(h.defId);
  const ab = def.abilities[idx];
  const lvl = h.abilityLevels[idx];
  const fx = ab.effect;
  const now = state.time;
  const color = '#b388ff';

  switch (fx.kind) {
    case 'nuke': {
      const t = target.entity;
      if (!t) break;
      state.addEffect({ kind: 'beam', x: e.x, y: e.y, x2: t.x, y2: t.y, color: '#ffd24d', dur: 0.4 });
      dealDamage(state, e, t, lv(fx.dmg, lvl, 0), 'heroic');
      if (fx.dotDps && !t.dead) {
        addBuff(t, { id: `dot_${ab.id}`, until: now + (fx.dotDur ?? 5), dps: lv(fx.dotDps, lvl, 0), source: e.id });
      }
      if (fx.slowPct && !t.dead) {
        addBuff(t, { id: `slow_${ab.id}`, until: now + (fx.slowDur ?? 4), msPct: -fx.slowPct });
      }
      break;
    }
    case 'nukeOrHeal': {
      const t = target.entity;
      if (!t) break;
      const amt = lv(fx.dmg, lvl, 0);
      if (isEnemy(e, t)) {
        dealDamage(state, e, t, amt, 'heroic');
        state.addEffect({ kind: 'beam', x: e.x, y: e.y, x2: t.x, y2: t.y, color: '#9b59d0', dur: 0.4 });
      } else {
        t.hp = Math.min(t.maxHp, t.hp + amt);
        state.addEffect({ kind: 'heal', x: t.x, y: t.y, color: '#7dff9a', dur: 0.8 });
      }
      break;
    }
    case 'aoePoint': {
      const r = fx.radius ?? 120;
      state.addEffect({ kind: 'ring', x: target.x, y: target.y, color: '#ff9d4d', r0: 10, r1: r, dur: 0.5 });
      const foes = state.store.query(target.x, target.y, r, q => isEnemy(e, q) && canTarget(e, q, now));
      for (const t of foes) {
        dealDamage(state, e, t, lv(fx.dmg, lvl, 0), 'heroic');
        if (t.dead) continue;
        if (fx.dotDps) addBuff(t, { id: `dot_${ab.id}`, until: now + (fx.dotDur ?? 3), dps: lv(fx.dotDps, lvl, 0), source: e.id });
        if (fx.slowPct) addBuff(t, { id: `slow_${ab.id}`, until: now + (fx.slowDur ?? 4), msPct: -fx.slowPct });
        if (fx.stunDur) addBuff(t, { id: `stun_${ab.id}`, until: now + fx.stunDur, stun: true });
      }
      break;
    }
    case 'line': {
      const len = fx.length ?? 280;
      const wHalf = (fx.width ?? 44) / 2 + 12;
      const dir = Math.atan2(target.y - e.y, target.x - e.x);
      const ex = e.x + Math.cos(dir) * len;
      const ey = e.y + Math.sin(dir) * len;
      state.addEffect({ kind: 'beam', x: e.x, y: e.y, x2: ex, y2: ey, color: '#ff5d5d', dur: 0.5 });
      const candidates = state.store.query((e.x + ex) / 2, (e.y + ey) / 2, len / 2 + 60,
        q => isEnemy(e, q) && canTarget(e, q, now));
      for (const t of candidates) {
        // distance from point to segment
        const dd = pointSegDist(t.x, t.y, e.x, e.y, ex, ey);
        if (dd <= wHalf + t.radius) {
          dealDamage(state, e, t, lv(fx.dmg, lvl, 0), 'heroic');
          if (!t.dead && fx.armorReduce) {
            addBuff(t, { id: `sunder_${ab.id}`, until: now + 8, armor: -fx.armorReduce });
          }
        }
      }
      break;
    }
    case 'healTarget': {
      const t = target.entity;
      if (!t || isEnemy(e, t)) break;
      t.hp = Math.min(t.maxHp, t.hp + lv(fx.heal, lvl, 0));
      state.addEffect({ kind: 'heal', x: t.x, y: t.y, color: '#7dff9a', dur: 0.8 });
      break;
    }
    case 'buffTarget': {
      const t = target.entity;
      if (!t || isEnemy(e, t)) break;
      addBuff(t, {
        id: `buff_${ab.id}`, until: now + lv(fx.dur, lvl, 30),
        armor: fx.armorBuff ? lv(fx.armorBuff, lvl, 0) : undefined,
        dmgReductionPct: fx.dmgReductionPct ? lv(fx.dmgReductionPct, lvl, 0) : undefined,
        returnDmg: fx.returnDmg,
      });
      state.addEffect({ kind: 'heal', x: t.x, y: t.y, color: '#9adcff', dur: 0.8 });
      break;
    }
    case 'aoeSelf': {
      const r = fx.radius ?? 140;
      state.addEffect({ kind: 'ring', x: e.x, y: e.y, color: '#ffe066', r0: 12, r1: r, dur: 0.55 });
      const foes = state.store.query(e.x, e.y, r, q => isEnemy(e, q) && canTarget(e, q, now));
      for (const t of foes) {
        dealDamage(state, e, t, lv(fx.dmg, lvl, 0), 'heroic');
        if (t.dead) continue;
        if (fx.slowPct) addBuff(t, { id: `slow_${ab.id}`, until: now + (fx.slowDur ?? 3), msPct: -fx.slowPct });
        if (fx.stunDur) addBuff(t, { id: `stun_${ab.id}`, until: now + fx.stunDur, stun: true });
        if (fx.blindPct) addBuff(t, { id: `blind_${ab.id}`, until: now + (fx.blindDur ?? 5), blindPct: fx.blindPct });
      }
      break;
    }
    case 'summon': {
      const count = lv(fx.summonCount, lvl, 1);
      const unitId = fx.summonUnit!;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2;
        const sx = e.x + Math.cos(ang) * 36;
        const sy = e.y + Math.sin(ang) * 36;
        const s = spawnUnit(state, unitId, e.owner, sx, sy);
        s.summonExpire = now + (fx.summonDur ?? 45);
        state.addEffect({ kind: 'burst', x: sx, y: sy, color, r0: 4, r1: 22, dur: 0.5 });
      }
      break;
    }
    case 'blink': {
      const maxR = lv(fx.range, lvl, 300);
      const d = dist(e.x, e.y, target.x, target.y);
      const t = Math.min(1, maxR / Math.max(1, d));
      let nx = e.x + (target.x - e.x) * t;
      let ny = e.y + (target.y - e.y) * t;
      // land on walkable
      const idx = state.pathfinder.nearestWalkable(state.map.walkable, Math.floor(nx / TILE), Math.floor(ny / TILE), 6);
      if (idx >= 0) {
        nx = (idx % state.map.size) * TILE + TILE / 2;
        ny = Math.floor(idx / state.map.size) * TILE + TILE / 2;
      }
      state.addEffect({ kind: 'burst', x: e.x, y: e.y, color: '#9adcff', r0: 4, r1: 26, dur: 0.4 });
      e.x = nx; e.y = ny; e.prevX = nx; e.prevY = ny;
      state.addEffect({ kind: 'burst', x: nx, y: ny, color: '#9adcff', r0: 4, r1: 26, dur: 0.4 });
      if (fx.bonusMult) h.bonusNextAttackMult = fx.bonusMult;
      break;
    }
    case 'invis': {
      e.invisible = true;
      addBuff(e, { id: 'invis', until: now + lv(fx.dur, lvl, 15), msPct: lv(fx.msPct, lvl, 0) });
      if (fx.bonusMult) h.bonusNextAttackMult = fx.bonusMult;
      break;
    }
    case 'channel': {
      h.channel = { abilityIdx: idx, until: now + (fx.channelDur ?? 8), x: target.x, y: target.y, lastPulse: now };
      channelPulse(state, e, idx); // first pulse immediately
      break;
    }
    case 'chain': {
      let cur: Entity | undefined = target.entity;
      let dmg = lv(fx.dmg, lvl, 0);
      const hit = new Set<number>();
      let from: Entity = e;
      for (let b = 0; b < (fx.bounces ?? 3) && cur; b++) {
        state.addEffect({ kind: 'beam', x: from.x, y: from.y, x2: cur.x, y2: cur.y, color: '#6fd0ff', dur: 0.35 });
        dealDamage(state, e, cur, dmg, 'heroic');
        hit.add(cur.id);
        dmg *= 1 - (fx.falloff ?? 0.15);
        from = cur;
        const next = state.store.query(cur.x, cur.y, 160, q =>
          isEnemy(e, q) && canTarget(e, q, now) && !hit.has(q.id) && q.etype === 'unit');
        cur = next[0];
      }
      break;
    }
    case 'reveal': {
      state.reveals.push({ x: target.x, y: target.y, radius: fx.radius ?? 350, until: now + lv(fx.dur, lvl, 10), owner: e.owner });
      state.addEffect({ kind: 'ring', x: target.x, y: target.y, color: '#ffffff', r0: 20, r1: fx.radius ?? 350, dur: 1.0 });
      if (fx.selfDmgPct) {
        addBuff(e, { id: `selfbuff_${ab.id}`, until: now + lv(fx.dur, lvl, 10), dmgPct: lv(fx.selfDmgPct, lvl, 0) });
      }
      break;
    }
    case 'sleep': {
      const t = target.entity;
      if (!t || !isEnemy(e, t)) break;
      addBuff(t, { id: 'sleep', until: now + lv(fx.dur, lvl, 5), sleep: true });
      break;
    }
    case 'root': {
      const t = target.entity;
      if (!t || !isEnemy(e, t)) break;
      addBuff(t, { id: 'root', until: now + lv(fx.dur, lvl, 3), root: true, dps: lv(fx.dps, lvl, 0), source: e.id });
      state.addEffect({ kind: 'burst', x: t.x, y: t.y, color: '#3fbf6f', r0: 6, r1: 24, dur: 0.6 });
      break;
    }
    case 'sacrifice': {
      const t = target.entity;
      if (!t || t.owner !== e.owner || t.hero || t.etype !== 'unit') break;
      if (fx.healPctOfCur) {
        e.hp = Math.min(e.maxHp, e.hp + t.hp * (fx.healPctOfCur / 100));
      }
      if (fx.manaPctOfMax) {
        e.mana = Math.min(e.maxMana, e.mana + t.maxHp * (fx.manaPctOfMax / 100) * 0.3);
      }
      state.addEffect({ kind: 'burst', x: t.x, y: t.y, color: '#9b59d0', r0: 8, r1: 30, dur: 0.7 });
      killEntity(state, t, null);
      break;
    }
    case 'silence': {
      const t = target.entity;
      if (!t || !isEnemy(e, t)) break;
      addBuff(t, { id: 'weep', until: now + lv(fx.dur, lvl, 3), silence: true, msPct: -(fx.slowPct ?? 50) });
      break;
    }
    case 'massTeleport': {
      // teleport to nearest friendly building to target point
      let best: Entity | null = null;
      let bestD = Infinity;
      state.store.forEach(b => {
        if (b.etype === 'building' && b.owner === e.owner && !b.constructing) {
          const d = dist(b.x, b.y, target.x, target.y);
          if (d < bestD) { bestD = d; best = b; }
        }
      });
      if (!best) break;
      const dest = best as Entity;
      const allies = state.store.query(e.x, e.y, fx.radius ?? 220, q =>
        q.owner === e.owner && q.etype === 'unit' && !q.dead && !q.hidden);
      for (const a of allies) {
        const ang = Math.random() * Math.PI * 2;
        const rr = dest.radius + 20 + Math.random() * 40;
        a.x = dest.x + Math.cos(ang) * rr;
        a.y = dest.y + Math.sin(ang) * rr;
        a.prevX = a.x; a.prevY = a.y;
        a.path = null;
        clearOrder(a);
        state.addEffect({ kind: 'burst', x: a.x, y: a.y, color: '#9adcff', r0: 4, r1: 20, dur: 0.5 });
      }
      break;
    }
    case 'delayedNuke': {
      const t = target.entity;
      if (!t) break;
      addBuff(t, { id: 'gaze_root', until: now + (fx.delay ?? 2), root: true });
      state.delayedHits.push({ targetId: t.id, sourceId: e.id, at: now + (fx.delay ?? 2), dmg: lv(fx.dmg, lvl, 0) });
      state.addEffect({ kind: 'beam', x: e.x, y: e.y, x2: t.x, y2: t.y, color: '#ff3333', dur: fx.delay ?? 2 });
      break;
    }
    case 'comet': {
      const r = fx.radius ?? 150;
      state.addEffect({ kind: 'burst', x: target.x, y: target.y, color: '#ff7733', r0: 20, r1: r, dur: 0.8 });
      const foes = state.store.query(target.x, target.y, r, q => isEnemy(e, q) && canTarget(e, q, now));
      for (const t of foes) {
        dealDamage(state, e, t, lv(fx.dmg, lvl, 0), 'heroic');
        if (!t.dead && fx.stunDur) addBuff(t, { id: 'comet_stun', until: now + fx.stunDur, stun: true });
      }
      if (fx.summonUnit) {
        const s = spawnUnit(state, fx.summonUnit, e.owner, target.x, target.y);
        s.summonExpire = now + (fx.summonDur ?? 60);
      }
      break;
    }
    case 'passive':
    case 'aura':
      break; // handled by passive/aura recompute
  }
}

function pointSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, ax + dx * t, ay + dy * t);
}

function channelPulse(state: GameState, e: Entity, idx: number) {
  const h = e.hero!;
  const def = getHeroDef(h.defId);
  const ab = def.abilities[idx];
  const fx = ab.effect;
  const lvl = Math.max(1, h.abilityLevels[idx]);
  const now = state.time;
  const ch = h.channel;
  const cx = fx.kind === 'channel' && ab.target === 'point' && ch ? ch.x : e.x;
  const cy = fx.kind === 'channel' && ab.target === 'point' && ch ? ch.y : e.y;
  const r = fx.radius ?? 220;
  state.addEffect({ kind: 'ring', x: cx, y: cy, color: '#cfa9ff', r0: r * 0.5, r1: r, dur: 0.9 });

  if (fx.healPctPerSec || fx.atkSpdPct) {
    const allies = state.store.query(cx, cy, r, q => q.owner === e.owner && q.etype === 'unit' && !q.dead);
    for (const a of allies) {
      if (fx.healPctPerSec) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * lv(fx.healPctPerSec, lvl, 0) / 100);
      if (fx.atkSpdPct) addBuff(a, { id: `chant_${ab.id}`, until: now + 1.2, atkSpdPct: lv(fx.atkSpdPct, lvl, 0) });
    }
  }
  if (fx.enemyDps || fx.enemyMaxHpPctPerSec || fx.slowPct) {
    const foes = state.store.query(cx, cy, r, q => isEnemy(e, q) && canTarget(e, q, now));
    for (const t of foes) {
      if (fx.enemyDps) dealDamage(state, e, t, lv(fx.enemyDps, lvl, 0), 'heroic');
      if (!t.dead && fx.enemyMaxHpPctPerSec) dealDamage(state, e, t, t.maxHp * lv(fx.enemyMaxHpPctPerSec, lvl, 0) / 100, 'primordial');
      if (!t.dead && fx.slowPct) addBuff(t, { id: `pool_${ab.id}`, until: now + 1.2, msPct: -fx.slowPct });
    }
  }
}

// ----------------------------------------------------- auras & passives

// recompute hero passive self-buffs and auras every 0.5s
export function auraTick(state: GameState) {
  const now = state.time;
  const until = now + 0.7;
  state.store.forEach(e => {
    if (e.etype !== 'unit' || e.dead) return;
    // built-in unit auras
    if (e.unitDef?.auraId === 'disease') {
      const foes = state.store.query(e.x, e.y, 130, q => isEnemy(e, q) && q.etype === 'unit');
      for (const t of foes) addBuff(t, { id: `disease_${e.id}`, until, dps: 2, source: e.id });
    }
    const h = e.hero;
    if (!h) return;
    const def = getHeroDef(h.defId);
    for (let i = 0; i < def.abilities.length; i++) {
      const ab = def.abilities[i];
      const lvl = h.abilityLevels[i];
      if (lvl <= 0) continue;
      const fx = ab.effect;
      if (fx.kind === 'passive') {
        addBuff(e, {
          id: `passive_${ab.id}`, until,
          armor: fx.armorBuff ? lv(fx.armorBuff, lvl, 0) : undefined,
          hpRegen: fx.hpRegen ? lv(fx.hpRegen, lvl, 0) : undefined,
          evasion: fx.evasionPct ? lv(fx.evasionPct, lvl, 0) : undefined,
          atkSpdPct: fx.atkSpdPct ? lv(fx.atkSpdPct, lvl, 0) : undefined,
          dmgPct: fx.dmgPct ? lv(fx.dmgPct, lvl, 0) : undefined,
        });
      } else if (fx.kind === 'aura') {
        const allies = state.store.query(e.x, e.y, fx.radius ?? 200, q =>
          q.owner === e.owner && q.etype === 'unit' && !q.dead);
        for (const a of allies) {
          addBuff(a, {
            id: `aura_${ab.id}`, until,
            hpRegen: fx.hpRegen ? lv(fx.hpRegen, lvl, 0) : undefined,
            msPct: fx.msPct ? lv(fx.msPct, lvl, 0) : undefined,
            atkSpdPct: fx.atkSpdPct ? lv(fx.atkSpdPct, lvl, 0) : undefined,
            armor: fx.armorAura ? lv(fx.armorAura, lvl, 0) : undefined,
            lifestealPct: fx.lifestealPct ? lv(fx.lifestealPct, lvl, 0) : undefined,
            evasion: fx.evasionPct ? lv(fx.evasionPct, lvl, 0) : undefined,
            source: e.id,
          });
        }
      }
    }
  });
}

// buff DoTs + expiry + invis maintenance; called each tick
export function buffTick(state: GameState, e: Entity, dt: number) {
  const now = state.time;
  if (e.buffs.length) {
    for (const b of e.buffs) {
      if (b.until > now && b.dps) {
        const src = b.source ? state.store.get(b.source) ?? null : null;
        dealDamage(state, src, e, b.dps * dt, 'arcane');
        if (e.dead) return;
      }
    }
    if (state.tick % 30 === 0) {
      e.buffs = e.buffs.filter(b => b.until > now);
    }
  }
  // invisibility expiry (hero Ceo Mara)
  if (e.invisible && e.hero) {
    const inv = e.buffs.find(b => b.id === 'invis');
    if (!inv || inv.until <= now) e.invisible = false;
  }
  // summons expire
  if (e.summonExpire && now >= e.summonExpire) {
    state.addEffect({ kind: 'burst', x: e.x, y: e.y, color: '#888888', r0: 4, r1: 18, dur: 0.5 });
    killEntity(state, e, null);
  }
}

// --------------------------------------------------------------- items

export function pickupItem(state: GameState, heroEnt: Entity, itemEnt: Entity): boolean {
  const h = heroEnt.hero;
  if (!h || !itemEnt.itemId) return false;
  const slot = h.inventory.findIndex(s => s === null);
  if (slot < 0) return false;
  h.inventory[slot] = itemEnt.itemId;
  itemEnt.dead = true;
  applyPermanentItem(heroEnt, itemEnt.itemId, 1);
  if (heroEnt.owner === 0) {
    state.bus.emit({ type: 'toast', msg: `Picked up ${ITEMS[itemEnt.itemId]?.name ?? 'an item'}.` });
  }
  return true;
}

export function applyPermanentItem(heroEnt: Entity, itemId: string, sign: 1 | -1) {
  const h = heroEnt.hero;
  const item = ITEMS[itemId];
  if (!h || !item || item.kind === 'consumable') return;
  const f = item.effect;
  h.itemStr += sign * ((f.str ?? 0) + (f.allStats ?? 0));
  h.itemAgi += sign * ((f.agi ?? 0) + (f.allStats ?? 0));
  h.itemInt += sign * ((f.int ?? 0) + (f.allStats ?? 0));
  h.itemArmor += sign * (f.armor ?? 0);
  h.itemDmg += sign * (f.dmg ?? 0);
  h.itemRegen += sign * (f.hpRegen ?? 0);
  h.itemHp += sign * (f.hp ?? 0);
  refreshHeroStats(heroEnt);
}

export function useItem(state: GameState, heroEnt: Entity, slot: number): boolean {
  const h = heroEnt.hero;
  if (!h) return false;
  const id = h.inventory[slot];
  if (!id) return false;
  const item = ITEMS[id];
  if (!item || item.kind !== 'consumable') return false;
  const f = item.effect;
  const now = state.time;
  if (f.heal) {
    if (heroEnt.hp >= heroEnt.maxHp) return false;
    heroEnt.hp = Math.min(heroEnt.maxHp, heroEnt.hp + f.heal);
    state.addEffect({ kind: 'heal', x: heroEnt.x, y: heroEnt.y, color: '#7dff9a', dur: 0.8 });
  } else if (f.mana) {
    if (heroEnt.mana >= heroEnt.maxMana) return false;
    heroEnt.mana = Math.min(heroEnt.maxMana, heroEnt.mana + f.mana);
    state.addEffect({ kind: 'heal', x: heroEnt.x, y: heroEnt.y, color: '#6fd0ff', dur: 0.8 });
  } else if (f.teleport) {
    let th: Entity | null = null;
    let bestD = Infinity;
    state.store.forEach(b => {
      if (b.etype === 'building' && b.owner === heroEnt.owner && !b.constructing && b.bldDef?.role === 'townhall') {
        const d = dist(b.x, b.y, heroEnt.x, heroEnt.y);
        if (d < bestD) { bestD = d; th = b; }
      }
    });
    if (!th) return false;
    const dest = th as Entity;
    const allies = state.store.query(heroEnt.x, heroEnt.y, 200, q =>
      q.owner === heroEnt.owner && q.etype === 'unit' && !q.dead && !q.hidden);
    for (const a of allies) {
      const ang = Math.random() * Math.PI * 2;
      const rr = dest.radius + 24 + Math.random() * 36;
      a.x = dest.x + Math.cos(ang) * rr;
      a.y = dest.y + Math.sin(ang) * rr;
      a.prevX = a.x; a.prevY = a.y;
      a.path = null;
      clearOrder(a);
    }
    state.addEffect({ kind: 'burst', x: dest.x, y: dest.y, color: '#9adcff', r0: 10, r1: 60, dur: 0.8 });
  } else if (f.reveal) {
    state.reveals.push({ x: heroEnt.x, y: heroEnt.y, radius: 360, until: now + 12, owner: heroEnt.owner });
    // uncloak nearby enemies
    const foes = state.store.query(heroEnt.x, heroEnt.y, 360, q => !!q.invisible && q.owner !== heroEnt.owner);
    for (const t of foes) addBuff(t, { id: 'revealed', until: now + 12, revealed: true });
  } else {
    return false;
  }
  h.inventory[slot] = null;
  return true;
}
