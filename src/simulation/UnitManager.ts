// Entity factories and death handling.
import type { Entity, HeroState } from '@/game/types';
import type { GameState } from './GameState';
import { getUnitDef, getBldDef, getHeroDef } from '@/data/races';
import { ITEMS, rollDrop } from '@/data/items';
import {
  TILE, HERO_HP_BASE, HERO_HP_PER_STR, HERO_REGEN_PER_STR, HERO_MANA_BASE,
  HERO_MANA_PER_INT, HERO_MANA_REGEN_PER_INT, HERO_MANA_REGEN_BASE,
  HERO_ARMOR_PER_AGI, unitKillXP, creepKillXP, heroKillXP, XP_SHARE_RANGE,
} from '@/utils/Constants';

export function spawnUnit(state: GameState, defId: string, owner: number, x: number, y: number): Entity {
  const def = getUnitDef(defId);
  const e = state.store.create({
    etype: 'unit', owner, x, y, prevX: x, prevY: y, radius: def.radius, dead: false,
    hp: def.hp, maxHp: def.hp, hpRegen: def.hpRegen ?? 0.1,
    armor: def.armor, armorType: def.armorType, sight: def.sight,
    damage: def.damage, attackType: def.attackType, attackRange: def.attackRange,
    attackCooldown: def.attackCooldown, cdTimer: 0, targetId: 0,
    moveSpeed: def.moveSpeed, flying: !!def.flying,
    mana: def.mana ?? 0, maxMana: def.mana ?? 0, manaRegen: def.manaRegen ?? 0,
    spellCd: 0,
    order: { type: 'idle' }, path: null, pathIdx: 0, repath: 0, buffs: [],
    unitDef: def,
  });
  return e;
}

export function heroAttrTotals(h: HeroState): { str: number; agi: number; int: number } {
  const def = getHeroDef(h.defId);
  const lv = h.level - 1;
  return {
    str: Math.floor(def.baseStr + def.strGain * lv) + h.itemStr,
    agi: Math.floor(def.baseAgi + def.agiGain * lv) + h.itemAgi,
    int: Math.floor(def.baseInt + def.intGain * lv) + h.itemInt,
  };
}

// Recompute hero entity derived stats from level + items (call after level/item change)
export function refreshHeroStats(e: Entity) {
  const h = e.hero!;
  const def = getHeroDef(h.defId);
  const { str, agi, int } = heroAttrTotals(h);
  const primary = def.primary === 'str' ? str : def.primary === 'agi' ? agi : int;

  const hpFrac = e.maxHp > 0 ? e.hp / e.maxHp : 1;
  const manaFrac = e.maxMana > 0 ? e.mana / e.maxMana : 1;
  e.maxHp = HERO_HP_BASE + str * HERO_HP_PER_STR + h.itemHp;
  e.hp = Math.min(e.maxHp, Math.max(1, e.maxHp * hpFrac));
  e.hpRegen = str * HERO_REGEN_PER_STR + h.itemRegen;
  e.maxMana = HERO_MANA_BASE + int * HERO_MANA_PER_INT;
  e.mana = e.maxMana * manaFrac;
  e.manaRegen = HERO_MANA_REGEN_BASE + int * HERO_MANA_REGEN_PER_INT;
  e.armor = def.baseArmor + agi * HERO_ARMOR_PER_AGI + h.itemArmor;
  e.damage = def.baseDamage + primary + h.itemDmg;
}

export function spawnHero(state: GameState, heroDefId: string, owner: number, x: number, y: number, existing?: HeroState): Entity {
  const def = getHeroDef(heroDefId);
  const h: HeroState = existing ?? {
    defId: heroDefId, level: 1, xp: 0, skillPoints: 1,
    abilityLevels: [0, 0, 0, 0], cooldownReady: [0, 0, 0, 0],
    itemStr: 0, itemAgi: 0, itemInt: 0, itemArmor: 0, itemDmg: 0, itemRegen: 0, itemHp: 0,
    inventory: [null, null, null, null, null, null],
  };
  const e = state.store.create({
    etype: 'unit', owner, x, y, prevX: x, prevY: y, radius: 13, dead: false,
    hp: 1, maxHp: 1, hpRegen: 0,
    armor: 0, armorType: 'heroic', sight: 380,
    damage: 10, attackType: 'heroic', attackRange: def.attackRange,
    attackCooldown: def.attackCooldown, cdTimer: 0, targetId: 0,
    moveSpeed: def.moveSpeed, flying: false,
    mana: 0, maxMana: 0, manaRegen: 0, spellCd: 0,
    order: { type: 'idle' }, path: null, pathIdx: 0, repath: 0, buffs: [],
    hero: h,
  });
  refreshHeroStats(e);
  if (existing) { // revived at half
    e.hp = e.maxHp * 0.5;
    e.mana = e.maxMana * 0.5;
  } else {
    e.hp = e.maxHp;
    e.mana = e.maxMana;
  }
  return e;
}

