import { z } from "zod";
import { AiError } from "./types";

// ── Limits ──────────────────────────────────────────────────────────────────

export const MAX_MESSAGE_LENGTH = 10_000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_SYSTEM_PROMPT_LENGTH = 50_000;
export const MAX_DESCRIPTION_LENGTH = 2_000;
export const MAX_GOAL_LENGTH = 5_000;

// ── Reusable field schemas ───────────────────────────────────────────────────

export const uuidSchema = z.string().uuid("Invalid ID format");

export const titleSchema = z
  .string()
  .min(1, "Title cannot be empty")
  .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer`);

export const descriptionSchema = z
  .string()
  .max(MAX_DESCRIPTION_LENGTH, `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`)
  .default("");

export const systemPromptSchema = z
  .string()
  .min(10, "System prompt must be at least 10 characters")
  .max(MAX_SYSTEM_PROMPT_LENGTH, `System prompt must be ${MAX_SYSTEM_PROMPT_LENGTH} characters or fewer`);

export const modelSchema = z.string().min(1).default("google/gemini-2.5-flash");

export const providerSchema = z
  .enum(["lovable-gateway", "openai", "google"])
  .default("lovable-gateway");

// ── Per-feature schemas ──────────────────────────────────────────────────────

export const createConversationSchema = z.object({
  title: titleSchema.default("New Conversation"),
  model: modelSchema,
  provider: providerSchema,
  agent_id: z.string().uuid().nullable().optional(),
});

export const updateConversationSchema = z.object({
  id: uuidSchema,
  title: titleSchema,
});

export const deleteConversationSchema = z.object({
  id: uuidSchema,
});

export const getMessagesSchema = z.object({
  conversation_id: uuidSchema,
});

export const createAgentSchema = z.object({
  name: titleSchema,
  description: descriptionSchema,
  system_prompt: systemPromptSchema,
  model: modelSchema,
  provider: providerSchema,
  tools: z.array(z.string().max(100)).max(20).default([]),
});

export const updateAgentSchema = z.object({
  id: uuidSchema,
  name: titleSchema.optional(),
  description: descriptionSchema.optional(),
  system_prompt: systemPromptSchema.optional(),
  model: modelSchema.optional(),
  provider: providerSchema.optional(),
  tools: z.array(z.string().max(100)).max(20).optional(),
  is_active: z.boolean().optional(),
});

export const deleteAgentSchema = z.object({
  id: uuidSchema,
});

export const createPlanSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  goal: z
    .string()
    .min(10, "Goal must be at least 10 characters")
    .max(MAX_GOAL_LENGTH, `Goal must be ${MAX_GOAL_LENGTH} characters or fewer`),
  conversation_id: z.string().uuid().nullable().optional(),
});

export const updatePlanTaskSchema = z.object({
  id: uuidSchema,
  status: z.enum(["pending", "in_progress", "completed", "failed", "skipped"]),
  result: z.record(z.unknown()).nullable().optional(),
});

export const updatePlanStatusSchema = z.object({
  id: uuidSchema,
  status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled"]),
});

export const deletePlanSchema = z.object({
  id: uuidSchema,
});

export const createTemplateSchema = z.object({
  name: titleSchema,
  description: descriptionSchema,
  template: z
    .string()
    .min(10, "Template must be at least 10 characters")
    .max(MAX_SYSTEM_PROMPT_LENGTH),
  variables: z
    .array(z.string().max(50).regex(/^[a-z_][a-z0-9_]*$/i, "Variable names must be alphanumeric"))
    .max(20)
    .default([]),
  category: z.string().max(50).default("general"),
  is_public: z.boolean().default(false),
});

export const updateTemplateSchema = z.object({
  id: uuidSchema,
  name: titleSchema.optional(),
  description: descriptionSchema.optional(),
  template: z.string().min(10).max(MAX_SYSTEM_PROMPT_LENGTH).optional(),
  variables: z.array(z.string().max(50)).max(20).optional(),
  category: z.string().max(50).optional(),
  is_public: z.boolean().optional(),
});

export const deleteTemplateSchema = z.object({
  id: uuidSchema,
});

export const listLogsSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

// ── Runtime validation helper ────────────────────────────────────────────────

export function validateOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new AiError("VALIDATION", message, 400);
  }
  return result.data;
}

// ── Content safety ───────────────────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /\bpretend (you are|to be)\b/i,
  /\bact as (if you are|a)\b/i,
  /\bjailbreak\b/i,
  /\bDAN mode\b/i,
];

export function sanitizeUserMessage(text: string): string {
  let sanitized = text.trim();
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[filtered]");
  }
  return sanitized;
}

export function assertMessageLength(text: string): void {
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new AiError(
      "VALIDATION",
      `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      400,
    );
  }
}
