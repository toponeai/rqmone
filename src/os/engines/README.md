# R.Q.M.1 Engines

Reusable primitives that power the Galaxy Operating System. Every module
consumes these — no duplicated animations, sounds, particles, or themes.

| Engine       | File            | Purpose                                                     |
| ------------ | --------------- | ----------------------------------------------------------- |
| Motion       | `motion.ts`     | Named durations, easings, keyframe presets (`anim("fade")`) |
| Particles    | `particles.tsx` | Reusable `<Starfield />` canvas layer (stars + nebula)      |
| Sound        | `sound.ts`      | WebAudio cues (`play("window-open")`), opt-in + persisted   |
| Theme        | `themes.ts`     | `applyTheme("aurora")`, registry-driven CSS variables       |

## Design contract

- **No hardcoded animation values in modules** — always import from `motion.ts`.
- **No asset-based sound files** — synthesized cues stay bundle-free.
- **Themes are CSS variables only** — no rerenders in consumers.
- **Particles are opt-in per surface** — respects `prefers-reduced-motion`.

## Extending

- **New motion preset**: add to `PRESETS` in `motion.ts` and (if needed) a
  keyframe in `src/styles.css`.
- **New theme**: append to `THEMES` in `themes.ts`. Zero component changes.
- **New sound cue**: add to `CUES` in `sound.ts` with `SoundName` type.
- **New particle effect**: add a new component alongside `Starfield`
  (e.g. `MeteorShower`, `SelectionBurst`) reusing the same rAF pattern.
