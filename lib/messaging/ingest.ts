import type { SupabaseClient } from "@supabase/supabase-js";
import { customerCodeFromPhone, normalizePhoneNumber } from "@/lib/concierge/phone";
import type { NormalizedInboundMessage, NormalizedMetaEvent } from "@/lib/messaging/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function ingestMetaEvents(events: NormalizedMetaEvent[]) {
  const supabase = createAdminClient();
  const results = [];
  for (const event of events) {
    results.push(event.kind === "message"
      ? await ingestInboundMessage(supabase, event)
      : await applyStatusUpdate(supabase, event));
  }
  return results;
}

async function ingestInboundMessage(supabase: SupabaseClient, event: NormalizedInboundMessage) {
  const { data: duplicate } = await supabase.from("messages").select("id, conversation_id").eq("external_message_id", event.externalMessageId).maybeSingle();
  if (duplicate) return { kind: "duplicate", id: duplicate.id };

  const identity = await findOrCreateIdentity(supabase, event);
  const conversation = await findOrCreateConversation(supabase, event, identity);
  const { data: message, error } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    direction: "INBOUND",
    sender_external_id: event.externalUserId,
    external_message_id: event.externalMessageId,
    message_type: event.messageType,
    body: event.body,
    provider_payload: event.raw,
    delivery_status: "RECEIVED",
    sent_at: event.timestamp
  }).select("id").single();
  if (error || !message) {
    if (error?.code === "23505") return { kind: "duplicate", id: event.externalMessageId };
    throw new Error(error?.message ?? "Could not store inbound Meta message.");
  }

  if (event.attachments.length) {
    const { error: attachmentError } = await supabase.from("message_attachments").insert(event.attachments.map((attachment) => ({
      message_id: message.id,
      attachment_type: attachment.type,
      external_media_id: attachment.externalMediaId ?? null,
      source_url: attachment.sourceUrl ?? null,
      mime_type: attachment.mimeType ?? null,
      filename: attachment.filename ?? null,
      metadata: attachment.metadata ?? {}
    })));
    if (attachmentError) throw new Error(attachmentError.message);
  }

  const preview = event.body || (event.attachments.length ? `[${event.attachments[0].type.toLowerCase()}]` : "[message]");
  await supabase.from("conversations").update({
    status: "OPEN",
    unread_count: conversation.unread_count + 1,
    last_message_at: event.timestamp,
    last_message_preview: preview.slice(0, 240)
  }).eq("id", conversation.id);
  await supabase.from("audit_logs").insert({
    user_id: null,
    action: "META_MESSAGE_RECEIVED",
    entity_type: "conversations",
    entity_id: conversation.id,
    metadata: { channel: event.channel, externalMessageId: event.externalMessageId, autoAssigned: Boolean(conversation.assigned_promoter_id) }
  });
  return { kind: "created", id: message.id, conversationId: conversation.id };
}

async function findOrCreateIdentity(supabase: SupabaseClient, event: NormalizedInboundMessage) {
  const { data: existing } = await supabase.from("customer_identities").select("id, client_id").eq("channel", event.channel).eq("external_user_id", event.externalUserId).maybeSingle();
  if (existing) {
    await supabase.from("customer_identities").update({
      username: event.username ?? undefined,
      display_name: event.displayName ?? undefined,
      phone: event.phone ? normalizePhoneNumber(event.phone) : undefined
    }).eq("id", existing.id);
    return existing as { id: string; client_id: string };
  }

  let client: { id: string; owner_promoter_id: string | null } | null = null;
  if (event.channel === "WHATSAPP" && event.phone) {
    const { data } = await supabase.from("clients").select("id, owner_promoter_id").eq("client_code", customerCodeFromPhone(event.phone)).maybeSingle();
    client = data;
  }
  if (!client) {
    const fallbackName = event.displayName || event.username || (event.channel === "WHATSAPP" ? event.phone : "Instagram guest") || "New guest";
    const phone = event.channel === "WHATSAPP" && event.phone ? normalizePhoneNumber(event.phone) : `instagram:${event.externalUserId}`;
    const { data, error } = await supabase.from("clients").insert({ name: fallbackName, phone }).select("id, owner_promoter_id").single();
    if (error || !data) throw new Error(error?.message ?? "Could not create customer for Meta identity.");
    client = data;
  }

  const { data: identity, error } = await supabase.from("customer_identities").insert({
    client_id: client.id,
    channel: event.channel,
    external_user_id: event.externalUserId,
    username: event.username ?? null,
    display_name: event.displayName ?? null,
    phone: event.phone ? normalizePhoneNumber(event.phone) : null
  }).select("id, client_id").single();
  if (error || !identity) throw new Error(error?.message ?? "Could not create customer identity.");
  return identity as { id: string; client_id: string };
}

async function findOrCreateConversation(
  supabase: SupabaseClient,
  event: NormalizedInboundMessage,
  identity: { id: string; client_id: string }
) {
  const { data: existing } = await supabase.from("conversations")
    .select("id, unread_count, assigned_promoter_id")
    .eq("customer_identity_id", identity.id)
    .eq("external_account_id", event.externalAccountId)
    .maybeSingle();
  if (existing) return existing as { id: string; unread_count: number; assigned_promoter_id: string | null };

  const { data: customer } = await supabase.from("clients").select("owner_promoter_id").eq("id", identity.client_id).single();
  let managerId: string | null = null;
  if (customer?.owner_promoter_id) {
    const { data: promoter } = await supabase.from("profiles").select("manager_id").eq("id", customer.owner_promoter_id).maybeSingle();
    managerId = promoter?.manager_id ?? null;
  }
  const { data, error } = await supabase.from("conversations").insert({
    client_id: identity.client_id,
    customer_identity_id: identity.id,
    channel: event.channel,
    external_account_id: event.externalAccountId,
    external_thread_id: event.externalThreadId ?? null,
    assigned_promoter_id: customer?.owner_promoter_id ?? null,
    assigned_manager_id: managerId,
    last_message_at: event.timestamp,
    unread_count: 0
  }).select("id, unread_count, assigned_promoter_id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create conversation.");
  if (data.assigned_promoter_id) {
    await supabase.from("conversation_assignments").insert({
      conversation_id: data.id,
      promoter_id: data.assigned_promoter_id,
      manager_id: managerId,
      reason: "Customer owner matched automatically"
    });
  }
  return data as { id: string; unread_count: number; assigned_promoter_id: string | null };
}

async function applyStatusUpdate(supabase: SupabaseClient, event: Extract<NormalizedMetaEvent, { kind: "status" }>) {
  const fields: Record<string, unknown> = { delivery_status: event.status, provider_payload: event.raw, error_message: event.error ?? null };
  if (event.status === "SENT") fields.sent_at = event.timestamp;
  if (event.status === "DELIVERED") fields.delivered_at = event.timestamp;
  if (event.status === "READ") fields.read_at = event.timestamp;
  const { data, error } = await supabase.from("messages").update(fields).eq("external_message_id", event.externalMessageId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  return { kind: data ? "updated" : "ignored", id: data?.id ?? event.externalMessageId };
}
