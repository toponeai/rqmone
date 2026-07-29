# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Enterprise repository scaffolding: CI, CodeQL, Dependency Review, Dependabot,
  CODEOWNERS, pull request template and structured issue forms.
- Full documentation set under `docs/` (architecture, database, API,
  deployment, authentication, AI, modules, developer guide).
- Governance documents: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`,
  `ROADMAP.md`, `CHANGELOG.md`, expanded `SECURITY.md`.
- Developer tooling: EditorConfig, Husky, lint-staged, commitlint,
  Prettier configuration improvements, `typecheck` and `format:check` scripts.

## [0.5.0] - 2026-07-28

### Added

- MCP agent integrations mounted at `/mcp`, OAuth 2.1 protected, with
  `search_entities`, `list_my_entities`, `create_entity` and
  `list_notifications` tools.
- OAuth consent screen with glassmorphic UI.

### Security

- Public lookup RPCs converted from `SECURITY DEFINER` to `SECURITY INVOKER`.
- Fixed `search_path` on trigger functions.
- Revoked `EXECUTE` on internal automation functions from `anon`/`authenticated`.
- Revoked API access to `public.spatial_ref_sys`.

## [0.4.0] - 2026-07-15

### Added

- Cinematic 3D galaxy layer (`src/os/galaxy3d/`) using Three.js and
  React Three Fiber: starfield, sun, planets and camera flight.
- Galaxy OS engines: motion, particles, sound and themes.
- Window Manager v2 with edge snapping and persistence.

### Fixed

- Infinite render loop caused by an unstable command registry snapshot.

## [0.3.0] - 2026-07-13

### Added

- Notification engine with realtime fan-out trigger from new messages.
- Messaging engine: conversations, messages, realtime chat pane at `/messages`.
- Planet Navigator orbital overlay and galaxy groupings.

## [0.2.0] - 2026-07-12

### Added

- Authentication and ownership: `profiles` table, `/auth` route,
  `/manage` dashboard, owner-scoped RLS on entities.
- Viewport clustering via the `entities_cluster` PostGIS RPC.
- AI Core assistant backed by the Lovable AI Gateway.

## [0.1.0] - 2026-07-12

### Added

- Initial platform: universal `entities` table with PostGIS geometry,
  interactive 3D Earth, and the first four entity types
  (Business, Property, Event, Product).
