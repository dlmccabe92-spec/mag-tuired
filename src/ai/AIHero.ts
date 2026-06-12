// AI hero skill learning, ability usage, self-preservation.
import type { Entity } from '@/game/types';
import type { GameState } from '@/simulation/GameState';
import type { AIParams } from './AIDifficulty';
import { getHeroDef } from '@/data/races';
import { dist } from '@/utils/Vector2';
import { canLearn, learnAbility, canCast, orderCast } from '@/simulation/HeroSystem';
import { isEnemy, canTarget } from '@/simulation/CombatSystem';
import { issueMove } from '@/simulation/OrderSystem';

export function heroDecide(state: GameState, pid: number, params: AIParams, heroes: Entity[], baseX: number, baseY: number) {
  const now = state.time;
  for (const e of heroes) {
    const h = e.hero;
    if (!h) continue;

    // learn skills: ult first when available, otherwise rotate normals
    if (h.skillPoints > 0) {
      if (canLearn(h, 3)) learnAbility(state, e, 3);
      else {
        const order = [0, 1, 2].sort((a, b) => h.abilityLevels[a] - h.abilityLevels[b]);
        for (const idx of order) {
          if (canLearn(h, idx)) { learnAbility(state, e, idx); break; }
        }
      }
    }

    // retreat when gravely wounded (hard only)
    if (params.heroRetreatHpPct > 0) {
      const hpPct = (e.hp / e.maxHp) * 100;
      if (hpPct < params.heroRetreatHpPct && dist(e.x, e.y, baseX, baseY) > 350) {
        issueMove(state, e, baseX, baseY, false);
        continue;
      }
    }

    if (!params.useAbilities) continue;
    if (e.order.type === 'castPoint' || e.order.type === 'castUnit' || h.channel) continue;

    const foes = state.store.query(e.x, e.y, 360, q => isEnemy(e, q) && canTarget(e, q, now) && q.etype === 'unit');
    if (!foes.length) continue;
    const enemyHero = foes.find(f => f.hero);
    const weakest = foes.reduce((a, b) => (a.hp < b.hp ? a : b));
    const cx = foes.reduce((s, f) => s + f.x, 0) / foes.length;
    const cy = foes.reduce((s, f) => s + f.y, 0) / foes.length;

    const def = getHeroDef(h.defId);
    for (let idx = 0; idx < def.abilities.length; idx++) {
      if (!canCast(state, e, idx).ok) continue;
      const ab = def.abilities[idx];
      const fx = ab.effect;
      const k = fx.kind;
      if (k === 'passive' || k === 'aura') continue;

      if (k === 'nuke' || k === 'delayedNuke' || k === 'chain') {
        const t = enemyHero ?? weakest;
        orderCast(state, e, idx, t.x, t.y, t.id);
        break;
      }
      if (k === 'nukeOrHeal') {
        const t = enemyHero ?? weakest;
        orderCast(state, e, idx, t.x, t.y, t.id);
        break;
      }
      if ((k === 'aoePoint' || k === 'line' || k === 'comet') && foes.length >= 2) {
        orderCast(state, e, idx, cx, cy);
        break;
      }
      if ((k === 'aoeSelf' || k === 'channel') && foes.filter(f => dist(f.x, f.y, e.x, e.y) < (fx.radius ?? 160)).length >= (k === 'channel' ? 3 : 2)) {
        // channel heals are for allies; only channel damage ults near foes
        if (fx.enemyDps || fx.enemyMaxHpPctPerSec || k === 'aoeSelf') {
          orderCast(state, e, idx, e.x, e.y);
          break;
        }
      }
      if ((k === 'root' || k === 'sleep' || k === 'silence') && enemyHero) {
        orderCast(state, e, idx, enemyHero.x, enemyHero.y, enemyHero.id);
        break;
      }
      if (k === 'summon' && foes.length >= 2) {
        orderCast(state, e, idx, e.x, e.y);
        break;
      }
      if (k === 'healTarget') {
        const allies = state.store.query(e.x, e.y, 300, q => q.owner === pid && q.etype === 'unit' && !q.dead);
        const hurt = allies.filter(a => a.hp / a.maxHp < 0.5);
        if (hurt.length) {
          const t = hurt.reduce((a, b) => (a.hp / a.maxHp < b.hp / b.maxHp ? a : b));
          orderCast(state, e, idx, t.x, t.y, t.id);
          break;
        }
      }
      if (k === 'buffTarget' && foes.length >= 3) {
        orderCast(state, e, idx, e.x, e.y, e.id);
        break;
      }
    }
  }
}
