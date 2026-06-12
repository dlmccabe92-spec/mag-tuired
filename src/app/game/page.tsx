'use client';

import dynamic from 'next/dynamic';

// The game touches window/canvas/AudioContext; render client-side only.
const GameRoot = dynamic(() => import('@/game/GameRoot'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-stone-950">
      <p className="animate-pulse font-serif text-2xl tracking-[0.3em] text-amber-500">
        CROSSING THE MIST…
      </p>
    </div>
  ),
});

export default function GamePage() {
  return <GameRoot />;
}
