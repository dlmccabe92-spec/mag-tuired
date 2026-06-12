import type { ItemDef } from '@/game/types';

export const ITEMS: Record<string, ItemDef> = {
  // ----- consumables (shop staples) -----
  deoch_leighis: {
    id: 'deoch_leighis', name: 'Deoch Leighis', desc: 'Healing draught. Restores 250 HP.',
    kind: 'consumable', cost: 110, dropTier: 1, effect: { heal: 250 },
  },
  deoch_mana: {
    id: 'deoch_mana', name: 'Deoch Mana', desc: 'Clarity draught. Restores 150 mana.',
    kind: 'consumable', cost: 100, dropTier: 1, effect: { mana: 150 },
  },
  lia_filleadh: {
    id: 'lia_filleadh', name: 'Lia Filleadh', desc: 'Return stone. Teleports the hero and nearby allies to your town hall.',
    kind: 'consumable', cost: 200, dropTier: 2, effect: { teleport: true },
  },
  deannach: {
    id: 'deannach', name: 'Deannach Léirithe', desc: 'Revealing dust. Briefly uncloaks hidden enemies nearby and reveals the area.',
    kind: 'consumable', cost: 90, dropTier: 1, effect: { reveal: true },
  },
  // ----- permanents -----
  idol_neart: {
    id: 'idol_neart', name: 'Iodhal Nirt', desc: 'Idol of Strength. +4 Strength.',
    kind: 'permanent', cost: 350, dropTier: 2, effect: { str: 4 },
  },
  idol_luas: {
    id: 'idol_luas', name: 'Iodhal Luais', desc: 'Idol of Swiftness. +4 Agility.',
    kind: 'permanent', cost: 350, dropTier: 2, effect: { agi: 4 },
  },
  idol_eagna: {
    id: 'idol_eagna', name: 'Iodhal Eagna', desc: 'Idol of Wisdom. +4 Intelligence.',
    kind: 'permanent', cost: 350, dropTier: 2, effect: { int: 4 },
  },
  fainne_cosanta: {
    id: 'fainne_cosanta', name: 'Fáinne Cosanta', desc: 'Warding Ring. +4 armor.',
    kind: 'permanent', cost: 300, dropTier: 1, effect: { armor: 4 },
  },
  geis_catha: {
    id: 'geis_catha', name: 'Geis Catha', desc: 'Battle Charm. +9 attack damage.',
    kind: 'permanent', cost: 380, dropTier: 2, effect: { dmg: 9 },
  },
  torc_oir: {
    id: 'torc_oir', name: 'Torc Óir', desc: 'Golden Torc. +175 hit points.',
    kind: 'permanent', cost: 400, dropTier: 2, effect: { hp: 175 },
  },
  // ----- artifacts (high creep drops only) -----
  brat_dagda: {
    id: 'brat_dagda', name: 'Brat an Dagda', desc: 'Cloak of the Dagda. +8 HP regeneration per second.',
    kind: 'artifact', cost: 0, dropTier: 3, effect: { hpRegen: 8 },
  },
  sleagh_lugh: {
    id: 'sleagh_lugh', name: 'Sleá Lugh', desc: 'Spear of Lugh. +15 attack damage.',
    kind: 'artifact', cost: 0, dropTier: 3, effect: { dmg: 15 },
  },
  coroin_eriu: {
    id: 'coroin_eriu', name: 'Coróin Ériu', desc: 'Crown of Ériu. +8 to all attributes.',
    kind: 'artifact', cost: 0, dropTier: 3, effect: { allStats: 8 },
  },
};

export const SHOP_STOCK = ['deoch_leighis', 'deoch_mana', 'lia_filleadh', 'deannach', 'fainne_cosanta', 'geis_catha'];

export function rollDrop(tier: number, rand: () => number): string | null {
  if (tier <= 0) return null;
  const pool = Object.values(ITEMS).filter(i => i.dropTier > 0 && i.dropTier <= tier &&
    (tier >= 3 || i.kind !== 'artifact'));
  // weight artifacts only at tier 3
  const weighted = pool.filter(i => (tier === 3 ? true : i.dropTier === tier || rand() < 0.5));
  const pick = weighted.length ? weighted : pool;
  if (!pick.length) return null;
  if (tier === 3) {
    const arts = pick.filter(i => i.kind === 'artifact');
    if (arts.length && rand() < 0.55) return arts[Math.floor(rand() * arts.length)].id;
  }
  return pick[Math.floor(rand() * pick.length)].id;
}
