// AI economic decisions: workers, harvest assignment, build order, expansion.
import type { Entity } from '@/game/types';
import type { GameState } from '@/simulation/GameState';
import type { AIParams } from './AIDifficulty';
import { RACES } from '@/data/races';
import { getBldDef } from '@/data/races';
import { TILE, ENSNARE_RANGE } from '@/utils/Constants';
import { dist } from '@/utils/Vector2';
import { trainUnit, startBuild, upgradeTownHall, research } from '@/simulation/Actions';
import { playerTier, hasBuilding } from '@/simulation/BuildingManager';
import { orderGatherTree, requestPath } from '@/simulation/OrderSystem';
import { ensnaredBy } from '@/simulation/ResourceSystem';
import { RESEARCH } from '@/simulation/TechTree';

export function ownEntities(state: GameState, pid: number): { workers: Entity[]; army: Entity[]; heroes: Entity[]; buildings: Entity[] } {
  const workers: Entity[] = [], army: Entity[] = [], heroes: Entity[] = [], buildings: Entity[] = [];
  state.store.forEach(e => {
    if (e.owner !== pid || e.dead) return;
    if (e.etype === 'building') buildings.push(e);
    else if (e.etype === 'unit') {
      if (e.hero) heroes.push(e);
      else if (e.unitDef?.role === 'worker') workers.push(e);
      else if (e.unitDef?.role !== 'summon') army.push(e);
    }
  });
  return { workers, army, heroes, buildings };
}

function mainHall(buildings: Entity[]): Entity | undefined {
  return buildings.find(b => b.bldDef?.role === 'townhall' && !b.constructing);
}

function findMineNear(state: GameState, x: number, y: number, maxD = 4000): Entity | undefined {
  let best: Entity | undefined;
  let bestD = maxD;
  state.store.forEach(e => {
    if (e.etype !== 'mine' || (e.goldLeft ?? 0) <= 0) return;
    const d = dist(x, y, e.x, e.y);
    if (d < bestD) { bestD = d; best = e; }
  });
  return best;
}

export function findBuildSpot(state: GameState, defId: string, nearX: number, nearY: number): { tx: number; ty: number } | null {
  const def = getBldDef(defId);
  const needBlight = def.race === 'sluagh' && def.role !== 'townhall';
  const ctx = Math.floor(nearX / TILE), cty = Math.floor(nearY / TILE);
  for (let r = 2; r <= 16; r++) {
    for (let attempt = 0; attempt < 14; attempt++) {
      const ang = Math.random() * Math.PI * 2;
      const tx = Math.round(ctx + Math.cos(ang) * r - def.size / 2);
      const ty = Math.round(cty + Math.sin(ang) * r - def.size / 2);
      if (state.map.canPlace(tx, ty, def.size, needBlight)) return { tx, ty };
    }
  }
  return null;
}

function countGoldWorkers(workers: Entity[]): number {
  return workers.filter(w => {
    const k = w.task?.kind;
    return k === 'toMine' || k === 'inMine' || k === 'channelMine' ||
      (k === 'returning' && w.task?.mineId !== undefined);
  }).length;
}

function isConstructingOrQueued(state: GameState, pid: number, role: string): boolean {
  let found = false;
  state.store.forEach(e => {
    if (found) return;
    if (e.owner === pid && e.etype === 'building' && e.constructing && e.bldDef?.role === role) found = true;
    if (e.owner === pid && e.etype === 'unit' && e.order.type === 'build') {
      try { if (getBldDef(e.order.bldId).role === role) found = true; } catch { /* noop */ }
    }
  });
  return found;
}

