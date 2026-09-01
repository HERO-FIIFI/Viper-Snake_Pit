import { useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { SnakeEngine, type DifficultyKey, type UISnapshot } from "./game/engine";
import { synth } from "./game/audio";
import DPad from "./components/DPad";
import DifficultyPicker from "./components/DifficultyPicker";
import {
  GameOverOverlay,
  PauseOverlay,
  StartOverlay,
  formatTime,
  statusLabel,
} from "./components/Overlays";
import {
  AppleIcon,
  BoltIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  SnakeLogo,
  SoundOffIcon,
  SoundOnIcon,
  SwipeIcon,
  TimerIcon,
  TrophyIcon,
} from "./components/icons";

const BEST_KEY = "viper-pit.best.v1";
const MUTE_KEY = "viper-pit.muted";
const DIFF_KEY = "viper-pit.diff";

function loadDiff(): DifficultyKey {
  const d = localStorage.getItem(DIFF_KEY);
  return d === "chill" || d === "classic" || d === "turbo" ? d : "classic";
}

function loadBests(): Record<DifficultyKey, number> {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { chill: p.chill ?? 0, classic: p.classic ?? 0, turbo: p.turbo ?? 0 };
    }
  } catch {
    /* ignore */
  }
  return { chill: 0, classic: 0, turbo: 0 };
}

const LED_COLOR: Record<UISnapshot["status"], string> = {
  attract: "#ffbd4d",
  playing: "#a4ec43",
  paused: "#ffbd4d",
  over: "#ff5449",
};

