import { synth } from "./audio";

/* ============================== types ============================== */

export type DifficultyKey = "chill" | "classic" | "turbo";
export type GameStatus = "attract" | "playing" | "paused" | "over";

export interface DifficultyDef {
  key: DifficultyKey;
  label: string;
  tagline: string;
  interval: number; // ms per step at start
  wrap: boolean; // walls wrap around instead of killing
  multiplier: number; // score multiplier
  color: string;
}

export const DIFFICULTIES: Record<DifficultyKey, DifficultyDef> = {
  chill: {
    key: "chill",
    label: "CHILL",
    tagline: "Slow crawl · walls wrap around",
    interval: 150,
    wrap: true,
    multiplier: 1,
    color: "#4fe3c1",
  },
  classic: {
    key: "classic",
    label: "CLASSIC",
    tagline: "Steady pace · walls are fatal",
    interval: 108,
    wrap: false,
    multiplier: 2,
    color: "#a4ec43",
  },
  turbo: {
    key: "turbo",
    label: "TURBO",
    tagline: "Full venom · walls are fatal",
    interval: 76,
    wrap: false,
    multiplier: 3,
    color: "#ff5449",
  },
};

export interface UISnapshot {
  status: GameStatus;
  score: number;
  best: number;
  apples: number;
  speedLevel: number; // 0..9
  length: number;
  timeMs: number;
  newBest: boolean;
  win: boolean;
  difficulty: DifficultyKey;
  games: number;
}

interface Vec {
  x: number;
  y: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}
interface Ring {
  x: number;
  y: number;
  life: number;
  max: number;
  color: string;
}
interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  color: string;
}

interface EngineHooks {
  onSnapshot: (s: UISnapshot) => void;
  getBest: (d: DifficultyKey) => number;
  setBest: (d: DifficultyKey, v: number) => void;
}

/* ============================ constants ============================ */

export const COLS = 21;
export const ROWS = 21;
const START_LEN = 4;
const MAX_SPEED_LEVEL = 9;

const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const C = {
  boardA: "#0e2418",
  boardB: "#102a1c",
  wallSolid: "#ff5449",
  wallWrap: "#2cc9a6",
  snakeHead: "#d9ff8a",
  snakeMid: "#a4ec43",
  snakeTail: "#47791f",
  appleHi: "#ffa06b",
  appleLo: "#d92f23",
  leaf: "#7cc32a",
  coral: "#ff7a68",
  venom: "#a4ec43",
  amber: "#ffbd4d",
};

/* ============================== engine ============================= */

