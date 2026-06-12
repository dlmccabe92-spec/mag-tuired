// Master simulation state and tick orchestration.
import type { Entity, GameConfig, PlayerState, AttackType, RaceId } from '@/game/types';
import { EntityStore } from '@/engine/ECS';
import { EventBus, GameEvent } from '@/engine/EventBus';
import { GameMap } from './GameMap';
import { Pathfinder } from '@/utils/Pathfinding';
import { getMap } from '@/data/maps';
import { RACES } from '@/data/races';
import {
  TILE, DAY_LENGTH, CYCLE_LENGTH, START_GOLD, START_LUMBER,
  SLUAGH_BLIGHT_REGEN, FAIRY_WELL_REGEN, FAIRY_WELL_MANA,
} from '@/utils/Constants';
import { spawnUnit, spawnBuilding, spawnMine, recomputeFood } from './UnitManager';
import { grantXPToHero, heroCastTick, auraTick, buffTick } from './HeroSystem';
import { combatTick, casterTick, projectileTick, dealDamage } from './CombatSystem';
import { orderTick } from './OrderSystem';
import { resourceTick, workerMoveTick } from './ResourceSystem';
import { buildingTick, buildTaskTick } from './BuildingManager';
import { creepTick, campRespawnTick, spawnCamp, CreepCamp } from './CreepSystem';
import { upkeepTick } from './UpkeepSystem';

export interface Projectile {
  x: number; y: number;
  targetId: number;
  speed: number;
  dmg: number;
  atype: AttackType;
  sourceId: number;
  owner: number;
  color: string;
  dead: boolean;
}

export interface VisualEffect {
  kind: 'ring' | 'burst' | 'beam' | 'heal' | 'levelup' | 'text';
  x: number; y: number;
  x2?: number; y2?: number;
  color: string;
  r0?: number; r1?: number;
  start: number;
  dur: number;
  text?: string;
}

export interface Reveal { x: number; y: number; radius: number; until: number; owner: number }
export interface DelayedHit { targetId: number; sourceId: number; at: number; dmg: number }

function makePlayer(id: number, race: RaceId, isAI: boolean): PlayerState {
  return {
    id, race, isAI,
    gold: START_GOLD, lumber: START_LUMBER,
    gatherMult: 1, buildMult: 1,
    foodUsed: 0, foodCap: 0,
    upgrades: { meleeAtk: 0, rangedAtk: 0, groundArmor: 0, airArmor: 0 },
    heroesRecruited: [],
    fallenHeroes: [],
    stats: { unitsSlain: 0, unitsLost: 0, goldMined: 0, lumberHarvested: 0, highestHeroLevel: 0 },
    defeated: false,
  };
}

export class GameState {
  time = 0;
  tick = 0;
  config: GameConfig;
  map: GameMap;
  store: EntityStore;
  players: PlayerState[];
  pathfinder: Pathfinder;
  bus = new EventBus();
  projectiles: Projectile[] = [];
  effects: VisualEffect[] = [];
  reveals: Reveal[] = [];
  delayedHits: DelayedHit[] = [];
  camps: CreepCamp[] = [];
  winner: number | null = null;
  lastAttackAlert = -99;
  startCamera: { x: number; y: number };
  private sfxLast = new Map<string, number>();

  constructor(config: GameConfig) {
    this.config = config;
    const mapDef = getMap(config.mapId);
    this.map = new GameMap(mapDef);
    this.store = new EntityStore(mapDef.size * TILE);
    this.players = [
      makePlayer(0, config.playerRace, false),
      makePlayer(1, config.enemyRace, true),
    ];
    this.pathfinder = new Pathfinder(mapDef.size, mapDef.size);
    this.startCamera = {
      x: (mapDef.starts[0].x + 2) * TILE,
      y: (mapDef.starts[0].y + 2) * TILE,
    };
    this.setup(mapDef.id);
  }

