import type { RaceDef, RaceId, UnitDef, BuildingDef, HeroDef } from '@/game/types';
import { tuathaDeDanann } from './tuathaDeDanann';
import { fomorians } from './fomorians';
import { aosSi } from './aosSi';
import { sluagh } from './sluagh';
import { ALL_EXTRA_UNITS } from '../creeps';
import { NEUTRAL_SHOP } from '../neutral';

export const RACES: Record<RaceId, RaceDef> = {
  tuatha: tuathaDeDanann,
  fomoire: fomorians,
  aossi: aosSi,
  sluagh,
};

export const RACE_LIST: RaceDef[] = [tuathaDeDanann, fomorians, aosSi, sluagh];

const unitIndex = new Map<string, UnitDef>();
const bldIndex = new Map<string, BuildingDef>();
const heroIndex = new Map<string, HeroDef>();

for (const r of RACE_LIST) {
  for (const u of r.units) unitIndex.set(u.id, u);
  for (const b of r.buildings) bldIndex.set(b.id, b);
  for (const h of r.heroes) heroIndex.set(h.id, h);
}
for (const [id, u] of Object.entries(ALL_EXTRA_UNITS)) unitIndex.set(id, u);
bldIndex.set(NEUTRAL_SHOP.id, NEUTRAL_SHOP);

export function getUnitDef(id: string): UnitDef {
  const d = unitIndex.get(id);
  if (!d) throw new Error(`unknown unit def: ${id}`);
  return d;
}
export function getBldDef(id: string): BuildingDef {
  const d = bldIndex.get(id);
  if (!d) throw new Error(`unknown building def: ${id}`);
  return d;
}
export function getHeroDef(id: string): HeroDef {
  const d = heroIndex.get(id);
  if (!d) throw new Error(`unknown hero def: ${id}`);
  return d;
}
export function playerColor(owner: number): string {
  return owner === 0 ? '#4da6ff' : owner === 1 ? '#ff5555' : '#d8c75a';
}
