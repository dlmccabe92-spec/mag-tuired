# Mag Tuired

*"When Gods and Monsters Clashed for Ériu"*

A browser-based real-time strategy game rooted in Celtic mythology — the Irish
Mythological Cycle, the Ulster Cycle, and the folklore of the fairy mounds.
1v1 skirmish against an AI opponent: build your base, harvest gold and timber,
summon heroes of legend, and destroy the enemy's every building.

Built from scratch in TypeScript on HTML5 Canvas 2D — no game engine.
Next.js serves as the shell; the entire simulation, renderer, pathfinding,
fog of war, and AI are bespoke.

## The Four Races

| Race | Archetype | Unique mechanics |
|---|---|---|
| **Tuatha Dé Danann** — Children of Danu | Balanced · versatile | *Call of Danu*: workers take up arms as militia for 60s |
| **Fomóire** — The Deep Ones | Aggressive · brutal | *Pillage of the Deep*: melee strikes vs buildings loot +3 gold |
| **Aos Sí** — The Hidden Folk | Elusive · nature-bound | *Fáth Fíada*: female units cloak at night while still; timber harvested without felling trees; halls ensnare gold mines |
| **Sluagh** — The Restless Dead | Necromantic · attrition | *Éag (Blight)*: buildings require and spread blight that heals your units; workers summon buildings and channel gold |

Each race fields 9 unit types, 11 buildings, and 3 heroes with 4 abilities
each (including an ultimate at level 6).

## Features

- Classic RTS economy: gold mines, timber, food, and a three-tier
  **tribute (upkeep)** system that taxes income as your army grows
- Tech tree with three town-hall tiers, prerequisite chains, and
  attack/armor research
- Hero system: XP, 10 levels, learnable abilities, 6-slot inventory,
  item drops, artifacts, revival at the summoning stone
- Original attack/armor type matrix (Blunt/Barbed/Arcane/Crushing/Heroic/Primordial
  vs Robed/Padded/Plated/Fortified/Heroic/Unshielded)
- Neutral creep camps that sleep at night, drop loot, and respawn;
  a Crossroads Merchant selling draughts and trinkets
- Day/night cycle (6 min) affecting sight, creep aggro, and stealth
- Three-state fog of war, A* pathfinding, projectile combat, auras, buffs
- AI opponent with Easy / Medium / Hard difficulty (build orders, creeping,
  timed attack waves, retreats, focus fire)
- Three hand-designed 1v1 maps: Bridge of Giants (96²), Meadow of Kings (128²),
  The Battle Plain (160²)
- Procedural Web Audio sound and ambient day/night drone

## Controls

| Input | Action |
|---|---|
| Left-click / drag | Select / box-select |
| Right-click | Smart order (move / attack / mine / harvest / rally) |
| Arrow keys, edge scroll | Pan camera · mouse wheel zooms |
| Ctrl+1–9 / 1–9 | Assign / recall control group (double-tap to center) |
| F1–F3 | Select heroes |
| A / S / H / P / B | Attack-move · Stop · Hold · Patrol · Build menu |
| Q W E R | Train units / cast hero abilities |
| Esc | Cancel / pause menu |

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build

# headless AI-vs-AI simulation (no browser):
npx tsx scripts/simtest.ts tuatha sluagh meadow 30
```

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Canvas 2D · Web Audio —
deployed on Vercel.

---

*Ar aghaidh leat. Tóg é. Seol é.*
