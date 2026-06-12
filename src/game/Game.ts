// Central orchestrator: owns the sim, loop, renderer, input, AI, audio, UI bridge.
import type { Entity, GameConfig, UISnapshot, CommandButton, HeroUIInfo, AbilityTarget } from '@/game/types';
import { GameState } from '@/simulation/GameState';
import { GameLoop } from '@/engine/GameLoop';
import { Camera } from '@/engine/Camera';
import { Renderer } from '@/renderer/Renderer';
import { FogOfWar } from '@/renderer/FogOfWar';
import { MinimapRenderer } from '@/renderer/MinimapRenderer';
import { InputManager } from '@/input/InputManager';
import { entityAt, entitiesInBox, sortSelection } from '@/input/Selection';
import { buildCommandCard, UICardMode } from '@/input/CommandCard';
import { AIController } from '@/ai/AIController';
import { AudioManager } from '@/audio/AudioManager';
import { TILE, tributeTier } from '@/utils/Constants';
import { getBldDef, getHeroDef, getUnitDef } from '@/data/races';
import { ITEMS } from '@/data/items';
import { T_TREE } from '@/simulation/GameMap';
import { smartOrder, issueMove, issueAttack, orderGatherTree, clearOrder, requestPath } from '@/simulation/OrderSystem';
import {
  trainUnit, recruitHero, reviveHero, startBuild, upgradeTownHall,
  research, buyItem, callMilitia,
} from '@/simulation/Actions';
import { canCast, orderCast, learnAbility, canLearn, useItem, xpToNext } from '@/simulation/HeroSystem';
import { heroAttrTotals } from '@/simulation/UnitManager';
import { playerTier } from '@/simulation/BuildingManager';
import { dist } from '@/utils/Vector2';

interface Targeting {
  buttonId: string;
  abilityIdx?: number;
  target: AbilityTarget | 'attack' | 'patrol';
}

export class Game {
  state: GameState;
  camera: Camera;
  loop: GameLoop;
  renderer: Renderer;
  fog: FogOfWar;
  minimap: MinimapRenderer;
  input: InputManager;
  ai: AIController;
  audio = new AudioManager();

