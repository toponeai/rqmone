# R.Q.M.1 — Cinematic Rebuild Plan

Goal: transform the current 2D "planet navigator" into a real cinematic 3D journey — enter a galaxy of realistic planets (each = a module), fly to Earth to browse geo-located listings, ads, and marketplace entities from users, with premium sound and visual effects.

The existing backend (entities, auth, messaging, notifications, AI Core, MCP) stays intact. This rebuild focuses on the visual/interaction shell and marketplace surface on Earth.

---

## 1. New 3D Rendering Layer (Three.js + R3F)

Add `@react-three/fiber` + `@react-three/drei` + `postprocessing` alongside the existing `react-globe.gl`. Create `src/os/galaxy3d/`:

- `GalaxyScene.tsx` — starfield (Points), nebula shader, drifting dust, camera rig with `OrbitControls` + auto-orbit.
- `Planet.tsx` — reusable realistic planet: sphere + PBR textures (color / normal / roughness), atmospheric Fresnel shader, cloud layer, ring option, glow sprite, self-rotation.
- `Sun.tsx` — central star (AI Core) with lens flare and bloom.
- `PlanetLabel.tsx` — Drei `Html` billboard with glass label + status badge.
- `CameraRig.tsx` — smooth `flyTo(target)` using GSAP-style tween on `useFrame`.
- Postprocessing: Bloom + Vignette + Chromatic Aberration (subtle).

Planets pull from existing `src/os/galaxy/planets.ts` registry (no schema change) — each entry gets a `texture` and `size` field.

## 2. Realistic Planet Assets

Generate high-res PBR textures with imagegen (2048×1024 equirectangular) into `public/textures/planets/`:

- earth (already present) → keep; add clouds + night lights variants
- mars, venus, jupiter, saturn (with ring), neptune, moon-luna
- one stylized "AI core" star texture
- Each planet: `<id>_color.jpg`, `<id>_normal.jpg` (optional), plus a shared `stars_milkyway.jpg` skybox

## 3. Galaxy → Earth Flow

`src/routes/index.tsx` becomes a staged experience:

```
[Intro: warp starfield 1.5s] → [Galaxy view: orbiting planets around Sun/AI Core]
    ↓ click planet
[Camera zoom + audio whoosh] → module route OR floating window
    ↓ click Earth
[Cinematic zoom to Earth] → existing InteractiveEarth v2 (marketplace view)
```

State machine via a small `useGalaxyStore` (Zustand): `mode: "galaxy" | "earth" | "transition"`.

## 4. Earth as Marketplace Surface

Upgrade `InteractiveEarth.tsx`:

- Distinct pin styles per `entity_type` (Business = storefront glyph, Property = house, Event = calendar burst, Product = tag) with color-coded glow.
- "Featured / Promoted" ring animation for entities flagged `is_featured` (add optional column via migration — additive, defaults false).
- Hover card (glass): title, price/type, owner, distance from camera focus, "Open" / "Message owner" actions.
- Category filter bar (top-center, glass): toggles per entity type; live re-cluster.
- Search-on-map: uses existing entity search server fn; results fly camera to bbox.
- "Post to Earth" FAB reuses `CreateEntityDialog`.

## 5. Sound Engine v2

Extend `src/os/engines/sound.ts` with layered cues + optional ambient:

- New cues: `warp-in`, `warp-out`, `planet-approach`, `planet-select`, `earth-enter`, `market-ping`, `pin-hover`.
- Ambient bed: low-volume synth pad loop (WebAudio oscillator + filter, no asset) toggled with the existing sound switch. Ducked during AI Core responses.
- Respect `prefers-reduced-motion` + persisted mute.

## 6. Shell Integration

- Replace `PlanetNavigator` overlay's 2D orbit with a mini 3D viewport (same `GalaxyScene` at low density) OR route the "planets" button to switch `mode → galaxy`. Chosen: **switch mode** — one canvas, one truth.
- Keep `AppShell` chrome (TopNav, docks, WindowManager) floating above the canvas via existing z-index tokens.
- Add `PerformanceGuard`: auto-drop star count / disable bloom on low-end (detect via `navigator.hardwareConcurrency` + first-frame time).

## 7. Accessibility & Perf

- All planets keyboard-reachable via a hidden `<nav>` list mirroring the registry.
- `prefers-reduced-motion` → static galaxy image + no bloom + no ambient sound.
- Textures lazy-loaded; skybox compressed; `frameloop="demand"` when idle.
- SSR-safe: entire 3D layer behind `<ClientOnly>` + `React.lazy`.

## 8. Migration & Backward Compat

- Additive migration only: `alter table public.entities add column is_featured boolean not null default false;` + index.
- No changes to auth, messaging, notifications, MCP, AI Core.
- Old `PlanetNavigator` kept as fallback for reduced-motion users.

---

## Technical Section

Packages to add:
- `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`, `maath` (easing), `leva` dev-only optional.

File map (new):
```
src/os/galaxy3d/
  GalaxyScene.tsx
  Sun.tsx
  Planet.tsx
  PlanetLabel.tsx
  CameraRig.tsx
  Starfield3D.tsx
  useGalaxyStore.ts
  performance.ts
public/textures/planets/*.jpg
src/modules/maps/InteractiveEarth.tsx  (upgraded)
src/modules/maps/MarketFilters.tsx     (new)
src/modules/maps/EntityHoverCard.tsx   (new)
src/os/engines/sound.ts                (extended)
supabase/migrations/<ts>_entities_featured.sql
```

Route change: `src/routes/index.tsx` orchestrates `mode` between `GalaxyScene` and `InteractiveEarth`.

Risks & mitigations:
- **Bundle size**: three ≈ 600 KB gz. Mitigate with dynamic import + code-split per mode.
- **Texture cost**: generate at 2048×1024, serve as `.jpg` q80; total < 8 MB.
- **Cloudflare Worker SSR**: entire 3D tree is client-only via `<ClientOnly>` + `React.lazy`; no server import of three.

---

## Delivery Stages

1. **Foundation** — install deps, `GalaxyScene` skeleton with starfield + orbiting sphere placeholders, mode store, `<ClientOnly>` wiring on `/`.
2. **Realistic planets** — generate textures, PBR `Planet` component, Sun + bloom, camera rig, click-to-fly, sound cues.
3. **Earth marketplace** — upgraded pins, hover card, category filters, featured ring, `is_featured` migration.
4. **Polish** — ambient audio bed, performance guard, reduced-motion path, keyboard nav, QA pass on RTL + auth flows.

Each stage ends buildable and testable in preview before moving on.

Confirm and I'll execute Stage 1 first.
