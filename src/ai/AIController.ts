// Master AI brain: runs economy, military, and hero modules on a cadence.
import type { GameState } from '@/simulation/GameState';
import type { Difficulty } from '@/game/types';
import { TILE } from '@/utils/Constants';
import { AI_PARAMS, AIParams } from './AIDifficulty';
import { economyDecide, ownEntities } from './AIEconomy';
import { militaryDecide, MilitaryState } from './AIMilitary';
import { heroDecide } from './AIHero';

export class AIController {
  private params: AIParams;
  private pid: number;
  private nextDecide = 5; // grace period at game start
  private military: MilitaryState = {
    mode: 'build', attackWaveAt: 0, waveStartFood: 0, creepCampId: -1, lastOrderAt: 0,
  };
  private baseX: number;
  private baseY: number;
  private enemyX: number;
  private enemyY: number;

  constructor(state: GameState, difficulty: Difficulty, pid = 1) {
    this.pid = pid;
    this.params = AI_PARAMS[difficulty];
    const def = state.map.def;
    this.baseX = def.starts[pid].x * TILE;
    this.baseY = def.starts[pid].y * TILE;
    this.enemyX = def.starts[1 - pid].x * TILE;
    this.enemyY = def.starts[1 - pid].y * TILE;
    // hard AI cheats
    const p = state.players[this.pid];
    p.gatherMult = this.params.gatherMult;
    p.buildMult = this.params.buildMult;
  }

  tick(state: GameState) {
    if (state.winner !== null) return;
    if (state.time < this.nextDecide) return;
    this.nextDecide = state.time + this.params.decideInterval;

    economyDecide(state, this.pid, this.params, this.baseX, this.baseY);
    militaryDecide(state, this.pid, this.params, this.military, this.baseX, this.baseY, this.enemyX, this.enemyY);
    const { heroes } = ownEntities(state, this.pid);
    heroDecide(state, this.pid, this.params, heroes, this.baseX, this.baseY);
  }
}