  private setup(mapId: string) {
    const def = this.map.def;
    // mines
    for (const m of def.mines) spawnMine(this, m.x, m.y, m.gold);
    // neutral shops
    for (const s of def.shops) {
      const b = spawnBuilding(this, 'neutral_shop', 9, s.x, s.y, true);
      b.armorType = 'fortified';
    }
    // creep camps
    for (let i = 0; i < def.camps.length; i++) {
      const c = def.camps[i];
      const camp: CreepCamp = {
        id: i, x: c.x * TILE + TILE / 2, y: c.y * TILE + TILE / 2,
        creeps: c.creeps, dropTier: c.dropTier, aliveIds: [], bossId: 0, respawnAt: 0,
      };
      this.camps.push(camp);
      spawnCamp(this, camp);
    }
    // players
    for (let pid = 0; pid < 2; pid++) {
      const race = RACES[this.players[pid].race];
      const st = def.starts[pid];
      const thTx = st.x - 2, thTy = st.y - 2;
      spawnBuilding(this, race.townHallId, pid, thTx, thTy, true);
      // altar east of TH
      const altTx = st.x + 4, altTy = st.y - 1;
      spawnBuilding(this, race.altarId, pid, altTx, altTy, true);
      // workers in an arc south
      for (let i = 0; i < 5; i++) {
        const wx = (st.x - 2 + i * 1.2) * TILE + TILE / 2;
        const wy = (st.y + 3) * TILE + TILE / 2;
        spawnUnit(this, race.workerId, pid, wx, wy);
      }
      recomputeFood(this, pid);
    }
    this.store.rebuildSpatial();
  }

