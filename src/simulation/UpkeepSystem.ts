// Food/tribute bookkeeping. Tribute (gold tax) itself is applied at income
// time via tributeMult(); here we keep food counts authoritative.
import type { GameState } from './GameState';
import { recomputeFood } from './UnitManager';

export function upkeepTick(state: GameState) {
  // periodic authoritative recompute guards against drift
  recomputeFood(state, 0);
  recomputeFood(state, 1);
}
