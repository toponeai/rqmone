# Roadmap

The direction of R.Q.M.1 — the Global Interactive Earth Platform. Dates are
intentions, not commitments; scope is refined per release.

## Delivered

- **Entity core** — universal `entities` table with PostGIS geometry, GIST
  index, viewport search and clustering RPCs.
- **Interactive Earth** — react-globe.gl surface with locally hosted textures,
  altitude-aware clustering, fly-to navigation.
- **Auth & ownership** — email + Google sign-in, `profiles`, owner-scoped RLS,
  `/manage` dashboard.
- **Messaging engine** — conversations, messages, realtime chat.
- **Notification engine** — notifications table with message fan-out trigger.
- **AI Core** — streaming assistant on the Lovable AI Gateway with persisted
  history.
- **Galaxy OS shell** — AppShell, docks, window manager, command system,
  motion / particles / sound / theme engines, EN + AR with RTL.
- **3D galaxy layer** — Three.js scene with sun, planets, starfield.
- **MCP agent integrations** — OAuth 2.1 protected server at `/mcp`.
- **Enterprise repository** — CI, CodeQL, Dependabot, docs, governance.

## Next

### Earth marketplace surface

- Distinct pin styles and colour coding per entity type.
- Featured / promoted entity ring animation.
- Glass hover cards with owner actions and "Message owner".
- Category filter bar and search-on-map with camera fly-to bbox.

### Galaxy polish

- PBR planet textures and atmospheric shaders per module.
- Ambient audio bed with ducking during AI Core responses.
- Performance guard: adaptive star count and bloom on low-end devices.
- Full reduced-motion and keyboard navigation paths.

## Later

- **Universal search engine** — cross-entity semantic search with embeddings.
- **Marketplace & wallet** — listings, offers, transactions, payouts.
- **Analytics planet** — owner dashboards for views, contacts, conversions.
- **Media pipeline** — image upload, optimisation and AI-generated covers.
- **Admin planet** — moderation queue, reporting, role management.
- **Automated test suite** — unit tests for server functions and Playwright
  end-to-end coverage of the core journeys.

## Non-goals

- Category-specific database schemas or per-vertical architectures.
- Alternative frontend frameworks or routers.
- Light theme as the default experience.

Have an idea? Open a [feature request](../../issues/new?template=feature_request.yml).
