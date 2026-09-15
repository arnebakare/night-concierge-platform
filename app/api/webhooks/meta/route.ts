import { NextResponse } from "next/server";
import { ingestMetaEvents } from "@/lib/messaging/ingest";
import { verifyMetaChallenge, verifyMetaSignature } from "@/lib/messaging/meta";
import { normalizeMetaWebhook } from "@/lib/messaging/normalize";

export const runtime = "nodejs";

export function GET(request: Request) {
  const challenge = verifyMetaChallenge(new URL(request.url).searchParams);
  return challenge
    ? new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } })
    : NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid Meta signature." }, { status: 403 });
  }
  if (rawBody.length > 1_000_000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const events = normalizeMetaWebhook(payload);
  try {
    await ingestMetaEvents(events);
    return NextResponse.json({ received: true, events: events.length });
  } catch (error) {
    console.error("Meta webhook ingestion failed", error);
    return NextResponse.json({ error: "Webhook ingestion failed." }, { status: 500 });
  }
}
