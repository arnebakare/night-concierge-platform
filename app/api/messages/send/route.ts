import { NextResponse } from "next/server";
import { sendMetaTemplate, sendMetaText } from "@/lib/messaging/meta";
import { writeAuditLog } from "@/lib/services/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_000) return NextResponse.json({ error: "Message is too large." }, { status: 413 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("id, role, active").eq("id", user.id).single();
  if (!profile?.active || !["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"].includes(profile.role)) {
    return NextResponse.json({ error: "Staff access required." }, { status: 403 });
  }

  let input: { conversationId?: string; body?: string; templateName?: string; languageCode?: string };
  try {
    input = await request.json() as typeof input;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const conversationId = input.conversationId?.trim();
  const body = input.body?.trim();
  const templateName = input.templateName?.trim();
  if (!conversationId || (!body && !templateName) || (body?.length ?? 0) > 4000) {
    return NextResponse.json({ error: "Choose a conversation and enter a valid message." }, { status: 400 });
  }

  const { data: conversation, error: conversationError } = await supabase.from("conversations")
    .select("id, channel, external_account_id, identity:customer_identities!conversations_customer_identity_id_fkey(external_user_id)")
    .eq("id", conversationId)
    .single();
  if (conversationError || !conversation) return NextResponse.json({ error: "Conversation is unavailable." }, { status: 404 });
  const identityValue = Array.isArray(conversation.identity) ? conversation.identity[0] : conversation.identity;
  const identity = identityValue as { external_user_id?: string } | null;
  if (!identity?.external_user_id) return NextResponse.json({ error: "Customer identity is unavailable." }, { status: 409 });
  if (templateName && conversation.channel !== "WHATSAPP") return NextResponse.json({ error: "Meta templates are only supported for WhatsApp." }, { status: 400 });
  const admin = createAdminClient();

  const { data: pending, error: insertError } = await admin.from("messages").insert({
    conversation_id: conversationId,
    direction: "OUTBOUND",
    sender_profile_id: user.id,
    message_type: templateName ? "TEMPLATE" : "TEXT",
    body: body || `[Template: ${templateName}]`,
    delivery_status: "PENDING"
  }).select("id").single();
  if (insertError || !pending) return NextResponse.json({ error: insertError?.message ?? "Could not queue message." }, { status: 500 });

  try {
    const result = templateName
      ? await sendMetaTemplate({ recipientId: identity.external_user_id, accountId: conversation.external_account_id, templateName, languageCode: input.languageCode?.trim() || "en" })
      : await sendMetaText({ channel: conversation.channel, recipientId: identity.external_user_id, accountId: conversation.external_account_id, body: body! });
    const sentAt = new Date().toISOString();
    await admin.from("messages").update({ external_message_id: result.messageId, delivery_status: "SENT", sent_at: sentAt }).eq("id", pending.id);
    await admin.from("conversations").update({ last_message_at: sentAt, last_message_preview: body || `[Template: ${templateName}]` }).eq("id", conversationId);
    await writeAuditLog(admin, { userId: user.id, action: "META_MESSAGE_SENT", entityType: "messages", entityId: pending.id, metadata: { conversationId, channel: conversation.channel, templateName: templateName ?? null } });
    return NextResponse.json({ ok: true, messageId: pending.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta delivery failed.";
    await admin.from("messages").update({ delivery_status: "FAILED", error_message: message }).eq("id", pending.id);
    await writeAuditLog(admin, { userId: user.id, action: "META_MESSAGE_FAILED", entityType: "messages", entityId: pending.id, metadata: { conversationId, channel: conversation.channel, error: message } });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
