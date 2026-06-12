// Damage model, target acquisition, attack execution, caster auto-spells.
import type { Entity, AttackType, Buff } from '@/game/types';
import type { GameState } from './GameState';
import { DAMAGE_MATRIX, armorMult, AGGRO_SCAN_RANGE, PILLAGE_GOLD, TILE } from '@/utils/Constants';
import { dist } from '@/utils/Vector2';
import { killEntity, heroAttrTotals } from './UnitManager';

// distance from a's edge to b's edge; buildings/mines measured to their footprint rect
export function edgeGap(a: Entity, b: Entity): number {
  if (b.etype === 'building' || b.etype === 'mine') {
    const size = (b.bldDef?.size ?? 3) * TILE;
    const x0 = (b.homeX ?? 0) * TILE, y0 = (b.homeY ?? 0) * TILE;
    const cx = Math.max(x0, Math.min(a.x, x0 + size));
    const cy = Math.max(y0, Math.min(a.y, y0 + size));
    return dist(a.x, a.y, cx, cy) - a.radius;
  }
  return dist(a.x, a.y, b.x, b.y) - a.radius - b.radius;
}

export function isStunned(e: Entity, now: number): boolean {
  return e.buffs.some(b => (b.stun || b.sleep) && b.until > now);
}
export function isRooted(e: Entity, now: number): boolean {
  return e.buffs.some(b => (b.root || b.stun || b.sleep) && b.until > now);
}
export function isSilenced(e: Entity, now: number): boolean {
  return e.buffs.some(b => b.silence && b.until > now);
}
export function buffSum(e: Entity, now: number, key: 'msPct' | 'atkSpdPct' | 'armor' | 'hpRegen' | 'dmgPct'): number {
  let s = 0;
  for (const b of e.buffs) if (b.until > now && b[key]) s += b[key]!;
  return s;
}
export function effectiveArmor(e: Entity, now: number): number {
  return e.armor + buffSum(e, now, 'armor');
}
export function effectiveSpeed(e: Entity, now: number): number {
  const pct = buffSum(e, now, 'msPct');
  return Math.max(20, e.moveSpeed * (1 + pct / 100));
}
export function canAttackAtAll(e: Entity): boolean {
  if (e.etype === 'building') return !!e.bldDef?.attack && !e.constructing;
  if (e.etype !== 'unit') return false;
  if (e.unitDef?.noAttack) return false;
  return true;
}

export function addBuff(e: Entity, buff: Buff) {
  // replace same-id buff
  const i = e.buffs.findIndex(b => b.id === buff.id);
  if (i >= 0) e.buffs[i] = buff;
  else e.buffs.push(buff);
}

export function wakeUp(e: Entity, now: number) {
  for (const b of e.buffs) if (b.sleep) b.until = now;
}

export function isInvisibleTo(e: Entity, viewerOwner: number, now: number): boolean {
  if (!e.invisible) return false;
  if (e.owner === viewerOwner) return false;
  if (e.buffs.some(b => b.revealed && b.until > now)) return false;
  return true;
}

export function canTarget(attacker: Entity, target: Entity, now: number): boolean {
  if (target.dead || target.hidden) return false;
  if (target.etype === 'mine' || target.etype === 'item') return false;
  if (isInvisibleTo(target, attacker.owner, now)) return false;
  if (target.flying) {
    // melee (short range) cannot strike flyers
    if (attacker.attackRange < 60 && attacker.etype === 'unit') return false;
  }
  return true;
}

export function isEnemy(a: Entity, b: Entity): boolean {
  if (a.owner === b.owner) return false;
  if (b.etype === 'mine' || b.etype === 'item') return false;
  if (a.owner === 9 || b.owner === 9) return false; // passive neutral
  return true;
}

export interface DamageOpts {
  noRetaliate?: boolean;
  isAttack?: boolean; // basic attack (can miss / proc thorns / lifesteal / pillage)
}

