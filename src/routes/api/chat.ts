import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM_PROMPT = `You are the AI Core of R.Q.M.1 — a living interactive Earth operating system.
You help the user manage entities they've placed on the planet, understand the platform,
draft descriptions, brainstorm new categories, and answer questions across their data.
Be concise, warm, and precise. Use markdown when it improves clarity. Never invent facts about
the user's account; ask before assuming.`;

type ChatRequestBody = {
  message?: UIMessage;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !supabaseUrl || !supabaseKey) {
          return new Response("Server misconfigured", { status: 500 });
        }

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length)
          : null;
        if (!token) return new Response("Unauthorized", { status: 401 });

        // Client scoped to the caller — RLS applies as that user.
        const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (supabaseKey.startsWith("sb_") && h.get("Authorization") === `Bearer ${supabaseKey}`) {
                h.delete("Authorization");
              }
              h.set("apikey", supabaseKey);
              h.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers: h });
            },
          },
        });

        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = userData.user.id;

        let body: ChatRequestBody;
        try {
          body = (await request.json()) as ChatRequestBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const newMessage = body.message;
        if (!newMessage || newMessage.role !== "user" || !Array.isArray(newMessage.parts)) {
          return new Response("Missing user message", { status: 400 });
        }

        // Load prior conversation from DB (RLS restricts to this user).
        const { data: history, error: histErr } = await supabase
          .from("ai_core_messages")
          .select("id, role, parts, created_at")
          .order("created_at", { ascending: true });
        if (histErr) {
          return new Response(`Failed to load history: ${histErr.message}`, { status: 500 });
        }

        const priorMessages: UIMessage[] = (history ?? []).map((row) => ({
          id: row.id,
          role: row.role as UIMessage["role"],
          parts: (row.parts as UIMessage["parts"]) ?? [],
        }));

        // Persist the new user turn immediately so it survives a refresh.
        const { error: insertUserErr } = await supabase.from("ai_core_messages").insert({
          user_id: userId,
          role: "user",
          parts: newMessage.parts as unknown as Database["public"]["Tables"]["ai_core_messages"]["Insert"]["parts"],
        });
        if (insertUserErr) {
          return new Response(`Failed to save user message: ${insertUserErr.message}`, {
            status: 500,
          });
        }

        const allMessages: UIMessage[] = [...priorMessages, newMessage];

        const gateway = createLovableAiGatewayProvider(apiKey);
        const result = streamText({
          model: gateway("google/gemini-2.5-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(allMessages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: allMessages,
          onFinish: async ({ responseMessage }) => {
            if (!responseMessage) return;
            await supabase.from("ai_core_messages").insert({
              user_id: userId,
              role: "assistant",
              parts: responseMessage.parts as unknown as Database["public"]["Tables"]["ai_core_messages"]["Insert"]["parts"],
            });
          },
        });
      },
    },
  },
});