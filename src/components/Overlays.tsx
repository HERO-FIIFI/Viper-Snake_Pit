import type { ReactNode } from "react";
import type { DifficultyKey, GameStatus, UISnapshot } from "../game/engine";
import { DIFFICULTIES } from "../game/engine";
import DifficultyPicker from "./DifficultyPicker";
import { CrownIcon, PlayIcon, RestartIcon, SkullIcon, SwipeIcon } from "./icons";

export function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function ArcadeButton({
  children,
  onClick,
  primary,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`btn-arcade chip-notch-sm font-display text-[10px] sm:text-[11px] px-4 py-3 sm:px-5 sm:py-3.5 inline-flex items-center gap-2 no-tap-highlight ${
        primary
          ? "btn-shine bg-venom-500 text-pit-950 shadow-[0_0_22px_rgba(164,236,67,0.4)] hover:bg-venom-400"
          : "bg-pit-800 text-cream border border-pit-line hover:bg-pit-700"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="chip-notch-sm bg-pit-900/90 border border-pit-600/50 px-2 py-2 text-center">
      <div className="text-[9px] uppercase tracking-[0.18em] text-moss leading-none">{label}</div>
      <div className="font-display text-[11px] sm:text-xs mt-1.5 leading-none" style={{ color: accent ?? "#eef7e4" }}>
        {value}
      </div>
    </div>
  );
}

interface OverlayProps {
  snap: UISnapshot;
  bests: Record<DifficultyKey, number>;
  onStart: () => void;
  onResume: () => void;
  onPick: (k: DifficultyKey) => void;
}

export function StartOverlay({ snap, bests, onStart, onPick }: OverlayProps) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-pit-950/72 p-3 cursor-pointer no-tap-highlight"
      onPointerDown={onStart}
    >
      <div className="overlay-in w-full max-w-[400px] text-center">
        <div className="font-display text-[9px] tracking-wider text-tealglow-400 anim-blink mb-3">
          ● DEMO MODE · ATTRACT
        </div>
        <h2 className="font-display text-xl sm:text-2xl text-cream leading-relaxed">
          READY,
          <br />
          <span className="text-venom-400">SLITHERER?</span>
        </h2>
        <p className="text-moss text-sm mt-3">
          Eat the apples. Don't bite yourself.{" "}
          <span style={{ color: DIFFICULTIES[snap.difficulty].color }}>{DIFFICULTIES[snap.difficulty].label}</span> pays ×
          {DIFFICULTIES[snap.difficulty].multiplier}.
        </p>

        <div className="mt-4">
          <DifficultyPicker compact value={snap.difficulty} onChange={onPick} bests={bests} />
        </div>

        <div className="mt-5">
          <ArcadeButton primary onClick={onStart} className="w-full justify-center">
            <PlayIcon className="w-3.5 h-3.5" /> INSERT COIN
          </ArcadeButton>
        </div>

        <div className="mt-4 flex items-center justify-center gap-x-5 gap-y-2 flex-wrap text-[11px] text-moss">
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <kbd className="key">◀</kbd>
            <kbd className="key">▲</kbd>
            <kbd className="key">▼</kbd>
            <kbd className="key">▶</kbd>
            <span className="ml-1">or WASD</span>
          </span>
          <span className="inline-flex items-center gap-1.5 sm:hidden">
            <SwipeIcon className="w-4 h-4 text-tealglow-400" /> swipe the pit to steer
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="key">SPACE</kbd> pause
          </span>
        </div>
      </div>
    </div>
  );
}

export function PauseOverlay({ onResume, onStart }: { onResume: () => void; onStart: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-pit-950/70 p-4">
      <div className="overlay-in text-center w-full max-w-[320px]">
        <div className="font-display text-2xl text-amberglow-400 anim-blink">PAUSED</div>
        <p className="text-moss text-sm mt-3">The viper waits. The apples sweat.</p>
        <div className="mt-5 flex flex-col gap-2">
          <ArcadeButton primary onClick={onResume} className="justify-center">
            <PlayIcon className="w-3.5 h-3.5" /> RESUME
          </ArcadeButton>
          <ArcadeButton onClick={onStart} className="justify-center">
            <RestartIcon className="w-3.5 h-3.5" /> RESTART RUN
          </ArcadeButton>
        </div>
        <div className="mt-4 text-[11px] text-moss">
          <kbd className="key">SPACE</kbd> or <kbd className="key">P</kbd> to resume
        </div>
      </div>
    </div>
  );
}

export function GameOverOverlay({ snap, bests, onStart, onPick }: OverlayProps) {
  const d = DIFFICULTIES[snap.difficulty];
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-pit-950/74 p-3">
      <div className="overlay-in-slow w-full max-w-[400px] text-center">
        <div
          className={`inline-flex items-center gap-2 font-display text-lg sm:text-2xl ${
            snap.win ? "text-venom-400" : "text-coral-500"
          }`}
        >
          {snap.win ? "PIT CLEARED!" : (
            <>
              <SkullIcon className="w-6 h-6 sm:w-7 sm:h-7 wiggle" /> GAME OVER
            </>
          )}
        </div>

        {snap.newBest && (
          <div className="mt-3 inline-flex items-center gap-2 chip-notch-sm bg-amberglow-500 text-pit-950 font-display text-[10px] px-3 py-2 anim-blink-fast shadow-[0_0_24px_rgba(255,189,77,0.55)]">
            <CrownIcon className="w-4 h-4" /> NEW HIGH SCORE
          </div>
        )}

        <div className="mt-4 chip-notch bg-pit-900/95 border border-pit-line px-4 py-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-moss">Score · {d.label} ×{d.multiplier}</div>
          <div className="font-display text-3xl sm:text-4xl text-amberglow-400 mt-2 score-pop">{snap.score}</div>
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            <StatBox label="Apples" value={String(snap.apples)} accent="#ff7a68" />
            <StatBox label="Length" value={String(snap.length)} accent="#a4ec43" />
            <StatBox label="Time" value={formatTime(snap.timeMs)} accent="#4fe3c1" />
            <StatBox label="Best" value={String(bests[snap.difficulty])} accent="#ffbd4d" />
          </div>
        </div>

        <div className="mt-4">
          <ArcadeButton primary onClick={onStart} className="w-full justify-center">
            <RestartIcon className="w-3.5 h-3.5" /> PLAY AGAIN
          </ArcadeButton>
        </div>
        <div className="mt-4">
          <DifficultyPicker compact value={snap.difficulty} onChange={onPick} bests={bests} />
        </div>
        <div className="mt-3 text-[11px] text-moss">
          <kbd className="key">ENTER</kbd> quick restart
        </div>
      </div>
    </div>
  );
}

export function statusLabel(s: GameStatus) {
  switch (s) {
    case "attract":
      return "INSERT COIN";
    case "playing":
      return "RUNNING";
    case "paused":
      return "HOLDING";
    case "over":
      return "WRECKED";
  }
}
