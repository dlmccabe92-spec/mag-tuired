import type { RaceDef, HeroDef } from '@/game/types';
import { unit, bld } from './common';

const R = 'aossi' as const;

const heroes: HeroDef[] = [
  {
    id: 'manannan', name: 'Manannán mac Lir', title: 'Lord of the Otherworld Sea', race: R,
    primary: 'agi',
    baseStr: 17, strGain: 2.0, baseAgi: 22, agiGain: 2.9, baseInt: 18, intGain: 2.0,
    baseDamage: 24, attackRange: 32, attackCooldown: 1.5, moveSpeed: 96, baseArmor: 2,
    desc: 'Ferryman between worlds, cloaked in mist. A trickster who is never where the blow falls.',
    abilities: [
      {
        id: 'brat_ceo', name: 'Brat na gCeo', hotkey: 'Q', maxLevel: 3,
        desc: 'Cloak of Mists. Nearby allies gain 15/20/25% evasion.',
        manaCost: [0, 0, 0], cooldown: [0, 0, 0], castRange: 0, target: 'passive',
        effect: { kind: 'aura', radius: 180, evasionPct: [15, 20, 25] },
      },
      {
        id: 'bolg', name: 'Bolg Crainne', hotkey: 'W', maxLevel: 3,
        desc: 'The Crane Bag of treasures wards its bearer: 15/20/25% chance to evade attacks.',
        manaCost: [0, 0, 0], cooldown: [0, 0, 0], castRange: 0, target: 'passive',
        effect: { kind: 'passive', evasionPct: [15, 20, 25] },
      },
      {
        id: 'sciath_ghairm', name: 'Sciath an Ghairm', hotkey: 'E', maxLevel: 3,
        desc: 'Manannán steps through the veil to a point 260/330/400 away; his next strike deals double damage.',
        manaCost: [60, 65, 70], cooldown: [14, 12, 10], castRange: 400, target: 'point',
        effect: { kind: 'blink', range: [260, 330, 400], bonusMult: 2 },
      },
      {
        id: 'tir_na_nog', name: 'Tír na nÓg', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: 'Passage to the Otherworld. Teleports Manannán and nearby allies to a friendly building.',
        manaCost: [125], cooldown: [120], castRange: 9999, target: 'point',
        effect: { kind: 'massTeleport', radius: 220 },
      },
    ],
  },
  {
    id: 'aine', name: 'Áine', title: 'Queen of the Sídhe', race: R,
    primary: 'int',
    baseStr: 15, strGain: 1.7, baseAgi: 15, agiGain: 1.8, baseInt: 24, intGain: 3.2,
    baseDamage: 22, attackRange: 175, attackCooldown: 1.65, moveSpeed: 86, baseArmor: 1,
    desc: 'The Summer Sovereign, lady of the fairy hill of Cnoc Áine. The wild itself answers her song.',
    abilities: [
      {
        id: 'freamhacha', name: 'Fréamhacha Ceangail', hotkey: 'Q', maxLevel: 3,
        desc: 'Binding Roots hold a target for 3/4/5s, crushing it for 15 damage per second.',
        manaCost: [70, 75, 80], cooldown: [11, 10, 9], castRange: 220, target: 'enemy',
        effect: { kind: 'root', dur: [3, 4, 5], dps: [15, 15, 15] },
      },
      {
        id: 'duisigh', name: 'Dúisigh an Fhiáin', hotkey: 'W', maxLevel: 3,
        desc: 'Awaken the Wild. Summons 2/3/4 tree-spirits for 45s.',
        manaCost: [90, 100, 110], cooldown: [22, 20, 18], castRange: 0, target: 'none',
        effect: { kind: 'summon', summonUnit: 'sum_treespirit', summonCount: [2, 3, 4], summonDur: 45 },
      },
      {
        id: 'ceol', name: 'Ceol an tSamhraidh', hotkey: 'E', maxLevel: 3,
        desc: 'Song of Summer. Nearby allies gain +1/2/3 armor.',
        manaCost: [0, 0, 0], cooldown: [0, 0, 0], castRange: 0, target: 'passive',
        effect: { kind: 'aura', radius: 210, armorAura: [1, 2, 3] },
      },
      {
        id: 'beannacht_aine', name: 'Beannacht Áine', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: "Áine's Blessing. Channels 10s: allies near Áine heal 8% of max HP per second.",
        manaCost: [170], cooldown: [110], castRange: 0, target: 'none',
        effect: { kind: 'channel', channelDur: 10, radius: 280, healPctPerSec: [8] },
      },
    ],
  },
  {
    id: 'fionn', name: 'Fionn mac Cumhaill', title: 'Captain of the Fianna', race: R,
    primary: 'str',
    baseStr: 23, strGain: 2.9, baseAgi: 16, agiGain: 1.9, baseInt: 17, intGain: 2.0,
    baseDamage: 25, attackRange: 32, attackCooldown: 1.7, moveSpeed: 90, baseArmor: 2,
    desc: 'Hunter-seer of the wild bands. He has tasted the Salmon of Knowledge and leads from the front.',
    abilities: [
      {
        id: 'ordog', name: 'Ordóg an Eolais', hotkey: 'Q', maxLevel: 3,
        desc: 'Thumb of Knowledge reveals a distant area for 12s and grants Fionn +10/15/20% damage.',
        manaCost: [50, 55, 60], cooldown: [16, 14, 12], castRange: 9999, target: 'point',
        effect: { kind: 'reveal', radius: 320, dur: [12, 12, 12], selfDmgPct: [10, 15, 20] },
      },
      {
        id: 'sciath_feinne', name: 'Sciath na Féinne', hotkey: 'W', maxLevel: 3,
        desc: 'Shield of the Fianna. A friendly unit takes 40/55/70% less damage for 8s.',
        manaCost: [60, 65, 70], cooldown: [12, 11, 10], castRange: 220, target: 'ally',
        effect: { kind: 'buffTarget', dmgReductionPct: [40, 55, 70], dur: [8, 8, 8] },
      },
      {
        id: 'gair', name: 'Gáir Catha', hotkey: 'E', maxLevel: 3,
        desc: 'Battle Shout: 90/145/200 damage around Fionn, stunning enemies for 1.5s.',
        manaCost: [80, 85, 90], cooldown: [13, 12, 11], castRange: 0, target: 'none',
        effect: { kind: 'aoeSelf', dmg: [90, 145, 200], radius: 145, stunDur: 1.5 },
      },
      {
        id: 'seilg', name: 'Seilg na Féinne', hotkey: 'R', maxLevel: 1, ultimate: true,
        desc: 'Hunt of the Fianna. Summons 4 Fianna warriors for 40s to fight at Fionn\'s side.',
        manaCost: [150], cooldown: [100], castRange: 0, target: 'none',
        effect: { kind: 'summon', summonUnit: 'sum_fianna', summonCount: [4], summonDur: 40 },
      },
    ],
  },
];

