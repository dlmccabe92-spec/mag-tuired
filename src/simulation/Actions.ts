// High-level validated commands, shared by the human UI and the AI.
import type { Entity } from '@/game/types';
import type { GameState } from './GameState';
import { getUnitDef, getBldDef, getHeroDef, RACES } from '@/data/races';
import { ITEMS } from '@/data/items';
import { HERO_COSTS, MILITIA_DURATION, reviveCost, reviveTime, TILE } from '@/utils/Constants';
import { unitRequirementsMet, buildingRequirementsMet, researchCost, canAfford } from './TechTree';
import { playerTier } from './BuildingManager';
import { recomputeFood } from './UnitManager';
import { requestPath } from './OrderSystem';
import { applyPermanentItem } from './HeroSystem';
import { dist } from '@/utils/Vector2';

export interface ActionResult { ok: boolean; err?: string }
const OK: ActionResult = { ok: true };
const fail = (err: string): ActionResult => ({ ok: false, err });

export function trainUnit(state: GameState, b: Entity, unitId: string): ActionResult {
  if (b.etype !== 'building' || b.constructing) return fail('Invalid building');
  const p = state.players[b.owner];
  const def = getUnitDef(unitId);
  if (!b.bldDef?.trains?.includes(unitId)) return fail('Cannot train here');
  if ((b.trainQueue?.length ?? 0) >= 5) return fail('Queue is full');
  const req = unitRequirementsMet(state, b.owner, def);
  if (!req.ok) return fail(req.err ?? 'Requirements not met');
  if (!canAfford(p, def.gold, def.lumber)) return fail('Not enough resources');
  if (p.foodUsed + def.food > p.foodCap) return fail('Not enough food — build more farms');
  p.gold -= def.gold;
  p.lumber -= def.lumber;
  b.trainQueue!.push({ kind: 'unit', id: unitId, progress: 0, total: def.buildTime });
  recomputeFood(state, b.owner);
  return OK;
}

export function recruitHero(state: GameState, altar: Entity, heroId: string): ActionResult {
  if (altar.etype !== 'building' || altar.constructing) return fail('Invalid building');
  const p = state.players[altar.owner];
  if (altar.bldDef?.role !== 'altar') return fail('Not a summoning stone');
  if (p.heroesRecruited.includes(heroId)) return fail('Already summoned');
  if (p.heroesRecruited.length >= 3) return fail('All three heroes summoned');
  // only one hero training at a time
  if (altar.trainQueue?.some(q => q.kind === 'hero' || q.kind === 'revive')) return fail('Altar is busy');
  // second hero needs T2, third needs T3
  const tier = playerTier(state, altar.owner);
  if (p.heroesRecruited.length === 1 && tier < 2) return fail('Requires Tier 2 hall');
  if (p.heroesRecruited.length === 2 && tier < 3) return fail('Requires Tier 3 hall');
  const cost = HERO_COSTS[p.heroesRecruited.length];
  if (!canAfford(p, cost.gold, cost.lumber)) return fail('Not enough resources');
  if (p.foodUsed + 5 > p.foodCap) return fail('Not enough food');
  p.gold -= cost.gold;
  p.lumber -= cost.lumber;
  altar.trainQueue!.push({ kind: 'hero', id: heroId, progress: 0, total: 35 });
  recomputeFood(state, altar.owner);
  return OK;
}

export function reviveHero(state: GameState, altar: Entity, heroId: string): ActionResult {
  if (altar.etype !== 'building' || altar.constructing || altar.bldDef?.role !== 'altar') return fail('Invalid');
  const p = state.players[altar.owner];
  const fallen = p.fallenHeroes.find(f => f.state.defId === heroId);
  if (!fallen) return fail('No fallen hero');
  if (altar.trainQueue?.some(q => q.kind === 'hero' || q.kind === 'revive')) return fail('Altar is busy');
  const cost = reviveCost(fallen.state.level);
  if (p.gold < cost) return fail('Not enough gold');
  if (p.foodUsed + 5 > p.foodCap) return fail('Not enough food');
  p.gold -= cost;
  altar.trainQueue!.push({ kind: 'revive', id: heroId, progress: 0, total: reviveTime(fallen.state.level) });
  recomputeFood(state, altar.owner);
  return OK;
}

