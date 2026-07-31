# Roadmap

The direction of R.Q.M.1 — the Global Interactive Earth Platform.
Dates are intentions, not commitments. Scope is refined per release.

---

## ✅ Delivered

| Feature | Status |
|---|---|
| **Entity core** — universal `entities` table with PostGIS geometry, GIST index, viewport search and clustering RPCs | ✅ |
| **Interactive Earth** — react-globe.gl with locally hosted textures, altitude-aware clustering, fly-to navigation | ✅ |
| **Auth and ownership** — email + OAuth sign-in, `profiles`, owner-scoped RLS, `/manage` dashboard | ✅ |
| **Messaging engine** — conversations, messages, realtime chat at `/messages` | ✅ |
| **Notification engine** — notifications table with message fan-out trigger and realtime toasts | ✅ |
| **AI Core** — streaming assistant via Lovable AI Gateway with persisted history at `/ai-core` | ✅ |
| **Galaxy OS shell** — AppShell, docks, window manager, command palette, motion/particles/sound/theme engines, EN + AR with RTL | ✅ |
| **3D galaxy layer** — Three.js scene with sun, planets, orbital rings, starfield | ✅ |
| **MCP agent integrations** — OAuth 2.1 protected server at `/mcp` with `search_entities`, `list_my_entities`, `create_entity`, `list_notifications` tools | ✅ |
| **Enterprise repository** — CI, CodeQL, Dependabot, governance docs | ✅ |

---

## Phase 1 — Earth Marketplace Surface

_Goal: make the globe the primary discovery and interaction surface._

- [ ] Distinct pin styles and colour-coded rings per entity type
- [ ] Featured / promoted entity pin animation (ring pulse)
- [ ] Glass hover cards with owner info and "Message owner" shortcut
- [ ] Category filter bar with camera fly-to matching bbox
- [ ] Map search — fly camera to results on the globe
- [ ] Cluster tap drill-down — zoom into cluster to reveal individual pins
- [ ] Entity detail page SEO improvements — structured data (JSON-LD)

---

## Phase 2 — Galaxy Polish

_Goal: raise the 3D experience to cinematic quality._

- [ ] PBR planet textures and atmospheric shaders per module
- [ ] Ambient audio bed with automatic ducking during AI Core responses
- [ ] Performance guard — adaptive star count and bloom strength on low-end GPUs
- [ ] Full reduced-motion support (respects `prefers-reduced-motion`)
- [ ] Full keyboard navigation through the galaxy and planet navigator
- [ ] Smooth camera transitions between galaxy and Earth modes

---

## Phase 3 — Media Pipeline

_Goal: let owners attach rich media to their entities._

- [ ] Image upload for entity cover photos (Supabase Storage)
- [ ] Client-side image compression before upload
- [ ] AI-generated cover image suggestions via the AI Gateway
- [ ] Video embed support (YouTube / direct URL)
- [ ] Image gallery on entity detail pages

---

## Phase 4 — Universal Search Engine

_Goal: semantic cross-entity discovery._

- [ ] Text embedding pipeline for entity titles and descriptions (pgvector)
- [ ] Vector similarity search RPC alongside the existing spatial RPC
- [ ] Combined relevance ranking (spatial + semantic)
- [ ] Search results panel with entity cards and map fly-to
- [ ] Search history and saved searches

---

## Phase 5 — Marketplace and Wallet

_Goal: enable commercial transactions between users._

- [ ] Listing price field on entities
- [ ] Offer / inquiry system between entity owner and visitor
- [ ] Wallet module — balance, credits, transaction history
- [ ] Payout flow for entity owners
- [ ] Promoted listing purchases (pay to feature)

---

## Phase 6 — Analytics Planet

_Goal: give owners actionable data about their entities._

- [ ] Entity view counter (privacy-preserving, aggregated)
- [ ] Contact / message conversion funnel
- [ ] Heatmap overlay on the globe (where users are browsing)
- [ ] Owner analytics dashboard at `/analytics`
- [ ] Export report as PDF or CSV

---

## Phase 7 — Admin Planet

_Goal: moderation and platform health tools._

- [ ] Moderation queue for reported entities
- [ ] Reporting flow from entity detail pages
- [ ] Role management — moderator, admin roles
- [ ] Bulk publish / unpublish / delete for admins
- [ ] Platform-wide audit log

---

## Phase 8 — Test Coverage

_Goal: prevent regressions as the codebase grows._

- [ ] Unit tests for all server functions (Vitest)
- [ ] Integration tests for auth flows
- [ ] Playwright end-to-end tests for critical journeys:
  - Sign in → create entity → view on globe
  - Send message → receive notification
  - AI Core conversation
- [ ] CI gates blocking merge on test failures

---

## Non-goals

- Category-specific database schemas or per-vertical architectures — all objects share the universal `entities` table.
- Alternative frontend frameworks or routers.
- Light theme as the default experience.
- Native mobile apps (the web app is designed to be mobile-responsive).

---

Have an idea? Open a [feature request](../../issues/new?template=feature_request.yml).
