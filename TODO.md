# TODO

Prioritized development tasks. Items within each priority level are ordered by impact.

For planned features and long-term direction see [ROADMAP.md](./ROADMAP.md).
For architecture context see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 🔴 Critical (do first)

- [ ] **Migrate deprecated `inputValidator()` API** — Replace all `createServerFn().inputValidator()` calls with `.validator()` in `src/modules/notifications/notifications.functions.ts` and `src/modules/entity/entity.functions.ts` (9+ occurrences). These will break in the next TanStack Start major version.

- [ ] **Add `LOVABLE_API_KEY` to production secrets** — Without this, the AI Core (`/ai-core`) and the `/api/chat` streaming endpoint silently return 500. Document the setup in your deployment platform.

- [ ] **Configure Supabase Auth redirect URLs** — Add your production domain (and `localhost:5000` for local dev) to the Supabase Auth → URL Configuration allow-list. OAuth sign-in will fail without this.

---

## 🟠 High Priority

- [ ] **Upgrade Node.js to 22** — Supabase JS v2 deprecates Node 20 support. Update the Replit runtime and any CI/CD Node version pins.

- [ ] **Remove `vite-tsconfig-paths` from dependencies** — It is no longer used (replaced by Vite's native `resolve.tsconfigPaths: true`). Run `bun remove vite-tsconfig-paths`.

- [ ] **Move `@lovable.dev/vite-tanstack-config` to devDependencies** — It is a build-time tool, not a runtime dependency.

- [ ] **Set up Vercel deployment** — Configure the Vercel project (build command, env vars, Node 22). See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#vercel-deployment) for steps.

- [ ] **Regenerate Supabase TypeScript types** — Run `supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts` to ensure the types match the latest schema (8 migrations applied since original generation).

- [ ] **Add production error tracking** — The `lovable-error-reporting.ts` shim is a no-op outside Lovable Cloud. Wire in Sentry, LogRocket, or another provider for production error visibility.

---

## 🟡 Medium Priority

- [ ] **Rate-limit the `/api/chat` endpoint** — Currently relies on Lovable AI Gateway upstream limits only. Add a per-user request rate limit (e.g., using an upstash Redis counter or a Supabase RPC) to prevent abuse.

- [ ] **Add pagination to entity lists** — `listConversations`, `listNotifications`, and the manage page entity list all load without a server-side page limit. Add cursor-based pagination before data volumes grow.

- [ ] **Entity search debounce** — The globe search fires on every keystroke. Add a 300 ms debounce to reduce server function calls.

- [ ] **Optimistic updates** — `createEntity`, `editEntity`, `deleteEntity`, `sendMessage` can all be made optimistic with TanStack Query's `useMutation` `onMutate` / `onError` pattern for snappier UI.

- [ ] **Secure the AI Core history** — `clearAiCoreHistory` server function should verify the calling user owns the messages before deleting (currently trusts the client-sent `userId`).

- [ ] **Add `Content-Security-Policy` headers** — The app loads fonts from `fonts.googleapis.com` and textures from `public/textures/`. Define a CSP that covers all sources.

- [ ] **Implement `SUPABASE_SERVICE_ROLE_KEY` guard** — Several server function paths check for this key but fall back silently. Make the failure explicit and log it clearly in dev mode.

---

## 🟢 Low Priority / Nice to Have

- [ ] **Move `@tanstack/router-plugin` to devDependencies** — It is a Vite build plugin, not a runtime package.

- [ ] **Add `bun.lock` integrity check to CI** — Run `bun install --frozen-lockfile` in CI to catch lockfile drift.

- [ ] **Enable `commitlint` in CI** — Husky only runs locally. Add a CI step that validates commit messages on pull requests.

- [ ] **Add `strict` ESLint rules for server functions** — Lint for forbidden `console.log` in server code and ensure `try/catch` around all Supabase calls.

- [ ] **Extract the AI Gateway base URL to an env var** — `https://ai.gateway.lovable.dev/v1` is hardcoded in `src/lib/ai-gateway.server.ts`. Externalise it so it can be overridden for a self-hosted gateway.

- [ ] **Document all Supabase RPCs** — The `entities_cluster` and `create_entity` RPCs in migrations lack inline documentation. Add `COMMENT ON FUNCTION` statements.

- [ ] **Add `robots.txt` and `sitemap.xml`** — Currently missing. Add a static `robots.txt` and a TanStack Start server route that generates a dynamic sitemap from published entities.

- [ ] **i18n completeness check** — Add a CI or pre-commit script that verifies all keys in `locales/en.ts` have corresponding entries in `locales/ar.ts` (and vice versa).

- [ ] **Accessibility audit** — Run `axe` or `pa11y` against the main routes. The 3D galaxy and window manager need particular attention for keyboard and screen reader users.

---

## 🧹 Tech Debt

- [ ] **Consolidate auth middleware** — `auth-attacher.ts` (client-side) and `auth-middleware.ts` (server-side) do complementary jobs but are documented separately. Add a short explanatory comment at the top of each cross-referencing the other.

- [ ] **Remove `@react-three/postprocessing` if unused** — The package is installed but bloom/post-processing may be inlined in the galaxy scene. Audit and remove if not imported.

- [ ] **Standardise error handling in server functions** — Some functions return `null` on failure, others throw. Pick one pattern and apply it consistently, then update call sites.

- [ ] **Split `src/routes/index.tsx`** — The main page component is 400+ lines mixing galaxy and earth concerns. Extract `GalaxyView` and `EarthView` into separate components.
