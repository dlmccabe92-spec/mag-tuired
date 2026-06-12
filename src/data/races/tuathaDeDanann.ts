import type { RaceDef, HeroDef } from '@/game/types';
import { unit, bld } from './common';

const R = 'tuatha' as const;

const heroes: HeroDef[] = [
  {
    id: 'lugh', name: 'Lugh Lámhfhada', title: 'Lugh of the Long Arm', race: R,
    primary: 'agi',
    baseStr: 16, strGain: 2.0, baseAgi: 22, agiGain: 2.8, baseInt: 17, intGain: 2.0,
    baseDamage: 24, attackRange: 160, attackCooldown: 1.5, moveSpeed: 92, baseArmor: 2,
    desc: 'Master of all arts, wielder of the unstoppable spear. A mobile striker who shines at picking off targets.',
    abilities: [
      {
        id: 'lia_gais', name: 'Lia an Gháis', hotkey: 'Q', maxLevel: 3,
        desc: 'Hurls the sling-stone that felled giants, dealing 100/175/250 damage to a target.',
        manaCost: [65, 70, 75], cooldown: [9, 9, 9], castRange: 210, target: 'enemy',
        effect: { kind: 'nuke', dmg: [100, 175, 250] },
      },
      {
        id: 'ildanach', name: 'Ildánach', hotkey: 'W', maxLevel: 3,
        desc: 'Master of All Arts. Passively grants 10/20/30% attack speed and 8/14/20% bonus damage.',
        manaCost: [0, 0, 0], cooldown: [0, 0, 0], castRange: 0, target: 'passive',
        effect: { kind: 'passive', atkSpdPct: [10, 20, 30], dmgPct: [8, 14, 20] },
      },
      {
        id: 'gae_assail', name: 'Gáe Assail', hotkey: 'E', maxLevel: 3,
        desc: 'The Spear of Assal pierces a line, dealing 120/200/280 damage to enemies struck.',
        manaCost: [80, 90, 100], cooldown: [13, 12, 11], castRange: 300, target: 'point',
        effect: { kind: 'line', dmg: [120, 200, 280], length: 300, width: 44 },
      },
      {
        id: 'grian_solais', name: 'Grían Solais', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: "Sun's Radiance. A burst of blinding light deals 350 damage around Lugh and blinds enemies (40% miss) for 6s.",
        manaCost: [150], cooldown: [85], castRange: 0, target: 'none',
        effect: { kind: 'aoeSelf', dmg: [350], radius: 190, blindPct: 40, blindDur: 6 },
      },
    ],
  },
  {
    id: 'dagda', name: 'An Dagda Mór', title: 'The Great Father', race: R,
    primary: 'str',
    baseStr: 24, strGain: 3.0, baseAgi: 13, agiGain: 1.5, baseInt: 17, intGain: 2.1,
    baseDamage: 26, attackRange: 30, attackCooldown: 1.8, moveSpeed: 86, baseArmor: 3,
    desc: 'The club-bearing chieftain of the gods. A frontline tank whose cauldron sustains his warband.',
    abilities: [
      {
        id: 'lorg_mor', name: 'Lorg Mór', hotkey: 'Q', maxLevel: 3,
        desc: 'The Great Club slams the earth: 90/160/230 damage around the Dagda, slowing enemies 40% for 4s.',
        manaCost: [75, 80, 85], cooldown: [11, 10, 9], castRange: 0, target: 'none',
        effect: { kind: 'aoeSelf', dmg: [90, 160, 230], radius: 140, slowPct: 40, slowDur: 4 },
      },
      {
        id: 'coire', name: 'Coire an Dagda', hotkey: 'W', maxLevel: 3,
        desc: 'The Cauldron of Plenty. Nearby allies regenerate +1.5/2.5/3.5 HP per second.',
        manaCost: [0, 0, 0], cooldown: [0, 0, 0], castRange: 0, target: 'passive',
        effect: { kind: 'aura', radius: 210, hpRegen: [1.5, 2.5, 3.5] },
      },
      {
        id: 'uaithne', name: 'Uaithne', hotkey: 'E', maxLevel: 3,
        desc: 'The Oak of Three Cries forces an enemy to weep — silenced and slowed 50% for 3/4/5s.',
        manaCost: [70, 75, 80], cooldown: [14, 13, 12], castRange: 220, target: 'enemy',
        effect: { kind: 'silence', dur: [3, 4, 5], slowPct: 50 },
      },
      {
        id: 'flea', name: 'Fleá na Síoraíochta', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: 'Feast of Eternity. Channels 8s: allies near the Dagda regenerate 2.5% max HP per second.',
        manaCost: [150], cooldown: [90], castRange: 0, target: 'none',
        effect: { kind: 'channel', channelDur: 8, radius: 230, healPctPerSec: [2.5] },
      },
    ],
  },
  {
    id: 'brigid', name: 'Brigid Tríréach', title: 'Brigid the Triple-Flame', race: R,
    primary: 'int',
    baseStr: 15, strGain: 1.8, baseAgi: 14, agiGain: 1.6, baseInt: 23, intGain: 3.1,
    baseDamage: 22, attackRange: 170, attackCooldown: 1.7, moveSpeed: 84, baseArmor: 1,
    desc: 'Goddess of the forge, of poetry, and of healing. A fire-caster who mends as fiercely as she burns.',
    abilities: [
      {
        id: 'tine', name: 'Tine Inspioráide', hotkey: 'Q', maxLevel: 3,
        desc: 'Flame of Inspiration scorches an area for 110/170/230 damage plus a 3s burn.',
        manaCost: [80, 90, 100], cooldown: [10, 10, 10], castRange: 230, target: 'point',
        effect: { kind: 'aoePoint', dmg: [110, 170, 230], radius: 115, dotDps: [10, 15, 20], dotDur: 3 },
      },
      {
        id: 'uisce', name: 'Uisce Leighis', hotkey: 'W', maxLevel: 3,
        desc: 'Healing Waters restore 200/350/500 HP to a friendly unit.',
        manaCost: [70, 85, 100], cooldown: [9, 8, 7], castRange: 220, target: 'ally',
        effect: { kind: 'healTarget', heal: [200, 350, 500] },
      },
      {
        id: 'beannacht', name: 'Beanacht na Ceártan', hotkey: 'E', maxLevel: 3,
        desc: 'Blessing of the Forge grants a friendly unit +5/8/12 armor for 30s.',
        manaCost: [50, 55, 60], cooldown: [10, 9, 8], castRange: 220, target: 'ally',
        effect: { kind: 'buffTarget', armorBuff: [5, 8, 12], dur: [30, 30, 30] },
      },
      {
        id: 'lasair', name: 'Lasair Shíoraí', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: 'Eternal Flame. Channels 10s: allies near Brigid gain +25% attack speed and heal 5% max HP/s; enemies burn for 40 damage/s.',
        manaCost: [160], cooldown: [95], castRange: 0, target: 'none',
        effect: { kind: 'channel', channelDur: 10, radius: 210, healPctPerSec: [5], atkSpdPct: [25], enemyDps: [40] },
      },
    ],
  },
];

