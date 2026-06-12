// Shared type definitions for Mag Tuired

export type RaceId = 'tuatha' | 'fomoire' | 'aossi' | 'sluagh';
export type AttackType = 'blunt' | 'barbed' | 'arcane' | 'crushing' | 'heroic' | 'primordial';
export type ArmorType = 'robed' | 'padded' | 'plated' | 'fortified' | 'heroic' | 'unshielded';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Attribute = 'str' | 'agi' | 'int';

export const NEUTRAL_HOSTILE = 8; // owner id for creeps
export const NEUTRAL_PASSIVE = 9; // owner id for shops

// ---------------------------------------------------------------- unit defs

export type UnitRole =
  | 'worker' | 'melee' | 'ranged' | 'elite' | 'caster' | 'siege'
  | 'flyer' | 'heavyflyer' | 'summon' | 'creep';

export interface CasterSpell {
  kind: 'heal' | 'nuke' | 'slow' | 'buffArmor' | 'buffAtkSpd';
  amount: number;
  range: number;
  manaCost: number;
  cooldown: number;
  name: string;
}

export interface UnitDef {
  id: string;
  name: string;
  epithet?: string;
  race: RaceId | 'neutral';
  role: UnitRole;
  tier: 1 | 2 | 3;
  food: number;
  gold: number;
  lumber: number;
  buildTime: number; // seconds
  hp: number;
  hpRegen?: number;
  mana?: number;
  manaRegen?: number;
  damage: number;
  attackRange: number; // px; melee ~ 24
  attackCooldown: number; // seconds between attacks
  attackType: AttackType;
  armorType: ArmorType;
  armor: number;
  moveSpeed: number; // px/sec
  sight: number; // px
  radius: number; // collision radius px
  flying?: boolean;
  female?: boolean; // Aos Si Fath Fiada stealth
  requires?: string[]; // building def ids
  casterSpell?: CasterSpell;
  enrageAt?: number; // hp fraction below which +30% damage (Athach)
  auraId?: 'disease' | 'tyrant'; // built-in unit auras
  level?: number; // creep level
  bounty?: number; // gold on kill
  noAttack?: boolean;
  desc?: string;
}

// ------------------------------------------------------------ building defs

export type BuildingRole =
  | 'townhall' | 'barracks' | 'casterhall' | 'siegehall' | 'aerie'
  | 'altar' | 'farm' | 'tower' | 'forge' | 'shop';

export interface BuildingDef {
  id: string;
  name: string;
  epithet?: string;
  race: RaceId | 'neutral';
  role: BuildingRole;
  tier: 1 | 2 | 3;
  gold: number;
  lumber: number;
  buildTime: number;
  hp: number;
  armor: number;
  size: number; // tiles per side (square footprint)
  foodProvided?: number;
  sight: number;
  requires?: string[];
  upgradesTo?: string;
  upgradeGold?: number;
  upgradeLumber?: number;
  upgradeTime?: number;
  attack?: { damage: number; range: number; cooldown: number; attackType: AttackType };
  trains?: string[]; // unit def ids
  desc?: string;
}

// ----------------------------------------------------------------- abilities

export interface AbilityEffect {
  kind:
    | 'nuke'           // single target damage
    | 'nukeOrHeal'     // damage enemy OR heal friendly
    | 'aoePoint'       // damage at point
    | 'line'           // linear skillshot
    | 'healTarget'
    | 'buffTarget'     // armor / damage reduction / thorns on ally
    | 'aoeSelf'        // burst around caster
    | 'passive'        // stat passive
    | 'aura'           // friendly aura
    | 'summon'
    | 'blink'
    | 'invis'
    | 'channel'        // channeled aoe over time around point/self
    | 'chain'          // bouncing damage
    | 'reveal'         // map reveal
    | 'sleep'
    | 'root'
    | 'sacrifice'      // kill friendly for hp or mana
    | 'silence'        // slow + silence target
    | 'massTeleport'
    | 'delayedNuke'    // channel on one target then big damage
    | 'comet';         // aoe dmg + stun + summon
  // numeric params, arrays indexed by ability level - 1
  dmg?: number[];
  heal?: number[];
  radius?: number;
  length?: number;
  width?: number;
  dur?: number[];
  dotDps?: number[];
  dotDur?: number;
  slowPct?: number;
  slowDur?: number;
  stunDur?: number;
  blindPct?: number;
  blindDur?: number;
  armorBuff?: number[];
  armorReduce?: number;
  dmgReductionPct?: number[];
  returnDmg?: number;
  hpRegen?: number[];
  hpRegenMult?: number[];
  evasionPct?: number[];
  atkSpdPct?: number[];
  msPct?: number[];
  dmgPct?: number[];
  lifestealPct?: number[];
  armorAura?: number[];
  summonUnit?: string;
  summonCount?: number[];
  summonDur?: number;
  range?: number[];
  bonusMult?: number;
  bounces?: number;
  falloff?: number;
  dps?: number[];
  healPctPerSec?: number[];
  enemyMaxHpPctPerSec?: number[];
  enemyDps?: number[];
  channelDur?: number;
  delay?: number;
  healPctOfCur?: number;
  manaPctOfMax?: number;
  selfDmgPct?: number[];
}