export const aosSi: RaceDef = {
  id: R,
  name: 'Aos Sí',
  irish: 'The Hidden Folk',
  archetype: 'Elusive · Nature-Bound',
  color: '#3fbf6f',
  colorDark: '#1c5e36',
  lore: 'The fairy folk of the hollow hills, who slipped between worlds when the age of mortals came. They strike from moonlight and vanish with the dew.',
  mechanic: 'Fáth Fíada — female Aos Sí units are invisible at night while standing still. Síoga harvest timber without felling trees, and a Sí built near a gold mine draws its gold without hauling.',
  workerId: 'si_worker',
  townHallId: 'si_th1',
  altarId: 'si_altar',
  farmId: 'si_farm',
  heroes,
  units: [
    unit(R, 'worker', { id: 'si_worker', name: 'Síóg', epithet: 'Sprite', female: true, desc: 'Harvests without harming the grove. Enters an ensnared mine to draw gold.' }),
    unit(R, 'melee', { id: 'si_melee', name: 'Fiannóg', epithet: 'Fian Warrior', desc: 'Wild warrior sworn to the hidden courts.' }),
    unit(R, 'ranged', { id: 'si_ranged', name: 'Boghdóir Coille', epithet: 'Forest Bow', female: true, desc: 'Huntress of the deep woods. Vanishes at night while still.' }),
    unit(R, 'elite', { id: 'si_elite', name: 'Fathach Sí', epithet: 'Fairy Giant', food: 5, hp: 1200, damage: 36, attackCooldown: 1.7, moveSpeed: 74, desc: 'A hill given legs and a grudge.' }),
    unit(R, 'caster', {
      id: 'si_caster1', name: 'Bean Leighis', epithet: 'Healing Woman', female: true,
      casterSpell: { kind: 'heal', amount: 100, range: 180, manaCost: 40, cooldown: 3, name: 'Herb-Craft' },
      desc: 'Mends wounds with herb and whisper.',
    }),
    unit(R, 'caster', {
      id: 'si_caster2', name: 'Púca', epithet: 'Shapeshifter Trickster',
      casterSpell: { kind: 'nuke', amount: 75, range: 190, manaCost: 45, cooldown: 5, name: 'Night Mischief' },
      desc: 'A grinning shape of shadow and horsehair.',
    }),
    unit(R, 'siege', { id: 'si_siege', name: 'Crann Catha', epithet: 'Battle Tree', hp: 520, desc: 'An ancient tree, uprooted and furious.' }),
    unit(R, 'flyer', { id: 'si_flyer', name: 'Éan Sí', epithet: 'Fairy Bird', female: true, desc: 'Silver-winged watcher of the mounds.' }),
    unit(R, 'heavyflyer', { id: 'si_heavy', name: 'Capall Sí', epithet: 'Fairy Steed', desc: 'The night-mare of the hollow hills, hooves on the wind.' }),
  ],
  buildings: [
    bld(R, 'townhall', { id: 'si_th1', name: 'Sí', epithet: 'Fairy Mound', upgradesTo: 'si_th2', upgradeGold: 320, upgradeLumber: 190, upgradeTime: 65, trains: ['si_worker'], desc: 'A hollow hill. Built near a gold mine, it ensnares the seam and draws gold without hauling.' }),
    bld(R, 'townhall2', { id: 'si_th2', name: 'Lios Mór', epithet: 'Great Ring-Fort', upgradesTo: 'si_th3', upgradeGold: 360, upgradeLumber: 210, upgradeTime: 65, trains: ['si_worker'], desc: 'A great ring of standing earth. Unlocks Tier 2.' }),
    bld(R, 'townhall3', { id: 'si_th3', name: 'Cnoc na Sí', epithet: 'Hill of the Sídhe', trains: ['si_worker'], desc: 'The shining hill itself. Unlocks Tier 3.' }),
    bld(R, 'farm', { id: 'si_farm', name: 'Tobar na Sí', epithet: 'Fairy Well', desc: 'Provides 6 food. Nearby units slowly recover HP and mana.' }),
    bld(R, 'barracks', { id: 'si_barracks', name: 'Ráth na Laoch', epithet: 'Fort of Champions', trains: ['si_melee', 'si_ranged', 'si_elite'], desc: 'Trains Fiannóga, Forest Bows, and (Tier 3) Fairy Giants.' }),
    bld(R, 'altar', { id: 'si_altar', name: 'Cloch Aisling', epithet: 'Dream Stone', desc: 'Summons and revives the lords of the Otherworld.' }),
    bld(R, 'casterhall', { id: 'si_caster_hall', name: 'Coill Rúin', epithet: 'Grove of Secrets', trains: ['si_caster1', 'si_caster2'], desc: 'Trains Healing Women and Púcaí.' }),
    bld(R, 'siegehall', { id: 'si_siege_hall', name: 'Crann Catha Mór', epithet: 'Elder Battle Tree', trains: ['si_siege'], desc: 'Wakes Battle Trees from their long sleep.' }),
    bld(R, 'aerie', { id: 'si_aerie', name: 'Nead na Gaoithe', epithet: 'Nest of the Wind', requires: ['si_forge'], trains: ['si_flyer', 'si_heavy'], desc: 'Roost of Fairy Birds and Fairy Steeds.' }),
    bld(R, 'tower', { id: 'si_tower', name: 'Tor Draíochta', epithet: 'Enchanted Spire', desc: 'Defensive tower.' }),
    bld(R, 'forge', { id: 'si_forge', name: 'Cloch Ghéaraithe', epithet: 'Whetstone Circle', desc: 'Researches attack and armor improvements.' }),
  ],
};
