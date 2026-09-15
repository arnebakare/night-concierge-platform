import { NextResponse } from "next/server";
import { fetchMetaMedia } from "@/lib/messaging/meta";
import { createClient } from "@/lib/supabase/server";
import type { MessagingChannel } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { attachmentId } = await params;
  const { data, error } = await supabase.from("message_attachments")
    .select("external_media_id, mime_type, filename, messages!inner(conversations!inner(channel))")
    .eq("id", attachmentId)
    .single();
  if (error || !data?.external_media_id) return NextResponse.json({ error: "Attachment is unavailable." }, { status: 404 });
  const messageRelation = Array.isArray(data.messages) ? data.messages[0] : data.messages;
  const conversationRelation = messageRelation && (Array.isArray(messageRelation.conversations) ? messageRelation.conversations[0] : messageRelation.conversations);
  const channel = conversationRelation?.channel as MessagingChannel | undefined;
  if (!channel) return NextResponse.json({ error: "Attachment channel is unavailable." }, { status: 409 });
  try {
    const media = await fetchMetaMedia(channel, data.external_media_id);
    return new Response(media.response.body, {
      headers: {
        "Content-Type": media.mimeType || data.mime_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeFilename(data.filename || `attachment-${attachmentId}`)}"`,
        "Cache-Control": "private, max-age=300"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Attachment download failed." }, { status: 502 });
  }
}

function safeFilename(value: string) { return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120); }