export function dealDamage(state: GameState, source: Entity | null, target: Entity, raw: number, atype: AttackType, opts: DamageOpts = {}) {
  if (target.dead || target.hp <= 0) return;
  const now = state.time;

  if (opts.isAttack && source) {
    // attacker blind
    let missChance = 0;
    for (const b of source.buffs) if (b.until > now && b.blindPct) missChance = Math.max(missChance, b.blindPct);
    // target evasion
    for (const b of target.buffs) if (b.until > now && b.evasion) {
      missChance = Math.max(missChance, b.evasion);
    }
    if (missChance > 0 && Math.random() * 100 < missChance) {
      state.addEffect({ kind: 'text', x: target.x, y: target.y - 16, color: '#aaaaaa', dur: 0.8, text: 'miss' });
      return;
    }
  }

  let dmg = raw * (DAMAGE_MATRIX[atype]?.[target.armorType] ?? 1);
  dmg *= armorMult(effectiveArmor(target, now));
  for (const b of target.buffs) {
    if (b.until <= now) continue;
    if (b.dmgReductionPct) dmg *= 1 - b.dmgReductionPct / 100;
    if (b.dmgTakenMult) dmg *= b.dmgTakenMult;
  }
  if (dmg <= 0) return;

  wakeUp(target, now);
  target.hp -= dmg;

  // pillage: fomoire melee striking buildings
  if (opts.isAttack && source && source.owner >= 0 && source.owner <= 1 && target.etype === 'building') {
    const sp = state.players[source.owner];
    if (sp.race === 'fomoire' && source.attackRange < 60 && source.etype === 'unit' && !source.hero) {
      sp.gold += PILLAGE_GOLD;
    }
  }
  // lifesteal aura
  if (opts.isAttack && source && source.attackRange < 60) {
    const ls = source.buffs.reduce((s, b) => b.until > now && b.lifestealPct ? s + b.lifestealPct : s, 0);
    if (ls > 0) source.hp = Math.min(source.maxHp, source.hp + dmg * ls / 100);
    // thorns
    const thorns = target.buffs.reduce((s, b) => b.until > now && b.returnDmg ? s + b.returnDmg : s, 0);
    if (thorns > 0 && !opts.noRetaliate) {
      dealDamage(state, target, source, thorns, 'arcane', { noRetaliate: true });
    }
  }
  // under-attack alert for human
  if (target.owner === 0 && (state.time - state.lastAttackAlert) > 12) {
    state.lastAttackAlert = state.time;
    state.bus.emit({ type: 'underAttack', x: target.x, y: target.y });
  }
  // record for AI defense triggers
  if (target.owner === 0 || target.owner === 1) {
    state.lastDamageAt[target.owner] = state.time;
    state.lastDamagePos[target.owner] = { x: target.x, y: target.y };
  }
  // creeps retaliate vs their attacker
  if (source && target.owner === 8 && !target.dead && target.targetId === 0) {
    target.sleeping = false;
    target.targetId = source.id;
    target.order = { type: 'attack', targetId: source.id };
  }

  if (target.hp <= 0) {
    killEntity(state, target, source);
  }
}

function upgradeBonus(state: GameState, e: Entity): { dmg: number; armor: number } {
  if (e.owner < 0 || e.owner > 1 || !e.unitDef || e.hero) return { dmg: 0, armor: 0 };
  const p = state.players[e.owner];
  const role = e.unitDef.role;
  const isMelee = role === 'melee' || role === 'elite' || role === 'worker';
  const dmg = isMelee ? p.upgrades.meleeAtk : p.upgrades.rangedAtk;
  const armor = e.flying ? p.upgrades.airArmor : p.upgrades.groundArmor;
  return { dmg, armor };
}