export const tuathaDeDanann: RaceDef = {
  id: R,
  name: 'Tuatha Dé Danann',
  irish: 'Children of Danu',
  archetype: 'Balanced · Versatile',
  color: '#e6b833',
  colorDark: '#8a6d1a',
  lore: 'Divine artisan-warriors who descended upon Ériu in a cloud of mist, bearing four treasures of power. Balanced armies, strong crafts, and the favor of the goddess Danu.',
  mechanic: 'Call of Danu — your Aithigh (workers) can take up arms as militia for 60 seconds to defend the dún.',
  workerId: 'tdd_worker',
  townHallId: 'tdd_th1',
  altarId: 'tdd_altar',
  farmId: 'tdd_farm',
  heroes,
  units: [
    unit(R, 'worker', { id: 'tdd_worker', name: 'Aithech', epithet: 'Vassal', desc: 'Mines gold, harvests timber, raises buildings. Can answer the Call of Danu.' }),
    unit(R, 'melee', { id: 'tdd_melee', name: 'Gaiscíoch', epithet: 'Champion', desc: 'Stout spear-and-shield infantry of the Tuatha.' }),
    unit(R, 'ranged', { id: 'tdd_ranged', name: 'Saighdeoir', epithet: 'Archer', desc: 'Longbow archer. Deadly against unarmored and flying foes.' }),
    unit(R, 'elite', { id: 'tdd_elite', name: 'Ridire Dána', epithet: 'Knight of Danu', food: 4, desc: 'Elite gold-torced knight, blessed by the goddess.' }),
    unit(R, 'caster', {
      id: 'tdd_caster1', name: 'Draoi', epithet: 'Druid',
      casterSpell: { kind: 'heal', amount: 110, range: 180, manaCost: 45, cooldown: 3, name: 'Mending Mist' },
      desc: 'Keeper of the groves. Heals wounded allies.',
    }),
    unit(R, 'caster', {
      id: 'tdd_caster2', name: 'Filí', epithet: 'Bard-Poet',
      casterSpell: { kind: 'nuke', amount: 80, range: 190, manaCost: 50, cooldown: 5, name: 'Searing Satire' },
      desc: 'His satire raises blisters on the skin of his foes.',
    }),
    unit(R, 'siege', { id: 'tdd_siege', name: 'Clochar Cogaidh', epithet: 'War Stone Thrower', desc: 'Hurls standing stones to crack forts.' }),
    unit(R, 'flyer', { id: 'tdd_flyer', name: 'Marcach Néil', epithet: 'Cloud Rider', desc: 'Scout of the upper airs.' }),
    unit(R, 'heavyflyer', { id: 'tdd_heavy', name: 'Gríobh Órga', epithet: 'Golden Gryphon', desc: 'Sky-lion of the northern isles.' }),
  ],
  buildings: [
    bld(R, 'townhall', { id: 'tdd_th1', name: 'Dún', epithet: 'Fort', upgradesTo: 'tdd_th2', upgradeGold: 320, upgradeLumber: 190, upgradeTime: 65, trains: ['tdd_worker'], desc: 'Heart of the settlement. Drop-off for gold and timber.' }),
    bld(R, 'townhall2', { id: 'tdd_th2', name: 'Ráth', epithet: 'Ringfort', upgradesTo: 'tdd_th3', upgradeGold: 360, upgradeLumber: 210, upgradeTime: 65, trains: ['tdd_worker'], desc: 'A fortified ring of earth and oak. Unlocks Tier 2.' }),
    bld(R, 'townhall3', { id: 'tdd_th3', name: 'Cathair', epithet: 'Citadel', trains: ['tdd_worker'], desc: 'A shining stone citadel. Unlocks Tier 3.' }),
    bld(R, 'farm', { id: 'tdd_farm', name: 'Tobar Naofa', epithet: 'Sacred Well', desc: 'Provides 6 food.' }),
    bld(R, 'barracks', { id: 'tdd_barracks', name: 'Grianán', epithet: 'Sun Hall', trains: ['tdd_melee', 'tdd_ranged', 'tdd_elite'], desc: 'Trains Gaiscígh, Saighdeoirí, and (at Tier 3) Ridirí Dána.' }),
    bld(R, 'altar', { id: 'tdd_altar', name: 'Cloch Lia', epithet: 'Standing Stone', desc: 'Summons and revives the heroes of the Tuatha.' }),
    bld(R, 'casterhall', { id: 'tdd_caster_hall', name: 'Cúirt Draíochta', epithet: 'Court of Sorcery', trains: ['tdd_caster1', 'tdd_caster2'], desc: 'Trains Draoithe and Filí.' }),
    bld(R, 'siegehall', { id: 'tdd_siege_hall', name: 'Ceárta Cogaidh', epithet: 'War Workshop', trains: ['tdd_siege'], desc: 'Builds War Stone Throwers.' }),
    bld(R, 'aerie', { id: 'tdd_aerie', name: 'Nead na Spéire', epithet: 'Aerie of the Sky', requires: ['tdd_forge'], trains: ['tdd_flyer', 'tdd_heavy'], desc: 'Roost of Cloud Riders and Golden Gryphons.' }),
    bld(R, 'tower', { id: 'tdd_tower', name: 'Túr Faire', epithet: 'Lookout Tower', desc: 'Defensive tower.' }),
    bld(R, 'forge', { id: 'tdd_forge', name: 'Ceárta an Ghabha', epithet: "The Smith's Forge", desc: 'Researches attack and armor improvements.' }),
  ],
};
