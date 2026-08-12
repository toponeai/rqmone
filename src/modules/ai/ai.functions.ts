import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

import type {
  AiConversation,
  AiMessage,
  AiAgent,
  AiPlan,
  AiPlanTask,
  AiPromptTemplate,
  AiLog,
  AiStats,
} from "./types";
import { getModel, DEFAULT_MODEL, DEFAULT_PROVIDER } from "./provider.server";
import { logAiEvent, startTimer } from "./logger.server";
import {
  validateOrThrow,
  createConversationSchema,
  updateConversationSchema,
  deleteConversationSchema,
  getMessagesSchema,
  createAgentSchema,
  updateAgentSchema,
  deleteAgentSchema,
  createPlanSchema,
  updatePlanTaskSchema,
  updatePlanStatusSchema,
  deletePlanSchema,
  createTemplateSchema,
  updateTemplateSchema,
  deleteTemplateSchema,
  listLogsSchema,
} from "./security";
import { PLAN_GENERATION_SYSTEM, SYSTEM_TEMPLATES } from "./templates";

// ── Type helpers ─────────────────────────────────────────────────────────────

type Supabase = import("@supabase/supabase-js").SupabaseClient<Database>;

function dbErr(msg: string): never {
  throw new Error(msg);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiConversation[]> => {
    const { data, error } = await context.supabase
      .from("ai_conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) dbErr(error.message);

    // Attach message counts in a second query
    const ids = (data ?? []).map((c) => c.id);
    if (ids.length === 0) return [];

    const { data: counts } = await context.supabase
      .from("ai_messages")
      .select("conversation_id")
      .in("conversation_id", ids);

    const countMap = new Map<string, number>();
    for (const row of counts ?? []) {
      countMap.set(row.conversation_id, (countMap.get(row.conversation_id) ?? 0) + 1);
    }

    return (data ?? []).map((c) => ({
      ...c,
      model: c.model as AiConversation["model"],
      provider: c.provider as AiConversation["provider"],
      message_count: countMap.get(c.id) ?? 0,
    }));
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      title: z.string().default("New Conversation"),
      model: z.string().default(DEFAULT_MODEL),
      provider: z.enum(["lovable-gateway", "openai", "google"]).default(DEFAULT_PROVIDER),
      agent_id: z.string().uuid().nullable().optional(),
    }),
  )
  .handler(async ({ data, context }): Promise<AiConversation> => {
    const input = validateOrThrow(createConversationSchema, data);
    const { data: row, error } = await context.supabase
      .from("ai_conversations")
      .insert({
        user_id: context.userId,
        title: input.title,
        model: input.model,
        provider: input.provider,
        agent_id: input.agent_id ?? null,
      })
      .select()
      .single();
    if (error) dbErr(error.message);

    void logAiEvent(context.supabase, {
      user_id: context.userId,
      conversation_id: row!.id,
      event_type: "conversation_created",
    });

    return {
      ...row!,
      model: row!.model as AiConversation["model"],
      provider: row!.provider as AiConversation["provider"],
    };
  });

export const updateConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid(), title: z.string().min(1).max(200) }))
  .handler(async ({ data, context }): Promise<AiConversation> => {
    const input = validateOrThrow(updateConversationSchema, data);
    const { data: row, error } = await context.supabase
      .from("ai_conversations")
      .update({ title: input.title })
      .eq("id", input.id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) dbErr(error.message);
    return {
      ...row!,
      model: row!.model as AiConversation["model"],
      provider: row!.provider as AiConversation["provider"],
    };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const input = validateOrThrow(deleteConversationSchema, data);
    const { error } = await context.supabase
      .from("ai_conversations")
      .delete()
      .eq("id", input.id)
      .eq("user_id", context.userId);
    if (error) dbErr(error.message);
    void logAiEvent(context.supabase, {
      user_id: context.userId,
      event_type: "conversation_deleted",
    });
    return { ok: true };
  });

export const getConversationMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ conversation_id: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<AiMessage[]> => {
    const input = validateOrThrow(getMessagesSchema, data);

    // Verify ownership via RLS — the policy ensures only the owner can see these
    const { data: rows, error } = await context.supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", input.conversation_id)
      .order("created_at", { ascending: true });
    if (error) dbErr(error.message);

    return (rows ?? []).map((r) => ({
      ...r,
      role: r.role as AiMessage["role"],
      tokens_used: r.tokens_used ?? null,
    }));
  });

