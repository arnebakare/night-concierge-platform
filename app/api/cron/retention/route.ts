import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendStoredWhatsApp } from "@/lib/services/whatsapp";
import { sendStoredEmail } from "@/lib/services/email";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const dormantDays = Number.parseInt(url.searchParams.get("days") ?? process.env.RETENTION_DAYS ?? "45", 10);
  const cooldownDays = Number.parseInt(url.searchParams.get("cooldown") ?? process.env.RETENTION_COOLDOWN_DAYS ?? "30", 10);
  const channels = (process.env.RETENTION_CHANNELS ?? "WHATSAPP").split(",").map((item) => item.trim().toUpperCase()).filter(Boolean);
  const now = new Date();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, phone, email, status, requests(requested_date, created_at), retention_outreach(created_at)")
    .neq("status", "BLOCKED")
    .limit(200);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  const candidates = (data ?? []).filter((client) => {
    const lastBooking = latestDate((client.requests ?? []).map((item) => item.requested_date ?? item.created_at?.slice(0, 10) ?? null));
    const lastOutreach = latestDateTime((client.retention_outreach ?? []).map((item) => item.created_at ?? null));
    const dormantEnough = !lastBooking || daysBetween(new Date(`${lastBooking}T12:00:00`), now) >= dormantDays;
    const cooledDown = !lastOutreach || daysBetween(new Date(lastOutreach), now) >= cooldownDays;
    return dormantEnough && cooledDown;
  }).slice(0, 20);

  for (const client of candidates) {
    const message = buildRetentionMessage(client.name);
    const attempts = [];
    if (channels.includes("WHATSAPP") && client.phone) {
      attempts.push({ channel: "WHATSAPP" as const, destination: client.phone, result: await sendStoredWhatsApp({ to: client.phone, body: message }) });
    }
    if (channels.includes("EMAIL") && client.email) {
      attempts.push({ channel: "EMAIL" as const, destination: client.email, result: await sendStoredEmail({ to: client.email, subject: "A note from your Marbella concierge", body: message }) });
    }
    if (!attempts.length) {
      skipped += 1;
      continue;
    }
    for (const attempt of attempts) {
      await supabase.from("retention_outreach").insert({
        client_id: client.id,
        user_id: null,
        channel: attempt.channel,
        destination: attempt.destination,
        message,
        status: attempt.result.ok ? "SENT" : "FAILED",
        provider: attempt.channel === "WHATSAPP" ? "twilio" : "resend",
        provider_message_id: attempt.result.ok ? ("sid" in attempt.result ? attempt.result.sid : attempt.result.id) ?? null : null,
        error_message: attempt.result.ok ? null : attempt.result.error,
        automatic: true
      });
      if (attempt.result.ok) sent += 1;
    }
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, sent, skipped });
}

function latestDate(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value)).sort().reverse()[0] ?? null;
}

function latestDateTime(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value)).sort().reverse()[0] ?? null;
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

function buildRetentionMessage(name: string) {
  const firstName = name.split(" ").filter(Boolean)[0] || name;
  return `Hi ${firstName}, we would love to host you again in Marbella. If you are planning a night out, a table, guestlist, or something more private, message us here and we will arrange it personally.`;
}
