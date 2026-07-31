/**
 * R.Q.M.1 Sound Engine.
 *
 * Tiny WebAudio wrapper that synthesizes short UI cues (no asset downloads).
 * Muted by default; opt-in via `setSoundEnabled(true)` and persisted to
 * localStorage. Reduced-motion users also get sound off by default.
 */

export type SoundName =
  | "planet-hover"
  | "window-open"
  | "window-close"
  | "notification"
  | "ai-response"
  | "message-received"
  | "warp-in"
  | "warp-out"
  | "planet-approach"
  | "planet-select"
  | "earth-enter"
  | "market-ping"
  | "pin-hover";

const STORAGE_KEY = "rqm.sound.enabled";
let ctx: AudioContext | null = null;
let enabled = false;

if (typeof window !== "undefined") {
  try {
    enabled = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    /* ignore */
  }
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as
      | typeof AudioContext
      | undefined;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

interface Tone {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slide?: number;
}

const CUES: Record<SoundName, Tone> = {
  "planet-hover": { freq: 880, dur: 0.06, type: "sine", gain: 0.03 },
  "window-open": { freq: 520, dur: 0.14, type: "triangle", gain: 0.05, slide: 780 },
  "window-close": { freq: 640, dur: 0.12, type: "triangle", gain: 0.04, slide: 320 },
  notification: { freq: 720, dur: 0.18, type: "sine", gain: 0.05, slide: 960 },
  "ai-response": { freq: 420, dur: 0.22, type: "sine", gain: 0.04, slide: 660 },
  "message-received": { freq: 560, dur: 0.16, type: "sine", gain: 0.045, slide: 820 },
  "warp-in": { freq: 180, dur: 0.6, type: "sawtooth", gain: 0.05, slide: 1200 },
  "warp-out": { freq: 1200, dur: 0.5, type: "sawtooth", gain: 0.05, slide: 140 },
  "planet-approach": { freq: 300, dur: 0.35, type: "sine", gain: 0.05, slide: 700 },
  "planet-select": { freq: 660, dur: 0.22, type: "triangle", gain: 0.06, slide: 1100 },
  "earth-enter": { freq: 220, dur: 0.7, type: "sine", gain: 0.06, slide: 520 },
  "market-ping": { freq: 980, dur: 0.12, type: "sine", gain: 0.04 },
  "pin-hover": { freq: 1040, dur: 0.05, type: "sine", gain: 0.025 },
};

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(v: boolean): void {
  enabled = v;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
}

export function play(name: SoundName): void {
  if (!enabled) return;
  const context = ac();
  if (!context) return;
  const cue = CUES[name];
  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = cue.type ?? "sine";
  osc.frequency.setValueAtTime(cue.freq, now);
  if (cue.slide) osc.frequency.exponentialRampToValueAtTime(cue.slide, now + cue.dur);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(cue.gain ?? 0.04, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + cue.dur);
  osc.connect(gain).connect(context.destination);
  osc.start(now);
  osc.stop(now + cue.dur + 0.02);
}