  private selection: number[] = [];
  private cardMode: UICardMode = 'normal';
  private targeting: Targeting | null = null;
  private placing: { bldId: string; tx: number; ty: number; valid: boolean } | null = null;
  private mouseWorld = { x: 0, y: 0 };
  private controlGroups = new Map<string, number[]>();
  private lastGroupTap = { key: '', time: 0 };
  private toasts: { id: number; text: string; time: number }[] = [];
  private toastId = 1;
  private fogTimer = 0;
  private miniTimer = 0;
  private snapTimer = 0;
  private lastRender = 0;
  private gameOver = false;
  private busOff: () => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private minimapCanvas: HTMLCanvasElement,
    config: GameConfig,
    private onSnapshot: (s: UISnapshot) => void,
  ) {
    this.state = new GameState(config);
    this.camera = new Camera(this.state.map.size);
    this.camera.centerOn(this.state.startCamera.x, this.state.startCamera.y);
    this.renderer = new Renderer(canvas);
    this.fog = new FogOfWar(this.state.map.size, 0);
    this.fog.update(this.state);
    this.minimap = new MinimapRenderer(this.state.map.size);
    this.ai = new AIController(this.state, config.difficulty);
    this.input = new InputManager(canvas, this.camera, {
      onLeftClick: (wx, wy) => this.leftClick(wx, wy),
      onBoxSelect: (a, b, c, d) => this.boxSelect(a, b, c, d),
      onRightClick: (wx, wy) => this.rightClick(wx, wy),
      onHotkey: (k, ctrl, shift) => this.hotkey(k, ctrl, shift),
      onEsc: () => this.escape(),
      onMouseMove: (wx, wy) => this.mouseMove(wx, wy),
    });
    this.busOff = this.state.bus.on(e => {
      this.audio.play(e.type);
      if (e.type === 'toast') this.pushToast(e.msg);
      if (e.type === 'underAttack') {
        this.pushToast('⚔ Your forces are under attack!');
        this.audio.play('underAttack');
      }
    });
    this.loop = new GameLoop(dt => this.update(dt), a => this.render(a), 60);
    this.loop.start();
    this.pushToast('Gather gold and timber. Raise an army. Destroy the enemy.');
  }

  // ------------------------------------------------------------ loop

  private update(dt: number) {
    if (this.gameOver) return;
    this.state.update(dt);
    this.ai.tick(this.state);
    if (this.state.winner !== null && !this.gameOver) {
      this.gameOver = true;
      this.audio.play(this.state.winner === 0 ? 'victory' : 'defeat');
      this.publishSnapshot();
    }
  }

  private render(alpha: number) {
    const now = performance.now() / 1000;
    const rdt = Math.min(0.1, this.lastRender ? now - this.lastRender : 0.016);
    this.lastRender = now;

    // camera pan
    const pan = this.input.panVector(rdt);
    if (pan.dx || pan.dy) this.camera.pan(pan.dx, pan.dy);

    // fog cadence
    this.fogTimer += rdt;
    if (this.fogTimer >= 0.25) {
      this.fogTimer = 0;
      this.fog.update(this.state);
      this.audio.setNight(this.state.isNight());
    }

    this.renderer.render(this.state, this.camera, alpha, {
      selection: new Set(this.selection),
      dragBox: this.input.dragBox,
      placing: this.placing,
    }, this.fog);

    this.miniTimer += rdt;
    if (this.miniTimer >= 0.2) {
      this.miniTimer = 0;
      const mm = this.minimapCanvas.getContext('2d');
      if (mm) this.minimap.render(mm, this.minimapCanvas.width, this.state, this.camera, this.fog);
    }

    this.snapTimer += rdt;
    if (this.snapTimer >= 0.1) {
      this.snapTimer = 0;
      this.publishSnapshot();
    }
  }

  // ------------------------------------------------------------ input handlers

  private selectedEntities(): Entity[] {
    const out: Entity[] = [];
    for (const id of this.selection) {
      const e = this.state.store.get(id);
      if (e) out.push(e);
    }
    return out;
  }

  private leftClick(wx: number, wy: number) {
    this.audio.unlock();
    if (this.placing) {
      this.confirmPlacement();
      return;
    }
    if (this.targeting) {
      this.executeTargeted(wx, wy);
      return;
    }
    const e = entityAt(this.state, this.fog, wx, wy);
    if (e) {
      this.selection = [e.id];
      this.audio.play('select');
    } else {
      this.selection = [];
    }
    this.cardMode = 'normal';
  }

  private boxSelect(wx0: number, wy0: number, wx1: number, wy1: number) {
    if (this.placing || this.targeting) return;
    const units = entitiesInBox(this.state, wx0, wy0, wx1, wy1);
    if (units.length) {
      this.selection = sortSelection(this.state, units.map(u => u.id));
      this.audio.play('select');
    } else {
      this.selection = [];
    }
    this.cardMode = 'normal';
  }

  private rightClick(wx: number, wy: number) {
    this.audio.unlock();
    if (this.placing) { this.placing = null; return; }
    if (this.targeting) { this.targeting = null; return; }
    const sel = this.selectedEntities().filter(e => e.owner === 0);
    if (!sel.length) return;
    const target = entityAt(this.state, this.fog, wx, wy);
    // tree gather for workers
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const isTree = this.state.map.inBounds(tx, ty) &&
      this.state.map.tiles[ty * this.state.map.size + tx] === T_TREE;
    let ordered = false;
    if (isTree) {
      for (const e of sel) {
        const canChop = e.unitDef?.role === 'worker' || e.unitDef?.id === 'slu_melee';
        if (canChop && (e.militiaUntil ?? 0) < this.state.time) {
          orderGatherTree(this.state, e, tx, ty);
          ordered = true;
        }
      }
      if (ordered) return;
    }
    smartOrder(this.state, sel, wx, wy, target && target.id !== sel[0].id ? target : null);
  }

  private mouseMove(wx: number, wy: number) {
    this.mouseWorld = { x: wx, y: wy };
    if (this.placing) {
      const def = getBldDef(this.placing.bldId);
      const tx = Math.round(wx / TILE - def.size / 2);
      const ty = Math.round(wy / TILE - def.size / 2);
      const needBlight = def.race === 'sluagh' && def.role !== 'townhall';
      this.placing.tx = tx;
      this.placing.ty = ty;
      this.placing.valid = this.state.map.canPlace(tx, ty, def.size, needBlight);
    }
  }

  private escape() {
    if (this.placing) { this.placing = null; return; }
    if (this.targeting) { this.targeting = null; return; }
    if (this.cardMode === 'build') { this.cardMode = 'normal'; return; }
    this.setPaused(!this.loop.paused);
  }

  private hotkey(key: string, ctrl: boolean, shift: boolean) {
    void shift;
    // control groups
    if (/^\d$/.test(key)) {
      // when a shop is selected, digits buy items
      const first = this.selectedEntities()[0];
      if (!ctrl && first?.etype === 'building' && first.bldDef?.role === 'shop') {
        const btn = this.currentButtons().find(b => b.hotkey === key);
        if (btn) { this.handleCommand(btn.id); return; }
      }
      if (ctrl) {
        if (this.selection.length) this.controlGroups.set(key, [...this.selection]);
        return;
      }
      const group = this.controlGroups.get(key);
      if (group?.length) {
        const alive = group.filter(id => this.state.store.get(id));
        if (alive.length) {
          this.selection = sortSelection(this.state, alive);
          const now = performance.now();
          if (this.lastGroupTap.key === key && now - this.lastGroupTap.time < 380) {
            const e = this.state.store.get(alive[0]);
            if (e) this.camera.centerOn(e.x, e.y);
          }
          this.lastGroupTap = { key, time: now };
        }
      }
      return;
    }
    // hero selection F1-F3
    if (key === 'F1' || key === 'F2' || key === 'F3') {
      const idx = Number(key[1]) - 1;
      const heroes: Entity[] = [];
      this.state.store.forEach(e => { if (e.owner === 0 && e.hero && !e.dead) heroes.push(e); });
      heroes.sort((a, b) => a.id - b.id);
      if (heroes[idx]) {
        this.selection = [heroes[idx].id];
        this.camera.centerOn(heroes[idx].x, heroes[idx].y);
        this.audio.play('select');
      }
      return;
    }
    if (key === 'Tab') {
      if (this.selection.length > 1) this.selection.push(this.selection.shift()!);
      return;
    }
    // command card hotkeys
    const btn = this.currentButtons().find(b => b.hotkey.toUpperCase() === key.toUpperCase());
    if (btn && btn.enabled) this.handleCommand(btn.id);
  }

  private currentButtons(): CommandButton[] {
    return buildCommandCard(this.state, this.selectedEntities(), this.cardMode, this.targeting?.buttonId ?? null);
  }

  // ------------------------------------------------------------ commands

  handleCommand(id: string) {
    this.audio.unlock();
    const sel = this.selectedEntities();
    const first = sel[0];
    const err = (msg?: string) => {
      this.audio.play('error');
      if (msg) this.pushToast(msg);
    };

    if (id === 'back') { this.cardMode = 'normal'; return; }
    if (id === 'buildmenu') { this.cardMode = 'build'; return; }
    if (id === 'stop') {
      for (const e of sel) if (e.owner === 0 && e.etype === 'unit') { clearOrder(e); e.task = undefined; }
      return;
    }
    if (id === 'hold') {
      for (const e of sel) if (e.owner === 0 && e.etype === 'unit') { clearOrder(e); e.order = { type: 'hold' }; }
      return;
    }
    if (id === 'attack' || id === 'patrol') {
      this.targeting = { buttonId: id, target: id as 'attack' | 'patrol' };
      return;
    }
    if (id.startsWith('train:')) {
      const b = sel.find(e => e.etype === 'building' && e.owner === 0);
      if (!b) return;
      const r = trainUnit(this.state, b, id.slice(6));
      if (!r.ok) err(r.err);
      return;
    }
    if (id.startsWith('hero:')) {
      const b = sel.find(e => e.bldDef?.role === 'altar' && e.owner === 0);
      if (!b) return;
      const r = recruitHero(this.state, b, id.slice(5));
      if (!r.ok) err(r.err);
      return;
    }
    if (id.startsWith('revive:')) {
      const b = sel.find(e => e.bldDef?.role === 'altar' && e.owner === 0);
      if (!b) return;
      const r = reviveHero(this.state, b, id.slice(7));
      if (!r.ok) err(r.err);
      return;
    }
    if (id === 'upgrade') {
      const b = sel.find(e => e.bldDef?.role === 'townhall' && e.owner === 0);
      if (!b) return;
      const r = upgradeTownHall(this.state, b);
      if (!r.ok) err(r.err);
      return;
    }
    if (id === 'militia') {
      const b = sel.find(e => e.bldDef?.role === 'townhall' && e.owner === 0);
      if (!b) return;
      const r = callMilitia(this.state, b);
      if (!r.ok) err(r.err);
      return;
    }
    if (id.startsWith('research:')) {
      const b = sel.find(e => e.bldDef?.role === 'forge' && e.owner === 0);
      if (!b) return;
      const r = research(this.state, b, id.slice(9) as 'meleeAtk' | 'rangedAtk' | 'groundArmor' | 'airArmor');
      if (!r.ok) err(r.err);
      return;
    }
    if (id.startsWith('buy:')) {
      const shop = sel.find(e => e.bldDef?.role === 'shop');
      if (!shop) return;
      let hero: Entity | null = null;
      let bestD = 260;
      this.state.store.forEach(e => {
        if (e.etype !== 'unit' || !e.hero || e.owner !== 0 || e.dead) return;
        const d = dist(e.x, e.y, shop.x, shop.y);
        if (d < bestD) { bestD = d; hero = e; }
      });
      if (!hero) { err('Bring a hero close to the merchant.'); return; }
      const r = buyItem(this.state, shop, hero, id.slice(4));
      if (!r.ok) err(r.err);
      return;
    }
    if (id.startsWith('build:')) {
      const bldId = id.slice(6);
      const def = getBldDef(bldId);
      const p = this.state.players[0];
      if (p.gold < def.gold || p.lumber < def.lumber) { err('Not enough resources.'); return; }
      this.placing = { bldId, tx: Math.round(this.mouseWorld.x / TILE), ty: Math.round(this.mouseWorld.y / TILE), valid: false };
      this.cardMode = 'normal';
      return;
    }
    if (id.startsWith('ability:')) {
      const idx = Number(id.slice(8));
      const hero = sel.find(e => e.hero && e.owner === 0);
      if (!hero?.hero) return;
      const ab = getHeroDef(hero.hero.defId).abilities[idx];
      const chk = canCast(this.state, hero, idx);
      if (!chk.ok) { err(chk.err); return; }
      if (ab.target === 'none') {
        orderCast(this.state, hero, idx, hero.x, hero.y);
      } else {
        this.targeting = { buttonId: id, abilityIdx: idx, target: ab.target };
      }
      return;
    }
    if (id.startsWith('learn:')) {
      const idx = Number(id.slice(6));
      const hero = sel.find(e => e.hero && e.owner === 0);
      if (!hero) return;
      if (!learnAbility(this.state, hero, idx)) err();
      else this.audio.play('levelup');
      return;
    }
    if (id.startsWith('useitem:')) {
      const slot = Number(id.slice(8));
      const hero = sel.find(e => e.hero && e.owner === 0);
      if (!hero) return;
      if (!useItem(this.state, hero, slot)) err();
      else this.audio.play('cast');
      return;
    }
  }

  private executeTargeted(wx: number, wy: number) {
    const t = this.targeting;
    if (!t) return;
    this.targeting = null;
    const sel = this.selectedEntities().filter(e => e.owner === 0 && e.etype === 'unit');
    if (!sel.length) return;

    if (t.target === 'attack') {
      const target = entityAt(this.state, this.fog, wx, wy);
      for (const e of sel) {
        if (target && target.owner !== 0 && target.etype !== 'mine' && target.etype !== 'item' && target.owner !== 9) {
          issueAttack(this.state, e, target.id);
        } else {
          issueMove(this.state, e, wx, wy, true);
        }
      }
      return;
    }
    if (t.target === 'patrol') {
      for (const e of sel) {
        e.task = undefined;
        e.order = { type: 'patrol', x1: e.x, y1: e.y, x2: wx, y2: wy, leg: 0 };
        requestPath(this.state, e, wx, wy);
      }
      return;
    }
    // ability targeting
    const hero = sel.find(e => e.hero);
    if (!hero || t.abilityIdx === undefined) return;
    if (t.target === 'point') {
      orderCast(this.state, hero, t.abilityIdx, wx, wy);
      return;
    }
    const target = entityAt(this.state, this.fog, wx, wy);
    if (!target || target.etype === 'mine' || target.etype === 'item') {
      this.pushToast('No target.');
      return;
    }
    if (t.target === 'ally' && target.owner !== 0) { this.pushToast('Must target a friendly unit.'); return; }
    if (t.target === 'enemy' && (target.owner === 0 || target.owner === 9)) { this.pushToast('Must target an enemy.'); return; }
    orderCast(this.state, hero, t.abilityIdx, target.x, target.y, target.id);
  }

  private confirmPlacement() {
    const pl = this.placing;
    if (!pl) return;
    if (!pl.valid) { this.audio.play('error'); return; }
    const worker = this.selectedEntities().find(e =>
      e.owner === 0 && e.unitDef?.role === 'worker');
    if (!worker) { this.placing = null; return; }
    const r = startBuild(this.state, worker, pl.bldId, pl.tx, pl.ty);
    if (!r.ok) {
      this.audio.play('error');
      this.pushToast(r.err ?? 'Cannot build there.');
    } else {
      this.audio.play('build');
    }
    this.placing = null;
  }

  // ------------------------------------------------------------ external API (HUD)

  minimapInteract(nx: number, ny: number, button: number) {
    const wx = nx * this.state.map.size * TILE;
    const wy = ny * this.state.map.size * TILE;
    if (button === 2) {
      const sel = this.selectedEntities().filter(e => e.owner === 0);
      if (sel.length) smartOrder(this.state, sel, wx, wy, null);
    } else {
      this.camera.centerOn(wx, wy);
    }
  }

  setPaused(p: boolean) {
    this.loop.paused = p;
    this.publishSnapshot();
  }
  get paused() { return this.loop.paused; }

  setMuted(m: boolean) { this.audio.setMuted(m); }
  setVolume(v: number) { this.audio.setVolume(v); }

  resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.camera.resize(w, h);
  }

  selectEntity(id: number) {
    if (this.state.store.get(id)) {
      this.selection = [id];
      this.audio.play('select');
    }
  }

  dispose() {
    this.loop.stop();
    this.input.dispose();
    this.busOff();
    this.audio.dispose();
  }

  private pushToast(text: string) {
    this.toasts.push({ id: this.toastId++, text, time: performance.now() });
    if (this.toasts.length > 5) this.toasts.shift();
  }

  // ------------------------------------------------------------ snapshot

  private publishSnapshot() {
    // prune selection & toasts
    this.selection = this.selection.filter(id => this.state.store.get(id));
    const now = performance.now();
    this.toasts = this.toasts.filter(t => now - t.time < 6000);

    const p = this.state.players[0];
    const sel = this.selectedEntities();
    const first = sel[0];

    let hero: HeroUIInfo | null = null;
    const heroEnt = sel.find(e => e.hero);
    if (heroEnt?.hero) {
      const h = heroEnt.hero;
      const hd = getHeroDef(h.defId);
      const attrs = heroAttrTotals(h);
      hero = {
        entityId: heroEnt.id,
        name: hd.name,
        title: hd.title,
        level: h.level,
        xp: h.xp - (h.level > 1 ? xpThreshBelow(h.level) : 0),
        xpToNext: xpToNext(h.level) === Infinity ? 0 : xpToNext(h.level),
        str: attrs.str, agi: attrs.agi, int: attrs.int,
        primary: hd.primary,
        damage: Math.round(heroEnt.damage),
        armor: Math.round(heroEnt.armor * 10) / 10,
        skillPoints: h.skillPoints,
        inventory: h.inventory.map(itemId => itemId ? {
          id: itemId,
          name: ITEMS[itemId]?.name ?? itemId,
          desc: ITEMS[itemId]?.desc ?? '',
        } : { id: '', name: '', desc: '' }),
        abilities: hd.abilities.map((ab, idx) => ({
          idx,
          name: ab.name,
          level: h.abilityLevels[idx],
          maxLevel: ab.maxLevel,
          canLearn: canLearn(h, idx),
          desc: ab.desc,
          ultimate: !!ab.ultimate,
          hotkey: ab.hotkey,
        })),
      };
    }

    let primary: UISnapshot['primary'] = null;
    if (first) {
      const name = first.unitDef?.name ?? first.bldDef?.name ?? (first.etype === 'mine' ? 'Gold Mine' : 'Item');
      const epithet = first.unitDef?.epithet ?? first.bldDef?.epithet ??
        (first.etype === 'mine' ? `${Math.max(0, Math.round(first.goldLeft ?? 0))} gold remains` : undefined);
      primary = {
        name: first.hero ? getHeroDef(first.hero.defId).name : name,
        epithet: first.hero ? getHeroDef(first.hero.defId).title : epithet,
        hp: Math.ceil(first.hp), maxHp: first.maxHp,
        mana: Math.floor(first.mana), maxMana: first.maxMana,
        damage: first.etype === 'unit' || first.bldDef?.attack ? Math.round(first.damage) : undefined,
        armor: first.etype !== 'mine' ? Math.round(first.armor * 10) / 10 : undefined,
        armorType: first.etype !== 'mine' ? first.armorType : undefined,
        attackType: (first.etype === 'unit' && !first.unitDef?.noAttack) || first.bldDef?.attack ? first.attackType : undefined,
        constructionProgress: first.constructing ? first.buildProgress : undefined,
        queue: first.owner === 0 ? first.trainQueue?.map(q => ({
          label: queueLabel(q.kind, q.id),
          progress: q.progress / q.total,
        })) : undefined,
      };
    }

    const snap: UISnapshot = {
      gold: Math.floor(p.gold),
      lumber: Math.floor(p.lumber),
      foodUsed: p.foodUsed,
      foodCap: p.foodCap,
      tribute: tributeTier(p.foodUsed),
      isNight: this.state.isNight(),
      clock: this.state.clockString(),
      tier: playerTier(this.state, 0),
      selection: sel.map(e => ({
        id: e.id,
        name: e.hero ? getHeroDef(e.hero.defId).name : e.unitDef?.name ?? e.bldDef?.name ?? 'Mine',
        hp: Math.ceil(e.hp), maxHp: e.maxHp,
        mana: Math.floor(e.mana), maxMana: e.maxMana,
        isHero: !!e.hero,
      })),
      primary,
      hero,
      buttons: this.currentButtons(),
      targeting: this.targeting !== null,
      placingBuilding: this.placing?.bldId ?? null,
      gameOver: this.state.winner !== null ? {
        victory: this.state.winner === 0,
        stats: this.state.players[0].stats,
        enemyStats: this.state.players[1].stats,
        duration: this.state.clockString(),
      } : null,
      paused: this.loop.paused,
      toasts: this.toasts.map(t => ({ id: t.id, text: t.text, time: t.time })),
    };
    this.onSnapshot(snap);
  }
}

function xpThreshBelow(level: number): number {
  const T = [0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5400];
  return T[level - 1] ?? 0;
}

function queueLabel(kind: string, id: string): string {
  try {
    if (kind === 'unit') return getUnitDef(id).name;
    if (kind === 'hero' || kind === 'revive') return getHeroDef(id).name;
    if (kind === 'tech') return getBldDef(id).name;
    if (kind === 'upgrade') return 'Research';
  } catch { /* noop */ }
  return id;
}