// ═══════════════════════════════════════════════════════════════════════════
// AGENTS
// ═══════════════════════════════════════════════════════════════════════════

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiAgent[]> => {
    const { data, error } = await context.supabase
      .from("ai_agents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) dbErr(error.message);
    return (data ?? []).map((a) => ({
      ...a,
      model: a.model as AiAgent["model"],
      provider: a.provider as AiAgent["provider"],
      tools: a.tools ?? [],
    }));
  });

export const createAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(2000).default(""),
      system_prompt: z.string().min(10).max(50000),
      model: z.string().default(DEFAULT_MODEL),
      provider: z.enum(["lovable-gateway", "openai", "google"]).default(DEFAULT_PROVIDER),
      tools: z.array(z.string()).max(20).default([]),
    }),
  )
  .handler(async ({ data, context }): Promise<AiAgent> => {
    const input = validateOrThrow(createAgentSchema, data);
    const { data: row, error } = await context.supabase
      .from("ai_agents")
      .insert({
        user_id: context.userId,
        name: input.name,
        description: input.description,
        system_prompt: input.system_prompt,
        model: input.model,
        provider: input.provider,
        tools: input.tools,
      })
      .select()
      .single();
    if (error) dbErr(error.message);
    void logAiEvent(context.supabase, {
      user_id: context.userId,
      event_type: "agent_created",
    });
    return {
      ...row!,
      model: row!.model as AiAgent["model"],
      provider: row!.provider as AiAgent["provider"],
      tools: row!.tools ?? [],
    };
  });

export const updateAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      system_prompt: z.string().min(10).max(50000).optional(),
      model: z.string().optional(),
      provider: z.enum(["lovable-gateway", "openai", "google"]).optional(),
      tools: z.array(z.string()).max(20).optional(),
      is_active: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }): Promise<AiAgent> => {
    const input = validateOrThrow(updateAgentSchema, data);
    const { id, ...rest } = input;

    const patch: Record<string, unknown> = {};
    if (rest.name !== undefined) patch.name = rest.name;
    if (rest.description !== undefined) patch.description = rest.description;
    if (rest.system_prompt !== undefined) patch.system_prompt = rest.system_prompt;
    if (rest.model !== undefined) patch.model = rest.model;
    if (rest.provider !== undefined) patch.provider = rest.provider;
    if (rest.tools !== undefined) patch.tools = rest.tools;
    if (rest.is_active !== undefined) patch.is_active = rest.is_active;

    const { data: row, error } = await context.supabase
      .from("ai_agents")
      .update(patch as never)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) dbErr(error.message);
    void logAiEvent(context.supabase, {
      user_id: context.userId,
      event_type: "agent_updated",
    });
    return {
      ...row!,
      model: row!.model as AiAgent["model"],
      provider: row!.provider as AiAgent["provider"],
      tools: row!.tools ?? [],
    };
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const input = validateOrThrow(deleteAgentSchema, data);
    const { error } = await context.supabase
      .from("ai_agents")
      .delete()
      .eq("id", input.id)
      .eq("user_id", context.userId);
    if (error) dbErr(error.message);
    void logAiEvent(context.supabase, {
      user_id: context.userId,
      event_type: "agent_deleted",
    });
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════════════════════
// PLANS
// ═══════════════════════════════════════════════════════════════════════════

type PlanRow = Database["public"]["Tables"]["ai_plans"]["Row"];
type TaskRow = Database["public"]["Tables"]["ai_plan_tasks"]["Row"];

function toPlan(row: PlanRow, tasks: TaskRow[] = []): AiPlan {
  return {
    ...row,
    status: row.status as AiPlan["status"],
    tasks: tasks.map((t) => ({
      ...t,
      status: t.status as AiPlanTask["status"],
      result: t.result ?? null,
    })),
  };
}

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiPlan[]> => {
    const { data: plans, error } = await context.supabase
      .from("ai_plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) dbErr(error.message);
    if (!plans || plans.length === 0) return [];

    const planIds = plans.map((p) => p.id);
    const { data: tasks } = await context.supabase
      .from("ai_plan_tasks")
      .select("*")
      .in("plan_id", planIds)
      .order("sort_order", { ascending: true });

    const tasksByPlan = new Map<string, TaskRow[]>();
    for (const t of tasks ?? []) {
      const arr = tasksByPlan.get(t.plan_id) ?? [];
      arr.push(t);
      tasksByPlan.set(t.plan_id, arr);
    }

    return plans.map((p) => toPlan(p, tasksByPlan.get(p.id) ?? []));
  });