export function startBuild(state: GameState, worker: Entity, bldId: string, tx: number, ty: number): ActionResult {
  if (worker.etype !== 'unit' || worker.unitDef?.role !== 'worker') return fail('Not a worker');
  const p = state.players[worker.owner];
  const def = getBldDef(bldId);
  const req = buildingRequirementsMet(state, worker.owner, def);
  if (!req.ok) return fail(req.err ?? 'Requirements not met');
  if (!canAfford(p, def.gold, def.lumber)) return fail('Not enough resources');
  const needBlight = def.race === 'sluagh' && def.role !== 'townhall';
  if (!state.map.canPlace(tx, ty, def.size, needBlight)) {
    return fail(needBlight ? 'Must be built on Éag (blight)' : 'Cannot build there');
  }
  p.gold -= def.gold;
  p.lumber -= def.lumber;
  // pull the worker out of a mine if needed
  if (worker.hidden) {
    if (worker.task?.kind === 'inMine' && worker.task.mineId) {
      const mine = state.store.get(worker.task.mineId);
      if (mine) mine.minersInside = Math.max(0, (mine.minersInside ?? 0) - 1);
    }
    worker.hidden = false;
  }
  worker.targetId = 0;
  worker.order = { type: 'build', bldId, tx, ty };
  worker.task = { kind: 'toBuild', timer: 0 }; // movable task; buildTaskTick handles arrival
  worker.carry = undefined;
  requestPath(state, worker, (tx + def.size / 2) * TILE, (ty + def.size / 2) * TILE);
  return OK;
}

export function upgradeTownHall(state: GameState, th: Entity): ActionResult {
  if (th.etype !== 'building' || th.constructing || th.bldDef?.role !== 'townhall') return fail('Invalid');
  const cur = th.bldDef;
  if (!cur.upgradesTo) return fail('Fully upgraded');
  if (th.trainQueue?.some(q => q.kind === 'tech')) return fail('Already upgrading');
  const p = state.players[th.owner];
  if (!canAfford(p, cur.upgradeGold ?? 0, cur.upgradeLumber ?? 0)) return fail('Not enough resources');
  p.gold -= cur.upgradeGold ?? 0;
  p.lumber -= cur.upgradeLumber ?? 0;
  th.trainQueue!.push({ kind: 'tech', id: cur.upgradesTo, progress: 0, total: cur.upgradeTime ?? 60 });
  return OK;
}

export function research(state: GameState, forge: Entity, upgId: 'meleeAtk' | 'rangedAtk' | 'groundArmor' | 'airArmor'): ActionResult {
  if (forge.etype !== 'building' || forge.constructing || forge.bldDef?.role !== 'forge') return fail('Invalid');
  const p = state.players[forge.owner];
  const rank = p.upgrades[upgId];
  if (rank >= 3) return fail('Fully researched');
  if (forge.trainQueue?.some(q => q.kind === 'upgrade' && q.id === upgId)) return fail('Already researching');
  if ((forge.trainQueue?.length ?? 0) >= 5) return fail('Queue is full');
  const cost = researchCost(rank);
  if (!canAfford(p, cost.gold, cost.lumber)) return fail('Not enough resources');
  p.gold -= cost.gold;
  p.lumber -= cost.lumber;
  forge.trainQueue!.push({ kind: 'upgrade', id: upgId, progress: 0, total: cost.time });
  return OK;
}

export function buyItem(state: GameState, shop: Entity, hero: Entity, itemId: string): ActionResult {
  if (shop.etype !== 'building' || shop.bldDef?.role !== 'shop') return fail('Not a shop');
  if (!hero.hero) return fail('Need a hero');
  if (shop.owner !== 9 && shop.owner !== hero.owner) return fail('Not your shop');
  if (dist(shop.x, shop.y, hero.x, hero.y) > 260) return fail('Hero too far from shop');
  const item = ITEMS[itemId];
  if (!item || item.cost <= 0) return fail('Not for sale');
  const p = state.players[hero.owner];
  if (p.gold < item.cost) return fail('Not enough gold');
  const slot = hero.hero.inventory.findIndex(s => s === null);
  if (slot < 0) return fail('Inventory full');
  p.gold -= item.cost;
  hero.hero.inventory[slot] = itemId;
  // permanents apply immediately
  if (item.kind !== 'consumable') applyPermanentItem(hero, itemId, 1);
  return OK;
}

export function callMilitia(state: GameState, th: Entity): ActionResult {
  if (th.etype !== 'building' || th.bldDef?.race !== 'tuatha' || th.bldDef.role !== 'townhall') return fail('Invalid');
  const now = state.time;
  const workers = state.store.query(th.x, th.y, 320, q =>
    q.owner === th.owner && q.unitDef?.role === 'worker' && !q.hidden);
  if (!workers.length) return fail('No vassals nearby');
  for (const w of workers) {
    w.militiaUntil = now + MILITIA_DURATION;
    w.task = undefined;
    w.carry = undefined;
    w.order = { type: 'attackmove', x: th.x, y: th.y };
    requestPath(state, w, th.x, th.y);
    state.addEffect({ kind: 'burst', x: w.x, y: w.y, color: '#e6b833', r0: 4, r1: 18, dur: 0.5 });
  }
  return OK;
}

export function raceOf(state: GameState, owner: number) {
  return RACES[state.players[owner].race];
}

export function heroDefOf(e: Entity) {
  return e.hero ? getHeroDef(e.hero.defId) : null;
}
