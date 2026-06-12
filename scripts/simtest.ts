// Headless AI-vs-AI simulation harness: verifies the sim runs a full game
// without crashing and reaches a victory condition.
// Run: npx tsx scripts/simtest.ts [raceA] [raceB] [map] [minutes]
import { GameState } from '../src/simulation/GameState';
import { AIController } from '../src/ai/AIController';
import type { RaceId } from '../src/game/types';

const raceA = (process.argv[2] ?? 'tuatha') as RaceId;
const raceB = (process.argv[3] ?? 'sluagh') as RaceId;
const mapId = process.argv[4] ?? 'meadow';
const maxMinutes = Number(process.argv[5] ?? 30);

console.log(`=== simtest: ${raceA} vs ${raceB} on ${mapId}, max ${maxMinutes}min ===`);

const state = new GameState({
  playerRace: raceA,
  enemyRace: raceB,
  difficulty: 'hard',
  mapId,
});
// player 0 is normally human; drive it with a second AI for the test
const ai0 = new AIController(state, 'medium', 0);
const ai1 = new AIController(state, 'hard', 1);

const DT = 1 / 60;
const maxTicks = maxMinutes * 60 * 60;
let lastLog = -30;

function counts(pid: number) {
  let units = 0, workers = 0, buildings = 0, heroLvl = 0;
  state.store.forEach(e => {
    if (e.owner !== pid || e.dead) return;
    if (e.etype === 'building') buildings++;
    else if (e.etype === 'unit') {
      if (e.unitDef?.role === 'worker') workers++;
      else units++;
      if (e.hero) heroLvl = Math.max(heroLvl, e.hero.level);
    }
  });
  return { units, workers, buildings, heroLvl };
}

for (let t = 0; t < maxTicks; t++) {
  state.update(DT);
  ai0.tick(state);
  ai1.tick(state);
  if (state.time - lastLog >= 60) {
    lastLog = state.time;
    const a = counts(0), b = counts(1);
    const p0 = state.players[0], p1 = state.players[1];
    console.log(
      `[${state.clockString()}] ` +
      `P0(${raceA}): g${Math.floor(p0.gold)} l${Math.floor(p0.lumber)} f${p0.foodUsed}/${p0.foodCap} ` +
      `w${a.workers} u${a.units} b${a.buildings} h${a.heroLvl} | ` +
      `P1(${raceB}): g${Math.floor(p1.gold)} l${Math.floor(p1.lumber)} f${p1.foodUsed}/${p1.foodCap} ` +
      `w${b.workers} u${b.units} b${b.buildings} h${b.heroLvl} | ` +
      `slain ${p0.stats.unitsSlain}/${p1.stats.unitsSlain}`,
    );
  }
  if (state.winner !== null) {
    console.log(`\n*** WINNER: Player ${state.winner} (${state.winner === 0 ? raceA : raceB}) at ${state.clockString()} ***`);
    break;
  }
}

if (state.winner === null) {
  const a = counts(0), b = counts(1);
  console.log(`\nNo winner after ${maxMinutes}min. P0 buildings=${a.buildings}, P1 buildings=${b.buildings}`);
  console.log(`Combat happened: P0 slain=${state.players[0].stats.unitsSlain}, P1 slain=${state.players[1].stats.unitsSlain}`);
}
console.log('=== simtest finished without crash ===');
