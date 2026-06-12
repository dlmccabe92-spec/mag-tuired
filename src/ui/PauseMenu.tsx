'use client';
import { useState } from 'react';

export function PauseMenu({ onResume, onRestart, onMenu, onMute, onVolume }: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onMute: (m: boolean) => void;
  onVolume: (v: number) => void;
}) {
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(50);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-stone-950/75">
      <div className="w-[340px] rounded-xl border-2 border-stone-700 bg-stone-900 p-6 text-center shadow-2xl">
        <h2 className="font-serif text-3xl font-bold tracking-widest text-amber-400">PAUSED</h2>
        <div className="mt-6 flex flex-col gap-2">
          <button onClick={onResume} className="rounded border border-amber-600 bg-amber-800/60 px-4 py-2 font-bold text-amber-100 hover:bg-amber-700/60">
            Resume
          </button>
          <button onClick={onRestart} className="rounded border border-stone-600 bg-stone-800 px-4 py-2 text-stone-200 hover:bg-stone-700">
            Restart Battle
          </button>
          <button onClick={onMenu} className="rounded border border-stone-600 bg-stone-800 px-4 py-2 text-stone-200 hover:bg-stone-700">
            Return to Menu
          </button>
        </div>
        <div className="mt-6 border-t border-stone-800 pt-4 text-left text-sm text-stone-300">
          <label className="flex items-center justify-between">
            <span>Sound</span>
            <input
              type="checkbox"
              checked={!muted}
              onChange={e => { setMuted(!e.target.checked); onMute(!e.target.checked); }}
            />
          </label>
          <label className="mt-2 flex items-center justify-between gap-3">
            <span>Volume</span>
            <input
              type="range" min={0} max={100} value={vol} className="flex-1"
              onChange={e => { const v = Number(e.target.value); setVol(v); onVolume(v / 100); }}
            />
          </label>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-stone-500">
          Camera: arrows / edge scroll · Zoom: wheel · Groups: Ctrl+1–9 ·
          Heroes: F1–F3 · A attack-move, S stop, H hold, P patrol, B build
        </p>
      </div>
    </div>
  );
}
