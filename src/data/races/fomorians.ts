import type { RaceDef, HeroDef } from '@/game/types';
import { unit, bld } from './common';

const R = 'fomoire' as const;

const heroes: HeroDef[] = [
  {
    id: 'balor', name: 'Balor Birugderc', title: 'Balor of the Piercing Eye', race: R,
    primary: 'str',
    baseStr: 25, strGain: 3.1, baseAgi: 12, agiGain: 1.4, baseInt: 16, intGain: 1.9,
    baseDamage: 27, attackRange: 32, attackCooldown: 1.85, moveSpeed: 84, baseArmor: 3,
    desc: 'King of the Fomóire, whose single eye slays all it gazes upon. A devastating frontline colossus.',
    abilities: [
      {
        id: 'suil', name: 'Súil an Bháis', hotkey: 'Q', maxLevel: 3,
        desc: 'The Eye of Death burns a line for 110/180/250 damage and rends 4 armor for 8s.',
        manaCost: [80, 90, 100], cooldown: [12, 11, 10], castRange: 310, target: 'point',
        effect: { kind: 'line', dmg: [110, 180, 250], length: 310, width: 46, armorReduce: 4 },
      },
      {
        id: 'tonn', name: 'Tonnchreith', hotkey: 'W', maxLevel: 3,
        desc: 'A tidal shockwave around Balor deals 80/140/200 damage and slows 30% for 2s.',
        manaCost: [70, 75, 80], cooldown: [10, 9, 8], castRange: 0, target: 'none',
        effect: { kind: 'aoeSelf', dmg: [80, 140, 200], radius: 150, slowPct: 30, slowDur: 2 },
      },
      {
        id: 'cnamh', name: 'Cnámh na Farraige', hotkey: 'E', maxLevel: 3,
        desc: 'Bones of the Sea. Passively grants +3/6/9 armor and +1/2/3 HP regeneration.',
        manaCost: [0, 0, 0], cooldown: [0, 0, 0], castRange: 0, target: 'passive',
        effect: { kind: 'passive', armorBuff: [3, 6, 9], hpRegen: [1, 2, 3] },
      },
      {
        id: 'radharc', name: 'Radharc an Léin', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: 'Gaze of Ruin. After a 2s stare, the target takes 700 damage. The victim is rooted while Balor stares.',
        manaCost: [175], cooldown: [100], castRange: 260, target: 'enemy',
        effect: { kind: 'delayedNuke', dmg: [700], delay: 2 },
      },
    ],
  },
  {
    id: 'bres', name: 'Bres mac Elatha', title: 'Bres the Tyrant', race: R,
    primary: 'agi',
    baseStr: 17, strGain: 2.0, baseAgi: 23, agiGain: 2.9, baseInt: 15, intGain: 1.7,
    baseDamage: 23, attackRange: 30, attackCooldown: 1.45, moveSpeed: 96, baseArmor: 2,
    desc: 'The beautiful, faithless king who sold Ériu to the deep. A venomous raider who strikes from the fog.',
    abilities: [
      {
        id: 'nimh', name: 'Nimh na Taoide', hotkey: 'Q', maxLevel: 3,
        desc: 'Venom Tide poisons a target: 40/80/120 damage over 8s and 30% slow.',
        manaCost: [60, 65, 70], cooldown: [9, 8, 7], castRange: 200, target: 'enemy',
        effect: { kind: 'nuke', dmg: [10, 20, 30], dotDps: [5, 10, 15], dotDur: 8, slowPct: 30, slowDur: 8 },
      },
      {
        id: 'ceo', name: 'Ceo Mara', hotkey: 'W', maxLevel: 3,
        desc: 'Sea Fog. Bres vanishes for 15/20/25s, moving 40% faster; his next strike deals 1.5× damage.',
        manaCost: [75, 80, 85], cooldown: [22, 20, 18], castRange: 0, target: 'none',
        effect: { kind: 'invis', dur: [15, 20, 25], msPct: [40], bonusMult: 1.5 },
      },
      {
        id: 'forlamhas', name: 'Forlámhas', hotkey: 'E', maxLevel: 3,
        desc: "Tyrant's Decree. Nearby allies attack 10/15/20% faster.",
        manaCost: [0, 0, 0], cooldown: [0, 0, 0], castRange: 0, target: 'passive',
        effect: { kind: 'aura', radius: 210, atkSpdPct: [10, 15, 20] },
      },
      {
        id: 'maelstrom', name: 'Cuairt-Shlogadh', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: 'Maelstrom. A whirlpool churns at the target point for 6s, dealing 30 damage/s and dragging (60% slow) enemies caught in it.',
        manaCost: [160], cooldown: [95], castRange: 300, target: 'point',
        effect: { kind: 'channel', channelDur: 6, radius: 190, enemyDps: [30], slowPct: 60 },
      },
    ],
  },
  {
    id: 'elatha', name: 'Elatha mac Delbáeth', title: 'Elatha of the Deep Throne', race: R,
    primary: 'int',
    baseStr: 16, strGain: 1.9, baseAgi: 13, agiGain: 1.5, baseInt: 24, intGain: 3.2,
    baseDamage: 23, attackRange: 175, attackCooldown: 1.7, moveSpeed: 84, baseArmor: 1,
    desc: 'The moon-silver king of the deep throne. A seer and summoner who commands the things beneath the waves.',
    abilities: [
      {
        id: 'saighead', name: 'Saighead Duibheagáin', hotkey: 'Q', maxLevel: 3,
        desc: 'Abyssal Bolt arcs between up to 4 foes: 110/170/230 damage, 15% less per bounce.',
        manaCost: [80, 90, 100], cooldown: [10, 10, 10], castRange: 220, target: 'enemy',
        effect: { kind: 'chain', dmg: [110, 170, 230], bounces: 4, falloff: 0.15 },
      },
      {
        id: 'radharc_fada', name: 'Radharc Fada', hotkey: 'W', maxLevel: 3,
        desc: 'Deep Sight reveals a distant area of the map for 10/12/14s.',
        manaCost: [40, 40, 40], cooldown: [18, 16, 14], castRange: 9999, target: 'point',
        effect: { kind: 'reveal', radius: 380, dur: [10, 12, 14] },
      },
      {
        id: 'glaoigh', name: 'Glaoigh ar na Fomóire', hotkey: 'E', maxLevel: 3,
        desc: 'Summons 2/3/4 sea-beasts from the deep to fight for 60s.',
        manaCost: [100, 110, 120], cooldown: [24, 22, 20], castRange: 0, target: 'none',
        effect: { kind: 'summon', summonUnit: 'sum_seabeast', summonCount: [2, 3, 4], summonDur: 60 },
      },
      {
        id: 'leviathan', name: 'Fearg an Leviathán', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: "Leviathan's Fury. Channels 8s: all enemies near Elatha take 5% of their max HP per second.",
        manaCost: [175], cooldown: [110], castRange: 0, target: 'none',
        effect: { kind: 'channel', channelDur: 8, radius: 260, enemyMaxHpPctPerSec: [5] },
      },
    ],
  },
];

