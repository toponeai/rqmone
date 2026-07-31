import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime message inserts for a conversation and invalidate
 * the messages query cache when new rows arrive.
 */
export function useMessagesRealtime(conversationId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", conversationId] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);
}

export function useConversationsRealtime(userId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`conversations:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () =>
        qc.invalidateQueries({ queryKey: ["conversations"] }),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
        qc.invalidateQueries({ queryKey: ["conversations"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
