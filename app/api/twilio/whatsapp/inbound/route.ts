import { NextResponse } from "next/server";
import twilio from "twilio";
import { handleInboundWhatsApp } from "@/lib/services/inbound-whatsapp";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_000) return twiml("Message is too large. Please send the booking details in a shorter message.", 413);

  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  if (!isValidTwilioRequest(request, params)) {
    return twiml("Webhook signature could not be verified.", 403);
  }

  const result = await handleInboundWhatsApp(params);
  return twiml(result.reply, result.ok ? 200 : 202);
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
