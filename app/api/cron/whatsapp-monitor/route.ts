import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendStoredWhatsApp } from "@/lib/services/whatsapp";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = new URL(request.url).searchParams.get("secret") || request.headers.get("x-cron-secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: setting } = await supabase.from("platform_settings").select("value").eq("key", "whatsapp_destination_number").maybeSingle();
  const destination = setting?.value || process.env.WHATSAPP_DESTINATION_NUMBER;
  if (!destination) {
    return NextResponse.json({ status: "skipped", reason: "No WhatsApp alert destination configured." });
  }

  const { data, error } = await supabase
    .from("inbound_whatsapp_messages")
    .select("id, from_number, profile_name, body, status, error_message, created_at, alert_sent_at")
    .in("status", ["FAILED", "NEEDS_REVIEW"])
    .is("alert_sent_at", null)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    return NextResponse.json({
      status: "needs_migration",
      reason: "Apply migration 021 so inbound alerts can be tracked.",
      detail: error.message
    }, { status: 200 });
  }

  const items = data ?? [];
  if (!items.length) return NextResponse.json({ status: "ok", alerted: 0 });

  const message = [
    "Night Concierge inbound WhatsApp needs review",
    "",
    ...items.map((item) => [
      `${item.status} · ${item.profile_name || item.from_number}`,
      item.body.slice(0, 180),
      item.error_message ? `Reason: ${item.error_message.slice(0, 160)}` : ""
    ].filter(Boolean).join("\n"))
  ].join("\n\n");

  const result = await sendStoredWhatsApp({ to: destination, body: message });
  if (!result.ok) {
    return NextResponse.json({ status: "failed", error: result.error }, { status: 200 });
  }

  await supabase
    .from("inbound_whatsapp_messages")
    .update({ alert_sent_at: new Date().toISOString() })
    .in("id", items.map((item) => item.id));

  return NextResponse.json({ status: "ok", alerted: items.length });
}
