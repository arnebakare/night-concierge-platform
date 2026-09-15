import type { NormalizedMetaEvent } from "@/lib/messaging/types";

type JsonRecord = Record<string, unknown>;

export function normalizeMetaWebhook(payload: JsonRecord): NormalizedMetaEvent[] {
  if (payload.object === "whatsapp_business_account") return normalizeWhatsApp(payload);
  if (payload.object === "instagram" || payload.object === "page") return normalizeInstagram(payload);
  return [];
}

function normalizeWhatsApp(payload: JsonRecord): NormalizedMetaEvent[] {
  const events: NormalizedMetaEvent[] = [];
  for (const entry of records(payload.entry)) {
    for (const change of records(entry.changes)) {
      const value = record(change.value);
      const metadata = record(value.metadata);
      const contacts = records(value.contacts);
      for (const message of records(value.messages)) {
        const contact = contacts.find((item) => String(item.wa_id ?? "") === String(message.from ?? "")) ?? contacts[0];
        const profile = record(contact?.profile);
        const parsed = whatsAppContent(message);
        if (!message.id || !message.from || !metadata.phone_number_id) continue;
        events.push({
          kind: "message",
          channel: "WHATSAPP",
          externalAccountId: String(metadata.phone_number_id),
          externalUserId: String(message.from),
          externalMessageId: String(message.id),
          displayName: stringOrNull(profile.name),
          phone: stringOrNull(contact?.wa_id) ?? String(message.from),
          messageType: String(message.type ?? "unknown").toUpperCase(),
          body: parsed.body,
          timestamp: epochToIso(message.timestamp),
          attachments: parsed.attachments,
          raw: message
        });
      }
      for (const status of records(value.statuses)) {
        if (!status.id) continue;
        const normalized = normalizeStatus(status.status);
        if (!normalized) continue;
        const errors = records(status.errors);
        events.push({
          kind: "status",
          channel: "WHATSAPP",
          externalMessageId: String(status.id),
          status: normalized,
          timestamp: epochToIso(status.timestamp),
          error: stringOrNull(errors[0]?.title) ?? stringOrNull(errors[0]?.message),
          raw: status
        });
      }
    }
  }
  return events;
}

function normalizeInstagram(payload: JsonRecord): NormalizedMetaEvent[] {
  const events: NormalizedMetaEvent[] = [];
  for (const entry of records(payload.entry)) {
    for (const item of records(entry.messaging)) {
      const message = record(item.message);
      const sender = record(item.sender);
      const recipient = record(item.recipient);
      if (!message.mid || !sender.id || !recipient.id || message.is_echo === true) continue;
      const attachments = records(message.attachments).map((attachment) => {
        const attachmentPayload = record(attachment.payload);
        return {
          type: String(attachment.type ?? "file").toUpperCase(),
          sourceUrl: stringOrNull(attachmentPayload.url),
          metadata: attachmentPayload
        };
      });
      events.push({
        kind: "message",
        channel: "INSTAGRAM",
        externalAccountId: String(recipient.id),
        externalUserId: String(sender.id),
        externalMessageId: String(message.mid),
        externalThreadId: `${recipient.id}:${sender.id}`,
        messageType: attachments[0]?.type ?? "TEXT",
        body: stringOrNull(message.text),
        timestamp: epochToIso(item.timestamp, true),
        attachments,
        raw: item
      });
    }
  }
  return events;
}

function whatsAppContent(message: JsonRecord) {
  const type = String(message.type ?? "unknown");
  const content = record(message[type]);
  const caption = stringOrNull(content.caption);
  if (type === "text") return { body: stringOrNull(record(message.text).body), attachments: [] };
  if (type === "button") return { body: stringOrNull(record(message.button).text), attachments: [] };
  if (type === "interactive") {
    const interactive = record(message.interactive);
    const reply = record(interactive.button_reply ?? interactive.list_reply);
    return { body: stringOrNull(reply.title) ?? stringOrNull(reply.id), attachments: [] };
  }
  if (["image", "video", "audio", "document", "sticker"].includes(type)) {
    return {
      body: caption,
      attachments: [{
        type: type.toUpperCase(),
        externalMediaId: stringOrNull(content.id),
        mimeType: stringOrNull(content.mime_type),
        filename: stringOrNull(content.filename),
        metadata: content
      }]
    };
  }
  return { body: stringOrNull(content.body) ?? `[${type}]`, attachments: [] };
}

function normalizeStatus(value: unknown): "SENT" | "DELIVERED" | "READ" | "FAILED" | null {
  const status = String(value ?? "").toUpperCase();
  return ["SENT", "DELIVERED", "READ", "FAILED"].includes(status) ? status as "SENT" | "DELIVERED" | "READ" | "FAILED" : null;
}

function epochToIso(value: unknown, milliseconds = false) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? new Date(milliseconds ? number : number * 1000).toISOString() : new Date().toISOString();
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