export const createPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).default(""),
      goal: z.string().min(10).max(5000),
      conversation_id: z.string().uuid().nullable().optional(),
    }),
  )
  .handler(async ({ data, context }): Promise<AiPlan> => {
    const input = validateOrThrow(createPlanSchema, data);
    const elapsed = startTimer();

    // Use AI to decompose the goal into structured tasks
    const model = getModel(DEFAULT_PROVIDER, DEFAULT_MODEL);
    let planJson: { title: string; description: string; tasks: { title: string; description: string; sort_order: number }[] };

    try {
      const result = await generateText({
        model,
        system: PLAN_GENERATION_SYSTEM,
        prompt: `Goal: ${input.goal}`,
        maxOutputTokens: 2000,
      });

      const raw = result.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      planJson = JSON.parse(raw) as typeof planJson;
    } catch (err) {
      throw new Error(
        `Failed to generate plan tasks: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Persist plan
    const { data: planRow, error: planErr } = await context.supabase
      .from("ai_plans")
      .insert({
        user_id: context.userId,
        conversation_id: input.conversation_id ?? null,
        title: planJson.title ?? input.title,
        description: planJson.description ?? input.description,
        goal: input.goal,
        status: "pending",
      })
      .select()
      .single();
    if (planErr) dbErr(planErr.message);

    // Persist tasks
    const taskInserts = (planJson.tasks ?? []).map((t, i) => ({
      plan_id: planRow!.id,
      title: String(t.title ?? "").slice(0, 200),
      description: String(t.description ?? "").slice(0, 500),
      sort_order: typeof t.sort_order === "number" ? t.sort_order : i,
      status: "pending" as const,
    }));

    const { data: taskRows, error: taskErr } = await context.supabase
      .from("ai_plan_tasks")
      .insert(taskInserts)
      .select();
    if (taskErr) dbErr(taskErr.message);

    void logAiEvent(context.supabase, {
      user_id: context.userId,
      event_type: "plan_created",
      model: DEFAULT_MODEL,
      provider: DEFAULT_PROVIDER,
      latency_ms: elapsed(),
    });

    return toPlan(planRow!, taskRows ?? []);
  });

export const updatePlanTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "in_progress", "completed", "failed", "skipped"]),
      result: z.record(z.unknown()).nullable().optional(),
    }),
  )
  .handler(async ({ data, context }): Promise<AiPlanTask> => {
    const input = validateOrThrow(updatePlanTaskSchema, data);
    const { data: row, error } = await context.supabase
      .from("ai_plan_tasks")
      .update({
        status: input.status,
        result: input.result as Database["public"]["Tables"]["ai_plan_tasks"]["Update"]["result"],
      })
      .eq("id", input.id)
      .select()
      .single();
    if (error) dbErr(error.message);
    return {
      ...row!,
      status: row!.status as AiPlanTask["status"],
      result: row!.result ?? null,
    };
  });

export const updatePlanStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "in_progress", "completed", "failed", "cancelled"]),
    }),
  )
  .handler(async ({ data, context }): Promise<AiPlan> => {
    const input = validateOrThrow(updatePlanStatusSchema, data);
    const { data: row, error } = await context.supabase
      .from("ai_plans")
      .update({ status: input.status })
      .eq("id", input.id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) dbErr(error.message);
    return toPlan(row!);
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const input = validateOrThrow(deletePlanSchema, data);
    const { error } = await context.supabase
      .from("ai_plans")
      .delete()
      .eq("id", input.id)
      .eq("user_id", context.userId);
    if (error) dbErr(error.message);
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiPromptTemplate[]> => {
    const { data, error } = await context.supabase
      .from("ai_prompt_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) dbErr(error.message);

    const dbTemplates: AiPromptTemplate[] = (data ?? []).map((t) => ({
      ...t,
      user_id: t.user_id ?? null,
      variables: t.variables ?? [],
    }));

    // Merge system templates (they're not in the DB, so always append them)
    return [...dbTemplates, ...SYSTEM_TEMPLATES];
  });

export const createTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(2000).default(""),
      template: z.string().min(10).max(50000),
      variables: z.array(z.string().max(50)).max(20).default([]),
      category: z.string().max(50).default("general"),
      is_public: z.boolean().default(false),
    }),
  )
  .handler(async ({ data, context }): Promise<AiPromptTemplate> => {
    const input = validateOrThrow(createTemplateSchema, data);
    const { data: row, error } = await context.supabase
      .from("ai_prompt_templates")
      .insert({
        user_id: context.userId,
        name: input.name,
        description: input.description,
        template: input.template,
        variables: input.variables,
        category: input.category,
        is_public: input.is_public,
      })
      .select()
      .single();
    if (error) dbErr(error.message);
    void logAiEvent(context.supabase, {
      user_id: context.userId,
      event_type: "template_created",
    });
    return { ...row!, user_id: row!.user_id ?? null, variables: row!.variables ?? [] };
  });

export const updateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      template: z.string().min(10).max(50000).optional(),
      variables: z.array(z.string().max(50)).max(20).optional(),
      category: z.string().max(50).optional(),
      is_public: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }): Promise<AiPromptTemplate> => {
    const input = validateOrThrow(updateTemplateSchema, data);
    const { id, ...rest } = input;

    const patch: Record<string, unknown> = {};
    if (rest.name !== undefined) patch.name = rest.name;
    if (rest.description !== undefined) patch.description = rest.description;
    if (rest.template !== undefined) patch.template = rest.template;
    if (rest.variables !== undefined) patch.variables = rest.variables;
    if (rest.category !== undefined) patch.category = rest.category;
    if (rest.is_public !== undefined) patch.is_public = rest.is_public;

    const { data: row, error } = await context.supabase
      .from("ai_prompt_templates")
      .update(patch as never)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) dbErr(error.message);
    return { ...row!, user_id: row!.user_id ?? null, variables: row!.variables ?? [] };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const input = validateOrThrow(deleteTemplateSchema, data);
    const { error } = await context.supabase
      .from("ai_prompt_templates")
      .delete()
      .eq("id", input.id)
      .eq("user_id", context.userId);
    if (error) dbErr(error.message);
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════════════════════
// STATS & LOGS
// ═══════════════════════════════════════════════════════════════════════════

export const getAiStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiStats> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowStart = new Date();
    windowStart.setMinutes(0, 0, 0);

    const [convResult, msgTodayResult, agentResult, planResult, rateLimitResult] =
      await Promise.all([
        context.supabase.from("ai_conversations").select("id", { count: "exact", head: true }),
        context.supabase
          .from("ai_messages")
          .select("id", { count: "exact", head: true })
          .gte("created_at", today.toISOString()),
        context.supabase.from("ai_agents").select("id", { count: "exact", head: true }).eq("is_active", true),
        context.supabase
          .from("ai_plans")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "in_progress"]),
        context.supabase
          .from("ai_rate_limits")
          .select("requests_count, tokens_used")
          .eq("user_id", context.userId)
          .eq("window_start", windowStart.toISOString())
          .maybeSingle(),
      ]);

    return {
      total_conversations: convResult.count ?? 0,
      total_messages_today: msgTodayResult.count ?? 0,
      total_agents: agentResult.count ?? 0,
      active_plans: planResult.count ?? 0,
      requests_this_hour: rateLimitResult.data?.requests_count ?? 0,
      tokens_this_hour: rateLimitResult.data?.tokens_used ?? 0,
    };
  });

export const listAiLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ limit: z.number().int().min(1).max(200).default(50), offset: z.number().int().min(0).default(0) }))
  .handler(async ({ data, context }): Promise<AiLog[]> => {
    const input = validateOrThrow(listLogsSchema, data);
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    const { data: rows, error } = await context.supabase
      .from("ai_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) dbErr(error.message);
    return (rows ?? []).map((r) => ({
      ...r,
      event_type: r.event_type as AiLog["event_type"],
      conversation_id: r.conversation_id ?? null,
      provider: r.provider ?? null,
      model: r.model ?? null,
      tokens_in: r.tokens_in ?? null,
      tokens_out: r.tokens_out ?? null,
      latency_ms: r.latency_ms ?? null,
      error: r.error ?? null,
    }));
  });

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY — kept for backward compatibility with ai-core history
// ═══════════════════════════════════════════════════════════════════════════

export type { AiConversation as StoredAiConversation };

export type StoredAiMessage = {
  id: string;
  role: string;
  parts: import("@/integrations/supabase/types").Json;
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
      parts: row.parts ?? [],
    }));
  });

export const clearAiCoreHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const { error } = await context.supabase
      .from("ai_core_messages")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
