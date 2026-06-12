import type { RaceDef, HeroDef } from '@/game/types';
import { unit, bld } from './common';

const R = 'sluagh' as const;

const heroes: HeroDef[] = [
  {
    id: 'donn', name: 'Donn Fírinne', title: 'Lord of the Dead', race: R,
    primary: 'str',
    baseStr: 24, strGain: 3.0, baseAgi: 13, agiGain: 1.5, baseInt: 17, intGain: 2.0,
    baseDamage: 26, attackRange: 32, attackCooldown: 1.8, moveSpeed: 86, baseArmor: 3,
    desc: 'First of the dead, who bids all souls come to his house. He gives death with one hand and takes it back with the other.',
    abilities: [
      {
        id: 'buille', name: 'Buille Bháis', hotkey: 'Q', maxLevel: 3,
        desc: 'Death Strike deals 100/175/250 damage to an enemy — or restores that much to a friendly Sluagh.',
        manaCost: [70, 75, 80], cooldown: [9, 8, 7], castRange: 210, target: 'unit',
        effect: { kind: 'nukeOrHeal', dmg: [100, 175, 250] },
      },
      {
        id: 'anail', name: 'Anáil na hUaighe', hotkey: 'W', maxLevel: 3,
        desc: 'Breath of the Grave. Nearby allies move 10/20/30% faster and regenerate +1/2/3 HP per second.',
        manaCost: [0, 0, 0], cooldown: [0, 0, 0], castRange: 0, target: 'passive',
        effect: { kind: 'aura', radius: 210, msPct: [10, 20, 30], hpRegen: [1, 2, 3] },
      },
      {
        id: 'iobairt', name: 'Íobairt na nDamanta', hotkey: 'E', maxLevel: 3,
        desc: 'Sacrifice of the Damned. Kills a friendly non-hero unit; Donn drinks 150% of its remaining life.',
        manaCost: [40, 35, 30], cooldown: [16, 14, 12], castRange: 180, target: 'ally',
        effect: { kind: 'sacrifice', healPctOfCur: 150 },
      },
      {
        id: 'eirigh', name: 'Éirigh na Marbh', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: 'Rise of the Dead. Calls 8 skeletal warriors from the earth for 40s.',
        manaCost: [160], cooldown: [100], castRange: 0, target: 'none',
        effect: { kind: 'summon', summonUnit: 'sum_skeleton', summonCount: [8], summonDur: 40 },
      },
    ],
  },
  {
    id: 'cailleach', name: 'An Chailleach', title: 'The Veiled One', race: R,
    primary: 'int',
    baseStr: 16, strGain: 1.9, baseAgi: 13, agiGain: 1.5, baseInt: 24, intGain: 3.2,
    baseDamage: 23, attackRange: 175, attackCooldown: 1.7, moveSpeed: 84, baseArmor: 1,
    desc: 'The winter hag who shaped the mountains and buries the year. Frost follows where she looks.',
    abilities: [
      {
        id: 'greim', name: 'Greim an Gheimhridh', hotkey: 'Q', maxLevel: 3,
        desc: "Winter's Clutch: 120/180/240 frost damage in an area, slowing victims 40% for 4s.",
        manaCost: [85, 95, 105], cooldown: [10, 10, 10], castRange: 230, target: 'point',
        effect: { kind: 'aoePoint', dmg: [120, 180, 240], radius: 120, slowPct: 40, slowDur: 4 },
      },
      {
        id: 'brat_seaca', name: 'Brat Seaca', hotkey: 'W', maxLevel: 3,
        desc: 'Frost Shroud wraps an ally: +3/6/9 armor and melee attackers take 10 cold damage. 30s.',
        manaCost: [50, 55, 60], cooldown: [9, 8, 7], castRange: 220, target: 'ally',
        effect: { kind: 'buffTarget', armorBuff: [3, 6, 9], returnDmg: 10, dur: [30, 30, 30] },
      },
      {
        id: 'deasghnath', name: 'Deasghnáth Dorcha', hotkey: 'E', maxLevel: 3,
        desc: 'Dark Rite. Kills a friendly non-hero unit; the Cailleach drinks 150% of its max HP as mana.',
        manaCost: [0, 0, 0], cooldown: [18, 15, 12], castRange: 180, target: 'ally',
        effect: { kind: 'sacrifice', manaPctOfMax: 150 },
      },
      {
        id: 'lobhadh', name: 'Lobhadh Mór', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: 'The Great Withering. Channels 10s: enemies near the Cailleach rot for 4% of their max HP per second.',
        manaCost: [175], cooldown: [110], castRange: 0, target: 'none',
        effect: { kind: 'channel', channelDur: 10, radius: 280, enemyMaxHpPctPerSec: [4] },
      },
    ],
  },
  {
    id: 'crom', name: 'Crom Cruach', title: 'The Bloody Crescent', race: R,
    primary: 'str',
    baseStr: 25, strGain: 3.0, baseAgi: 12, agiGain: 1.4, baseInt: 18, intGain: 2.2,
    baseDamage: 27, attackRange: 32, attackCooldown: 1.85, moveSpeed: 84, baseArmor: 2,
    desc: 'The dark idol of the mound, fed on first fruits and firstborn. His shadow drinks the blood of battle.',
    abilities: [
      {
        id: 'gaoth_phla', name: 'Gaoth Phlá', hotkey: 'Q', maxLevel: 3,
        desc: 'Plague Wind scours a wide line for 100/175/250 damage.',
        manaCost: [80, 90, 100], cooldown: [11, 10, 9], castRange: 300, target: 'point',
        effect: { kind: 'line', dmg: [100, 175, 250], length: 300, width: 64 },
      },
      {
        id: 'codladh', name: 'Codladh na Cumhachta', hotkey: 'W', maxLevel: 3,
        desc: 'Slumber of Power. Puts an enemy to sleep for 5/10/15s. Any damage wakes it.',
        manaCost: [65, 70, 75], cooldown: [12, 11, 10], castRange: 220, target: 'enemy',
        effect: { kind: 'sleep', dur: [5, 10, 15] },
      },
      {
        id: 'deachu', name: 'Deachú Fola', hotkey: 'E', maxLevel: 3,
        desc: 'Blood Tithe. Nearby friendly melee units heal for 15/25/35% of the damage they deal.',
        manaCost: [0, 0, 0], cooldown: [0, 0, 0], castRange: 0, target: 'passive',
        effect: { kind: 'aura', radius: 200, lifestealPct: [15, 25, 35] },
      },
      {
        id: 'dreige', name: 'Dreige an Scrios', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: 'Baleful Comet: 250 damage in an area, 3s stun, and a Golem of Crom rises from the crater for 60s.',
        manaCost: [175], cooldown: [110], castRange: 300, target: 'point',
        effect: { kind: 'comet', dmg: [250], radius: 150, stunDur: 3, summonUnit: 'sum_golem', summonCount: [1], summonDur: 60 },
      },
    ],
  },
];