export const fomorians: RaceDef = {
  id: R,
  name: 'Fomóire',
  irish: 'The Deep Ones',
  archetype: 'Aggressive · Brutal',
  color: '#cc3333',
  colorDark: '#6e1414',
  lore: 'Primordial giants of the sea and the dark beyond the horizon, enemies of every harvest. They take what they please by tide and by force.',
  mechanic: 'Pillage of the Deep — your melee warriors tear +3 gold from enemy buildings with every blow.',
  workerId: 'fom_worker',
  townHallId: 'fom_th1',
  altarId: 'fom_altar',
  farmId: 'fom_farm',
  heroes,
  units: [
    unit(R, 'worker', { id: 'fom_worker', name: 'Clobhsaí', epithet: 'Laborer', desc: 'Drudge of the deep forts. Mines, hauls, and builds.' }),
    unit(R, 'melee', { id: 'fom_melee', name: 'Marfóir', epithet: 'Slayer', hp: 470, damage: 14, moveSpeed: 84, desc: 'Brine-scarred butcher. Pillages gold from enemy buildings.' }),
    unit(R, 'ranged', { id: 'fom_ranged', name: 'Caitheoir Ga', epithet: 'Javelin Hurler', desc: 'Hurls barbed harpoons.' }),
    unit(R, 'elite', { id: 'fom_elite', name: 'Athach', epithet: 'Giant Brute', food: 5, hp: 1100, damage: 38, enrageAt: 0.35, desc: 'A sea-giant that grows furious (+30% damage) when bloodied.' }),
    unit(R, 'caster', {
      id: 'fom_caster1', name: 'Corrguineach', epithet: 'Hex Caster',
      casterSpell: { kind: 'nuke', amount: 95, range: 190, manaCost: 60, cooldown: 6, name: 'Crane Curse' },
      desc: 'Casts the one-eyed, one-legged hex of ruin.',
    }),
    unit(R, 'caster', {
      id: 'fom_caster2', name: 'Draoidheachta Mara', epithet: 'Sea Witch',
      casterSpell: { kind: 'slow', amount: 35, range: 190, manaCost: 40, cooldown: 4, name: 'Dragging Tide' },
      desc: 'Her tides drag at the limbs of her enemies.',
    }),
    unit(R, 'siege', { id: 'fom_siege', name: 'Carraig Chogaidh', epithet: 'War Rock Lobber', desc: 'Lobs reef-rock at walls and roofs.' }),
    unit(R, 'flyer', { id: 'fom_flyer', name: 'Corr Réisc', epithet: 'Marsh Heron', desc: 'Great carrion heron of the salt marsh.' }),
    unit(R, 'heavyflyer', { id: 'fom_heavy', name: 'Péist Mhara', epithet: 'Sea Wyrm', food: 5, hp: 900, damage: 42, desc: 'A coiling horror of the deep, risen on storm winds.' }),
  ],
  buildings: [
    bld(R, 'townhall', { id: 'fom_th1', name: 'Dún Mara', epithet: 'Sea Fort', upgradesTo: 'fom_th2', upgradeGold: 320, upgradeLumber: 190, upgradeTime: 65, trains: ['fom_worker'], desc: 'Barnacle-crusted keep of the Deep Ones.' }),
    bld(R, 'townhall2', { id: 'fom_th2', name: 'Caisleán Domhain', epithet: 'Deep Castle', upgradesTo: 'fom_th3', upgradeGold: 360, upgradeLumber: 210, upgradeTime: 65, trains: ['fom_worker'], desc: 'Coral-walled castle. Unlocks Tier 2.' }),
    bld(R, 'townhall3', { id: 'fom_th3', name: 'Tor an Bhaloir', epithet: 'Tower of Balor', trains: ['fom_worker'], desc: 'The eye-crowned tower. Unlocks Tier 3.' }),
    bld(R, 'farm', { id: 'fom_farm', name: 'Bothán Bia', epithet: 'Feeding Hall', desc: 'Provides 6 food.' }),
    bld(R, 'barracks', { id: 'fom_barracks', name: 'Teach Cogaidh', epithet: 'War House', trains: ['fom_melee', 'fom_ranged', 'fom_elite'], desc: 'Trains Marfóirí, Javelin Hurlers, and (Tier 3) Athaigh.' }),
    bld(R, 'altar', { id: 'fom_altar', name: 'Cloch Fola', epithet: 'Blood Stone', desc: 'Summons and revives the tyrants of the deep.' }),
    bld(R, 'casterhall', { id: 'fom_caster_hall', name: 'Fás na nDorcha', epithet: 'Growth of Darkness', trains: ['fom_caster1', 'fom_caster2'], desc: 'Trains Hex Casters and Sea Witches.' }),
    bld(R, 'siegehall', { id: 'fom_siege_hall', name: 'Poll Léigir', epithet: 'Siege Pit', trains: ['fom_siege'], desc: 'Builds War Rock Lobbers.' }),
    bld(R, 'aerie', { id: 'fom_aerie', name: 'Carraig na nÉan', epithet: 'Crag of the Sea Birds', requires: ['fom_forge'], trains: ['fom_flyer', 'fom_heavy'], desc: 'Roost of Marsh Herons and Sea Wyrms.' }),
    bld(R, 'tower', { id: 'fom_tower', name: 'Túr Deilgneach', epithet: 'Thorn Tower', desc: 'Defensive tower.' }),
    bld(R, 'forge', { id: 'fom_forge', name: 'Ceárta Dubh', epithet: 'Dark Forge', desc: 'Researches attack and armor improvements.' }),
  ],
};
