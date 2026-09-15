import { createClient } from "@/lib/supabase/server";
import type { Conversation, ConversationMessage, ConversationNote, Profile } from "@/lib/types";

const conversationSelect = "id, client_id, customer_identity_id, channel, external_account_id, external_thread_id, assigned_promoter_id, assigned_manager_id, status, unread_count, last_message_at, last_message_preview, clients(id, name, phone, instagram, vip_level, status), identity:customer_identities!conversations_customer_identity_id_fkey(external_user_id, username, display_name, phone), promoter:profiles!conversations_assigned_promoter_id_fkey(id, name, email), manager:profiles!conversations_assigned_manager_id_fkey(id, name, email)";

export async function getConversations(profile: Profile, filters?: { channel?: string; assignment?: string; q?: string }) {
  const supabase = await createClient();
  let query = supabase.from("conversations").select(conversationSelect).order("last_message_at", { ascending: false, nullsFirst: false }).limit(100);
  if (filters?.channel === "WHATSAPP" || filters?.channel === "INSTAGRAM") query = query.eq("channel", filters.channel);
  if (filters?.assignment === "unassigned") query = query.is("assigned_promoter_id", null);
  if (filters?.assignment === "mine") query = query.eq("assigned_promoter_id", profile.id);
  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  const conversations = (data ?? []).map(normalizeConversation);
  const needle = filters?.q?.trim().toLowerCase();
  if (!needle) return conversations;
  return conversations.filter((item) => [item.clients?.name, item.clients?.phone, item.identity?.username, item.last_message_preview].some((value) => value?.toLowerCase().includes(needle)));
}

export async function getConversationDetail(id: string) {
  const supabase = await createClient();
  const [{ data: conversation, error }, { data: messages }, { data: notes }] = await Promise.all([
    supabase.from("conversations").select(conversationSelect).eq("id", id).maybeSingle(),
    supabase.from("messages").select("id, conversation_id, direction, sender_profile_id, external_message_id, message_type, body, delivery_status, error_message, sent_at, created_at, sender:profiles!messages_sender_profile_id_fkey(name, email), attachments:message_attachments(id, attachment_type, external_media_id, source_url, mime_type, filename)").eq("conversation_id", id).order("created_at").limit(500),
    supabase.from("conversation_notes").select("id, conversation_id, author_id, body, created_at, author:profiles!conversation_notes_author_id_fkey(name, email)").eq("conversation_id", id).order("created_at").limit(100)
  ]);
  if (error) throw error;
  return {
    conversation: conversation ? normalizeConversation(conversation) : null,
    messages: (messages ?? []).map((message) => normalizeRelations(message)) as unknown as ConversationMessage[],
    notes: (notes ?? []).map((note) => normalizeRelations(note)) as unknown as ConversationNote[]
  };
}

function normalizeConversation(value: unknown) {
  return normalizeRelations(value) as Conversation;
}

function normalizeRelations(value: unknown): Record<string, unknown> {
  const item = { ...(value as Record<string, unknown>) };
  for (const key of ["clients", "identity", "promoter", "manager", "sender", "author"]) {
    const relation = item[key];
    if (Array.isArray(relation)) item[key] = relation[0] ?? null;
  }
  return item;
}
