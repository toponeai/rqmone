import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export interface AppNotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  actor_id: string | null;
  entity_id: string | null;
  metadata: Record<string, string | number | boolean | null>;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
}

/** List the user's most recent notifications (unarchived by default). */
export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(100).default(30),
        includeArchived: z.boolean().default(false),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("notifications")
      .select(
        "id, kind, title, body, link, actor_id, entity_id, metadata, read_at, archived_at, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (!data.includeArchived) q = q.is("archived_at", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as AppNotificationRow[];
  });

export const unreadNotificationsCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)
      .is("archived_at", null);
    if (error) throw new Error(error.message);
    return count ?? 0;
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
