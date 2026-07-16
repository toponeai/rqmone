import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyEntities from "./tools/list-my-entities";
import createEntity from "./tools/create-entity";
import searchEntities from "./tools/search-entities";
import listNotifications from "./tools/list-notifications";

// The OAuth issuer must be the direct Supabase host — the .lovable.cloud proxy
// publishes a different issuer and mcp-js rejects it (RFC 8414). The project
// ref is inlined at build time by Vite; the sentinel keeps this well-formed
// during the manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "rqm1-mcp",
  title: "R.Q.M.1 — Interactive Earth",
  version: "0.1.0",
  instructions:
    "Tools for R.Q.M.1, a living Interactive Earth. Use `search_entities` to find businesses, properties, events, and products anywhere on the globe. Use `list_my_entities` and `create_entity` to manage the signed-in user's own entities. Use `list_notifications` to check the user's notifications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchEntities, listMyEntities, createEntity, listNotifications],
});
