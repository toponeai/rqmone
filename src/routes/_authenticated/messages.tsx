import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  listConversations,
  getMessages,
  sendMessage,
  createOrGetConversation,
  markConversationRead,
  searchUsers,
} from "@/modules/messaging/messaging.functions";
import { useMessagesRealtime, useConversationsRealtime } from "@/modules/messaging/realtime";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/os/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, MessageCircle, Users, Search } from "@/os/icons";

const searchSchema = z.object({ c: z.string().optional() });

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (s) => searchSchema.parse(s),
  component: MessagesPage,
});

function MessagesPage() {
  const { c: activeId } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useSession();
  const t = useT();

  const listFn = useServerFn(listConversations);
  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listFn(),
    staleTime: 10_000,
  });

  useConversationsRealtime(user?.id ?? null);

  const conversations = conversationsQuery.data ?? [];
  const active = activeId ? conversations.find((c) => c.id === activeId) : undefined;

  const setActive = (id: string | undefined) => navigate({ to: "/messages", search: { c: id } });

  return (
    <div className="fixed inset-0 top-14 bottom-16 md:bottom-0 flex bg-background">
      <ConversationList
        conversations={conversations}
        loading={conversationsQuery.isLoading}
        activeId={activeId}
        onSelect={setActive}
        currentUserId={user?.id ?? ""}
        onStarted={setActive}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        {activeId ? (
          <ChatPane
            conversationId={activeId}
            currentUserId={user?.id ?? ""}
            title={
              active?.title ??
              active?.counterparts.map((c) => c.display_name || "Unknown").join(", ") ??
              t("module.messages")
            }
          />
        ) : (
          <EmptyPane label={t("messages.empty")} />
        )}
      </div>
    </div>
  );
}

function EmptyPane({ label }: { label: string }) {
  return (
    <div className="flex-1 grid place-items-center text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-full p-6 bg-card border border-border/40">
          <MessageCircle className="w-8 h-8" />
        </div>
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

function ConversationList({
  conversations,
  loading,
  activeId,
  onSelect,
  currentUserId,
  onStarted,
}: {
  conversations: Awaited<ReturnType<typeof listConversations>>;
  loading: boolean;
  activeId?: string;
  onSelect: (id: string) => void;
  currentUserId: string;
  onStarted: (id: string) => void;
}) {
  const t = useT();
  const [showNew, setShowNew] = useState(false);
  return (
    <aside className="w-full max-w-xs md:w-80 border-r border-border/40 bg-card/40 backdrop-blur flex flex-col">
      <div className="p-3 flex items-center justify-between gap-2 border-b border-border/40">
        <h2 className="font-semibold text-sm">{t("module.messages")}</h2>
        <Button size="sm" variant="secondary" onClick={() => setShowNew((v) => !v)}>
          <Users className="w-4 h-4 mr-1" /> {t("messages.new")}
        </Button>
      </div>
      {showNew && (
        <NewConversationPicker
          onStarted={(id) => {
            onStarted(id);
            setShowNew(false);
          }}
        />
      )}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-6 grid place-items-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">{t("messages.emptyList")}</p>
        ) : (
          <ul className="p-2 space-y-1">
            {conversations.map((c) => {
              const label =
                c.title ||
                c.counterparts.map((p) => p.display_name || "Unknown").join(", ") ||
                t("messages.untitled");
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "w-full text-left rounded-lg p-2 flex items-start gap-2 transition-colors",
                      activeId === c.id ? "bg-primary/15" : "hover:bg-muted/60",
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 grid place-items-center text-xs font-semibold">
                      {label.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{label}</span>
                        {c.unread > 0 && (
                          <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.lastMessage
                          ? (c.lastMessage.senderId === currentUserId ? "You: " : "") +
                            c.lastMessage.body
                          : t("messages.noMessages")}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </aside>
  );
}

function NewConversationPicker({ onStarted }: { onStarted: (id: string) => void }) {
  const [q, setQ] = useState("");
  const searchFn = useServerFn(searchUsers);
  const createFn = useServerFn(createOrGetConversation);
  const results = useQuery({
    queryKey: ["user-search", q],
    queryFn: () => searchFn({ data: { q } }),
    enabled: q.trim().length > 0,
  });
  const start = useMutation({
    mutationFn: (peerUserId: string) => createFn({ data: { peerUserId, isGroup: false } }),
    onSuccess: (r) => onStarted(r.id),
  });
  return (
    <div className="p-3 border-b border-border/40 space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people…"
          className="pl-8"
        />
      </div>
      {results.data && results.data.length > 0 && (
        <ul className="space-y-1 max-h-48 overflow-auto">
          {results.data.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => start.mutate(u.id)}
                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/60 text-left"
              >
                <div className="w-7 h-7 rounded-full bg-primary/30 grid place-items-center text-[10px] font-semibold">
                  {(u.display_name || "?").slice(0, 1).toUpperCase()}
                </div>
                <span className="text-sm">{u.display_name || "Unknown user"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChatPane({
  conversationId,
  currentUserId,
  title,
}: {
  conversationId: string;
  currentUserId: string;
  title: string;
}) {
  const t = useT();
  const qc = useQueryClient();
  const getFn = useServerFn(getMessages);
  const sendFn = useServerFn(sendMessage);
  const markFn = useServerFn(markConversationRead);

  const messages = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => getFn({ data: { conversationId, limit: 80 } }),
  });

  useMessagesRealtime(conversationId);

  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => messages.data ?? [], [messages.data]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [items.length]);

  useEffect(() => {
    markFn({ data: { conversationId } }).catch(() => {});
  }, [conversationId, items.length, markFn]);

  const send = useMutation({
    mutationFn: () => sendFn({ data: { conversationId, body: draft.trim() } }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const submit = () => {
    if (!draft.trim() || send.isPending) return;
    send.mutate();
  };

  return (
    <>
      <header className="h-14 border-b border-border/40 bg-card/40 backdrop-blur px-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 grid place-items-center text-xs font-semibold">
          {title.slice(0, 1).toUpperCase()}
        </div>
        <h1 className="font-semibold truncate">{title}</h1>
      </header>
      <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.isLoading ? (
          <div className="grid place-items-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">
            {t("messages.startPrompt")}
          </p>
        ) : (
          items.map((m) => (
            <MessageBubble
              key={m.id}
              mine={m.sender_id === currentUserId}
              body={m.body}
              createdAt={m.created_at}
            />
          ))
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="border-t border-border/40 bg-card/40 backdrop-blur p-3 flex items-end gap-2"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={8000}
          placeholder={t("messages.inputPlaceholder")}
          className="flex-1 resize-none rounded-md bg-background/60 border border-border/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label={t("messages.inputPlaceholder")}
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || send.isPending}>
          {send.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </>
  );
}

function MessageBubble({
  mine,
  body,
  createdAt,
}: {
  mine: boolean;
  body: string;
  createdAt: string;
}) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{body}</p>
        <p className={cn("text-[10px] mt-1 opacity-70", mine ? "text-right" : "text-left")}>
          {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