export function attackDamageOf(state: GameState, e: Entity): number {
  const now = state.time;
  let dmg = e.damage + upgradeBonus(state, e).dmg;
  // militia bonus
  if (e.militiaUntil && e.militiaUntil > now) dmg = Math.max(dmg, 16);
  // enrage (Athach)
  if (e.unitDef?.enrageAt && e.hp / e.maxHp <= e.unitDef.enrageAt) dmg *= 1.3;
  const pct = buffSum(e, now, 'dmgPct');
  dmg *= 1 + pct / 100;
  // hero bonus first strike (blink/invis)
  if (e.hero?.bonusNextAttackMult) {
    dmg *= e.hero.bonusNextAttackMult;
    e.hero.bonusNextAttackMult = undefined;
  }
  // small variance
  return dmg * (0.93 + Math.random() * 0.14);
}

// main combat tick for one unit/building able to attack
export function combatTick(state: GameState, e: Entity, dt: number) {
  const now = state.time;
  if (e.cdTimer > 0) e.cdTimer -= dt;
  if (!canAttackAtAll(e)) return;
  if (e.hidden || isStunned(e, now)) return;
  if (e.hero?.channel) return;

  const o = e.order;
  // explicit attack order target
  let target = e.targetId ? state.store.get(e.targetId) : undefined;
  if (target && (!isEnemy(e, target) || !canTarget(e, target, now))) {
    target = undefined;
    e.targetId = 0;
    if (o.type === 'attack') e.order = { type: 'idle' };
  }

  // auto-acquire when idle / hold / attackmove / patrol / creep
  if (!target && (o.type === 'idle' || o.type === 'hold' || o.type === 'attackmove' || o.type === 'patrol')) {
    if ((state.tick + e.id) % 15 === 0) { // stagger scans
      const range = o.type === 'hold' ? Math.max(e.attackRange + 10, 60)
        : Math.max(AGGRO_SCAN_RANGE, e.attackRange + 30);
      const enemies = state.store.query(e.x, e.y, range, q => isEnemy(e, q) && canTarget(e, q, now) && q.etype !== 'building');
      let best: Entity | undefined;
      let bestD = Infinity;
      for (const q of enemies) {
        const d = dist(e.x, e.y, q.x, q.y);
        if (d < bestD) { bestD = d; best = q; }
      }
      // attack buildings only on attackmove if no units around
      if (!best && o.type === 'attackmove') {
        const blds = state.store.query(e.x, e.y, range, q => isEnemy(e, q) && q.etype === 'building' && canTarget(e, q, now));
        best = blds[0];
      }
      if (best) e.targetId = best.id;
      target = best;
    }
  }
  if (!target) return;

  const d = edgeGap(e, target);
  const inRange = d <= e.attackRange;
  if (inRange && e.cdTimer <= 0) {
    // face & strike (attacking breaks stealth/invisibility)
    e.lastMoveAt = now;
    if (e.invisible) {
      e.invisible = false;
      if (e.hero) e.buffs = e.buffs.filter(b => b.id !== 'invis');
    }
    const dmg = attackDamageOf(state, e);
    let atkSpdAgi = 0;
    if (e.hero) {
      // hero agility attack speed
      atkSpdAgi = heroAgi(state, e) * 2; // 2% per agi
    }
    const pct = buffSum(e, now, 'atkSpdPct') + atkSpdAgi;
    e.cdTimer = e.attackCooldown / Math.max(0.25, 1 + pct / 100);

    if (e.attackRange >= 60 || e.etype === 'building') {
      state.projectiles.push({
        x: e.x, y: e.y, targetId: target.id, speed: 330,
        dmg, atype: e.attackType, sourceId: e.id, owner: e.owner,
        color: e.owner === 0 ? '#9adcff' : e.owner === 1 ? '#ff9a9a' : '#e8d27a', dead: false,
      });
    } else {
      dealDamage(state, e, target, dmg, e.attackType, { isAttack: true });
      state.sfx('attack');
    }
  }
  // chase handled by OrderSystem (it moves toward targetId when attack-order or acquired)
}

