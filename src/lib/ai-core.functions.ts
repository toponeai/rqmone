import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StoredAiMessagePart = { type: string; text?: string; [key: string]: unknown };
export type StoredAiMessage = {
  id: string;
  role: string;
  parts: StoredAiMessagePart[];
};

export const loadAiCoreHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoredAiMessage[]> => {
    const { data, error } = await context.supabase
      .from("ai_core_messages")
      .select("id, role, parts, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      role: row.role,
      parts: (row.parts as StoredAiMessagePart[]) ?? [],
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