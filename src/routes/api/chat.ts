import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import type { Database } from "@/integrations/supabase/types";
import { getModel } from "@/modules/ai/provider.server";
import { checkRateLimit, incrementRateLimit, assertRateLimit } from "@/modules/ai/rate-limiter.server";
import { logAiEvent, startTimer } from "@/modules/ai/logger.server";
import { sanitizeUserMessage, assertMessageLength } from "@/modules/ai/security";
import { DEFAULT_SYSTEM_PROMPT, buildSystemPrompt } from "@/modules/ai/templates";
import type { AiProvider, AiModel } from "@/modules/ai/types";

type ChatRequestBody = {
  message?: UIMessage;
  conversationId?: string;
};

function isNewKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const elapsed = startTimer();

        // ── Env check ───────────────────────────────────────────────────────
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
          return new Response("Server misconfigured: missing Supabase credentials", {
            status: 500,
          });
        }

        // ── Auth ────────────────────────────────────────────────────────────
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return new Response("Unauthorized", { status: 401 });

        // Supabase client scoped to this user (RLS applies)
        const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (isNewKey(supabaseKey) && h.get("Authorization") === `Bearer ${supabaseKey}`) {
                h.delete("Authorization");
              }
              h.set("apikey", supabaseKey);
              h.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers: h });
            },
          },
        });

        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        // ── Rate limit ──────────────────────────────────────────────────────
        const rateLimit = await checkRateLimit(supabase, userId);
        if (!rateLimit.allowed) {
          void logAiEvent(supabase, {
            user_id: userId,
            event_type: "rate_limited",
            metadata: { requests_count: rateLimit.requests_count },
          });
          return new Response(
            JSON.stringify({
              error: "RATE_LIMITED",
              message: `Rate limit exceeded. ${rateLimit.requests_count}/${rateLimit.requests_limit} requests this hour. Resets at ${rateLimit.reset_at}.`,
            }),
            { status: 429, headers: { "Content-Type": "application/json" } },
          );
        }

        // ── Parse body ──────────────────────────────────────────────────────
        let body: ChatRequestBody;
        try {
          body = (await request.json()) as ChatRequestBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const newMessage = body.message;
        if (!newMessage || newMessage.role !== "user" || !Array.isArray(newMessage.parts)) {
          return new Response("Missing or invalid user message", { status: 400 });
        }

        // Validate + sanitize message text
        const textParts = newMessage.parts.filter((p) => p.type === "text");
        const rawText = textParts.map((p) => ("text" in p ? String(p.text) : "")).join(" ");
        try {
          assertMessageLength(rawText);
        } catch (err) {
          return new Response((err as Error).message, { status: 400 });
        }
        const sanitizedText = sanitizeUserMessage(rawText);
        const sanitizedParts = newMessage.parts.map((p) =>
          p.type === "text" ? { ...p, text: sanitizedText } : p,
        );
        const sanitizedMessage: UIMessage = { ...newMessage, parts: sanitizedParts };

        // ── Resolve conversation + model ────────────────────────────────────
        const conversationId = body.conversationId ?? null;
        let model: AiModel = "google/gemini-2.5-flash";
        let provider: AiProvider = "lovable-gateway";
        let systemPrompt = DEFAULT_SYSTEM_PROMPT;
        let agentId: string | null = null;

        if (conversationId) {
          const { data: conv } = await supabase
            .from("ai_conversations")
            .select("model, provider, agent_id")
            .eq("id", conversationId)
            .eq("user_id", userId)
            .single();

          if (conv) {
            model = conv.model as AiModel;
            provider = conv.provider as AiProvider;
            agentId = conv.agent_id ?? null;
          }
        }

        // If there's an agent, load its system prompt
        if (agentId) {
          const { data: agent } = await supabase
            .from("ai_agents")
            .select("system_prompt, name")
            .eq("id", agentId)
            .single();
          if (agent) {
            systemPrompt = buildSystemPrompt(agent.system_prompt, { agentName: agent.name });
          }
        }

        // ── Load conversation history ────────────────────────────────────────
        let priorMessages: UIMessage[] = [];

        if (conversationId) {
          const { data: history } = await supabase
            .from("ai_messages")
            .select("id, role, parts")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

          priorMessages = (history ?? []).map((row) => ({
            id: row.id,
            role: row.role as UIMessage["role"],
            parts: (row.parts as UIMessage["parts"]) ?? [],
          }));

          // Persist new user message
          await supabase.from("ai_messages").insert({
            conversation_id: conversationId,
            role: "user",
            parts: sanitizedMessage.parts as unknown as Database["public"]["Tables"]["ai_messages"]["Insert"]["parts"],
          });

          // Update conversation updated_at
          void supabase
            .from("ai_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        } else {
          // Legacy path — use ai_core_messages
          const { data: history } = await supabase
            .from("ai_core_messages")
            .select("id, role, parts")
            .order("created_at", { ascending: true });

          priorMessages = (history ?? []).map((row) => ({
            id: row.id,
            role: row.role as UIMessage["role"],
            parts: (row.parts as UIMessage["parts"]) ?? [],
          }));

          await supabase.from("ai_core_messages").insert({
            user_id: userId,
            role: "user",
            parts: sanitizedMessage.parts as unknown as Database["public"]["Tables"]["ai_core_messages"]["Insert"]["parts"],
          });
        }

        const allMessages: UIMessage[] = [...priorMessages, sanitizedMessage];

        // ── Stream ──────────────────────────────────────────────────────────
        const llm = getModel(provider, model);
        const result = streamText({
          model: llm,
          system: systemPrompt,
          messages: await convertToModelMessages(allMessages),
          maxOutputTokens: 4096,
          onError: ({ error }) => {
            console.error("[Chat] streamText error:", error);
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: allMessages,
          onFinish: async ({ responseMessage }) => {
            if (!responseMessage) return;

            if (conversationId) {
              await supabase.from("ai_messages").insert({
                conversation_id: conversationId,
                role: "assistant",
                parts: responseMessage.parts as unknown as Database["public"]["Tables"]["ai_messages"]["Insert"]["parts"],
              });
            } else {
              await supabase.from("ai_core_messages").insert({
                user_id: userId,
                role: "assistant",
                parts: responseMessage.parts as unknown as Database["public"]["Tables"]["ai_core_messages"]["Insert"]["parts"],
              });
            }

            // Increment rate limit counter (1 request, token count unavailable in onFinish)
            void incrementRateLimit(supabase, userId, 0);

            // Log the interaction
            void logAiEvent(supabase, {
              user_id: userId,
              conversation_id: conversationId,
              event_type: "chat",
              provider,
              model,
              latency_ms: elapsed(),
            });
          },
        });
      },
    },
  },
});
