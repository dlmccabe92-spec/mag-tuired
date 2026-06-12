'use client';
// Game setup: race, enemy, difficulty, map selection.
import { useState } from 'react';
import type { GameConfig, RaceId, Difficulty } from '@/game/types';
import { RACE_LIST } from '@/data/races';
import { MAPS } from '@/data/maps';

const DIFFICULTIES: { id: Difficulty; name: string; desc: string }[] = [
  { id: 'easy', name: 'Easy', desc: 'A sleepy foe. Learns the field, attacks late, never presses.' },
  { id: 'medium', name: 'Medium', desc: 'A worthy rival. Creeps, expands, and marches in earnest.' },
  { id: 'hard', name: 'Hard', desc: 'A merciless one. Faster hands, sharper timing, no mercy.' },
];

export function MainMenu({ onStart }: { onStart: (config: GameConfig) => void }) {
  const [playerRace, setPlayerRace] = useState<RaceId>('tuatha');
  const [enemyRace, setEnemyRace] = useState<RaceId | 'random'>('random');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [mapId, setMapId] = useState('meadow');

  const begin = () => {
    const enemy: RaceId = enemyRace === 'random'
      ? RACE_LIST[Math.floor(Math.random() * RACE_LIST.length)].id
      : enemyRace;
    onStart({ playerRace, enemyRace: enemy, difficulty, mapId });
  };

  return (
    <div className="flex min-h-screen flex-col items-center overflow-y-auto bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 px-4 py-8 text-stone-200">
      <h1 className="bg-gradient-to-b from-amber-200 to-amber-600 bg-clip-text font-serif text-6xl font-bold tracking-[0.18em] text-transparent">
        MAG TUIRED
      </h1>
      <p className="mt-2 font-serif italic text-stone-400">&ldquo;When Gods and Monsters Clashed for Ériu&rdquo;</p>

      <section className="mt-8 w-full max-w-5xl">
        <h2 className="mb-2 font-serif text-lg tracking-widest text-amber-500">CHOOSE YOUR RACE</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RACE_LIST.map(r => (
            <button
              key={r.id}
              onClick={() => setPlayerRace(r.id)}
              className={`rounded-lg border-2 p-3 text-left transition
                ${playerRace === r.id ? 'border-amber-500 bg-stone-800/90 shadow-lg shadow-amber-900/30' : 'border-stone-700 bg-stone-900/60 hover:border-stone-500'}`}
            >
              <div className="font-serif text-lg font-bold" style={{ color: r.color }}>{r.name}</div>
              <div className="text-xs italic text-stone-400">{r.irish} · {r.archetype}</div>
              <p className="mt-2 text-xs leading-snug text-stone-300">{r.lore}</p>
              <p className="mt-2 border-t border-stone-700/60 pt-1.5 text-[11px] leading-snug text-amber-200/80">{r.mechanic}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 w-full max-w-5xl">
        <h2 className="mb-2 font-serif text-lg tracking-widest text-amber-500">ENEMY RACE</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEnemyRace('random')}
            className={`rounded border-2 px-4 py-2 text-sm ${enemyRace === 'random' ? 'border-amber-500 bg-stone-800' : 'border-stone-700 bg-stone-900/60 hover:border-stone-500'}`}
          >🎲 Random</button>
          {RACE_LIST.map(r => (
            <button
              key={r.id}
              onClick={() => setEnemyRace(r.id)}
              className={`rounded border-2 px-4 py-2 text-sm ${enemyRace === r.id ? 'border-amber-500 bg-stone-800' : 'border-stone-700 bg-stone-900/60 hover:border-stone-500'}`}
              style={{ color: r.color }}
            >{r.name}</button>
          ))}
        </div>
      </section>

      <section className="mt-6 w-full max-w-5xl">
        <h2 className="mb-2 font-serif text-lg tracking-widest text-amber-500">DIFFICULTY</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DIFFICULTIES.map(d => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={`rounded border-2 p-3 text-left ${difficulty === d.id ? 'border-amber-500 bg-stone-800' : 'border-stone-700 bg-stone-900/60 hover:border-stone-500'}`}
            >
              <div className="font-bold">{d.name}</div>
              <div className="text-xs text-stone-400">{d.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 w-full max-w-5xl">
        <h2 className="mb-2 font-serif text-lg tracking-widest text-amber-500">BATTLEFIELD</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MAPS.map(m => (
            <button
              key={m.id}
              onClick={() => setMapId(m.id)}
              className={`rounded border-2 p-3 text-left ${mapId === m.id ? 'border-amber-500 bg-stone-800' : 'border-stone-700 bg-stone-900/60 hover:border-stone-500'}`}
            >
              <div className="font-bold text-amber-100">{m.name}</div>
              <div className="text-xs italic text-stone-400">{m.irish} · {m.size}×{m.size}</div>
              <p className="mt-1 text-xs text-stone-300">{m.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={begin}
        className="mt-10 mb-6 rounded-lg border-2 border-amber-500 bg-gradient-to-b from-amber-700 to-amber-900 px-16 py-4 font-serif text-2xl font-bold tracking-[0.3em] text-amber-100 shadow-xl shadow-amber-900/40 transition hover:from-amber-600 hover:to-amber-800"
      >
        BEGIN
      </button>
    </div>
  );
}