export function economyDecide(state: GameState, pid: number, params: AIParams, baseX: number, baseY: number) {
  const p = state.players[pid];
  const race = RACES[p.race];
  const { workers, buildings } = ownEntities(state, pid);
  const hall = mainHall(buildings);
  if (!hall) return;

  // 1) train workers
  if (workers.length < params.workerTarget && (hall.trainQueue?.length ?? 0) < 2) {
    trainUnit(state, hall, race.workerId);
  }

  // 2) assign idle workers
  const mine = findMineNear(state, hall.x, hall.y, 1200);
  // aos si can only draw gold from an ensnared mine
  const mineUsable = !!mine && (p.race !== 'aossi' || ensnaredBy(state, mine, pid));
  let goldCount = countGoldWorkers(workers);
  for (const w of workers) {
    if (w.task || w.order.type !== 'idle' || (w.militiaUntil ?? 0) > state.time) continue;
    if (mine && mineUsable && goldCount < params.goldWorkers) {
      w.order = { type: 'gatherMine', mineId: mine.id };
      w.task = { kind: 'toMine', mineId: mine.id, timer: 0 };
      requestPath(state, w, mine.x, mine.y);
      goldCount++;
    } else {
      const tree = state.map.nearestTree(w.x, w.y);
      if (tree) orderGatherTree(state, w, tree.tx, tree.ty);
    }
  }

  // helper to queue a build
  const tryBuild = (defId: string, nx: number, ny: number): boolean => {
    const builder = workers.find(w =>
      !w.hidden &&
      w.order.type !== 'build' &&
      w.task?.kind !== 'building' &&
      w.task?.kind !== 'inMine' &&
      w.task?.kind !== 'channelMine' &&
      (w.militiaUntil ?? 0) < state.time);
    if (!builder) return false;
    const spot = findBuildSpot(state, defId, nx, ny);
    if (!spot) return false;
    return startBuild(state, builder, defId, spot.tx, spot.ty).ok;
  };

  // 3) farms ahead of demand
  if (p.foodCap < 100 && p.foodCap - p.foodUsed < 6 && !isConstructingOrQueued(state, pid, 'farm')) {
    if (p.gold >= 80 && p.lumber >= 20) tryBuild(race.farmId, baseX + 80, baseY + 80);
  }

  // 4) core structures
  const wantOrder: { id: string; cond: boolean }[] = [
    { id: race.altarId, cond: !hasBuilding(state, pid, race.altarId) && !isConstructingOrQueued(state, pid, 'altar') },
    {
      id: race.buildings.find(b => b.role === 'barracks')!.id,
      cond: !buildings.some(b => b.bldDef?.role === 'barracks') && !isConstructingOrQueued(state, pid, 'barracks'),
    },
    {
      id: race.buildings.find(b => b.role === 'forge')!.id,
      cond: params.research && p.foodUsed > 18 &&
        !buildings.some(b => b.bldDef?.role === 'forge') && !isConstructingOrQueued(state, pid, 'forge'),
    },
    {
      id: race.buildings.find(b => b.role === 'casterhall')!.id,
      cond: playerTier(state, pid) >= 2 &&
        !buildings.some(b => b.bldDef?.role === 'casterhall') && !isConstructingOrQueued(state, pid, 'casterhall'),
    },
  ];
  for (const w of wantOrder) {
    if (!w.cond) continue;
    const def = getBldDef(w.id);
    if (p.gold >= def.gold && p.lumber >= def.lumber) {
      tryBuild(w.id, baseX + (Math.random() - 0.5) * 220, baseY + (Math.random() - 0.5) * 220);
    }
    break; // one core building at a time
  }

  // 4b) additional war buildings when gold piles up
  const racksId = race.buildings.find(b => b.role === 'barracks')!.id;
  const racksCount = buildings.filter(b => b.bldDef?.role === 'barracks').length;
  if (racksCount >= 1 && racksCount < 3 && p.gold > 800 && p.lumber > 100 &&
    !isConstructingOrQueued(state, pid, 'barracks')) {
    tryBuild(racksId, baseX + (Math.random() - 0.5) * 260, baseY + (Math.random() - 0.5) * 260);
  }

  // 5) towers (hard)
  if (params.buildTowers && p.foodUsed > 24) {
    const towers = buildings.filter(b => b.bldDef?.role === 'tower').length;
    if (towers < 2 && !isConstructingOrQueued(state, pid, 'tower') && p.gold > 350) {
      const towerId = race.buildings.find(b => b.role === 'tower')!.id;
      tryBuild(towerId, baseX - 80, baseY - 80);
    }
  }

  // 6) tier upgrades
  const tier = playerTier(state, pid);
  if (tier === 1 && p.foodUsed >= params.tier2Food) upgradeTownHall(state, hall);
  else if (tier === 2 && p.foodUsed >= params.tier3Food) upgradeTownHall(state, hall);

  // 7) expansion
  if (params.expand) {
    const mainGold = mine?.goldLeft ?? 0;
    if (mainGold < params.expandMainGoldBelow && p.gold > 500 && p.lumber > 250) {
      const newMine = findUnclaimedMine(state, pid, hall.x, hall.y);
      if (newMine && !isConstructingOrQueued(state, pid, 'townhall')) {
        // aos si must snuggle the hall against the mine to ensnare it
        const offset = p.race === 'aossi' ? ENSNARE_RANGE * 0.5 : 140;
        tryBuild(race.townHallId, newMine.x + offset, newMine.y + offset * 0.4);
      }
    }
  }

  // 8) research
  if (params.research) {
    const forge = buildings.find(b => b.bldDef?.role === 'forge' && !b.constructing);
    if (forge && (forge.trainQueue?.length ?? 0) === 0 && p.gold > 400) {
      for (const r of RESEARCH) {
        if (p.upgrades[r.id] < 3 && research(state, forge, r.id).ok) break;
      }
    }
  }
}

function findUnclaimedMine(state: GameState, pid: number, fromX: number, fromY: number): Entity | undefined {
  const halls: Entity[] = [];
  state.store.forEach(e => {
    if (e.etype === 'building' && e.bldDef?.role === 'townhall') halls.push(e);
  });
  let best: Entity | undefined;
  let bestD = Infinity;
  state.store.forEach(m => {
    if (m.etype !== 'mine' || (m.goldLeft ?? 0) < 2000) return;
    if (halls.some(h => dist(h.x, h.y, m.x, m.y) < 400)) return;
    const d = dist(fromX, fromY, m.x, m.y);
    if (d < bestD) { bestD = d; best = m; }
  });
  return best;
}