  isNight(): boolean {
    return this.time % CYCLE_LENGTH >= DAY_LENGTH;
  }
  // 0..1 how deep into night we are (for visuals)
  nightBlend(): number {
    const t = this.time % CYCLE_LENGTH;
    const fade = 8; // seconds of dusk/dawn
    if (t < DAY_LENGTH - fade) return 0;
    if (t < DAY_LENGTH) return (t - (DAY_LENGTH - fade)) / fade;
    if (t < CYCLE_LENGTH - fade) return 1;
    return 1 - (t - (CYCLE_LENGTH - fade)) / fade;
  }
  clockString(): string {
    const m = Math.floor(this.time / 60);
    const s = Math.floor(this.time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  sightOf(e: Entity): number {
    if (this.isNight() && this.players[e.owner]?.race !== 'sluagh') {
      return e.sight * 0.7;
    }
    return e.sight;
  }

  grantXP(heroEnt: Entity, xp: number) {
    grantXPToHero(this, heroEnt, xp);
  }

  addEffect(fx: Omit<VisualEffect, 'start'>) {
    if (this.effects.length > 220) this.effects.splice(0, 40);
    this.effects.push({ ...fx, start: this.time });
  }

  sfx(type: GameEvent['type']) {
    const last = this.sfxLast.get(type) ?? -1;
    if (this.time - last < 0.12) return;
    this.sfxLast.set(type, this.time);
    this.bus.emit({ type } as GameEvent);
  }

  update(dt: number) {
    this.time += dt;
    this.tick++;
    const now = this.time;

    // snapshot prev positions for interpolation + movement detection
    this.store.forEach(e => {
      if (e.etype === 'unit') {
        if (e.x !== e.prevX || e.y !== e.prevY) e.lastMoveAt = now;
        e.prevX = e.x; e.prevY = e.y;
      }
    });

    this.store.rebuildSpatial();

    this.store.forEach(e => {
      if (e.etype === 'unit') {
        if (e.task) {
          resourceTick(this, e, dt);
          workerMoveTick(this, e, dt);
        }
        if (e.order.type === 'build') buildTaskTick(this, e);
        orderTick(this, e, dt);
        combatTick(this, e, dt);
        if (e.unitDef?.casterSpell && (this.tick + e.id) % 30 === 0) casterTick(this, e);
        if (e.hero) heroCastTick(this, e, dt);
        buffTick(this, e, dt);
        if (e.owner === 8) creepTick(this, e);
      } else if (e.etype === 'building') {
        buildingTick(this, e, dt);
        combatTick(this, e, dt); // towers
      }
    });

    projectileTick(this, dt);

    // delayed hits (Gaze of Ruin)
    if (this.delayedHits.length) {
      const due = this.delayedHits.filter(d => now >= d.at);
      if (due.length) {
        this.delayedHits = this.delayedHits.filter(d => now < d.at);
        for (const d of due) {
          const t = this.store.get(d.targetId);
          const src = this.store.get(d.sourceId) ?? null;
          if (t && !t.dead) {
            dealDamage(this, src, t, d.dmg, 'heroic');
            this.addEffect({ kind: 'burst', x: t.x, y: t.y, color: '#ff3333', r0: 8, r1: 44, dur: 0.6 });
          }
        }
      }
    }

    if (this.tick % 30 === 0) auraTick(this);
    if (this.tick % 30 === 15) this.regenTick(0.5);
    if (this.tick % 60 === 0) {
      upkeepTick(this);
      campRespawnTick(this);
      this.stealthTick();
      this.victoryTick();
      this.reveals = this.reveals.filter(r => r.until > now);
      if (this.effects.length) this.effects = this.effects.filter(f => f.start + f.dur > now);
    }

    this.store.sweep();
  }

  private regenTick(period: number) {
    const now = this.time;
    this.store.forEach(e => {
      if (e.etype !== 'unit' || e.dead) return;
      let regen = e.hpRegen;
      for (const b of e.buffs) {
        if (b.until > now && b.hpRegen) regen += b.hpRegen;
      }
      // Sluagh blight regeneration
      if (this.players[e.owner]?.race === 'sluagh' && this.map.isBlighted(e.x, e.y)) {
        regen += SLUAGH_BLIGHT_REGEN;
      }
      if (regen !== 0 && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + regen * period);
      }
      if (e.maxMana > 0 && e.mana < e.maxMana) {
        e.mana = Math.min(e.maxMana, e.mana + e.manaRegen * period);
      }
    });
    // fairy wells
    if (this.players[0].race === 'aossi' || this.players[1].race === 'aossi') {
      this.store.forEach(b => {
        if (b.etype !== 'building' || b.constructing) return;
        if (b.bldDef?.race !== 'aossi' || b.bldDef.role !== 'farm') return;
        const near = this.store.query(b.x, b.y, 150, q =>
          q.owner === b.owner && q.etype === 'unit' && !q.dead);
        for (const u of near) {
          u.hp = Math.min(u.maxHp, u.hp + FAIRY_WELL_REGEN * period);
          if (u.maxMana > 0) u.mana = Math.min(u.maxMana, u.mana + FAIRY_WELL_MANA * period);
        }
      });
    }
  }

  // Aos Si Fath Fiada: female non-hero units invisible at night while still
  private stealthTick() {
    const night = this.isNight();
    const now = this.time;
    for (const pid of [0, 1]) {
      if (this.players[pid].race !== 'aossi') continue;
      this.store.forEach(e => {
        if (e.owner !== pid || e.etype !== 'unit' || e.hero || !e.unitDef?.female) return;
        // still for 1.5s (moving or attacking stamps lastMoveAt)
        e.invisible = night && now - (e.lastMoveAt ?? 0) > 1.5;
      });
    }
  }

  private victoryTick() {
    if (this.winner !== null) return;
    const counts = [0, 0];
    this.store.forEach(e => {
      if (e.etype === 'building' && (e.owner === 0 || e.owner === 1) && !e.dead) {
        counts[e.owner]++;
      }
    });
    for (const pid of [0, 1]) {
      if (counts[pid] === 0) {
        this.players[pid].defeated = true;
        this.winner = pid === 0 ? 1 : 0;
        this.bus.emit({ type: this.winner === 0 ? 'victory' : 'defeat' });
      }
    }
  }
}
