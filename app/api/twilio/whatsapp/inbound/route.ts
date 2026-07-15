import { after, NextResponse } from "next/server";
import twilio from "twilio";
import { handleInboundWhatsApp } from "@/lib/services/inbound-whatsapp";
import { sendStoredWhatsApp } from "@/lib/services/whatsapp";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_000) return twiml("Message is too large. Please send the booking details in a shorter message.", 413);

  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  if (!isValidTwilioRequest(request, params)) {
    return twiml("Webhook signature could not be verified.", 403);
  }

  if (isScheduleCommand(params.Body)) {
    after(async () => {
      const result = await handleInboundWhatsApp(params);
      const to = params.From;
      if (!to || !result.reply) return;
      const sent = await sendStoredWhatsApp({ to, body: result.reply });
      if (!sent.ok) console.error("Could not send inbound schedule reply", sent.error);
    });
    return twiml("I am building the Marbella schedule now and will send it here in a moment.");
  }

  const result = await handleInboundWhatsApp(params);
  return twiml(result.reply, result.ok ? 200 : 202);
}

function isScheduleCommand(body?: string | null) {
  return /^\s*(schedule|plan|trail)\b/i.test(body ?? "");
}

function isValidTwilioRequest(request: Request, params: Record<string, string>) {
  if (process.env.TWILIO_VALIDATE_WEBHOOKS === "false") return true;
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!authToken) return true;

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return false;

  const requestUrl = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const publicUrl = appUrl ? `${appUrl.replace(/\/$/, "")}${requestUrl.pathname}${requestUrl.search}` : request.url;

  return (
    twilio.validateRequest(authToken, signature, request.url, params) ||
    twilio.validateRequest(authToken, signature, publicUrl, params)
  );
}

function twiml(message: string, status = 200) {
  const body = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" }
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
