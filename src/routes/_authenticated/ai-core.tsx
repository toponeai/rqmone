import { useEffect, useMemo, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowLeft,
  Sparkles,
  Trash2,
  Plus,
  MessageSquare,
  ChevronDown,
  Settings2,
  LayoutDashboard,
} from "@/os/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  listConversations,
  createConversation,
  deleteConversation,
  getConversationMessages,
  listAgents,
  loadAiCoreHistory,
  clearAiCoreHistory,
  type StoredAiMessage,
} from "@/modules/ai/ai.functions";
import type { AiConversation, AiAgent } from "@/modules/ai/types";
import { MODEL_OPTIONS } from "@/modules/ai/types";

export const Route = createFileRoute("/_authenticated/ai-core")({
  head: () => ({
    meta: [
      { title: "AI Core — R.Q.M.1" },
      {
        name: "description",
        content:
          "The AI Core is the intelligent command surface of R.Q.M.1 — chat with the mind of your Interactive Earth.",
      },
    ],
  }),
  component: AiCorePage,
});

// ── Hook: build DefaultChatTransport ────────────────────────────────────────
function useAiTransport(conversationId: string | null) {
  return useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            message: messages[messages.length - 1],
            conversationId: conversationId ?? undefined,
          },
        }),
        fetch: async (input, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      }),
    [conversationId],
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function AiCorePage() {
  const queryClient = useQueryClient();

  // Active conversation — null = legacy ai_core_messages
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<AiAgent | null>(null);

  const fetchConversations = useServerFn(listConversations);
  const fetchAgents = useServerFn(listAgents);
  const createConv = useServerFn(createConversation);
  const deleteConv = useServerFn(deleteConversation);
  const fetchMessages = useServerFn(getConversationMessages);
  const loadHistory = useServerFn(loadAiCoreHistory);
  const clearHistory = useServerFn(clearAiCoreHistory);

  const conversationsQuery = useQuery({
    queryKey: ["ai", "conversations"],
    queryFn: () => fetchConversations(),
    staleTime: 30_000,
  });

  const agentsQuery = useQuery({
    queryKey: ["ai", "agents"],
    queryFn: () => fetchAgents(),
    staleTime: 60_000,
  });

  // Load messages for active conversation or legacy history
  const messagesQuery = useQuery({
    queryKey: ["ai", "messages", activeConvId],
    queryFn: () =>
      activeConvId
        ? fetchMessages({ data: { conversation_id: activeConvId } })
        : loadHistory(),
    staleTime: Infinity,
  });

  const initialMessages = useMemo<UIMessage[]>(() => {
    const raw = messagesQuery.data ?? [];
    return (raw as StoredAiMessage[]).map((m) => ({
      id: m.id,
      role: m.role as UIMessage["role"],
      parts: (m.parts as UIMessage["parts"]) ?? [],
    }));
  }, [messagesQuery.data]);

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; agent_id?: string }) =>
      createConv({
        data: {
          title: payload.title,
          model: "google/gemini-2.5-flash",
          provider: "lovable-gateway",
          agent_id: payload.agent_id ?? null,
        },
      }),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
      setActiveConvId(conv.id);
    },
    onError: (err) => toast.error(`Failed to create conversation: ${(err as Error).message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConv({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
      if (activeConvId === id) setActiveConvId(null);
    },
    onError: (err) => toast.error(`Failed to delete: ${(err as Error).message}`),
  });

  const handleNewConversation = useCallback(() => {
    createMutation.mutate({
      title: `Chat ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      agent_id: activeAgent?.id,
    });
  }, [createMutation, activeAgent]);

  if (messagesQuery.isLoading) {
    return (
      <ChatShell activeConvId={activeConvId} conversations={[]} onSelect={() => {}} onNew={() => {}}>
        <div className="flex flex-1 items-center justify-center">
          <Shimmer>Waking the AI Core…</Shimmer>
        </div>
      </ChatShell>
    );
  }

  return (
    <ChatShell
      activeConvId={activeConvId}
      conversations={conversationsQuery.data ?? []}
      agents={agentsQuery.data ?? []}
      activeAgent={activeAgent}
      onSelect={(id) => {
        setActiveConvId(id);
        queryClient.invalidateQueries({ queryKey: ["ai", "messages", id] });
      }}
      onNew={handleNewConversation}
      onDelete={(id) => deleteMutation.mutate(id)}
      onAgentSelect={setActiveAgent}
    >
      <ChatSurface
        key={activeConvId ?? "legacy"}
        seed={initialMessages}
        conversationId={activeConvId}
        onCleared={() => {
          queryClient.invalidateQueries({ queryKey: ["ai", "messages", activeConvId] });
        }}
        clearFn={
          activeConvId
            ? () => deleteConv({ data: { id: activeConvId } }).then(() => ({ ok: true }))
            : clearHistory
        }
      />
    </ChatShell>
  );
}