interface Firefly {
  left: string;
  top: string;
  size: number;
  color: string;
  vars: Record<string, string>;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
  const statusRef = useRef<UISnapshot["status"]>("attract");
  const bestsRef = useRef(loadBests());
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const [bests, setBests] = useState(bestsRef.current);
  const [snap, setSnap] = useState<UISnapshot>({
    status: "attract",
    score: 0,
    best: 0,
    apples: 0,
    speedLevel: 0,
    length: 4,
    timeMs: 0,
    newBest: false,
    win: false,
    difficulty: loadDiff(),
    games: 0,
  });
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === "1");

  useEffect(() => {
    synth.muted = muted;
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  }, [muted]);

  /* ------------------------- engine lifecycle ------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new SnakeEngine(canvas, {
      onSnapshot: (s) => {
        statusRef.current = s.status;
        setSnap(s);
      },
      getBest: (d) => bestsRef.current[d],
      setBest: (d, v) => {
        bestsRef.current = { ...bestsRef.current, [d]: v };
        localStorage.setItem(BEST_KEY, JSON.stringify(bestsRef.current));
        setBests(bestsRef.current);
      },
    });
    engineRef.current = engine;
    engine.setDifficulty(loadDiff());
    setSnap(engine.getSnapshot());

    const onVis = () => {
      if (document.hidden && statusRef.current === "playing") engine.pause();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  /* --------------------------- live clock ----------------------------- */
  useEffect(() => {
    if (snap.status !== "playing") return;
    const id = setInterval(() => {
      const e = engineRef.current;
      if (e) setSnap(e.getSnapshot());
    }, 250);
    return () => clearInterval(id);
  }, [snap.status]);

  /* ----------------------------- actions ------------------------------ */
  const startGame = () => {
    synth.unlock();
    engineRef.current?.start();
  };
  const resumeGame = () => {
    synth.unlock();
    engineRef.current?.resume();
  };
  const pickDifficulty = (k: DifficultyKey) => {
    synth.unlock();
    synth.select();
    localStorage.setItem(DIFF_KEY, k);
    engineRef.current?.setDifficulty(k);
  };
  const pauseToggle = () => {
    synth.unlock();
    const e = engineRef.current;
    if (!e) return;
    const s = statusRef.current;
    if (s === "playing") e.pause();
    else if (s === "paused") e.resume();
    else e.start();
  };
  const steer = (x: number, y: number) => {
    synth.unlock();
    engineRef.current?.setDirection(x, y);
  };

  /* ---------------------------- keyboard ------------------------------ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const engine = engineRef.current;
      if (!engine) return;
      const dirMap: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        w: [0, -1],
        s: [0, 1],
        a: [-1, 0],
        d: [1, 0],
        W: [0, -1],
        S: [0, 1],
        A: [-1, 0],
        D: [1, 0],
      };
      if (dirMap[k]) {
        e.preventDefault();
        synth.unlock();
        engine.setDirection(...dirMap[k]);
        return;
      }
      const st = statusRef.current;
      if (k === " " || k === "Spacebar") {
        e.preventDefault();
        synth.unlock();
        if (st === "playing") engine.pause();
        else if (st === "paused") engine.resume();
        else engine.start();
      } else if (k === "p" || k === "P" || k === "Escape") {
        synth.unlock();
        engine.togglePause();
      } else if (k === "Enter") {
        synth.unlock();
        if (st === "paused") engine.resume();
        else if (st !== "playing") engine.start();
      } else if (k === "m" || k === "M") {
        setMuted((m) => !m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ------------------------------ swipe ------------------------------- */
  const onTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    synth.unlock();
    if (Math.abs(dx) > Math.abs(dy)) engineRef.current?.setDirection(Math.sign(dx), 0);
    else engineRef.current?.setDirection(0, Math.sign(dy));
  };

  /* ---------------------------- ambience ------------------------------ */
  const fireflies = useMemo<Firefly[]>(() => {
    const colors = ["#a4ec43", "#4fe3c1", "#ffbd4d"];
    return Array.from({ length: 16 }, (_, i) => ({
      left: `${(i * 61) % 100}%`,
      top: `${(i * 37 + 12) % 100}%`,
      size: 2 + ((i * 7) % 3),
      color: colors[i % colors.length],
      vars: {
        "--ff-x": `${((i % 5) - 2) * 26}px`,
        "--ff-y": `${-60 - ((i * 13) % 90)}px`,
        "--ff-dur": `${7 + ((i * 11) % 8)}s`,
        "--ff-delay": `${-((i * 17) % 9)}s`,
        "--ff-max": `${0.35 + ((i * 3) % 5) / 10}`,
      } as Record<string, string>,
    }));
  }, []);

  const pipColor = (i: number) =>
    i < 4 ? "#a4ec43" : i < 7 ? "#ffbd4d" : "#ff5449";
  const record = Math.max(bests.chill, bests.classic, bests.turbo);

  /* ------------------------------ render ------------------------------ */
  return (
    <div className="pit-backdrop relative min-h-screen overflow-hidden">
      <div className="pit-grid-floor absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0" aria-hidden="true">
        {fireflies.map((f, i) => (
          <span
            key={i}
            className="firefly"
            style={{
              left: f.left,
              top: f.top,
              width: f.size,
              height: f.size,
              backgroundColor: f.color,
              boxShadow: `0 0 ${f.size * 3}px ${f.color}`,
              ...f.vars,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-3 sm:px-5 py-4 sm:py-6">
        {/* ------------------------- marquee ------------------------- */}
        <header className="flex items-center justify-between gap-3 rise-in">
          <div className="flex items-center gap-3">
            <SnakeLogo className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_0_12px_rgba(164,236,67,0.45)]" />
            <div>
              <h1 className="marquee-glow font-display text-base sm:text-2xl leading-none text-cream">
                VIPER&nbsp;PIT
              </h1>
              <p className="mt-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-moss">
                Serpent protocol · 21×21
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="chip-notch-sm hidden sm:flex items-center gap-2 bg-pit-900/85 border border-pit-line px-3 py-2">
              <span
                className="led h-2 w-2 rounded-full"
                style={{ backgroundColor: LED_COLOR[snap.status], color: LED_COLOR[snap.status] }}
              />
              <span className="font-display text-[9px]" style={{ color: LED_COLOR[snap.status] }}>
                {statusLabel(snap.status)}
              </span>
            </div>
            <div className="chip-notch-sm hidden md:flex items-center gap-2 bg-pit-900/85 border border-pit-line px-3 py-2 text-amberglow-400">
              <TrophyIcon className="w-4 h-4" />
              <span className="font-display text-[9px]">{record}</span>
            </div>
            <button
              onClick={() => {
                synth.unlock();
                synth.select();
                setMuted((m) => !m);
              }}
              aria-label={muted ? "Unmute" : "Mute"}
              className="btn-arcade chip-notch-sm bg-pit-900/85 border border-pit-line px-3 py-2 text-moss hover:text-cream"
            >
              {muted ? <SoundOffIcon className="w-4 h-4" /> : <SoundOnIcon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* --------------------------- main --------------------------- */}
        <main className="mt-4 sm:mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
          {/* board column */}
          <section className="rise-in" style={{ animationDelay: "0.06s" }}>
            {/* HUD bar */}
            <div className="chip-notch bg-pit-900/92 border border-pit-line px-3 sm:px-4 py-2.5 flex items-center gap-3 sm:gap-5 flex-wrap">
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-moss leading-none">Score</div>
                <div key={snap.score} className="score-pop font-display text-lg sm:text-2xl text-amberglow-400 mt-1 leading-none">
                  {snap.score}
                </div>
              </div>
              <div className="hidden sm:block w-px self-stretch bg-pit-line" />
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-moss leading-none flex items-center gap-1">
                  <TrophyIcon className="w-3 h-3 text-amberglow-500" /> Best
                </div>
                <div className="font-display text-sm sm:text-base text-venom-400 mt-1 leading-none">{snap.best}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-moss leading-none flex items-center gap-1">
                  <AppleIcon className="w-3 h-3 text-coral-400" /> Fed
                </div>
                <div className="font-display text-sm sm:text-base text-cream mt-1 leading-none">{snap.apples}</div>
              </div>
              <div className="min-w-[76px]">
                <div className="text-[9px] uppercase tracking-[0.22em] text-moss leading-none flex items-center gap-1">
                  <BoltIcon className="w-3 h-3 text-amberglow-400" /> Venom
                </div>
                <div className="mt-1.5 flex items-end gap-[3px] h-4">
                  {Array.from({ length: 10 }, (_, i) => (
                    <span
                      key={i}
                      className="w-[5px] transition-all duration-300"
                      style={{
                        height: 5 + i,
                        backgroundColor: i <= snap.speedLevel ? pipColor(i) : "#1e4230",
                        boxShadow: i <= snap.speedLevel ? `0 0 6px ${pipColor(i)}` : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="font-display text-[10px] sm:text-xs text-tealglow-400 flex items-center gap-1.5">
                  <TimerIcon className="w-3.5 h-3.5" />
                  {formatTime(snap.timeMs)}
                </span>
                {(snap.status === "playing" || snap.status === "paused") && (
                  <button
                    onClick={pauseToggle}
                    aria-label={snap.status === "playing" ? "Pause" : "Resume"}
                    className="btn-arcade chip-notch-sm bg-pit-800 border border-pit-line px-3 py-2 text-amberglow-400 hover:bg-pit-700"
                  >
                    {snap.status === "playing" ? (
                      <PauseIcon className="w-3.5 h-3.5" />
                    ) : (
                      <PlayIcon className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* board */}
            <div
              className="relative mt-3 mx-auto w-full max-w-[540px] aspect-square bg-pit-900 border border-pit-line scanlines crt-vignette shadow-[0_20px_70px_rgba(0,0,0,0.55),0_0_50px_rgba(164,236,67,0.07)]"
              style={{ touchAction: "none" }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <canvas ref={canvasRef} className="absolute inset-0 m-auto" />

              {snap.status === "attract" && (
                <StartOverlay snap={snap} bests={bests} onStart={startGame} onResume={resumeGame} onPick={pickDifficulty} />
              )}
              {snap.status === "paused" && <PauseOverlay onResume={resumeGame} onStart={startGame} />}
              {snap.status === "over" && (
                <GameOverOverlay snap={snap} bests={bests} onStart={startGame} onResume={resumeGame} onPick={pickDifficulty} />
              )}
            </div>

            {/* touch controls */}
            <div className="mt-4 md:hidden">
              <DPad onDir={steer} onPauseToggle={pauseToggle} playing={snap.status === "playing"} />
              <p className="mt-2 text-center text-[11px] text-moss flex items-center justify-center gap-1.5">
                <SwipeIcon className="w-4 h-4 text-tealglow-400" /> swipe anywhere on the pit to steer
              </p>
            </div>
          </section>

          {/* side panel */}
          <aside className="hidden lg:flex flex-col gap-3 rise-in sticky top-6" style={{ animationDelay: "0.12s" }}>
            <div className="chip-notch bg-pit-900/92 border border-pit-line p-3.5">
              <h2 className="font-display text-[10px] text-venom-400 flex items-center gap-2">
                <BoltIcon className="w-3.5 h-3.5" /> SELECT VENOM
              </h2>
              <div className="mt-3">
                <DifficultyPicker value={snap.difficulty} onChange={pickDifficulty} bests={bests} />
              </div>
            </div>

            <div className="chip-notch bg-pit-900/92 border border-pit-line p-3.5">
              <h2 className="font-display text-[10px] text-tealglow-400">CONTROLS</h2>
              <ul className="mt-3 space-y-2.5 text-xs text-moss">
                <li className="flex items-center justify-between gap-2">
                  <span>Steer</span>
                  <span className="flex gap-1">
                    <kbd className="key">W</kbd>
                    <kbd className="key">A</kbd>
                    <kbd className="key">S</kbd>
                    <kbd className="key">D</kbd>
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>Pause</span>
                  <span className="flex gap-1">
                    <kbd className="key">SPACE</kbd>
                    <kbd className="key">P</kbd>
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>Restart</span>
                  <kbd className="key">ENTER</kbd>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span>Sound</span>
                  <kbd className="key">M</kbd>
                </li>
              </ul>
            </div>

            <div className="chip-notch bg-pit-900/92 border border-pit-line p-3.5">
              <h2 className="font-display text-[10px] text-amberglow-400">PIT LEDGER</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="chip-notch-sm bg-pit-850 border border-pit-600/50 p-2.5">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-moss">Runs</div>
                  <div className="font-display text-sm text-cream mt-1">{snap.games}</div>
                </div>
                <div className="chip-notch-sm bg-pit-850 border border-pit-600/50 p-2.5">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-moss">Record</div>
                  <div className="font-display text-sm text-amberglow-400 mt-1">{record}</div>
                </div>
                <div className="chip-notch-sm bg-pit-850 border border-pit-600/50 p-2.5 col-span-2 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.18em] text-moss">Current run</div>
                    <div className="font-display text-sm text-venom-400 mt-1">
                      {snap.length} <span className="text-[9px] text-moss">LONG</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      synth.unlock();
                      engineRef.current?.start();
                    }}
                    className="btn-arcade chip-notch-sm bg-pit-800 border border-pit-line px-2.5 py-2 text-moss hover:text-cream"
                    aria-label="Restart run"
                  >
                    <RestartIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </main>

        <footer className="mt-6 pb-4 text-center text-[10px] uppercase tracking-[0.25em] text-moss/70 rise-in" style={{ animationDelay: "0.2s" }}>
          Viper pit · canvas-forged · high scores live in this browser
        </footer>
      </div>
    </div>
  );
}