export type AbilityTarget = 'none' | 'point' | 'unit' | 'ally' | 'enemy' | 'passive';

export interface AbilityDef {
  id: string;
  name: string;
  hotkey: string;
  desc: string;
  maxLevel: number;
  ultimate?: boolean;
  manaCost: number[];
  cooldown: number[];
  castRange: number; // px, 0 = self
  target: AbilityTarget;
  effect: AbilityEffect;
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  race: RaceId | 'neutral';
  primary: Attribute;
  baseStr: number; strGain: number;
  baseAgi: number; agiGain: number;
  baseInt: number; intGain: number;
  baseDamage: number;
  attackRange: number;
  attackCooldown: number;
  moveSpeed: number;
  baseArmor: number;
  abilities: AbilityDef[]; // 3 normal + 1 ultimate
  desc: string;
}

// --------------------------------------------------------------------- items

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  kind: 'consumable' | 'permanent' | 'artifact';
  cost: number; // shop price (0 = drop only)
  dropTier: number; // 0 = not dropped, 1-3
  effect: {
    heal?: number; mana?: number; teleport?: boolean; reveal?: boolean;
    str?: number; agi?: number; int?: number; allStats?: number;
    armor?: number; dmg?: number; hpRegen?: number; hp?: number;
  };
}

// ----------------------------------------------------------------- races

export interface RaceDef {
  id: RaceId;
  name: string;
  irish: string;
  archetype: string;
  color: string;       // primary faction color
  colorDark: string;
  lore: string;
  mechanic: string;    // unique mechanic blurb
  buildings: BuildingDef[];
  units: UnitDef[];
  heroes: HeroDef[];
  workerId: string;
  townHallId: string;
  altarId: string;
  farmId: string;
}

// ----------------------------------------------------------------- map defs

export interface CreepCampDef {
  x: number; y: number; // tile coords
  creeps: string[];     // creep def ids
  dropTier: number;     // 0-3
}

export interface MapDef {
  id: string;
  name: string;
  irish: string;
  desc: string;
  size: number; // tiles per side
  starts: { x: number; y: number }[];
  mines: { x: number; y: number; gold: number }[];
  camps: CreepCampDef[];
  shops: { x: number; y: number }[];
}

// ------------------------------------------------------------------- orders

export type Order =
  | { type: 'idle' }
  | { type: 'hold' }
  | { type: 'move'; x: number; y: number }
  | { type: 'attackmove'; x: number; y: number }
  | { type: 'attack'; targetId: number }
  | { type: 'patrol'; x1: number; y1: number; x2: number; y2: number; leg: 0 | 1 }
  | { type: 'gatherMine'; mineId: number }
  | { type: 'gatherTree'; tx: number; ty: number }
  | { type: 'returnRes' }
  | { type: 'build'; bldId: string; tx: number; ty: number }
  | { type: 'castPoint'; abilityIdx: number; x: number; y: number }
  | { type: 'castUnit'; abilityIdx: number; targetId: number };

// -------------------------------------------------------------------- buffs

export interface Buff {
  id: string;
  until: number; // game time expiry
  msPct?: number;        // movement speed % (+/-)
  atkSpdPct?: number;    // attack speed % (+/-)
  armor?: number;
  dps?: number;          // damage per second (poison etc)
  dpsType?: AttackType;
  stun?: boolean;
  sleep?: boolean;
  root?: boolean;
  silence?: boolean;
  dmgReductionPct?: number;
  dmgTakenMult?: number;
  returnDmg?: number;
  blindPct?: number;     // attacker miss chance
  evasion?: number;      // target dodge chance
  hpRegen?: number;
  hpRegenMult?: number;
  lifestealPct?: number;
  dmgPct?: number;
  revealed?: boolean;    // counters invisibility
  militia?: boolean;
  source?: number;
}

// ----------------------------------------------------------------- entities

export type WorkerTaskKind =
  | 'toMine' | 'inMine' | 'channelMine' | 'toTree' | 'chopping'
  | 'returning' | 'toBuild' | 'building';

export interface WorkerTask {
  kind: WorkerTaskKind;
  mineId?: number;
  tx?: number; ty?: number;     // tree tile
  buildingId?: number;          // under-construction building
  timer: number;
  insideUntil?: number;
}

export interface HeroState {
  defId: string;
  level: number;
  xp: number;
  skillPoints: number;
  abilityLevels: number[]; // 4
  cooldownReady: number[]; // game time when ability ready
  itemStr: number; itemAgi: number; itemInt: number;
  itemArmor: number; itemDmg: number; itemRegen: number; itemHp: number;
  inventory: (string | null)[];
  channel?: { abilityIdx: number; until: number; x: number; y: number; targetId?: number; lastPulse: number };
  bonusNextAttackMult?: number;
}

