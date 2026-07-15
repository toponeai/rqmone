import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

/**
 * List conversations the current user participates in, ordered by most recent
 * activity. Includes counterpart profile info and unread counts.
 */
export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: parts, error: pErr } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at, muted")
      .eq("user_id", userId);
    if (pErr) throw new Error(pErr.message);
    const convIds = (parts ?? []).map((p) => p.conversation_id);
    if (convIds.length === 0) return [];

    const { data: convs, error: cErr } = await supabase
      .from("conversations")
      .select("id, title, is_group, created_by, last_message_at, metadata")
      .in("id", convIds)
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (cErr) throw new Error(cErr.message);

    // Load participants + counterpart profiles.
    const { data: allParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds);
    const userIds = Array.from(
      new Set((allParts ?? []).map((p) => p.user_id).filter((u) => u !== userId)),
    );
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
      : { data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] };
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));

    // Last message per conversation.
    const { data: recent } = await supabase
      .from("messages")
      .select("id, conversation_id, body, sender_id, created_at, deleted_at")
      .in("conversation_id", convIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    type RecentMsg = { id: string; conversation_id: string; body: string; sender_id: string; created_at: string; deleted_at: string | null };
    const lastByConv = new Map<string, RecentMsg>();
    for (const m of (recent ?? []) as RecentMsg[]) {
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
    }

    const partMap = new Map<string, { last_read_at: string; muted: boolean }>();
    for (const p of parts ?? []) {
      partMap.set(p.conversation_id, { last_read_at: p.last_read_at, muted: p.muted });
    }

    return (convs ?? []).map((c) => {
      const others = (allParts ?? [])
        .filter((p) => p.conversation_id === c.id && p.user_id !== userId)
        .map((p) => profMap.get(p.user_id))
        .filter(Boolean) as { id: string; display_name: string | null; avatar_url: string | null }[];
      const meta = partMap.get(c.id);
      const last = lastByConv.get(c.id);
      const unread =
        last && meta && last.sender_id !== userId && last.created_at > meta.last_read_at ? 1 : 0;
      return {
        id: c.id,
        title: c.title,
        isGroup: c.is_group,
        lastMessageAt: c.last_message_at,
        lastMessage: last ? { body: last.body, senderId: last.sender_id, createdAt: last.created_at } : null,
        counterparts: others,
        muted: meta?.muted ?? false,
        unread,
      };
    });
  });

export const getMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ conversationId: uuid, limit: z.number().int().min(1).max(200).default(80) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, kind, edited_at, deleted_at, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []).reverse();
  });

const sendSchema = z.object({
  conversationId: uuid,
  body: z.string().trim().min(1).max(8000),
});

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Rate limit: max 30 messages in trailing 60 seconds per sender.
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 30) {
      throw new Error("Rate limit exceeded — slow down.");
    }

    const { data: row, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: data.conversationId,
        sender_id: userId,
        body: data.body,
        kind: "text",
      })
      .select("id, conversation_id, sender_id, body, kind, edited_at, deleted_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const createSchema = z.object({
  peerUserId: uuid.optional(),
  title: z.string().trim().max(120).optional(),
  isGroup: z.boolean().default(false),
});

export const createOrGetConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Direct message: reuse existing 1:1 if present.
    if (!data.isGroup && data.peerUserId && data.peerUserId !== userId) {
      const { data: mine } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);
      const { data: theirs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", data.peerUserId);
      const overlap = (mine ?? [])
        .map((r) => r.conversation_id)
        .filter((id) => (theirs ?? []).some((t) => t.conversation_id === id));
      if (overlap.length) {
        const { data: existing } = await supabase
          .from("conversations")
          .select("id, is_group")
          .in("id", overlap)
          .eq("is_group", false)
          .limit(1)
          .maybeSingle();
        if (existing) return { id: existing.id, created: false };
      }
    }

    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ created_by: userId, is_group: data.isGroup, title: data.title ?? null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.peerUserId && data.peerUserId !== userId) {
      await supabase
        .from("conversation_participants")
        .insert({ conversation_id: conv.id, user_id: data.peerUserId, role: "member" });
    }
    return { id: conv.id, created: true };
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversationId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Universal-search participant lookup for starting new DMs. */
export const searchUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().trim().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .ilike("display_name", `%${data.q}%`)
      .neq("id", userId)
      .limit(10);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