export function spawnBuilding(state: GameState, defId: string, owner: number, tx: number, ty: number, instant = false): Entity {
  const def = getBldDef(defId);
  const px = (tx + def.size / 2) * TILE;
  const py = (ty + def.size / 2) * TILE;
  const e = state.store.create({
    etype: 'building', owner, x: px, y: py, prevX: px, prevY: py,
    radius: def.size * TILE * 0.5, dead: false,
    hp: instant ? def.hp : Math.max(1, def.hp * 0.1), maxHp: def.hp, hpRegen: 0,
    armor: def.armor, armorType: 'fortified', sight: def.sight,
    damage: def.attack?.damage ?? 0, attackType: def.attack?.attackType ?? 'barbed',
    attackRange: def.attack?.range ?? 0, attackCooldown: def.attack?.cooldown ?? 1,
    cdTimer: 0, targetId: 0, moveSpeed: 0, flying: false,
    mana: 0, maxMana: 0, manaRegen: 0, spellCd: 0,
    order: { type: 'idle' }, path: null, pathIdx: 0, repath: 0, buffs: [],
    bldDef: def, constructing: !instant, buildProgress: instant ? 1 : 0,
    trainQueue: [],
  });
  state.map.stampOccupy(tx, ty, def.size, e.id);
  (e as Entity & { tx: number; ty: number }).homeX = tx; // store NW tile in homeX/homeY
  e.homeX = tx; e.homeY = ty;
  if (instant && def.race === 'sluagh') state.map.addBlight(px, py);
  if (instant && def.foodProvided) recomputeFood(state, owner);
  return e;
}

export function spawnMine(state: GameState, tx: number, ty: number, gold: number): Entity {
  const size = 3;
  const px = (tx + size / 2) * TILE;
  const py = (ty + size / 2) * TILE;
  const e = state.store.create({
    etype: 'mine', owner: 9, x: px, y: py, prevX: px, prevY: py,
    radius: size * TILE * 0.5, dead: false,
    hp: 1, maxHp: 1, hpRegen: 0, armor: 0, armorType: 'fortified', sight: 0,
    damage: 0, attackType: 'blunt', attackRange: 0, attackCooldown: 1,
    cdTimer: 0, targetId: 0, moveSpeed: 0, flying: false,
    mana: 0, maxMana: 0, manaRegen: 0, spellCd: 0,
    order: { type: 'idle' }, path: null, pathIdx: 0, repath: 0, buffs: [],
    goldLeft: gold, minersInside: 0,
  });
  e.homeX = tx; e.homeY = ty;
  state.map.stampOccupy(tx, ty, size, e.id);
  return e;
}

export function spawnItem(state: GameState, itemId: string, x: number, y: number): Entity {
  return state.store.create({
    etype: 'item', owner: 9, x, y, prevX: x, prevY: y, radius: 7, dead: false,
    hp: 1, maxHp: 1, hpRegen: 0, armor: 0, armorType: 'unshielded', sight: 0,
    damage: 0, attackType: 'blunt', attackRange: 0, attackCooldown: 1,
    cdTimer: 0, targetId: 0, moveSpeed: 0, flying: false,
    mana: 0, maxMana: 0, manaRegen: 0, spellCd: 0,
    order: { type: 'idle' }, path: null, pathIdx: 0, repath: 0, buffs: [],
    itemId,
  });
}

