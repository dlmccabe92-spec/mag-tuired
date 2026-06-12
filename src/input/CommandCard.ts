// Builds the context-sensitive command card buttons for the current selection.
import type { Entity, CommandButton } from '@/game/types';
import type { GameState } from '@/simulation/GameState';
import { getUnitDef, getBldDef, getHeroDef, RACES } from '@/data/races';
import { ITEMS, SHOP_STOCK } from '@/data/items';
import { HERO_COSTS, reviveCost } from '@/utils/Constants';
import { unitRequirementsMet, buildingRequirementsMet, researchCost, RESEARCH } from '@/simulation/TechTree';
import { playerTier } from '@/simulation/BuildingManager';
import { canCast } from '@/simulation/HeroSystem';
import { dist } from '@/utils/Vector2';

export type UICardMode = 'normal' | 'build';

const HOTKEYS = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'F', 'G'];

export function buildCommandCard(
  state: GameState,
  selection: Entity[],
  mode: UICardMode,
  targetingId: string | null,
): CommandButton[] {
  if (!selection.length) return [];
  const p = state.players[0];
  const first = selection[0];
  const buttons: CommandButton[] = [];

  // ---------------- build menu (worker submode) ----------------
  if (mode === 'build') {
    const race = RACES[p.race];
    let i = 0;
    for (const b of race.buildings) {
      if (b.role === 'townhall' && b.tier > 1) continue; // upgrades, not built directly
      const req = buildingRequirementsMet(state, 0, b);
      const afford = p.gold >= b.gold && p.lumber >= b.lumber;
      buttons.push({
        id: `build:${b.id}`,
        label: b.name,
        hotkey: HOTKEYS[i] ?? '',
        icon: glyphForBuilding(b.role),
        enabled: req.ok && afford,
        tooltip: `${b.name} (${b.epithet ?? ''}) — ${b.desc ?? ''}${req.ok ? '' : ` [${req.err}]`}`,
        costGold: b.gold,
        costLumber: b.lumber,
      });
      i++;
    }
    buttons.push({ id: 'back', label: 'Back', hotkey: 'X', icon: '↩', enabled: true, tooltip: 'Back' });
    return buttons;
  }

  // ---------------- building selected ----------------
  if (first.etype === 'building' && first.owner === 0 && !first.constructing) {
    const def = first.bldDef!;
    let i = 0;
    for (const uid of def.trains ?? []) {
      const u = getUnitDef(uid);
      const req = unitRequirementsMet(state, 0, u);
      const afford = p.gold >= u.gold && p.lumber >= u.lumber;
      const food = p.foodUsed + u.food <= p.foodCap;
      buttons.push({
        id: `train:${uid}`,
        label: u.name,
        hotkey: HOTKEYS[i++] ?? '',
        icon: glyphForRole(u.role),
        enabled: req.ok && afford && food,
        tooltip: `${u.name} (${u.epithet ?? ''}) — ${u.desc ?? ''}${!req.ok ? ` [${req.err}]` : !food ? ' [Need food]' : ''}`,
        costGold: u.gold, costLumber: u.lumber, costFood: u.food,
      });
    }
    if (def.role === 'altar') {
      const race = RACES[p.race];
      for (const h of race.heroes) {
        if (p.heroesRecruited.includes(h.id)) continue;
        const idx = p.heroesRecruited.length;
        const cost = HERO_COSTS[Math.min(idx, 2)];
        const tier = playerTier(state, 0);
        const tierOk = idx === 0 || (idx === 1 && tier >= 2) || (idx === 2 && tier >= 3);
        buttons.push({
          id: `hero:${h.id}`,
          label: h.name,
          hotkey: HOTKEYS[i++] ?? '',
          icon: '★',
          enabled: tierOk && p.gold >= cost.gold && p.lumber >= cost.lumber && p.foodUsed + 5 <= p.foodCap,
          tooltip: `${h.name} — ${h.title}. ${h.desc}${tierOk ? '' : ` [Requires Tier ${idx + 1} hall]`}`,
          costGold: cost.gold, costLumber: cost.lumber, costFood: 5,
        });
      }
      for (const f of p.fallenHeroes) {
        const hd = getHeroDef(f.state.defId);
        buttons.push({
          id: `revive:${f.state.defId}`,
          label: `Revive ${hd.name}`,
          hotkey: HOTKEYS[i++] ?? '',
          icon: '✚',
          enabled: p.gold >= reviveCost(f.state.level),
          tooltip: `Revive ${hd.name} (level ${f.state.level}).`,
          costGold: reviveCost(f.state.level),
        });
      }
    }
    if (def.role === 'townhall') {
      if (def.upgradesTo) {
        const next = getBldDef(def.upgradesTo);
        buttons.push({
          id: 'upgrade',
          label: `Rise: ${next.name}`,
          hotkey: 'U',
          icon: '⬆',
          enabled: p.gold >= (def.upgradeGold ?? 0) && p.lumber >= (def.upgradeLumber ?? 0) &&
            !first.trainQueue?.some(q => q.kind === 'tech'),
          tooltip: `Upgrade to ${next.name} (${next.epithet}) — unlocks Tier ${next.tier}.`,
          costGold: def.upgradeGold, costLumber: def.upgradeLumber,
        });
      }
      if (def.race === 'tuatha') {
        buttons.push({
          id: 'militia',
          label: 'Call of Danu',
          hotkey: 'C',
          icon: '⚔',
          enabled: true,
          tooltip: 'Nearby Aithigh take up arms as militia for 60 seconds.',
        });
      }
    }
    if (def.role === 'forge') {
      for (const r of RESEARCH) {
        const rank = p.upgrades[r.id];
        const cost = researchCost(rank);
        buttons.push({
          id: `research:${r.id}`,
          label: `${r.name} (${rank}/3)`,
          hotkey: HOTKEYS[i++] ?? '',
          icon: '⚒',
          enabled: rank < 3 && p.gold >= cost.gold && p.lumber >= cost.lumber &&
            !first.trainQueue?.some(q => q.kind === 'upgrade' && q.id === r.id),
          tooltip: r.desc,
          costGold: cost.gold, costLumber: cost.lumber,
        });
      }
    }
    if (def.role === 'shop') {
      const hero = nearestOwnHero(state, first);
      let j = 0;
      for (const itemId of SHOP_STOCK) {
        const item = ITEMS[itemId];
        buttons.push({
          id: `buy:${itemId}`,
          label: item.name,
          hotkey: `${(j % 9) + 1}`,
          icon: item.kind === 'consumable' ? '🜚' : '◆',
          enabled: !!hero && p.gold >= item.cost,
          tooltip: `${item.name} — ${item.desc}${hero ? '' : ' [Bring a hero close to buy]'}`,
          costGold: item.cost,
        });
        j++;
      }
    }
    return buttons;
  }
  // neutral shop selected
  if (first.etype === 'building' && first.owner === 9 && first.bldDef?.role === 'shop') {
    const hero = nearestOwnHero(state, first);
    let j = 0;
    for (const itemId of SHOP_STOCK) {
      const item = ITEMS[itemId];
      buttons.push({
        id: `buy:${itemId}`,
        label: item.name,
        hotkey: `${(j % 9) + 1}`,
        icon: item.kind === 'consumable' ? '🜚' : '◆',
        enabled: !!hero && p.gold >= item.cost,
        tooltip: `${item.name} — ${item.desc}${hero ? '' : ' [Bring a hero close to buy]'}`,
        costGold: item.cost,
      });
      j++;
    }
    return buttons;
  }

  // ---------------- units selected ----------------
  const ownUnits = selection.filter(e => e.etype === 'unit' && e.owner === 0);
  if (!ownUnits.length) return buttons;

  const hero = ownUnits.find(e => e.hero);
  if (hero?.hero) {
    const hd = getHeroDef(hero.hero.defId);
    for (let idx = 0; idx < hd.abilities.length; idx++) {
      const ab = hd.abilities[idx];
      const lvl = hero.hero.abilityLevels[idx];
      const learned = lvl > 0;
      const passive = ab.target === 'passive';
      const cdLeft = Math.max(0, hero.hero.cooldownReady[idx] - state.time);
      const cdTotal = ab.cooldown[Math.max(0, Math.min(lvl - 1, ab.cooldown.length - 1))] || 1;
      buttons.push({
        id: `ability:${idx}`,
        label: ab.name,
        hotkey: ab.hotkey,
        icon: ab.ultimate ? '☀' : '✦',
        enabled: learned && !passive && canCast(state, hero, idx).ok,
        tooltip: `${ab.name}${lvl > 0 ? ` (level ${lvl})` : ' (not learned)'} — ${ab.desc}`,
        active: targetingId === `ability:${idx}`,
        progress: learned && cdLeft > 0 ? cdLeft / cdTotal : 0,
      });
    }
  }

  buttons.push({ id: 'attack', label: 'Attack', hotkey: 'A', icon: '⚔', enabled: true, tooltip: 'Attack-move: engage enemies along the way.', active: targetingId === 'attack' });
  buttons.push({ id: 'stop', label: 'Stop', hotkey: 'S', icon: '■', enabled: true, tooltip: 'Stop all actions.' });
  buttons.push({ id: 'hold', label: 'Hold', hotkey: 'H', icon: '⌂', enabled: true, tooltip: 'Hold position: attack in range, never chase.' });
  buttons.push({ id: 'patrol', label: 'Patrol', hotkey: 'P', icon: '↔', enabled: true, tooltip: 'Patrol between here and a target point.', active: targetingId === 'patrol' });

  if (ownUnits.some(e => e.unitDef?.role === 'worker')) {
    buttons.push({ id: 'buildmenu', label: 'Build', hotkey: 'B', icon: '⚒', enabled: true, tooltip: 'Construct a building.' });
  }
  return buttons;
}

function nearestOwnHero(state: GameState, shop: Entity): Entity | null {
  let best: Entity | null = null;
  let bestD = 260;
  state.store.forEach(e => {
    if (e.etype !== 'unit' || !e.hero || e.owner !== 0 || e.dead) return;
    const d = dist(e.x, e.y, shop.x, shop.y);
    if (d < bestD) { bestD = d; best = e; }
  });
  return best;
}

function glyphForRole(role: string): string {
  switch (role) {
    case 'worker': return '⛏';
    case 'melee': return '⚔';
    case 'ranged': return '➳';
    case 'elite': return '✠';
    case 'caster': return '✦';
    case 'siege': return '☄';
    case 'flyer': return '≋';
    case 'heavyflyer': return '☽';
    default: return '●';
  }
}
function glyphForBuilding(role: string): string {
  switch (role) {
    case 'townhall': return '⌂';
    case 'farm': return '☘';
    case 'barracks': return '⚔';
    case 'altar': return '★';
    case 'tower': return '♜';
    case 'forge': return '⚒';
    case 'casterhall': return '✦';
    case 'siegehall': return '☄';
    case 'aerie': return '≋';
    case 'shop': return '◆';
    default: return '■';
  }
}
