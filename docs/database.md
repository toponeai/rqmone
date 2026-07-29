# Database

Postgres with PostGIS, managed by Lovable Cloud. All schema lives in
`supabase/migrations/` and is applied in filename order.

## Tables

| Table | Purpose |
| --- | --- |
| `entities` | Every object: `type`, `title`, `description`, `published`, PostGIS `location`, `jsonb metadata`, `owner_id` |
| `profiles` | Created by trigger on user signup |
| `conversations` / `messages` | Realtime messaging |
| `notifications` | Fan-out from new messages via trigger |
| `ai_core_messages` | AI Core assistant history |

`entities.location` is a `geography(Point, 4326)` column with a GIST index for
viewport and radius queries.

## RPCs

| Function | Purpose |
| --- | --- |
| `entities_in_viewport` | Bounded-box search for published entities |
| `entities_cluster` | Grid-hash clustering by precision derived from camera altitude |
| `search_entities` | Text search across published entities |
| `get_entity` | Single entity lookup |
| `create_entity` | Owner-scoped insert with geometry construction |
| `is_conversation_participant` | Membership check used by RLS policies |

Public lookup RPCs run as `SECURITY INVOKER` so RLS applies to the caller.
Internal automation functions (`handle_new_user`, `fanout_message_notification`,
`tg_add_creator_participant`) have `EXECUTE` revoked from `anon` and
`authenticated`, and all trigger functions pin `search_path = public`.

## Row Level Security

RLS is enabled on every table in `public`. The general model:

- Anonymous users read only `published` entities.
- Authenticated users additionally read and write rows they own (`owner_id = auth.uid()`).
- Conversation and message access requires participation.
- Notifications are visible only to their recipient.

## Migration rules

Every migration that creates a public table must follow this exact order:

```sql
CREATE TABLE public.example (...);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.example TO authenticated;
GRANT ALL ON public.example TO service_role;
-- GRANT SELECT ON public.example TO anon;  -- only if a policy allows anon reads

ALTER TABLE public.example ENABLE ROW LEVEL SECURITY;

CREATE POLICY ... ON public.example ...;
```

Migrations are append-only and additive; never edit an applied file.