// ── Shell with sidebar ────────────────────────────────────────────────────────

function ChatShell({
  children,
  activeConvId,
  conversations,
  agents,
  activeAgent,
  onSelect,
  onNew,
  onDelete,
  onAgentSelect,
}: {
  children: React.ReactNode;
  activeConvId: string | null;
  conversations: AiConversation[];
  agents?: AiAgent[];
  activeAgent?: AiAgent | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  onDelete?: (id: string) => void;
  onAgentSelect?: (agent: AiAgent | null) => void;
}) {
  const activeConv = conversations.find((c) => c.id === activeConvId);
  const convLabel = activeConv?.title ?? (activeConvId ? "Conversation" : "AI Core");

  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Sidebar */}
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-border/60 bg-card/30 backdrop-blur">
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/70 to-accent shadow-[0_0_20px_-4px_hsl(var(--primary))]">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">AI Core</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button asChild variant="ghost" size="icon-sm">
              <Link to="/ai-manager" title="AI Manager">
                <LayoutDashboard className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onNew} title="New conversation">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Agent selector */}
        {agents && agents.length > 0 && onAgentSelect && (
          <div className="border-b border-border/60 px-2 py-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                  <span className="truncate">{activeAgent?.name ?? "Default agent"}</span>
                  <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem onClick={() => onAgentSelect(null)}>
                  <span className="text-muted-foreground">Default agent</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {agents.filter((a) => a.is_active).map((agent) => (
                  <DropdownMenuItem key={agent.id} onClick={() => onAgentSelect(agent)}>
                    {agent.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-1">
          {/* Legacy entry */}
          <button
            onClick={() => onSelect(null)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 ${activeConvId === null ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
          >
            <MessageSquare className="h-3 w-3 flex-shrink-0" />
            <span className="truncate font-medium">AI Core (classic)</span>
          </button>

          {conversations.length > 0 && (
            <p className="mt-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Conversations
            </p>
          )}
          {conversations.map((conv) => (
            <div key={conv.id} className="group flex items-center gap-1 px-1">
              <button
                onClick={() => onSelect(conv.id)}
                className={`flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 ${activeConvId === conv.id ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                <MessageSquare className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{conv.title}</span>
                {conv.message_count !== undefined && conv.message_count > 0 && (
                  <span className="ml-auto flex-shrink-0 text-[10px] opacity-50">
                    {conv.message_count}
                  </span>
                )}
              </button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={() => onDelete(conv.id)}
                  title="Delete conversation"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Back link */}
        <div className="border-t border-border/60 p-2">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start text-xs">
            <Link to="/">
              <ArrowLeft className="mr-1.5 h-3 w-3" />
              Back to Earth
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{convLabel}</p>
            {activeAgent && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {activeAgent.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Model badge */}
            {(activeConv?.model ?? "google/gemini-2.5-flash") && (() => {
              const modelId = activeConv?.model ?? "google/gemini-2.5-flash";
              const opt = MODEL_OPTIONS.find((m) => m.id === modelId);
              return (
                <span className="rounded border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {opt?.label ?? modelId}
                </span>
              );
            })()}
            <Button asChild variant="ghost" size="icon-sm" title="AI Manager">
              <Link to="/ai-manager">
                <Settings2 className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

// ── Chat surface ──────────────────────────────────────────────────────────────

function ChatSurface({
  seed,
  conversationId,
  clearFn,
  onCleared,
}: {
  seed: UIMessage[];
  conversationId: string | null;
  clearFn: () => Promise<{ ok: boolean }>;
  onCleared: () => void;
}) {
  const transport = useAiTransport(conversationId);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: conversationId ?? "ai-core",
    messages: seed,
    transport,
  });

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    setMessages(seed);
  }, [seed, setMessages]);

  const handleClear = async () => {
    await clearFn();
    setMessages([]);
    onCleared();
  };

  return (
    <>
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Sparkles className="h-8 w-8 text-primary" />}
              title="Start a conversation"
              description="Ask about your entities on Earth, brainstorm new ideas, or let the AI Core help you plan and execute tasks."
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
          <PromptInputFooter className="justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => void handleClear()}
              disabled={messages.length === 0 || isStreaming}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Clear
            </Button>
            <PromptInputSubmit status={status} disabled={isStreaming} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}