export class SnakeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hooks: EngineHooks;
  private ro: ResizeObserver | null = null;

  private w = 300;
  private h = 300;
  private cell = 300 / COLS;
  private dpr = 1;

  private raf = 0;
  private last = 0;
  private t = 0; // global anim clock (s)
  private acc = 0;
  private timeouts: number[] = [];
  private destroyed = false;

  status: GameStatus = "attract";
  private diff: DifficultyDef = DIFFICULTIES.classic;
  private snake: Vec[] = [];
  private dir: Vec = { x: 1, y: 0 };
  private queue: Vec[] = [];
  private food: Vec = { x: 10, y: 10 };
  private apples = 0;
  private score = 0;
  private elapsed = 0;
  private games = 0;
  private newBest = false;
  private win = false;

  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private floaters: Floater[] = [];
  private shake = 0;
  private eatFlash = 0;
  private deathT = 99;

  constructor(canvas: HTMLCanvasElement, hooks: EngineHooks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.hooks = hooks;

    const parent = canvas.parentElement;
    if (parent && typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.fit());
      this.ro.observe(parent);
    }
    this.fit();
    this.resetRun(true);
    this.last = performance.now();
    const tick = (now: number) => {
      if (this.destroyed) return;
      const dt = Math.min(100, now - this.last);
      this.last = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.timeouts.forEach((id) => clearTimeout(id));
  }

  /* ---------------------------- public API --------------------------- */

  getSnapshot(): UISnapshot {
    return {
      status: this.status,
      score: this.score,
      best: this.hooks.getBest(this.diff.key),
      apples: this.apples,
      speedLevel: this.speedLevel(),
      length: this.snake.length,
      timeMs: this.elapsed,
      newBest: this.newBest,
      win: this.win,
      difficulty: this.diff.key,
      games: this.games,
    };
  }

  private emit() {
    this.hooks.onSnapshot(this.getSnapshot());
  }

  start(key?: DifficultyKey) {
    if (key) this.diff = DIFFICULTIES[key];
    this.resetRun(false);
    this.status = "playing";
    synth.start();
    this.floater(COLS / 2, ROWS / 2 - 2, "GO!", C.venom, 0.8);
    this.emit();
  }

  pause() {
    if (this.status !== "playing") return;
    this.status = "paused";
    synth.pause();
    this.emit();
  }

  resume() {
    if (this.status !== "paused") return;
    this.status = "playing";
    this.acc = 0;
    synth.resume();
    this.emit();
  }

  togglePause() {
    if (this.status === "playing") this.pause();
    else if (this.status === "paused") this.resume();
  }

  backToAttract() {
    this.resetRun(true);
    this.emit();
  }

  setDifficulty(key: DifficultyKey) {
    this.diff = DIFFICULTIES[key];
    if (this.status === "playing" || this.status === "paused") {
      this.resetRun(false);
      this.status = "playing";
      this.floater(COLS / 2, ROWS / 2 - 2, "GO!", C.venom, 0.8);
    } else {
      this.resetRun(true);
    }
    this.emit();
  }

  setDirection(x: number, y: number) {
    if (this.status !== "playing") return;
    const lastDir = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (x === lastDir.x && y === lastDir.y) return;
    if (x === -lastDir.x && y === -lastDir.y) return; // no reversing into neck
    if (this.queue.length >= 3) return;
    this.queue.push({ x, y });
    synth.turn();
  }

  /* ----------------------------- internals --------------------------- */

  private speedLevel() {
    return Math.min(MAX_SPEED_LEVEL, Math.floor(this.apples / 4));
  }

  private curInterval() {
    const ramp = Math.max(0.52, 1 - this.apples * 0.013);
    return this.diff.interval * ramp;
  }

  private resetRun(demo: boolean) {
    const cy = Math.floor(ROWS / 2);
    const cx = Math.floor(COLS / 2);
    this.snake = Array.from({ length: START_LEN }, (_, i) => ({ x: cx - i, y: cy }));
    this.dir = { x: 1, y: 0 };
    this.queue = [];
    this.apples = 0;
    this.score = 0;
    this.elapsed = 0;
    this.acc = 0;
    this.newBest = false;
    this.win = false;
    this.deathT = 99;
    this.particles = [];
    this.rings = [];
    this.floaters = [];
    this.shake = 0;
    this.isDemo = demo;
    this.status = demo ? "attract" : this.status;
    this.spawnFood();
  }

  private spawnFood(): boolean {
    const occupied = new Set(this.snake.map((s) => s.x + s.y * COLS));
    const free: Vec[] = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (!occupied.has(x + y * COLS)) free.push({ x, y });
    if (free.length === 0) return false;
    this.food = free[Math.floor(Math.random() * free.length)];
    return true;
  }

  private update(dt: number) {
    this.t += dt / 1000;
    this.shake = Math.max(0, this.shake - dt * 0.03);
    this.eatFlash = Math.max(0, this.eatFlash - dt * 0.003);
    if (this.status === "over") this.deathT += dt / 1000;

    if (this.status === "playing" || this.status === "attract") {
      this.acc += dt;
      if (this.status === "playing") this.elapsed += dt;
      let guard = 0;
      while (this.acc >= this.curInterval() && guard++ < 6) {
        this.acc -= this.curInterval();
        this.step();
        if (this.status !== "playing" && this.status !== "attract") break;
      }
    }

    // effects
    const k = dt / 1000;
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0);
    for (const p of this.particles) {
      p.x += p.vx * k;
      p.y += p.vy * k;
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 26 * k;
    }
    this.rings = this.rings.filter((r) => (r.life -= dt) > 0);
    this.floaters = this.floaters.filter((f) => (f.life -= dt) > 0);
  }

  private step() {
    if (this.status === "attract") this.demoThink();

    while (this.queue.length) {
      const d = this.queue.shift()!;
      if (!(d.x === -this.dir.x && d.y === -this.dir.y) && !(d.x === this.dir.x && d.y === this.dir.y)) {
        this.dir = d;
        break;
      }
    }

    const head = this.snake[0];
    let nx = head.x + this.dir.x;
    let ny = head.y + this.dir.y;

    // demo runs always use wrap rules so the attract snake lives longer
    const wraps = this.diff.wrap || this.status === "attract";
    if (wraps) {
      nx = (nx + COLS) % COLS;
      ny = (ny + ROWS) % ROWS;
    } else if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
      this.wallHit(head);
      return;
    }

    const willEat = nx === this.food.x && ny === this.food.y;
    const body = willEat ? this.snake : this.snake.slice(0, -1);
    if (body.some((s) => s.x === nx && s.y === ny)) {
      this.die();
      return;
    }

    this.snake.unshift({ x: nx, y: ny });
    if (willEat) this.onEat();
    else this.snake.pop();
  }

  private onEat() {
    this.apples += 1;
    const lvl = this.speedLevel();
    const pts = (10 + lvl * 5) * this.diff.multiplier;
    this.score += pts;
    this.eatFlash = 1;
    synth.eat(this.apples);
    this.burst(this.food.x + 0.5, this.food.y + 0.5, 14, [C.amber, C.coral, C.venom], 130);
    this.rings.push({ x: this.food.x + 0.5, y: this.food.y + 0.5, life: 420, max: 420, color: C.amber });
    this.floater(this.food.x + 0.5, this.food.y - 0.2, `+${pts}`, C.amber, 0.9);
    if (!this.spawnFood()) {
      // board full — perfect game
      this.win = true;
      this.status = "over";
      if (!this.isDemo) this.games += 1;
      this.deathT = 0;
      this.settleBest();
      synth.newBest();
      this.emit();
      return;
    }
    this.emit();
  }

  private wallHit(head: Vec) {
    this.burst(
      Math.min(COLS - 0.5, Math.max(0.5, head.x + this.dir.x * 0.5 + 0.5)),
      Math.min(ROWS - 0.5, Math.max(0.5, head.y + this.dir.y * 0.5 + 0.5)),
      16,
      [C.coral, C.amber],
      150,
    );
    this.die();
  }

  private die() {
    this.status = "over";
    this.deathT = 0;
    if (!this.isDemo) this.games += 1;
    this.shake = 13;
    for (let i = 0; i < this.snake.length; i += 2) {
      const s = this.snake[i];
      this.burst(s.x + 0.5, s.y + 0.5, 4, [C.coral, C.venom], 90);
    }
    synth.die();
    this.settleBest();
    this.emit();
    if (this.isDemo) {
      // demo crashed — quietly relaunch the attract run
      const id = window.setTimeout(() => {
        if (!this.destroyed && this.status === "over" && this.isDemo) this.backToAttract();
      }, 1100);
      this.timeouts.push(id);
    }
  }

  private isDemo = false;
  private settleBest() {
    if (this.isDemo) return; // attract-mode runs never touch the ledger
    const best = this.hooks.getBest(this.diff.key);
    if (this.score > best) {
      this.hooks.setBest(this.diff.key, this.score);
      this.newBest = true;
      const id = window.setTimeout(() => {
        if (!this.destroyed) synth.newBest();
      }, 550);
      this.timeouts.push(id);
    }
  }

  /* --------------------------- demo brain ---------------------------- */

  private demoThink() {
    this.isDemo = true;
    const head = this.snake[0];
    const options = DIRS.filter((d) => !(d.x === -this.dir.x && d.y === -this.dir.y));
    let bestD: Vec = this.dir;
    let bestScore = Infinity;
    for (const d of options) {
      const nx = (head.x + d.x + COLS) % COLS;
      const ny = (head.y + d.y + ROWS) % ROWS;
      const body = this.snake.slice(0, -1);
      if (body.some((s) => s.x === nx && s.y === ny)) continue;
      const dist =
        Math.min(Math.abs(nx - this.food.x), COLS - Math.abs(nx - this.food.x)) +
        Math.min(Math.abs(ny - this.food.y), ROWS - Math.abs(ny - this.food.y));
      // 1-step lookahead: penalise dead ends
      let open = 0;
      for (const d2 of DIRS) {
        if (d2.x === -d.x && d2.y === -d.y) continue;
        const mx = (nx + d2.x + COLS) % COLS;
        const my = (ny + d2.y + ROWS) % ROWS;
        if (!this.snake.some((s) => s.x === mx && s.y === my)) open++;
      }
      const score = dist * 2 - open + Math.random() * 0.6;
      if (score < bestScore) {
        bestScore = score;
        bestD = d;
      }
    }
    this.queue = [bestD];
  }

  /* ----------------------------- effects ----------------------------- */

  private burst(gx: number, gy: number, n: number, colors: string[], speed: number) {
    const px = gx * this.cell;
    const py = gy * this.cell;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.75);
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 30,
        life: 380 + Math.random() * 320,
        max: 700,
        size: 2 + Math.random() * 3.4,
        color: colors[i % colors.length],
      });
    }
  }

  private floater(gx: number, gy: number, text: string, color: string, secs: number) {
    this.floaters.push({
      x: gx * this.cell,
      y: gy * this.cell,
      text,
      life: secs * 1000,
      max: secs * 1000,
      color,
    });
  }

  /* ----------------------------- sizing ------------------------------ */

  private fit() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const size = Math.max(120, Math.min(rect.width, rect.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = size;
    this.h = size;
    this.cell = size / COLS;
    this.canvas.width = Math.round(size * this.dpr);
    this.canvas.height = Math.round(size * this.dpr);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /* ----------------------------- drawing ----------------------------- */

  private draw() {
    const { ctx, w, h, cell } = this;
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    if (this.shake > 0.3) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    // board
    ctx.fillStyle = C.boardA;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.boardB;
    for (let y = 0; y < ROWS; y++) {
      for (let x = (y % 2); x < COLS; x += 2) {
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    if (this.eatFlash > 0) {
      ctx.fillStyle = `rgba(164,236,67,${(0.06 * this.eatFlash).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
    // soft center glow
    const glow = ctx.createRadialGradient(w / 2, h / 2, cell, w / 2, h / 2, w * 0.72);
    glow.addColorStop(0, "rgba(164,236,67,0.05)");
    glow.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // walls
    this.drawWalls();

    // food
    this.drawFood();

    // snake
    this.drawSnake();

    // rings
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1.5, cell * 0.09 * (1 - k));
      ctx.beginPath();
      ctx.arc(r.x * cell, r.y * cell, cell * 0.4 + k * cell * 2.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // particles (additive)
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // floaters
    for (const f of this.floaters) {
      const k = 1 - f.life / f.max;
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = f.color;
      ctx.font = `${Math.max(9, cell * 0.42)}px "Press Start 2P", monospace`;
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y - k * cell * 1.4);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private drawWalls() {
    const { ctx, w, h } = this;
    ctx.lineWidth = Math.max(2, this.cell * 0.1);
    if (this.diff.wrap) {
      ctx.strokeStyle = C.wallWrap;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([this.cell * 0.5, this.cell * 0.42]);
      ctx.lineDashOffset = -this.t * 14;
      ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.setLineDash([]);
    } else {
      const danger = this.status === "playing" ? 0.55 + Math.sin(this.t * 3) * 0.12 : 0.45;
      ctx.strokeStyle = C.wallSolid;
      ctx.globalAlpha = danger;
      ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
      // corner brackets
      ctx.globalAlpha = 0.9;
      const b = this.cell * 0.9;
      ctx.lineWidth = Math.max(3, this.cell * 0.16);
      ctx.strokeStyle = C.amber;
      const corners: Array<[number, number, number, number]> = [
        [2, 2, 1, 1],
        [w - 2, 2, -1, 1],
        [2, h - 2, 1, -1],
        [w - 2, h - 2, -1, -1],
      ];
      for (const [cx, cy, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * b, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * b);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawFood() {
    const { ctx, cell } = this;
    const pulse = 1 + Math.sin(this.t * 4.2) * 0.09;
    const cx = (this.food.x + 0.5) * cell;
    const cy = (this.food.y + 0.5) * cell;
    const r = cell * 0.34 * pulse;

    ctx.save();
    ctx.shadowColor = "rgba(255,167,38,0.85)";
    ctx.shadowBlur = cell * 0.6;
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.15, cx, cy, r);
    g.addColorStop(0, C.appleHi);
    g.addColorStop(1, C.appleLo);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // stem + leaf
    ctx.strokeStyle = "#8a5a2b";
    ctx.lineWidth = Math.max(1.5, cell * 0.07);
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.9);
    ctx.lineTo(cx + r * 0.12, cy - r * 1.35);
    ctx.stroke();
    ctx.fillStyle = C.leaf;
    ctx.save();
    ctx.translate(cx + r * 0.5, cy - r * 1.25);
    ctx.rotate(-0.5 + Math.sin(this.t * 2.5) * 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.42, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // shine
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.38, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSnake() {
    const { ctx, cell } = this;
    const pts = this.snake.map((s) => ({ x: (s.x + 0.5) * cell, y: (s.y + 0.5) * cell }));
    if (pts.length < 2) return;

    const dying = this.status === "over" && !this.win;
    const flash = dying && this.deathT < 0.55 && Math.sin(this.deathT * 42) > 0;
    const head = pts[0];
    const tail = pts[pts.length - 1];

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // body
    const grad = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
    if (flash) {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, C.coral);
    } else if (dying) {
      grad.addColorStop(0, "#c98d7a");
      grad.addColorStop(1, "#6e4038");
    } else {
      grad.addColorStop(0, C.snakeHead);
      grad.addColorStop(0.45, C.snakeMid);
      grad.addColorStop(1, C.snakeTail);
    }
    ctx.strokeStyle = grad;
    ctx.lineWidth = cell * 0.74;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    for (let i = pts.length - 2; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // glossy spine
    if (!dying) {
      ctx.strokeStyle = "rgba(233,255,190,0.28)";
      ctx.lineWidth = cell * 0.26;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      for (let i = pts.length - 2; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }

    // tongue flick
    if (!dying && this.t % 2.4 < 0.22) {
      const tx = head.x + this.dir.x * cell * 0.55;
      const ty = head.y + this.dir.y * cell * 0.55;
      ctx.strokeStyle = "#ff5449";
      ctx.lineWidth = Math.max(1.5, cell * 0.07);
      ctx.beginPath();
      ctx.moveTo(head.x + this.dir.x * cell * 0.3, head.y + this.dir.y * cell * 0.3);
      ctx.lineTo(tx, ty);
      ctx.lineTo(tx + (this.dir.y !== 0 ? cell * 0.12 : 0) + this.dir.x * cell * 0.14, ty + (this.dir.x !== 0 ? cell * 0.12 : 0) + this.dir.y * cell * 0.14);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - (this.dir.y !== 0 ? cell * 0.12 : 0) + this.dir.x * cell * 0.14, ty - (this.dir.x !== 0 ? cell * 0.12 : 0) + this.dir.y * cell * 0.14);
      ctx.stroke();
    }

    // head + eyes
    ctx.fillStyle = dying ? (flash ? "#ffffff" : "#d19a86") : C.snakeHead;
    ctx.beginPath();
    ctx.arc(head.x, head.y, cell * 0.46, 0, Math.PI * 2);
    ctx.fill();

    if (!dying) {
      const px = -this.dir.y;
      const py = this.dir.x;
      const blink = this.t % 3.3 < 0.11;
      for (const s of [1, -1]) {
        const ex = head.x + this.dir.x * cell * 0.16 + px * s * cell * 0.19;
        const ey = head.y + this.dir.y * cell * 0.16 + py * s * cell * 0.19;
        if (blink) {
          ctx.strokeStyle = "#12300f";
          ctx.lineWidth = Math.max(1.5, cell * 0.06);
          ctx.beginPath();
          ctx.moveTo(ex - px * cell * 0.09 - (this.dir.x * cell) / 12, ey - py * cell * 0.09 - (this.dir.y * cell) / 12);
          ctx.lineTo(ex + px * cell * 0.09 - (this.dir.x * cell) / 12, ey + py * cell * 0.09 - (this.dir.y * cell) / 12);
          ctx.stroke();
        } else {
          ctx.fillStyle = "#f4ffe8";
          ctx.beginPath();
          ctx.arc(ex, ey, cell * 0.12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#12300f";
          ctx.beginPath();
          ctx.arc(ex + this.dir.x * cell * 0.045, ey + this.dir.y * cell * 0.045, cell * 0.06, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}
