# Developer Guide

## Prerequisites

- [Bun](https://bun.sh) 1.1+
- Node.js 20+ (tooling parity)
- A modern WebGL-capable browser

## Setup

```bash
bun install
cp .env.example .env   # fill in your backend values
bun run dev            # http://localhost:8080
```

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run build:dev` | Development-mode build (prerender check) |
| `bun run preview` | Serve the built output |
| `bun run lint` | ESLint |
| `bun run lint:fix` | ESLint with autofix |
| `bun run typecheck` | TypeScript, no emit |
| `bun run format` | Prettier write |
| `bun run format:check` | Prettier check (CI) |
| `bun run prepare` | Install Husky hooks |

## Git hooks

Husky installs two hooks:

- `pre-commit` → lint-staged (ESLint + Prettier on staged files)
- `commit-msg` → commitlint (Conventional Commits)

## Conventions

- **Routing** — file-based under `src/routes/`; never edit `routeTree.gen.ts`.
  Every parent/layout route renders `<Outlet />`.
- **Data loading** — loader calls `context.queryClient.ensureQueryData(...)`;
  component calls `useSuspenseQuery(...)`. Avoid `useEffect` fetching.
- **Server code** — `createServerFn` for internal RPC; `*.server.ts` for
  server-only helpers; never import a `.server` module from a component.
- **Styling** — Tailwind v4 with semantic tokens; no hardcoded colours.
- **3D** — everything Three.js loads client-side only.
- **i18n** — add strings to both `en.ts` and `ar.ts`; RTL must keep working.

## Head metadata

Every content route defines its own `head()` with a unique title, description,
`og:title` and `og:description`.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Maximum update depth exceeded` | Unstable Zustand selector or `useSyncExternalStore` snapshot returning a new reference — memoise it |
| `Unauthorized` during `build:dev` | Protected server function called from a public route loader — move it into the component |
| `[unenv] X is not implemented yet!` | Node-only API in a Worker — use a Worker-compatible alternative |
| Hydration mismatch | Browser storage read during render — move it to `useEffect` |
| Blank 3D scene | WebGL unavailable, or a Three.js module imported during SSR |

## Before opening a pull request

```bash
bun run lint && bun run typecheck && bun run format:check && bun run build
```

Then follow [CONTRIBUTING.md](../CONTRIBUTING.md).