function heroAgi(state: GameState, e: Entity): number {
  if (!e.hero) return 0;
  return heroAttrTotals(e.hero).agi;
}

// caster auto-spells
export function casterTick(state: GameState, e: Entity) {
  const def = e.unitDef;
  const spell = def?.casterSpell;
  if (!spell || e.dead) return;
  const now = state.time;
  if (e.spellCd > now || e.mana < spell.manaCost) return;
  if (isStunned(e, now) || isSilenced(e, now)) return;

  if (spell.kind === 'heal') {
    const allies = state.store.query(e.x, e.y, spell.range, q =>
      q.owner === e.owner && q.etype === 'unit' && !q.dead && q.maxHp - q.hp > 90 && q.id !== e.id);
    if (allies.length) {
      const t = allies.reduce((a, b) => (a.maxHp - a.hp > b.maxHp - b.hp ? a : b));
      t.hp = Math.min(t.maxHp, t.hp + spell.amount);
      e.mana -= spell.manaCost;
      e.spellCd = now + spell.cooldown;
      state.addEffect({ kind: 'heal', x: t.x, y: t.y, color: '#7dff9a', dur: 0.7 });
    }
  } else if (spell.kind === 'nuke') {
    const foes = state.store.query(e.x, e.y, spell.range, q => isEnemy(e, q) && canTarget(e, q, now) && q.etype === 'unit');
    if (foes.length) {
      const t = foes.reduce((a, b) => (a.hp < b.hp ? a : b));
      dealDamage(state, e, t, spell.amount, 'arcane');
      e.mana -= spell.manaCost;
      e.spellCd = now + spell.cooldown;
      state.addEffect({ kind: 'beam', x: e.x, y: e.y, x2: t.x, y2: t.y, color: '#c79aff', dur: 0.35 });
    }
  } else if (spell.kind === 'slow') {
    const foes = state.store.query(e.x, e.y, spell.range, q =>
      isEnemy(e, q) && canTarget(e, q, now) && q.etype === 'unit' &&
      !q.buffs.some(b => b.id === 'casterslow' && b.until > now));
    if (foes.length) {
      const t = foes.reduce((a, b) => (a.maxHp > b.maxHp ? a : b));
      addBuff(t, { id: 'casterslow', until: now + 6, msPct: -spell.amount, atkSpdPct: -spell.amount });
      e.mana -= spell.manaCost;
      e.spellCd = now + spell.cooldown;
      state.addEffect({ kind: 'beam', x: e.x, y: e.y, x2: t.x, y2: t.y, color: '#6fd0ff', dur: 0.35 });
    }
  } else if (spell.kind === 'buffArmor') {
    const allies = state.store.query(e.x, e.y, spell.range, q =>
      q.owner === e.owner && q.etype === 'unit' && !q.dead && q.id !== e.id &&
      !q.buffs.some(b => b.id === 'casterarmor' && b.until > now));
    if (allies.length) {
      const t = allies[0];
      addBuff(t, { id: 'casterarmor', until: now + 30, armor: spell.amount });
      e.mana -= spell.manaCost;
      e.spellCd = now + spell.cooldown;
    }
  }
}

// projectile advance
export function projectileTick(state: GameState, dt: number) {
  for (const p of state.projectiles) {
    if (p.dead) continue;
    const t = state.store.get(p.targetId);
    if (!t || t.dead || t.hidden) { p.dead = true; continue; }
    const dx = t.x - p.x, dy = t.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const step = p.speed * dt;
    if (d <= step + 10) {
      p.dead = true;
      const src = state.store.get(p.sourceId) ?? null;
      dealDamage(state, src, t, p.dmg, p.atype, { isAttack: true });
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }
  if (state.tick % 60 === 0) {
    state.projectiles = state.projectiles.filter(p => !p.dead);
  }
}
