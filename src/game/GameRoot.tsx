'use client';
// Client-side root: setup menu -> game canvas + HUD.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameConfig, UISnapshot } from '@/game/types';
import { Game } from './Game';
import { MainMenu } from '@/ui/MainMenu';
import { HUD } from '@/ui/HUD';
import { PauseMenu } from '@/ui/PauseMenu';
import { GameOverScreen } from '@/ui/GameOverScreen';

function GameView({ config, onRestart, onMenu }: {
  config: GameConfig;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState<UISnapshot | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const minimap = minimapRef.current;
    const container = containerRef.current;
    if (!canvas || !minimap || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const game = new Game(canvas, minimap, config, s => setSnap(s));
    gameRef.current = game;
    game.resize(container.clientWidth, container.clientHeight);

    const ro = new ResizeObserver(() => {
      game.resize(container.clientWidth, container.clientHeight);
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      game.dispose();
      gameRef.current = null;
    };
  }, [config]);

  const onCommand = useCallback((id: string) => gameRef.current?.handleCommand(id), []);
  const onSelect = useCallback((id: number) => gameRef.current?.selectEntity(id), []);
  const onMinimapMouse = useCallback((ev: React.MouseEvent<HTMLCanvasElement>) => {
    ev.preventDefault();
    const r = ev.currentTarget.getBoundingClientRect();
    gameRef.current?.minimapInteract(
      (ev.clientX - r.left) / r.width,
      (ev.clientY - r.top) / r.height,
      ev.button,
    );
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0 bottom-[212px] top-0">
        <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />
      </div>
      {/* minimap canvas lives outside HUD so it exists before the first snapshot */}
      <canvas
        ref={minimapRef}
        width={196}
        height={196}
        className="absolute bottom-2 left-2 z-30 h-[196px] w-[196px] cursor-pointer rounded border border-stone-700 bg-stone-950"
        onMouseDown={onMinimapMouse}
        onContextMenu={e => e.preventDefault()}
      />
      {snap && (
        <HUD snap={snap} onCommand={onCommand} onSelect={onSelect} />
      )}
      {snap?.paused && !snap.gameOver && (
        <PauseMenu
          onResume={() => gameRef.current?.setPaused(false)}
          onRestart={onRestart}
          onMenu={onMenu}
          onMute={m => gameRef.current?.setMuted(m)}
          onVolume={v => gameRef.current?.setVolume(v)}
        />
      )}
      {snap?.gameOver && (
        <GameOverScreen
          victory={snap.gameOver.victory}
          stats={snap.gameOver.stats}
          enemyStats={snap.gameOver.enemyStats}
          duration={snap.gameOver.duration}
          onRestart={onRestart}
          onMenu={onMenu}
        />
      )}
    </div>
  );
}

export default function GameRoot() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [gameKey, setGameKey] = useState(0);

  if (!config) {
    return <MainMenu onStart={c => { setConfig(c); setGameKey(k => k + 1); }} />;
  }
  return (
    <GameView
      key={gameKey}
      config={config}
      onRestart={() => setGameKey(k => k + 1)}
      onMenu={() => setConfig(null)}
    />
  );
}
