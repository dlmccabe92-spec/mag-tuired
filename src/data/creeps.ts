// Neutral creeps and summoned units.
import type { UnitDef } from '@/game/types';

function creep(o: Partial<UnitDef> & { id: string; name: string; level: number }): UnitDef {
  return {
    race: 'neutral', role: 'creep', tier: 1, food: 0, gold: 0, lumber: 0, buildTime: 0,
    hp: 300, damage: 12, attackRange: 28, attackCooldown: 1.3,
    attackType: 'blunt', armorType: 'unshielded', armor: 0,
    moveSpeed: 80, sight: 280, radius: 11, bounty: 15 + o.level * 6,
    ...o,
  } as UnitDef;
}

export const CREEPS: Record<string, UnitDef> = {
  faolchu: creep({
    id: 'faolchu', name: 'Faolchú', epithet: 'Dire Wolf', level: 2,
    hp: 300, damage: 13, moveSpeed: 95, desc: 'A grey hunter of the night roads.',
  }),
  torc: creep({
    id: 'torc', name: 'Torc Allta', epithet: 'Wild Boar', level: 3,
    hp: 450, damage: 18, armor: 1, desc: 'A bristled boar with murder in its small eyes.',
  }),
  feardearg: creep({
    id: 'feardearg', name: 'Fear Dearg', epithet: 'Red Man', level: 3,
    hp: 320, damage: 19, attackRange: 150, attackType: 'barbed', armorType: 'padded',
    desc: 'A red-coated trickster with a cruel aim.',
  }),
  damhanalla: creep({
    id: 'damhanalla', name: 'Damhán Alla', epithet: 'Great Spider', level: 4,
    hp: 550, damage: 24, armor: 1, desc: 'A bog-spider grown fat on lost travelers.',
  }),
  bodach: creep({
    id: 'bodach', name: 'Bodach', epithet: 'Night Churl', level: 5,
    hp: 700, damage: 30, armor: 2, desc: 'A lumbering shadow that raps on windows and breaks down doors.',
  }),
  bananach: creep({
    id: 'bananach', name: 'Bánánach', epithet: 'Shrieker of Battle', level: 6,
    hp: 600, damage: 26, attackRange: 160, attackType: 'arcane', armorType: 'robed',
    mana: 100, desc: 'A pale haunter of battlefields.',
  }),
  gruagach: creep({
    id: 'gruagach', name: 'Gruagach', epithet: 'Shaggy Giant', level: 7,
    hp: 950, damage: 38, armor: 3, attackType: 'primordial', radius: 14,
    desc: 'A hairy giant of the lonely glens.',
  }),
  oilliphéist: creep({
    id: 'oilliphéist', name: 'Oilliphéist', epithet: 'Great Serpent', level: 9,
    hp: 1500, damage: 55, armor: 4, attackType: 'primordial', radius: 17,
    attackCooldown: 1.6, desc: 'The river-carving serpent of legend. Guards true treasure.',
  }),
};

// Summons (timed life, unshielded)
function summon(o: Partial<UnitDef> & { id: string; name: string }): UnitDef {
  return {
    race: 'neutral', role: 'summon', tier: 1, food: 0, gold: 0, lumber: 0, buildTime: 0,
    hp: 350, damage: 16, attackRange: 28, attackCooldown: 1.2,
    attackType: 'blunt', armorType: 'unshielded', armor: 0,
    moveSpeed: 88, sight: 280, radius: 10,
    ...o,
  } as UnitDef;
}

export const SUMMONS: Record<string, UnitDef> = {
  sum_seabeast: summon({ id: 'sum_seabeast', name: 'Péist Bheag', epithet: 'Sea-Beast', hp: 420, damage: 19 }),
  sum_treespirit: summon({ id: 'sum_treespirit', name: 'Spiorad Crainn', epithet: 'Tree-Spirit', hp: 380, damage: 17 }),
  sum_fianna: summon({ id: 'sum_fianna', name: 'Laoch Féinne', epithet: 'Fianna Warrior', hp: 450, damage: 22, armor: 2 }),
  sum_skeleton: summon({ id: 'sum_skeleton', name: 'Cnámharlach', epithet: 'Skeletal Warrior', hp: 300, damage: 14 }),
  sum_golem: summon({ id: 'sum_golem', name: 'Gólam Chroim', epithet: 'Golem of Crom', hp: 1100, damage: 45, armor: 4, radius: 15, moveSpeed: 80 }),
  // Tuatha militia is handled via buff, not a summon.
};

export const ALL_EXTRA_UNITS: Record<string, UnitDef> = { ...CREEPS, ...SUMMONS };
