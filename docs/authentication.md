# Authentication

Auth is provided by Lovable Cloud (Supabase Auth).

## Providers

- Email + password (no anonymous sign-ups, no auto-confirm).
- Google OAuth.

The sign-in surface is `src/routes/auth.tsx`. OAuth `redirect_uri` must be a
full same-origin public URL (`window.location.origin`), never a protected route;
the intended destination is stored separately and navigated to once the session
hydrates.

## Clients

| Context | Client | RLS |
| --- | --- | --- |
| Browser | `supabase` from `@/integrations/supabase/client` | applies as the user |
| Authenticated server fn | `context.supabase` via `.middleware([requireSupabaseAuth])` | applies as the user |
| Public server read | publishable client created inside the handler | applies as `anon` |
| Privileged work | `supabaseAdmin` from `client.server` | bypasses RLS |

Generated integration files are auto-managed and must not be edited.

## Protected routes

Routes under `src/routes/_authenticated/` are gated by
`_authenticated/route.tsx`, which redirects unauthenticated visitors to `/auth`
before loaders run. Only that subtree may call protected server functions from a
loader; public routes must call them from components via `useServerFn` inside
`useQuery` or an event handler, otherwise prerender fails with `Unauthorized`.

Client-side `functionMiddleware` in `src/start.ts` attaches the Supabase bearer
token to server function calls.

## Ownership and roles

Entities carry `owner_id`; RLS restricts writes to the owner. If role-based
access is added, roles must live in a dedicated `user_roles` table with a
`SECURITY DEFINER` `has_role()` helper — never as a column on `profiles`, which
would enable privilege escalation.

## MCP OAuth

The MCP server at `/mcp` is protected by OAuth 2.1. Agents authenticate as a
real R.Q.M.1 user, consent through
`src/routes/[.]lovable.oauth.consent.tsx`, and every tool call is executed with
that user's token so RLS is enforced end to end.