export const sluagh: RaceDef = {
  id: R,
  name: 'Sluagh',
  irish: 'The Host of the Restless Dead',
  archetype: 'Necromantic · Attrition',
  color: '#9b59d0',
  colorDark: '#4a2470',
  lore: 'The unforgiven dead, riding the western wind under Donn, Lord of the Dead. Where they settle, the ground itself dies — and serves.',
  mechanic: 'Éag (Blight) — Sluagh buildings must stand on blighted ground and spread it; your units heal on Éag. Adharcaigh summon buildings (then walk free) and channel gold from mines without hauling.',
  workerId: 'slu_worker',
  townHallId: 'slu_th1',
  altarId: 'slu_altar',
  farmId: 'slu_farm',
  heroes,
  units: [
    unit(R, 'worker', { id: 'slu_worker', name: 'Adharcach', epithet: 'Devotee', desc: 'Hooded servant of Donn. Channels gold from mines; summons buildings and walks free.' }),
    unit(R, 'melee', { id: 'slu_melee', name: 'Taise', epithet: 'Revenant', desc: 'A risen corpse with a grave-cold grip. Can also harvest timber.' }),
    unit(R, 'ranged', { id: 'slu_ranged', name: 'Cnámhshaighdeoir', epithet: 'Bone Archer', desc: 'Fires shards of its own ribs.' }),
    unit(R, 'elite', { id: 'slu_elite', name: 'Fear Marb', epithet: 'Wight', food: 4, auraId: 'disease', desc: 'A barrow-wight wrapped in plague fog: nearby enemies sicken (-2 HP/s).' }),
    unit(R, 'caster', {
      id: 'slu_caster1', name: 'Cailleach Oíche', epithet: 'Night Hag',
      casterSpell: { kind: 'slow', amount: 35, range: 190, manaCost: 40, cooldown: 4, name: 'Night Terrors' },
      desc: 'Rides the sleeping and curses the waking.',
    }),
    unit(R, 'caster', {
      id: 'slu_caster2', name: 'Bean Chaointe', epithet: 'Keening Woman',
      casterSpell: { kind: 'nuke', amount: 85, range: 190, manaCost: 55, cooldown: 6, name: 'Death Keen' },
      desc: 'Her wail is heard the night before a death. Often, it causes one.',
    }),
    unit(R, 'siege', { id: 'slu_siege', name: 'Cart Cnámh', epithet: 'Bone Cart', desc: 'A creaking ossuary on wheels, flinging grave-stones.' }),
    unit(R, 'flyer', { id: 'slu_flyer', name: 'Deamhan Aeir', epithet: 'Air Demon', desc: 'A shrieking thing on the west wind.' }),
    unit(R, 'heavyflyer', { id: 'slu_heavy', name: 'Ollphéist', epithet: 'Great Wyrm', food: 5, hp: 900, damage: 42, desc: 'A bone-wyrm vast as a river.' }),
  ],
  buildings: [
    bld(R, 'townhall', { id: 'slu_th1', name: 'Carn', epithet: 'Cairn', upgradesTo: 'slu_th2', upgradeGold: 320, upgradeLumber: 190, upgradeTime: 65, trains: ['slu_worker'], desc: 'A heap of dead men\'s stones. Spreads the Éag.' }),
    bld(R, 'townhall2', { id: 'slu_th2', name: 'Dumha na Marbh', epithet: 'Mound of the Dead', upgradesTo: 'slu_th3', upgradeGold: 360, upgradeLumber: 210, upgradeTime: 65, trains: ['slu_worker'], desc: 'A barrow swollen with the host. Unlocks Tier 2.' }),
    bld(R, 'townhall3', { id: 'slu_th3', name: 'Teach Duinn', epithet: 'House of Donn', trains: ['slu_worker'], desc: 'The house where all the dead arrive. Unlocks Tier 3.' }),
    bld(R, 'farm', { id: 'slu_farm', name: 'Leacht', epithet: 'Memorial Stone', desc: 'Provides 6 food.' }),
    bld(R, 'barracks', { id: 'slu_barracks', name: 'Uaigh Chogaidh', epithet: 'War Tomb', trains: ['slu_melee', 'slu_ranged', 'slu_elite'], desc: 'Raises Revenants, Bone Archers, and (Tier 3) Wights.' }),
    bld(R, 'altar', { id: 'slu_altar', name: 'Gallán Spiorad', epithet: 'Spirit Pillar', desc: 'Summons and revives the lords of the dead.' }),
    bld(R, 'casterhall', { id: 'slu_caster_hall', name: 'Teampall Scáth', epithet: 'Temple of Shadows', trains: ['slu_caster1', 'slu_caster2'], desc: 'Trains Night Hags and Keening Women.' }),
    bld(R, 'siegehall', { id: 'slu_siege_hall', name: 'Séipéal Cnámh', epithet: 'Bone Chapel', trains: ['slu_siege'], desc: 'Assembles Bone Carts.' }),
    bld(R, 'aerie', { id: 'slu_aerie', name: 'Poll na Scáthanna', epithet: 'Pit of Shades', requires: ['slu_forge'], trains: ['slu_flyer', 'slu_heavy'], desc: 'Vents Air Demons and Great Wyrms.' }),
    bld(R, 'tower', { id: 'slu_tower', name: 'Leacht Cosanta', epithet: 'Warding Stone', desc: 'Defensive tower.' }),
    bld(R, 'forge', { id: 'slu_forge', name: 'Reilig', epithet: 'Burial Ground', desc: 'Researches attack and armor improvements. Timber drop-off.' }),
    bld(R, 'shop', { id: 'slu_shop', name: 'Siopa na Marbh', epithet: 'Shop of the Dead', desc: 'Sells draughts and trinkets to your heroes.' }),
  ],
};
