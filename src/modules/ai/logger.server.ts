import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AiEventType } from "./types";

export interface LogEntry {
  user_id: string;
  conversation_id?: string | null;
  event_type: AiEventType;
  provider?: string | null;
  model?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  latency_ms?: number | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Persist an AI interaction log entry. Non-throwing — errors are console-logged only
 * so logging failures never break the main request flow.
 */
export async function logAiEvent(
  supabase: SupabaseClient<Database>,
  entry: LogEntry,
): Promise<void> {
  const { error } = await supabase.from("ai_logs").insert({
    user_id: entry.user_id,
    conversation_id: entry.conversation_id ?? null,
    event_type: entry.event_type,
    provider: entry.provider ?? null,
    model: entry.model ?? null,
    tokens_in: entry.tokens_in ?? null,
    tokens_out: entry.tokens_out ?? null,
    latency_ms: entry.latency_ms ?? null,
    error: entry.error ?? null,
    metadata: (entry.metadata ??
      {}) as Database["public"]["Tables"]["ai_logs"]["Insert"]["metadata"],
  });

  if (error) {
    console.error("[AiLogger] Failed to write log:", error.message);
  }
}

/**
 * Returns a function that calculates elapsed milliseconds since the call.
 */
export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
