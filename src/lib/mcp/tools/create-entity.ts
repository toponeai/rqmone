import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "create_entity",
  title: "Create entity",
  description:
    "Create a new entity (business, property, event, or product) on the R.Q.M.1 Earth at a given location, owned by the signed-in user.",
  inputSchema: {
    type: z.enum(["business", "property", "event", "product"]).describe("Entity category."),
    title: z.string().min(1).max(160).describe("Public title."),
    description: z.string().max(4000).optional().describe("Optional description."),
    lat: z.number().min(-90).max(90).describe("Latitude in decimal degrees."),
    lng: z.number().min(-180).max(180).describe("Longitude in decimal degrees."),
    published: z.boolean().optional().describe("Publish immediately (default true)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ type, title, description, lat, lng, published }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data, error } = await supabase
      .rpc("create_entity", {
        p_type: type,
        p_title: title,
        p_description: description ?? "",
        p_lat: lat,
        p_lng: lng,
        p_metadata: {},
        p_published: published ?? true,
      })
      .single();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Created entity ${JSON.stringify(data)}` }],
      structuredContent: { entity: data },
    };
  },
});
