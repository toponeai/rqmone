# AI

## AI Core assistant

AI Core is the platform assistant, rendered at `/ai-core` (authenticated) and
reachable from the Galaxy shell's central sun.

- **Model access** — Lovable AI Gateway; no provider key is managed in code.
- **Transport** — streaming completions over `POST /api/chat`.
- **History** — persisted in `ai_core_messages`, one conversation per user,
  protected by RLS.
- **Server logic** — `src/lib/ai-core.functions.ts` and
  `src/lib/ai-gateway.server.ts`.
- **UI** — `src/components/ai-elements/` (conversation, message, prompt input,
  shimmer) built on the AI SDK React bindings.

## Request flow

```text
Prompt input → /api/chat (server route)
  → Lovable AI Gateway (streaming)
  → token stream back to the client
  → persisted turn written to ai_core_messages
```

`LOVABLE_API_KEY` is read inside the handler and never reaches the browser.

## Error handling

Non-OK gateway responses are logged with their status and body and surfaced to
the caller rather than collapsed into a generic error. Authentication failures
on the key are resolved by rotating it, not by retrying against the provider
directly.

## Guidelines for new AI features

- Prefer the Lovable AI Gateway over bespoke provider keys.
- Keep prompts and model selection server-side.
- Never send private user data of other users into a prompt; scope context to
  what RLS already permits the caller to read.
- Stream long responses; duck ambient audio while the assistant speaks.
