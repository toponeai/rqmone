import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  EntityDetail,
  EntityPoint,
  EntitySearchResult,
  MyEntity,
} from "./types";

const entityTypeSchema = z.enum(["business", "property", "event", "product"]);

/** Server-only publishable client for public read (RLS applies as anon). */
function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const viewportSchema = z.object({
  minLng: z.number().default(-180),
  minLat: z.number().default(-85),
  maxLng: z.number().default(180),
  maxLat: z.number().default(85),
  types: z.array(entityTypeSchema).optional(),
  q: z.string().max(200).optional(),
});

export const getEntitiesInViewport = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => viewportSchema.parse(input))
  .handler(async ({ data }): Promise<EntityPoint[]> => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase.rpc("entities_in_viewport", {
      min_lng: data.minLng,
      min_lat: data.minLat,
      max_lng: data.maxLng,
      max_lat: data.maxLat,
      filter_types: data.types && data.types.length ? data.types : undefined,
      search_query: data.q && data.q.length ? data.q : undefined,
      max_results: 2000,
    });
    if (error) {
      console.error("[entities_in_viewport]", error.message);
      return [];
    }
    return (rows ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      lat: r.lat,
      lng: r.lng,
    }));
  });

const searchSchema = z.object({
  q: z.string().max(200).optional(),
  types: z.array(entityTypeSchema).optional(),
});

export const searchEntities = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => searchSchema.parse(input))
  .handler(async ({ data }): Promise<EntitySearchResult[]> => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase.rpc("search_entities", {
      search_query: data.q && data.q.length ? data.q : undefined,
      filter_types: data.types && data.types.length ? data.types : undefined,
      max_results: 50,
    });
    if (error) {
      console.error("[search_entities]", error.message);
      return [];
    }
    return (rows ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      lat: r.lat,
      lng: r.lng,
    }));
  });

export const getEntityById = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<EntityDetail | null> => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase.rpc("get_entity", {
      entity_id: data.id,
    });
    if (error) {
      console.error("[get_entity]", error.message);
      return null;
    }
    const row = rows?.[0];
    if (!row) return null;
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      metadata: (row.metadata as Record<string, import("./types").JsonValue>) ?? {},
      lat: row.lat,
      lng: row.lng,
      createdAt: row.created_at,
    };
  });

const createSchema = z.object({
  type: entityTypeSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(""),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const createEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: newId, error } = await context.supabase.rpc("create_entity", {
      p_type: data.type,
      p_title: data.title,
      p_description: data.description,
      p_lat: data.lat,
      p_lng: data.lng,
      p_metadata: data.metadata as Database["public"]["Tables"]["entities"]["Row"]["metadata"],
    });
    if (error) {
      console.error("[create_entity]", error.message);
      throw new Error(error.message || "Could not place this entity on Earth.");
    }
    return { id: newId as string };
  });

export const getMyEntities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyEntity[]> => {
    const { data: rows, error } = await context.supabase.rpc("my_entities");
    if (error) {
      console.error("[my_entities]", error.message);
      return [];
    }
    return (rows ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      published: r.published,
      metadata: (r.metadata as Record<string, import("./types").JsonValue>) ?? {},
      lat: r.lat,
      lng: r.lng,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(""),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  metadata: z.record(z.string(), z.unknown()).default({}),
  published: z.boolean().default(true),
});

export const updateEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: updatedId, error } = await context.supabase.rpc("update_entity", {
      p_id: data.id,
      p_title: data.title,
      p_description: data.description,
      p_lat: data.lat,
      p_lng: data.lng,
      p_metadata: data.metadata as Database["public"]["Tables"]["entities"]["Row"]["metadata"],
      p_published: data.published,
    });
    if (error) {
      console.error("[update_entity]", error.message);
      throw new Error(error.message || "Could not update this entity.");
    }
    return { id: updatedId as string };
  });

export const deleteEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { data: ok, error } = await context.supabase.rpc("delete_entity", {
      p_id: data.id,
    });
    if (error) {
      console.error("[delete_entity]", error.message);
      throw new Error(error.message || "Could not delete this entity.");
    }
    return { ok: !!ok };
  });
