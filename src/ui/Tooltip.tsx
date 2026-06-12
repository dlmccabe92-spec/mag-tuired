'use client';
import { useState, ReactNode } from 'react';

export function Tooltip({ tip, children, costGold, costLumber, costFood }: {
  tip: string;
  children: ReactNode;
  costGold?: number;
  costLumber?: number;
  costFood?: number;
}) {
  const [show, setShow] = useState(false);
  const hasCost = (costGold ?? 0) > 0 || (costLumber ?? 0) > 0 || (costFood ?? 0) > 0;
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-64 rounded border border-amber-700/60 bg-stone-950/95 p-2 text-xs text-stone-200 shadow-xl">
          {hasCost && (
            <div className="mb-1 flex gap-3 font-mono text-[11px]">
              {(costGold ?? 0) > 0 && <span className="text-amber-400">⛏ {costGold}</span>}
              {(costLumber ?? 0) > 0 && <span className="text-emerald-500">🪵 {costLumber}</span>}
              {(costFood ?? 0) > 0 && <span className="text-rose-300">🍖 {costFood}</span>}
            </div>
          )}
          {tip}
        </div>
      )}
    </div>
  );
}