export interface QueueItem {
  kind: 'unit' | 'hero' | 'upgrade' | 'tech' | 'revive';
  id: string;          // unit/hero/upgrade def id
  progress: number;    // seconds elapsed
  total: number;       // seconds needed
  heroLevel?: number;  // for revive
}

export interface Entity {
  id: number;
  etype: 'unit' | 'building' | 'mine' | 'item';
  owner: number; // 0 human, 1 ai, 8 hostile neutral, 9 passive neutral
  x: number; y: number;
  prevX: number; prevY: number;
  radius: number;
  dead: boolean;
  hp: number; maxHp: number; hpRegen: number;
  armor: number; armorType: ArmorType;
  sight: number;

  // combat
  damage: number;
  attackType: AttackType;
  attackRange: number;
  attackCooldown: number;
  cdTimer: number;
  targetId: number; // 0 = none
  moveSpeed: number;
  flying: boolean;

  mana: number; maxMana: number; manaRegen: number;
  spellCd: number; // caster autocast cooldown

  order: Order;
  path: { x: number; y: number }[] | null;
  pathIdx: number;
  repath: number; // time until repath allowed
  buffs: Buff[];

  unitDef?: UnitDef;
  task?: WorkerTask;
  carry?: { type: 'gold' | 'lumber'; amount: number };
  hero?: HeroState;

  bldDef?: BuildingDef;
  constructing?: boolean;
  buildProgress?: number;
  builderId?: number;
  trainQueue?: QueueItem[];
  rallyX?: number; rallyY?: number;

  goldLeft?: number;
  minersInside?: number;

  itemId?: string;

  campId?: number;
  homeX?: number; homeY?: number;
  sleeping?: boolean;

  invisible?: boolean;
  summonExpire?: number; // game time
  militiaUntil?: number;
  hidden?: boolean; // inside mine
  lastMoveAt?: number; // for Fath Fiada stealth
}

// --------------------------------------------------------------- game config

export interface GameConfig {
  playerRace: RaceId;
  enemyRace: RaceId;
  difficulty: Difficulty;
  mapId: string;
}

export interface GameStats {
  unitsSlain: number;
  unitsLost: number;
  goldMined: number;
  lumberHarvested: number;
  highestHeroLevel: number;
}

export interface PlayerState {
  id: number;
  race: RaceId;
  isAI: boolean;
  gold: number;
  lumber: number;
  gatherMult: number;   // hard AI bonus
  buildMult: number;    // hard AI build speed bonus
  foodUsed: number;
  foodCap: number;
  upgrades: { meleeAtk: number; rangedAtk: number; groundArmor: number; airArmor: number };
  heroesRecruited: string[];
  fallenHeroes: { state: HeroState; diedAt: number }[];
  stats: GameStats;
  defeated: boolean;
}

// --------------------------------------------------------------- UI bridge

export interface CommandButton {
  id: string;
  label: string;
  hotkey: string;
  icon: string;       // single char / emoji-ish glyph
  enabled: boolean;
  tooltip: string;
  costGold?: number;
  costLumber?: number;
  costFood?: number;
  active?: boolean;   // e.g. targeting mode
  progress?: number;  // cooldown fraction remaining
}

export interface SelEntityInfo {
  id: number;
  name: string;
  hp: number; maxHp: number;
  mana: number; maxMana: number;
  isHero: boolean;
}

export interface HeroUIInfo {
  entityId: number;
  name: string;
  title: string;
  level: number;
  xp: number;
  xpToNext: number;
  str: number; agi: number; int: number;
  primary: Attribute;
  damage: number;
  armor: number;
  skillPoints: number;
  inventory: { id: string; name: string; desc: string }[];
  abilities: {
    idx: number; name: string; level: number; maxLevel: number;
    canLearn: boolean; desc: string; ultimate: boolean; hotkey: string;
  }[];
}

export interface UISnapshot {
  gold: number;
  lumber: number;
  foodUsed: number;
  foodCap: number;
  tribute: 'none' | 'low' | 'high';
  isNight: boolean;
  clock: string;
  tier: number;
  selection: SelEntityInfo[];
  primary: {
    name: string;
    epithet?: string;
    hp: number; maxHp: number;
    mana: number; maxMana: number;
    damage?: number; armor?: number; armorType?: string; attackType?: string;
    queue?: { label: string; progress: number }[];
    constructionProgress?: number;
  } | null;
  hero: HeroUIInfo | null;
  buttons: CommandButton[];
  targeting: boolean;
  placingBuilding: string | null;
  gameOver: { victory: boolean; stats: GameStats; enemyStats: GameStats; duration: string } | null;
  paused: boolean;
  toasts: { id: number; text: string; time: number }[];
}
