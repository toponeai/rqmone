# Galaxy OS — Staged Rebuild Plan

The full spec (galaxy scene + 9 real modules + AI Core) is 10+ milestones of work. Doing it in one pass would guarantee bugs and instability, which directly violates your "never sacrifice stability for new features" rule. So we ship in stages, each stage independently stable and shippable.

---

## Stage 1 — Stabilization Sweep (this stage)

Goal: zero known errors on the current Earth platform before any galaxy work starts. Nothing new is added.

### Audit pass (read-only, first)
- Run TypeScript compile + ESLint across the repo, capture every error/warning.
- Run the Supabase linter for RLS / grant / policy issues.
- Read production + preview server-function logs for runtime errors.
- Load `/`, `/auth`, `/manage`, `/entity/$id` in a headless browser; capture console errors, network 4xx/5xx, and screenshots.
- Inspect the globe for: memory leaks (ResizeObserver / debounce timers / three.js dispose), animation stutters, cluster re-render loops, camera event listener leaks on unmount.
- Verify every route in `routeTree.gen.ts` renders and every `<Link>` target exists.

### Fix pass (only real findings)
- TypeScript errors → fix at source.
- Runtime errors in console/logs → root-cause and fix.
- Broken routes / missing components → repair.
- Three.js / globe leaks → add proper cleanup in `useEffect` returns, dispose geometries/materials on unmount, remove `controls('change')` listener.
- RLS/grant gaps → migration.
- Build warnings that indicate real bugs (not just noise) → fix.

Deliverable: clean build, clean console on every route, clean linter, documented list of what was found and fixed. No feature work.

### Note on "Firestore errors"
This project runs on Lovable Cloud (Postgres), not Firestore — treating that line in the spec as a template copy-paste and auditing the actual stack, per your answer.

---

## Stage 2 — Galaxy Shell (next stage, separate plan)

Wrap the existing app in a galaxy scene:
- New `/` = galaxy view. AI Core sphere at center. ~9 planets on slow orbits.
- Existing Earth interactive globe becomes the "Earth / TOPONE Web OS" planet — clicking Earth flies the camera in and mounts the current homepage.
- Other 8 planets open "coming soon" shells (real modules land in Stage 3+).
- Space environment: starfield, nebula, dust, subtle bloom, deep-space background.
- Hover glow + info card, click-to-fly camera, back button flies out.
- Orbits are slow (30–120s per revolution) so planets are easy to click.
- Performance budget: 60fps target, frustum culling, LOD on planets, texture compression, lazy-loaded scene chunk.

Existing routes (`/manage`, `/auth`, `/entity/$id`) stay reachable via the top nav — the galaxy is an entry surface, not a replacement for working URLs.

## Stage 3+ — Real Modules, One Per Milestone

Each planet becomes a real app in its own milestone (your "build them for real" answer). Order proposed:
1. Moon — Messaging (owner↔visitor chat, realtime, notifications)
2. Venus — Wallet (Stripe, balances, transactions)
3. Mars — Real Estate (entity subtype + listings UI)
4. Neptune — AI Marketplace (Lovable AI agents catalog)
5. Mercury — Analytics (per-owner dashboards)
6. Saturn — Cloud Devices
7. Jupiter — DubAI
8. Uranus — Security center
9. Pluto — Admin center

Each module ships Dashboard / Settings / Analytics / Notifications / AI Assistant tabs, backed by real tables + RLS.

## Stage 4 — AI Command Center

The center AI Core becomes a real command surface: cross-module semantic search (pgvector), open-any-module intents, run workflows, monitor platform health. Requires Stages 1–3.

---

## What I'll deliver if you approve

Stage 1 only. I will:
1. Run the audit tools listed above in parallel.
2. Report the findings.
3. Fix them.
4. Verify each route is clean.
5. Hand back a stable baseline and ask for approval to start Stage 2.

Approve to start the audit.
