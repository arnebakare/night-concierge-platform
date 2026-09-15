export type MessagingChannel = "WHATSAPP" | "INSTAGRAM";
export type MessageDeliveryStatus = "RECEIVED" | "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";

export type NormalizedInboundMessage = {
  kind: "message";
  channel: MessagingChannel;
  externalAccountId: string;
  externalUserId: string;
  externalMessageId: string;
  externalThreadId?: string | null;
  displayName?: string | null;
  username?: string | null;
  phone?: string | null;
  messageType: string;
  body?: string | null;
  timestamp: string;
  attachments: Array<{
    type: string;
    externalMediaId?: string | null;
    sourceUrl?: string | null;
    mimeType?: string | null;
    filename?: string | null;
    metadata?: Record<string, unknown>;
  }>;
  raw: Record<string, unknown>;
};

export type NormalizedStatusUpdate = {
  kind: "status";
  channel: MessagingChannel;
  externalMessageId: string;
  status: Exclude<MessageDeliveryStatus, "RECEIVED" | "PENDING">;
  timestamp: string;
  error?: string | null;
  raw: Record<string, unknown>;
};

export type NormalizedMetaEvent = NormalizedInboundMessage | NormalizedStatusUpdate;

