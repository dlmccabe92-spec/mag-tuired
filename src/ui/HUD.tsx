'use client';
// In-game HUD overlay: top resource bar, bottom panel (minimap slot / info / command card), toasts.
import type { UISnapshot } from '@/game/types';
import { HeroPanel } from './HeroPanel';
import { Tooltip } from './Tooltip';

export function HUD({ snap, onCommand, onSelect }: {
  snap: UISnapshot;
  onCommand: (id: string) => void;
  onSelect: (id: number) => void;
}) {
  const tributeColor = snap.tribute === 'none' ? 'text-emerald-400'
    : snap.tribute === 'low' ? 'text-yellow-400' : 'text-red-400';
  const tributeLabel = snap.tribute === 'none' ? 'No Tribute'
    : snap.tribute === 'low' ? 'Low Tribute' : 'High Tribute';

  return (
    <>
      {/* top resource bar */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center gap-5 border-b border-stone-800/80 bg-stone-950/85 px-4 py-1.5 font-mono text-sm">
        <span className="font-bold tracking-widest text-amber-500">MAG TUIRED</span>
        <span className="text-amber-300">⛏ {snap.gold}</span>
        <span className="text-emerald-400">🪵 {snap.lumber}</span>
        <span className={tributeColor}>🍖 {snap.foodUsed}/{snap.foodCap} — {tributeLabel}</span>
        <span className="text-stone-300">{snap.isNight ? '🌙 Night' : '☀️ Day'}</span>
        <span className="text-stone-400">Tier {snap.tier}</span>
        <span className="ml-auto text-stone-400">{snap.clock}</span>
      </div>

      {/* toasts */}
      <div className="pointer-events-none absolute left-1/2 top-12 z-20 flex w-[460px] -translate-x-1/2 flex-col gap-1">
        {snap.toasts.map(t => (
          <div key={t.id} className="rounded border border-amber-900/50 bg-stone-950/80 px-3 py-1 text-center text-xs text-amber-100">
            {t.text}
          </div>
        ))}
      </div>

      {/* targeting hint */}
      {(snap.targeting || snap.placingBuilding) && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 translate-y-24 rounded bg-stone-950/80 px-3 py-1 text-xs text-amber-200">
          {snap.placingBuilding ? 'Left-click to place · right-click to cancel' : 'Choose a target · right-click to cancel'}
        </div>
      )}

      {/* bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex h-[212px] items-stretch gap-2 border-t border-stone-800 bg-stone-950/90 p-2">
        {/* minimap slot (canvas overlays here from GameRoot) */}
        <div className="h-[196px] w-[196px] shrink-0" />

        {/* info panel */}
        <div className="flex min-w-0 flex-1 flex-col rounded border border-stone-800 bg-stone-900/60 p-2">
          {snap.hero ? (
            <HeroPanel hero={snap.hero} onCommand={onCommand} />
          ) : snap.primary ? (
            <div className="flex h-full flex-col text-xs">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-amber-200">{snap.primary.name}</span>
                {snap.primary.epithet && <span className="text-stone-400">{snap.primary.epithet}</span>}
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono text-[11px]">
                <span className="text-emerald-400">HP {snap.primary.hp}/{snap.primary.maxHp}</span>
                {snap.primary.maxMana > 0 && (
                  <span className="text-sky-400">MP {snap.primary.mana}/{snap.primary.maxMana}</span>
                )}
                {snap.primary.damage !== undefined && <span className="text-stone-300">⚔ {snap.primary.damage} <i className="text-stone-500">({snap.primary.attackType})</i></span>}
                {snap.primary.armor !== undefined && <span className="text-stone-300">🛡 {snap.primary.armor} <i className="text-stone-500">({snap.primary.armorType})</i></span>}
              </div>
              {snap.primary.constructionProgress !== undefined && (
                <div className="mt-2">
                  <div className="mb-0.5 text-[10px] text-stone-400">Under construction…</div>
                  <div className="h-2 w-56 overflow-hidden rounded bg-stone-800">
                    <div className="h-full bg-emerald-500" style={{ width: `${(snap.primary.constructionProgress * 100).toFixed(0)}%` }} />
                  </div>
                </div>
              )}
              {snap.primary.queue && snap.primary.queue.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {snap.primary.queue.map((q, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-36 truncate text-[11px] text-stone-300">{q.label}</span>
                      <div className="h-1.5 w-40 overflow-hidden rounded bg-stone-800">
                        <div className="h-full bg-amber-500" style={{ width: `${(i === 0 ? q.progress * 100 : 0).toFixed(0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-stone-600">
              Select units with left-click or drag · right-click to order
            </div>
          )}

          {/* multi-selection chips */}
          {snap.selection.length > 1 && (
            <div className="mt-auto flex flex-wrap gap-1 pt-1">
              {snap.selection.slice(0, 14).map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`rounded border px-1.5 py-0.5 text-[10px] ${s.isHero
                    ? 'border-amber-600 text-amber-300' : 'border-stone-700 text-stone-300'} hover:bg-stone-800`}
                >
                  {s.name} <span className="text-emerald-500">{Math.round((s.hp / s.maxHp) * 100)}%</span>
                </button>
              ))}
              {snap.selection.length > 14 && <span className="text-[10px] text-stone-500">+{snap.selection.length - 14}</span>}
            </div>
          )}
        </div>

        {/* command card */}
        <div className="grid w-[340px] grid-cols-4 content-start gap-1 rounded border border-stone-800 bg-stone-900/60 p-2">
          {snap.buttons.map(b => (
            <Tooltip key={b.id} tip={b.tooltip} costGold={b.costGold} costLumber={b.costLumber} costFood={b.costFood}>
              <button
                onClick={() => b.enabled && onCommand(b.id)}
                className={`relative flex h-[46px] w-full flex-col items-center justify-center overflow-hidden rounded border text-center
                  ${b.active ? 'border-amber-400 bg-amber-900/50'
                    : b.enabled ? 'border-stone-600 bg-stone-800 hover:border-amber-700 hover:bg-stone-700'
                      : 'border-stone-800 bg-stone-900 opacity-45'}`}
              >
                <span className="text-base leading-none">{b.icon}</span>
                <span className="mt-0.5 w-full truncate px-0.5 text-[9px] leading-tight text-stone-300">{b.label}</span>
                <span className="absolute right-0.5 top-0 font-mono text-[9px] text-amber-500">{b.hotkey}</span>
                {(b.progress ?? 0) > 0 && (
                  <span
                    className="absolute inset-x-0 bottom-0 bg-stone-950/80"
                    style={{ height: `${(b.progress! * 100).toFixed(0)}%` }}
                  />
                )}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
    </>
  );
}
