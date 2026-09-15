import { createHmac, timingSafeEqual } from "node:crypto";
import type { MessagingChannel } from "@/lib/messaging/types";

const graphVersion = process.env.META_GRAPH_API_VERSION?.trim() || "v26.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;
const instagramGraphBase = `https://graph.instagram.com/${graphVersion}`;

export function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret || !signatureHeader?.startsWith("sha256=")) return false;
  const provided = Buffer.from(signatureHeader.slice(7), "hex");
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function verifyMetaChallenge(params: URLSearchParams) {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  return mode === "subscribe" && Boolean(expected) && token === expected ? challenge : null;
}

export async function sendMetaText(input: {
  channel: MessagingChannel;
  recipientId: string;
  body: string;
  accountId: string;
}) {
  const token = accessToken(input.channel);
  const endpoint = input.channel === "WHATSAPP"
    ? `${graphBase}/${encodeURIComponent(input.accountId)}/messages`
    : `${instagramGraphBase}/me/messages`;
  const payload = input.channel === "WHATSAPP"
    ? { messaging_product: "whatsapp", recipient_type: "individual", to: input.recipientId, type: "text", text: { preview_url: false, body: input.body } }
    : { recipient: { id: input.recipientId }, message: { text: input.body } };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  const result = await response.json() as { messages?: Array<{ id?: string }>; message_id?: string; error?: { message?: string; code?: number } };
  if (!response.ok) throw new Error(result.error?.message || `Meta send failed (${response.status}).`);
  const messageId = result.messages?.[0]?.id ?? result.message_id;
  if (!messageId) throw new Error("Meta accepted the request without returning a message ID.");
  return { messageId };
}

export async function sendMetaTemplate(input: {
  recipientId: string;
  accountId: string;
  templateName: string;
  languageCode: string;
  components?: unknown[];
}) {
  const token = accessToken("WHATSAPP");
  const response = await fetch(`${graphBase}/${encodeURIComponent(input.accountId)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.recipientId,
      type: "template",
      template: { name: input.templateName, language: { code: input.languageCode }, components: input.components ?? [] }
    }),
    cache: "no-store"
  });
  const result = await response.json() as { messages?: Array<{ id?: string }>; error?: { message?: string } };
  if (!response.ok) throw new Error(result.error?.message || `Meta template send failed (${response.status}).`);
  const messageId = result.messages?.[0]?.id;
  if (!messageId) throw new Error("Meta accepted the template without returning a message ID.");
  return { messageId };
}

export function getMetaConfigStatus() {
  const whatsappToken = Boolean(process.env.META_WHATSAPP_ACCESS_TOKEN?.trim() || process.env.META_ACCESS_TOKEN?.trim());
  const instagramToken = Boolean(process.env.META_INSTAGRAM_ACCESS_TOKEN?.trim() || process.env.META_ACCESS_TOKEN?.trim());
  const appSecret = Boolean(process.env.META_APP_SECRET?.trim());
  const verifyToken = Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN?.trim());
  const phoneNumberId = Boolean(process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim());
  const instagramAccountId = Boolean(process.env.META_INSTAGRAM_ACCOUNT_ID?.trim());
  return {
    webhookReady: appSecret && verifyToken,
    whatsappReady: whatsappToken && phoneNumberId,
    instagramReady: instagramToken && instagramAccountId,
    appSecret,
    verifyToken,
    whatsappToken,
    instagramToken,
    phoneNumberId,
    instagramAccountId,
    graphVersion
  };
}

export async function fetchMetaMedia(channel: MessagingChannel, mediaId: string) {
  const token = accessToken(channel);
  const metadataResponse = await fetch(`${graphBase}/${encodeURIComponent(mediaId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const metadata = await metadataResponse.json() as { url?: string; mime_type?: string; file_size?: number; error?: { message?: string } };
  if (!metadataResponse.ok || !metadata.url) throw new Error(metadata.error?.message || "Meta media is unavailable.");
  const mediaResponse = await fetch(metadata.url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!mediaResponse.ok || !mediaResponse.body) throw new Error(`Meta media download failed (${mediaResponse.status}).`);
  return { response: mediaResponse, mimeType: metadata.mime_type };
}

function accessToken(channel: MessagingChannel) {
  const token = channel === "WHATSAPP"
    ? process.env.META_WHATSAPP_ACCESS_TOKEN?.trim() || process.env.META_ACCESS_TOKEN?.trim()
    : process.env.META_INSTAGRAM_ACCESS_TOKEN?.trim() || process.env.META_ACCESS_TOKEN?.trim();
  if (!token) throw new Error(`Meta ${channel.toLowerCase()} access token is not configured.`);
  return token;
}
