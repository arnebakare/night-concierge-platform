import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { verifyMetaChallenge, verifyMetaSignature } from "./meta";
import { normalizeMetaWebhook } from "./normalize";

afterEach(() => {
  delete process.env.META_APP_SECRET;
  delete process.env.META_WEBHOOK_VERIFY_TOKEN;
});

describe("Meta webhook security", () => {
  it("accepts only the matching SHA-256 signature", () => {
    process.env.META_APP_SECRET = "test-secret";
    const body = JSON.stringify({ object: "test" });
    const signature = `sha256=${createHmac("sha256", "test-secret").update(body).digest("hex")}`;
    expect(verifyMetaSignature(body, signature)).toBe(true);
    expect(verifyMetaSignature(`${body}x`, signature)).toBe(false);
  });

  it("returns a challenge only for the configured token", () => {
    process.env.META_WEBHOOK_VERIFY_TOKEN = "verify-me";
    expect(verifyMetaChallenge(new URLSearchParams("hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=123"))).toBe("123");
    expect(verifyMetaChallenge(new URLSearchParams("hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123"))).toBeNull();
  });
});

describe("Meta webhook normalization", () => {
  it("normalizes WhatsApp text, media, and status events", () => {
    const events = normalizeMetaWebhook({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ value: {
        metadata: { phone_number_id: "phone-1" },
        contacts: [{ wa_id: "34600111222", profile: { name: "Sophie" } }],
        messages: [
          { id: "wamid.text", from: "34600111222", timestamp: "1789494000", type: "text", text: { body: "A table for six" } },
          { id: "wamid.image", from: "34600111222", timestamp: "1789494001", type: "image", image: { id: "media-1", mime_type: "image/jpeg", caption: "This view" } }
        ],
        statuses: [{ id: "wamid.out", status: "delivered", timestamp: "1789494002" }]
      } }] }]
    });
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ kind: "message", channel: "WHATSAPP", externalAccountId: "phone-1", externalUserId: "34600111222", body: "A table for six", displayName: "Sophie" });
    expect(events[1]).toMatchObject({ kind: "message", messageType: "IMAGE", body: "This view", attachments: [{ externalMediaId: "media-1" }] });
    expect(events[2]).toMatchObject({ kind: "status", status: "DELIVERED", externalMessageId: "wamid.out" });
  });

  it("normalizes Instagram messages and ignores echoes", () => {
    const events = normalizeMetaWebhook({
      object: "instagram",
      entry: [{ messaging: [
        { timestamp: 1789494000000, sender: { id: "ig-user" }, recipient: { id: "ig-account" }, message: { mid: "ig-mid", text: "Ocean Club?" } },
        { timestamp: 1789494000001, sender: { id: "ig-account" }, recipient: { id: "ig-user" }, message: { mid: "echo", text: "Reply", is_echo: true } }
      ] }]
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "message", channel: "INSTAGRAM", externalUserId: "ig-user", externalAccountId: "ig-account", externalThreadId: "ig-account:ig-user", body: "Ocean Club?" });
  });
});
