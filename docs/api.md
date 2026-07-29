# API

## Server functions

App-internal logic uses `createServerFn` from `@tanstack/react-start` — typed
RPC callable from components and loaders.

```ts
export const getEntity = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => { /* ... */ });
```

Modules and their function files:

| Module | File | Responsibilities |
| --- | --- | --- |
| Entity | `src/modules/entity/entity.functions.ts` | viewport search, clustering, create, update, delete, detail |
| Messaging | `src/modules/messaging/messaging.functions.ts` | conversations, send message, user search |
| Notifications | `src/modules/notifications/notifications.functions.ts` | list, mark read, archive |
| AI Core | `src/lib/ai-core.functions.ts` | history load, clear |

Rules:

- Read `process.env.*` inside `.handler()`, never at module scope.
- Function files stay thin: imports, types and exported declarations only.
- Protected functions use `.middleware([requireSupabaseAuth])` and must never be
  called from a public route loader (SSR/prerender has no session).

## HTTP routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/chat` | POST | Streaming AI Core completions via the Lovable AI Gateway |
| `/mcp` | POST | MCP server endpoint (OAuth 2.1 protected) |
| `/.well-known/oauth-protected-resource` | GET | MCP resource metadata |

Public, unauthenticated endpoints belong under `src/routes/api/public/*` and
must verify their caller (signature check, token, or read-only scope) inside the
handler.

## MCP tools

Exposed at `/mcp` after publish; every tool forwards the caller's bearer token
so RLS applies.

| Tool | Purpose |
| --- | --- |
| `search_entities` | Search published entities by text and type |
| `list_my_entities` | List the caller's own entities |
| `create_entity` | Create an entity via the `create_entity` RPC |
| `list_notifications` | List the caller's notifications |

## Errors

Server functions throw; the route error boundary renders a recoverable state.
Gateway and provider failures surface their status and body rather than a
generic 500.
