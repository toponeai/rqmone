import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { AiError } from "./types";

export { HOURLY_REQUEST_LIMIT, HOURLY_TOKEN_LIMIT } from "./limits";
import { HOURLY_REQUEST_LIMIT, HOURLY_TOKEN_LIMIT } from "./limits";

export interface RateLimitResult {
  allowed: boolean;
  requests_count: number;
  tokens_used: number;
  requests_limit: number;
  tokens_limit: number;
  reset_at: string;
}

function getWindowStart(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now.toISOString();
}

function getResetAt(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return now.toISOString();
}

export async function checkRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<RateLimitResult> {
  const windowStart = getWindowStart();
  const resetAt = getResetAt();

  const { data, error } = await supabase
    .from("ai_rate_limits")
    .select("requests_count, tokens_used")
    .eq("user_id", userId)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (error) {
    // Fail open on DB error — do not block users due to rate-limit tracking issues
    console.error("[RateLimiter] Failed to read rate limit:", error.message);
    return {
      allowed: true,
      requests_count: 0,
      tokens_used: 0,
      requests_limit: HOURLY_REQUEST_LIMIT,
      tokens_limit: HOURLY_TOKEN_LIMIT,
      reset_at: resetAt,
    };
  }

  const requests = data?.requests_count ?? 0;
  const tokens = data?.tokens_used ?? 0;
  const allowed = requests < HOURLY_REQUEST_LIMIT && tokens < HOURLY_TOKEN_LIMIT;

  return {
    allowed,
    requests_count: requests,
    tokens_used: tokens,
    requests_limit: HOURLY_REQUEST_LIMIT,
    tokens_limit: HOURLY_TOKEN_LIMIT,
    reset_at: resetAt,
  };
}

export async function incrementRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  tokensUsed: number = 0,
): Promise<void> {
  const windowStart = getWindowStart();

  const { error } = await supabase.rpc("increment_ai_rate_limit", {
    p_user_id: userId,
    p_window_start: windowStart,
    p_tokens: tokensUsed,
  });

  if (error) {
    // Non-fatal — log and continue
    console.error("[RateLimiter] Failed to increment:", error.message);
  }
}

export function assertRateLimit(result: RateLimitResult): void {
  if (!result.allowed) {
    throw new AiError(
      "RATE_LIMITED",
      `Rate limit exceeded. ${result.requests_count}/${result.requests_limit} requests used this hour. Resets at ${result.reset_at}.`,
      429,
    );
  }
}
