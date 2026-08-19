# R.Q.M.1 — Repair, Icon Overhaul & Completion Plan

Goal: repair known gaps, unify the icon system, fill in missing data (translations, textures, planet registry, entity fields), and finish the half-built module planets — **without removing or disabling any existing program, route, or engine**. Everything currently live (Earth, AI Core, AI Manager, Manage, Messages, Notifications, MCP, Galaxy 3D, Window Manager, engines) stays live and only gains capability.

---

## 1. Icon system repair (the main hygiene fix)

The project rule is: every icon comes from `@/os/icons`. Right now 30+ files import `lucide-react` directly (routes, entity dialogs, auth menu, AI panels), so the icon set can't be swapped or themed in one place.

- Extend `src/os/icons/index.ts` into a complete semantic registry: add the currently-missing names used across the app (mail, lock, key, send, copy, check, alert, info, filter, calendar, tag, price, upload, image, refresh, sparkle-loading, external-link, star, heart, eye, clock, trash, download, chevrons, grid/list toggles, verified badge, shield, robot/agent, plan/task, log).
- Migrate every app file (routes, `src/modules/**`, `src/components/auth-menu.tsx`, `src/components/ai-elements/**`) to import from `@/os/icons`. Generated `src/components/ui/*` shadcn primitives stay untouched — they're vendor files, not app icons.
- Add an ESLint `no-restricted-imports` rule banning `lucide-react` outside `src/os/icons/index.ts` and `src/components/ui/`, so the rule enforces itself from now on.
- Standardise icon sizing/stroke via one `IconProps` convention (`h-4 w-4` default, `strokeWidth 1.75`) so glass UI stays visually consistent.
- Give each entity type and each planet a dedicated, distinct glyph in `src/modules/config/entity-types.tsx` and `src/os/galaxy/planets.ts` (today Property reuses the Home icon that also means "home nav" — that gets its own house glyph).

## 2. Complete the missing data

**Translations** — `nav.jobs` is referenced with an `as never` cast in `LeftDock.tsx` and `planets.ts` because the key doesn't exist. Add it plus every other missing key to `en.ts` and `ar.ts`, then remove all `as never` casts so the dictionary is type-checked again. Add missing `module.*.soon` bodies for jobs/analytics/profile/settings/admin instead of the generic fallback.

**Planet textures** — `public/textures/planets/` has 9 maps but no Moon and no Uranus, and no cloud/normal layers. Generate the missing colour maps plus an Earth cloud layer so Earth looks real in the 3D galaxy.

**Planet registry** — fill in every entry with the fields the 3D layer expects (texture path, orbit radius, orbital speed, tilt, ring flag) so `planetLayout.ts` stops guessing.

**Entity metadata** — additive migration only: `is_featured boolean default false` and `cover_url text` on `public.entities`, plus an index for featured lookups. No column or table is dropped.

## 3. Repairs to existing surfaces

- **Galaxy 3D**: wire `useGalaxyStore` mode transitions to the camera (fly-to on planet click, cinematic zoom into Earth) and to the sound cues that already exist in `sound.ts` but are never fired (`warp-in`, `planet-approach`, `earth-enter`, `pin-hover`).
- **Coming-soon planets stay reachable**: `ComingSoonModule` keeps working; planets that get real routes in step 4 simply flip `status: "soon" → "ready"`.
- **Earth surface**: per-type pin glyphs with colour-coded glow, featured ring for `is_featured`, glass hover card (title, type, owner, actions), category filter bar, search-flies-camera. `InteractiveEarth` is upgraded in place.
- **Accessibility**: hidden keyboard-reachable nav mirroring the planet registry, `prefers-reduced-motion` path, aria labels on every icon-only button.
- **SEO/head**: unique `head()` (title, description, og/twitter) on every content route that lacks one.

## 4. Finish the remaining module planets (nothing disabled, only added)

Built in this order, each as a real route under the existing shell, each type-agnostic and reusing `entities`/`profiles`:

1. **Profile** (`/profile`) — display name, avatar upload, public profile page.
2. **Settings** (`/settings`) — language, theme, sound, motion, notification preferences (persisted per user).
3. **Marketplace** (`/marketplace`) — list/grid browse over the same entities with filters, sort, and featured rail. No new entity concept.
4. **Analytics** (`/analytics`) — owner-scoped counts, views, and map heat summary from existing tables.
5. **Community**, **Jobs**, **Live**, **Wallet** — remain roadmap planets with their coming-soon windows intact and clearer copy, so nothing regresses.

## 5. Suggestions I'd add

- **Galaxy Time**: subtle day/night terminator on Earth driven by real UTC time.
- **Entity constellations**: entities owned by one user connect with faint arc lines when their profile is focused.
- **Command palette deep links**: every planet, entity type, and settings toggle becomes a palette command.
- **Save/bookmark**: `saved_entities` table so users can pin places to their own orbit.
- **Share cards**: per-entity OG image URL from `cover_url` so shared links preview properly.

---

## Technical section

Files touched (all edits additive or in-place upgrades; no deletions of features):

```
src/os/icons/index.ts                     expanded registry
eslint.config.js                          no-restricted-imports for lucide-react
src/os/i18n/locales/{en,ar}.ts            missing keys, remove `as never`
src/os/galaxy/planets.ts                  full per-planet data
src/os/galaxy3d/{GalaxyScene,Planet3D,planetLayout,useGalaxyStore}.ts(x)
src/modules/maps/InteractiveEarth.tsx     pins, hover card, filters
src/modules/maps/{MarketFilters,EntityHoverCard}.tsx   new
src/modules/config/entity-types.tsx       distinct glyphs + cover field
src/routes/{profile,settings,marketplace,analytics}.tsx  new
public/textures/planets/*                 missing maps
supabase/migrations/<ts>_entities_featured_cover.sql
supabase/migrations/<ts>_saved_entities.sql
```

Migration rules followed: `CREATE TABLE` → `GRANT` → `ENABLE ROW LEVEL SECURITY` → policies, owner-scoped on `auth.uid()`. Existing tables only gain nullable/defaulted columns.

Data access: authenticated reads/writes through `createServerFn` with `requireSupabaseAuth`; public reads (marketplace, entity pages) through public server fns so SSR/prerender never 401s. No Supabase edge functions.

Verification after each stage: `bun run build:dev`, `tsgo`, route smoke test on `/`, `/ai-core`, `/ai-manager`, `/manage`, `/messages`, `/notifications`, `/marketplace`, `/profile`, `/settings`, `/analytics`, plus a Playwright pass on the 3D galaxy.

## Delivery stages

1. **Icons + i18n repair** — registry, migrations of all imports, ESLint guard, missing keys, casts removed.
2. **Data completion** — textures, planet registry fields, `is_featured`/`cover_url` migration.
3. **Earth marketplace surface** — pins, hover card, filters, featured ring, camera/sound wiring.
4. **New module planets** — Profile, Settings, Marketplace, Analytics.
5. **Polish** — accessibility, reduced motion, head metadata, saved entities, share cards.

Each stage ends buildable and testable in preview.