export function recomputeFood(state: GameState, owner: number) {
  const p = state.players[owner];
  if (!p) return;
  let used = 0;
  let cap = 0;
  state.store.forEach(e => {
    if (e.owner !== owner || e.dead) return;
    if (e.etype === 'unit') {
      if (e.hero) used += 5;
      else if (e.unitDef && e.unitDef.role !== 'summon') used += e.unitDef.food;
    } else if (e.etype === 'building' && !e.constructing) {
      if (e.bldDef?.foodProvided) cap += e.bldDef.foodProvided;
      for (const q of e.trainQueue ?? []) {
        if (q.kind === 'unit') used += getUnitDef(q.id).food;
        else if (q.kind === 'hero' || q.kind === 'revive') used += 5;
      }
    }
  });
  p.foodUsed = used;
  p.foodCap = Math.min(100, cap);
}

// ------------------------------------------------------------------- deaths

export function killEntity(state: GameState, target: Entity, killer: Entity | null) {
  if (target.dead) return;
  target.dead = true;

  // stats + bounty + xp
  const killerPlayer = killer && killer.owner >= 0 && killer.owner <= 1 ? state.players[killer.owner] : null;
  const victimPlayer = target.owner >= 0 && target.owner <= 1 ? state.players[target.owner] : null;

  if (target.etype === 'unit') {
    if (victimPlayer) victimPlayer.stats.unitsLost++;
    if (killerPlayer && victimPlayer && killerPlayer !== victimPlayer) killerPlayer.stats.unitsSlain++;

    // bounty for creeps
    const def = target.unitDef;
    if (def?.bounty && killerPlayer) {
      killerPlayer.gold += def.bounty;
      state.addEffect({ kind: 'text', x: target.x, y: target.y - 18, color: '#ffd700', dur: 1.2, text: `+${def.bounty}` });
    }
    // XP to nearby heroes of killer's team
    if (killer && killer.owner >= 0 && killer.owner <= 1) {
      let xp = 0;
      if (target.hero) xp = heroKillXP(target.hero.level);
      else if (def?.role === 'creep') xp = creepKillXP(def.level ?? 1);
      else if (def && def.role !== 'summon') xp = unitKillXP(def.food);
      else if (def?.role === 'summon') xp = 12;
      if (xp > 0) {
        const heroes = state.store.query(target.x, target.y, XP_SHARE_RANGE,
          q => !!q.hero && q.owner === killer.owner && !q.dead);
        if (heroes.length) {
          const each = Math.floor(xp / heroes.length);
          for (const hEnt of heroes) state.grantXP(hEnt, each);
        }
      }
    }
    // creep drops
    if (def?.role === 'creep' && target.campId !== undefined) {
      const camp = state.camps[target.campId];
      if (camp) {
        camp.aliveIds = camp.aliveIds.filter(id => id !== target.id);
        if (camp.bossId === target.id && camp.dropTier > 0) {
          const drop = rollDrop(camp.dropTier, Math.random);
          if (drop && ITEMS[drop]) spawnItem(state, drop, target.x, target.y);
        }
        if (camp.aliveIds.length === 0) camp.respawnAt = state.time + 180;
      }
    }
    // hero death -> fallen list for revival
    if (target.hero && victimPlayer) {
      victimPlayer.fallenHeroes.push({ state: target.hero, diedAt: state.time });
      state.bus.emit({ type: 'toast', msg: `${target.hero ? heroName(target.hero.defId) : 'Hero'} has fallen!` });
    }
    state.bus.emit({ type: 'death' });
    if (victimPlayer) recomputeFood(state, target.owner);
  }

  if (target.etype === 'building') {
    const def = target.bldDef!;
    state.map.unstamp(target.homeX ?? 0, target.homeY ?? 0, def.size);
    if (victimPlayer) {
      recomputeFood(state, target.owner);
      // refund queue (units in production are lost; gold not refunded for simplicity)
    }
    state.addEffect({ kind: 'burst', x: target.x, y: target.y, color: '#ff8844', r0: 10, r1: def.size * TILE * 0.7, dur: 0.6 });
    state.bus.emit({ type: 'death' });
  }

  if (target.etype === 'mine') {
    state.map.unstamp(target.homeX ?? 0, target.homeY ?? 0, 3);
  }
}

function heroName(defId: string): string {
  try { return getHeroDef(defId).name; } catch { return 'Hero'; }
}
