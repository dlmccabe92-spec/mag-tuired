'use client';
import type { GameStats } from '@/game/types';

export function GameOverScreen({ victory, stats, enemyStats, duration, onRestart, onMenu }: {
  victory: boolean;
  stats: GameStats;
  enemyStats: GameStats;
  duration: string;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const rows: { label: string; you: number; foe: number }[] = [
    { label: 'Units slain', you: stats.unitsSlain, foe: enemyStats.unitsSlain },
    { label: 'Units lost', you: stats.unitsLost, foe: enemyStats.unitsLost },
    { label: 'Gold mined', you: Math.floor(stats.goldMined), foe: Math.floor(enemyStats.goldMined) },
    { label: 'Timber harvested', you: Math.floor(stats.lumberHarvested), foe: Math.floor(enemyStats.lumberHarvested) },
    { label: 'Highest hero level', you: stats.highestHeroLevel, foe: enemyStats.highestHeroLevel },
  ];
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-stone-950/85">
      <div className="w-[480px] rounded-xl border-2 border-amber-700 bg-stone-900 p-8 text-center shadow-2xl">
        <h2 className={`font-serif text-5xl font-bold tracking-widest ${victory ? 'text-amber-300' : 'text-red-400'}`}>
          {victory ? 'VICTORY' : 'DEFEAT'}
        </h2>
        <p className="mt-2 font-serif italic text-stone-400">
          {victory
            ? 'The sovereignty of Ériu is yours. The bards will sing of this day.'
            : 'Your halls lie broken on the plain. The Morrígan feasts tonight.'}
        </p>
        <p className="mt-1 text-xs text-stone-500">Battle duration: {duration}</p>

        <table className="mx-auto mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 text-stone-400">
              <th className="py-1 text-left font-normal"> </th>
              <th className="font-normal text-sky-400">You</th>
              <th className="font-normal text-red-400">Enemy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label} className="border-b border-stone-800">
                <td className="py-1.5 text-left text-stone-300">{r.label}</td>
                <td className="font-mono">{r.you}</td>
                <td className="font-mono">{r.foe}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex justify-center gap-3">
          <button onClick={onRestart} className="rounded border border-amber-600 bg-amber-800/60 px-6 py-2 font-bold text-amber-100 hover:bg-amber-700/60">
            Fight Again
          </button>
          <button onClick={onMenu} className="rounded border border-stone-600 bg-stone-800 px-6 py-2 text-stone-200 hover:bg-stone-700">
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
