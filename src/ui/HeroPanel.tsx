'use client';
import type { HeroUIInfo } from '@/game/types';
import { Tooltip } from './Tooltip';

export function HeroPanel({ hero, onCommand }: {
  hero: HeroUIInfo;
  onCommand: (id: string) => void;
}) {
  const xpPct = hero.xpToNext > 0 ? Math.min(100, (hero.xp / hero.xpToNext) * 100) : 100;
  return (
    <div className="flex h-full flex-col gap-1 text-xs">
      <div className="flex items-baseline gap-2">
        <span className="font-bold text-amber-300">{hero.name}</span>
        <span className="text-stone-400">{hero.title}</span>
        <span className="ml-auto rounded bg-amber-900/60 px-1.5 font-mono text-amber-200">Lv {hero.level}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded bg-stone-800">
        <div className="h-full bg-violet-500" style={{ width: `${xpPct}%` }} />
      </div>
      <div className="flex gap-3 font-mono text-[11px]">
        <span className={hero.primary === 'str' ? 'text-amber-300' : 'text-stone-300'}>STR {hero.str}</span>
        <span className={hero.primary === 'agi' ? 'text-amber-300' : 'text-stone-300'}>AGI {hero.agi}</span>
        <span className={hero.primary === 'int' ? 'text-amber-300' : 'text-stone-300'}>INT {hero.int}</span>
        <span className="text-stone-400">⚔ {hero.damage}</span>
        <span className="text-stone-400">🛡 {hero.armor}</span>
        {hero.skillPoints > 0 && (
          <span className="animate-pulse text-emerald-300">+{hero.skillPoints} skill</span>
        )}
      </div>
      <div className="flex gap-1">
        {hero.abilities.map(ab => (
          <Tooltip key={ab.idx} tip={`${ab.name} [${ab.hotkey}] — ${ab.desc}`}>
            <div className={`relative flex h-9 w-9 items-center justify-center rounded border text-base
              ${ab.level > 0 ? 'border-amber-600 bg-stone-800 text-amber-200' : 'border-stone-700 bg-stone-900 text-stone-600'}`}>
              {ab.ultimate ? '☀' : '✦'}
              <span className="absolute bottom-0 right-0.5 font-mono text-[9px] text-stone-300">{ab.level}/{ab.maxLevel}</span>
              {ab.canLearn && (
                <button
                  onClick={() => onCommand(`learn:${ab.idx}`)}
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 font-bold text-white hover:bg-emerald-500"
                >+</button>
              )}
            </div>
          </Tooltip>
        ))}
      </div>
      <div className="mt-auto grid w-fit grid-cols-3 gap-1">
        {hero.inventory.map((item, slot) => (
          <Tooltip key={slot} tip={item.id ? `${item.name} — ${item.desc} (click to use)` : 'Empty slot'}>
            <button
              onClick={() => item.id && onCommand(`useitem:${slot}`)}
              className={`h-7 w-9 rounded border text-[10px] ${item.id
                ? 'border-sky-700 bg-stone-800 text-sky-200 hover:bg-stone-700'
                : 'border-stone-800 bg-stone-900/60'}`}
            >
              {item.id ? '◆' : ''}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
