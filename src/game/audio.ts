/* Tiny WebAudio chip-tune synth for game feedback. Context is created lazily
   on first user gesture to satisfy autoplay policies. */

type Wave = OscillatorType;

class ChipSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Call from a user gesture to unlock audio. */
  unlock() {
    this.ensure();
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: Wave; to?: number; delay?: number; gain?: number } = {},
  ) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const { type = "square", to, delay = 0, gain = 1 } = opts;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.9 * gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  eat(streak: number) {
    const base = 500 + Math.min(streak, 8) * 40;
    this.tone(base, 0.07, { type: "square" });
    this.tone(base * 1.5, 0.09, { type: "square", delay: 0.055 });
  }
  turn() {
    this.tone(220, 0.03, { type: "triangle", gain: 0.25 });
  }
  die() {
    this.tone(320, 0.34, { type: "sawtooth", to: 55 });
    this.tone(180, 0.4, { type: "square", to: 40, delay: 0.05, gain: 0.7 });
  }
  start() {
    this.tone(392, 0.08);
    this.tone(523, 0.08, { delay: 0.09 });
    this.tone(784, 0.14, { delay: 0.18 });
  }
  pause() {
    this.tone(440, 0.06, { type: "triangle", gain: 0.5 });
    this.tone(330, 0.08, { type: "triangle", delay: 0.07, gain: 0.5 });
  }
  resume() {
    this.tone(330, 0.06, { type: "triangle", gain: 0.5 });
    this.tone(440, 0.08, { type: "triangle", delay: 0.07, gain: 0.5 });
  }
  newBest() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this.tone(f, 0.12, { delay: i * 0.09, gain: 0.8 }),
    );
  }
  select() {
    this.tone(660, 0.05, { type: "triangle", gain: 0.5 });
  }
}

export const synth = new ChipSynth();
