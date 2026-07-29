# Contributing to R.Q.M.1

Thanks for helping build the Global Interactive Earth Platform.

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Getting started](#getting-started)
- [Project principles](#project-principles)
- [Branching and commits](#branching-and-commits)
- [Quality gates](#quality-gates)
- [Database changes](#database-changes)
- [Pull requests](#pull-requests)

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
By participating you agree to uphold it.

## Getting started

```bash
bun install
cp .env.example .env    # fill in your backend values
bun run dev             # http://localhost:8080
```

Requirements: [Bun](https://bun.sh) 1.1+ and Node.js 20+ (for tooling parity).

See the [Developer Guide](docs/developer-guide.md) for the full workflow.

## Project principles

1. **Everything is an Entity.** New categories are an `entity_type` enum value
   plus a registry entry in `src/modules/config/entity-types.tsx` — never a new
   category-specific table or bespoke architecture.
2. **Design tokens only.** No hardcoded colours (`text-white`, `bg-[#hex]`).
   Use the semantic tokens in `src/design/tokens.css` and `src/styles.css`.
3. **Server boundaries.** App-internal logic uses `createServerFn`; external
   callers use file routes under `src/routes/api/`.
4. **Client-only 3D.** The Three.js layer must stay behind `ClientOnly` +
   `React.lazy`; never import it during SSR.
5. **RLS is mandatory.** Every new table gets grants, RLS, and policies in the
   same migration.

## Branching and commits

Branch naming:

```
feat/<short-description>
fix/<short-description>
docs/<short-description>
chore/<short-description>
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and
are validated by commitlint via a Husky `commit-msg` hook:

```
feat(entity): add featured ring to earth pins
fix(messaging): stop duplicate realtime subscription
docs(api): document entities_cluster RPC
chore(deps): bump three to 0.185.1
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

## Quality gates

Run before pushing (a Husky `pre-commit` hook runs lint-staged automatically):

```bash
bun run lint
bun run typecheck
bun run format:check
bun run build
```

CI runs the same steps on every pull request and uploads the build artifact.

## Database changes

- Add a new timestamped file in `supabase/migrations/`; never edit applied ones.
- Migrations must be additive and backwards compatible.
- For every new table in `public`, in this order: `CREATE TABLE` → `GRANT` →
  `ENABLE ROW LEVEL SECURITY` → `CREATE POLICY`.
- Document the change in [docs/database.md](docs/database.md).

## Pull requests

1. Keep PRs focused; one concern per PR.
2. Fill in the pull request template completely.
3. Link the issue you are closing.
4. Add an entry under `Unreleased` in [CHANGELOG.md](CHANGELOG.md).
5. All CI checks must be green before review.
6. At least one CODEOWNER approval is required to merge.
