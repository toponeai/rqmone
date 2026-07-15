export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  kind: string;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  isGroup: boolean;
  lastMessageAt: string;
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  counterparts: { id: string; display_name: string | null; avatar_url: string | null }[];
  muted: boolean;
  unread: number;
}
