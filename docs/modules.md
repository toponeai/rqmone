# Modules

Every module is a planet in the Galaxy OS. The registry lives in
`src/os/galaxy/planets.ts` with groupings in `GALAXIES`
(Core, Comms, Market, Economy, Analytics, Admin).

| Planet | Module | Status |
| --- | --- | --- |
| Sun — AI Core | `src/lib/ai-core.functions.ts`, `/ai-core` | live |
| Earth — Marketplace surface | `src/modules/maps/InteractiveEarth.tsx` | live |
| Entities | `src/modules/entity/` | live |
| Messages | `src/modules/messaging/` | live |
| Notifications | `src/modules/notifications/` | live |
| Wallet / Analytics / Admin | — | planned (see [ROADMAP](../ROADMAP.md)) |

## Entity types

Entity types are declared once in `src/modules/config/entity-types.tsx`: label,
icon, colour token, metadata fields and map pin style. The current set is
Business, Property, Event and Product.

## Adding a new category

1. Add one value to the `entity_type` enum in a new migration.
2. Add one entry to the registry in `src/modules/config/entity-types.tsx`.

That is the whole change. No new table, no new server functions, no new routes.
Create, edit, map rendering, search, clustering, ownership and RLS all work
immediately because they are type-agnostic.

## Adding a new planet module

1. Register the planet in `src/os/galaxy/planets.ts` (id, label, galaxy group,
   status, texture, size).
2. Create the route (`src/routes/...`) or a floating window component.
3. Put business logic in `src/modules/<name>/` with a `*.functions.ts` file for
   server calls.
4. Wire commands into `src/os/commands/builtins.ts` so the module is reachable
   from the command palette.
5. Add locale strings to `src/os/i18n/locales/en.ts` and `ar.ts`.

Modules marked "coming soon" render `src/os/galaxy/ComingSoonModule.tsx`.
