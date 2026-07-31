import type { Json } from "@/integrations/supabase/types";

// ── Providers & Models ──────────────────────────────────────────────────────

export type AiProvider = "lovable-gateway" | "openai" | "google";

export type AiModel =
  | "google/gemini-2.5-flash"
  | "google/gemini-2.5-pro"
  | "openai/gpt-4o"
  | "openai/gpt-4o-mini"
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

export interface ModelOption {
  id: AiModel;
  label: string;
  provider: AiProvider;
  description: string;
  context: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "lovable-gateway",
    description: "Fast, efficient multimodal model",
    context: "1M tokens",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "lovable-gateway",
    description: "Most capable Gemini model",
    context: "2M tokens",
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    provider: "lovable-gateway",
    description: "Flagship OpenAI model",
    context: "128K tokens",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "lovable-gateway",
    description: "Affordable & intelligent small model",
    context: "128K tokens",
  },
];

// ── Conversations ───────────────────────────────────────────────────────────

export interface AiConversation {
  id: string;
  user_id: string;
  agent_id: string | null;
  title: string;
  model: AiModel;
  provider: AiProvider;
  metadata: Json;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  parts: Json;
  tokens_used: number | null;
  metadata: Json;
  created_at: string;
}

// ── Agents ──────────────────────────────────────────────────────────────────

export interface AiAgent {
  id: string;
  user_id: string;
  name: string;
  description: string;
  system_prompt: string;
  model: AiModel;
  provider: AiProvider;
  tools: string[];
  is_active: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// ── Plans ───────────────────────────────────────────────────────────────────

export type PlanStatus = "pending" | "in_progress" | "completed" | "failed" | "cancelled";
export type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";

export interface AiPlan {
  id: string;
  user_id: string;
  conversation_id: string | null;
  title: string;
  description: string;
  goal: string;
  status: PlanStatus;
  metadata: Json;
  created_at: string;
  updated_at: string;
  tasks?: AiPlanTask[];
}

export interface AiPlanTask {
  id: string;
  plan_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  sort_order: number;
  result: Json | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// ── Templates ───────────────────────────────────────────────────────────────

export interface AiPromptTemplate {
  id: string;
  user_id: string | null;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: string;
  is_public: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// ── Logs ────────────────────────────────────────────────────────────────────

export type AiEventType =
  | "chat"
  | "conversation_created"
  | "conversation_deleted"
  | "agent_created"
  | "agent_updated"
  | "agent_deleted"
  | "plan_created"
  | "plan_executed"
  | "task_executed"
  | "template_created"
  | "rate_limited"
  | "error";

export interface AiLog {
  id: string;
  user_id: string;
  conversation_id: string | null;
  event_type: AiEventType;
  provider: string | null;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  error: string | null;
  metadata: Json;
  created_at: string;
}

export interface AiStats {
  total_conversations: number;
  total_messages_today: number;
  total_agents: number;
  active_plans: number;
  requests_this_hour: number;
  tokens_this_hour: number;
}

// ── Errors ──────────────────────────────────────────────────────────────────

export class AiError extends Error {
  constructor(
    public code:
      | "RATE_LIMITED"
      | "UNAUTHORIZED"
      | "VALIDATION"
      | "PROVIDER"
      | "NOT_FOUND"
      | "INTERNAL",
    message: string,
    public httpStatus: number = 500,
  ) {
    super(message);
    this.name = "AiError";
  }
}
