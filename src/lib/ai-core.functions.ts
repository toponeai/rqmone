import { createServerFn } from "@tanstack/react-start";
import type { UIMessage } from "ai";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const loadAiCoreHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UIMessage[]> => {
    const { data, error } = await context.supabase
      .from("ai_core_messages")
      .select("id, role, parts, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      role: row.role as UIMessage["role"],
      parts: (row.parts as UIMessage["parts"]) ?? [],
    }));
  });

export const clearAiCoreHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("ai_core_messages")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });