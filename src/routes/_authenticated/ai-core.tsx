import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowLeft, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { loadAiCoreHistory, clearAiCoreHistory, type StoredAiMessage } from "@/lib/ai-core.functions";

export const Route = createFileRoute("/_authenticated/ai-core")({
  head: () => ({
    meta: [
      { title: "AI Core — R.Q.M.1" },
      {
        name: "description",
        content: "The AI Core is the intelligent command surface of R.Q.M.1 — chat with the mind of your Interactive Earth.",
      },
    ],
  }),
  component: AiCorePage,
});

function AiCorePage() {
  const queryClient = useQueryClient();
  const loadHistory = useServerFn(loadAiCoreHistory);
  const clearHistory = useServerFn(clearAiCoreHistory);

  const historyQuery = useQuery({
    queryKey: ["ai-core", "history"],
    queryFn: () => loadHistory(),
    staleTime: Infinity,
  });

  const initialMessages = useMemo<UIMessage[]>(
    () =>
      (historyQuery.data ?? []).map((m: StoredAiMessage) => ({
        id: m.id,
        role: m.role as UIMessage["role"],
        parts: (m.parts as UIMessage["parts"]) ?? [],
      })),
    [historyQuery.data],
  );

  return historyQuery.isLoading ? (
    <ChatShell>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        <Shimmer>Waking the AI Core…</Shimmer>
      </div>
    </ChatShell>
  ) : (
    <ChatSurface
      seed={initialMessages}
      onCleared={() => queryClient.invalidateQueries({ queryKey: ["ai-core", "history"] })}
      clearFn={clearHistory}
    />
  );
}

function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <header className="flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/70 to-accent shadow-[0_0_30px_-6px_hsl(var(--primary))]">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">AI Core</h1>
              <p className="text-xs text-muted-foreground">R.Q.M.1 · living mind</p>
            </div>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}

function ChatSurface({
  seed,
  clearFn,
  onCleared,
}: {
  seed: UIMessage[];
  clearFn: () => Promise<{ ok: boolean }>;
  onCleared: () => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        // Server owns history — only send the newest user turn.
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { message: messages[messages.length - 1] },
        }),
        // Attach the Supabase bearer for the server route's auth check.
        fetch: async (input, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: "ai-core",
    messages: seed,
    transport,
  });

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    // Re-seed if history refetches (e.g. after a clear).
    setMessages(seed);
  }, [seed, setMessages]);

  return (
    <ChatShellWithClear
      onClear={async () => {
        await clearFn();
        setMessages([]);
        onCleared();
      }}
      disabled={messages.length === 0 || isStreaming}
    >
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Sparkles className="h-8 w-8 text-primary" />}
              title="Say hello to the AI Core"
              description="Ask about entities on your Earth, brainstorm new categories, or draft a description. Everything you say is remembered per your account."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return message.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <span key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </span>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border/60 bg-card/40 p-3 backdrop-blur">
        <PromptInput
          onSubmit={(msg) => {
            const text = (msg.text ?? "").trim();
            if (!text || isStreaming) return;
            void sendMessage({ text });
          }}
        >
          <PromptInputTextarea placeholder="Message the AI Core…" autoFocus />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={isStreaming} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </ChatShellWithClear>
  );
}

function ChatShellWithClear({
  children,
  onClear,
  disabled,
}: {
  children: React.ReactNode;
  onClear: () => void | Promise<void>;
  disabled: boolean;
}) {
  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <header className="flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/70 to-accent shadow-[0_0_30px_-6px_hsl(var(--primary))]">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">AI Core</h1>
              <p className="text-xs text-muted-foreground">R.Q.M.1 · living mind</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void onClear()} disabled={disabled}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      </header>
      {children}
    </main>
  );
}