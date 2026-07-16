/**
 * R.Q.M.1 Motion Engine.
 *
 * Central animation preset registry. Modules import from here rather than
 * hardcoding durations/easings so future themes/reduced-motion overrides
 * flow through one file.
 *
 * Values are pure JS numbers so they can drive both CSS (via inline style)
 * and any future JS animation runtime (framer-motion, GSAP).
 */

export type EasingName = "linear" | "out" | "inOut" | "spring" | "elastic";

export const EASINGS: Record<EasingName, string> = {
  linear: "linear",
  out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  elastic: "cubic-bezier(0.68, -0.55, 0.27, 1.55)",
};

export type SpeedName = "fast" | "normal" | "slow";
export const DURATIONS: Record<SpeedName, number> = {
  fast: 120,
  normal: 220,
  slow: 420,
};

export interface MotionPreset {
  duration: number;
  easing: string;
  keyframes?: string;
}

/** Named motion presets used across the OS. */
export const PRESETS = {
  fade: { duration: DURATIONS.normal, easing: EASINGS.out, keyframes: "rqm-fade-in" },
  scale: { duration: DURATIONS.normal, easing: EASINGS.spring, keyframes: "rqm-scale-in" },
  float: { duration: 5500, easing: EASINGS.inOut, keyframes: "rqm-breathe" },
  orbit: { duration: 60000, easing: EASINGS.linear, keyframes: "rqm-orbit" },
  aurora: { duration: 12000, easing: EASINGS.linear, keyframes: "rqm-aurora" },
  elastic: { duration: 360, easing: EASINGS.spring, keyframes: "rqm-scale-in" },
} satisfies Record<string, MotionPreset>;

export type PresetName = keyof typeof PRESETS;

/** Build a CSS `animation` shorthand from a preset name. */
export function anim(name: PresetName, extras: string = ""): string {
  const p = PRESETS[name];
  return `${p.keyframes} ${p.duration}ms ${p.easing} ${extras}`.trim();
}

/** Respect user preference at call site (JS side only; CSS uses the media query in tokens.css). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
