import twilio from "twilio";
import type { SupabaseClient } from "@supabase/supabase-js";

type WhatsAppPayload = {
  requestId: string;
  clubName: string;
  requestedDate: string;
  requestType: string;
  clientName: string;
  phone: string;
  guestCount: number;
  promoterName?: string | null;
  source: string;
};

export async function sendRequestWhatsApp(supabase: SupabaseClient, payload: WhatsAppPayload) {
  const destination = await getDestination(supabase);
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const message = `New VIP Request

Club: ${payload.clubName}
Date: ${payload.requestedDate}
Type: ${payload.requestType}
Client: ${payload.clientName}
Phone: ${payload.phone}
Guests: ${payload.guestCount}
Promoter: ${payload.promoterName || "none"}
Source: ${payload.source}

Open request:
${appUrl}/manager/requests?request=${payload.requestId}`;

  const baseRecord = {
    request_id: payload.requestId,
    destination_number: destination ?? "",
    message,
    provider: "twilio"
  };

  if (!destination || !from || !sid || !token) {
    await supabase.from("whatsapp_notifications").insert({
      ...baseRecord,
      status: "FAILED",
      error_message: "WhatsApp environment variables or destination number are missing."
    });
    return { ok: false };
  }

  try {
    const client = twilio(sid, token);
    const result = await client.messages.create({ from, to: destination, body: message });
    await supabase.from("whatsapp_notifications").insert({
      ...baseRecord,
      provider_message_id: result.sid,
      status: "SENT"
    });
    return { ok: true };
  } catch (error) {
    await supabase.from("whatsapp_notifications").insert({
      ...baseRecord,
      status: "FAILED",
      error_message: error instanceof Error ? error.message : "Unknown Twilio error"
    });
    return { ok: false };
  }
}

async function getDestination(supabase: SupabaseClient) {
  if (process.env.WHATSAPP_DESTINATION_NUMBER) return process.env.WHATSAPP_DESTINATION_NUMBER;
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "whatsapp_destination_number")
    .maybeSingle();
  return data?.value ?? null;
}

export async function sendStoredWhatsApp(input: { to: string; body: string }) {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!from || !sid || !token) return { ok: false as const, error: "Twilio credentials are not configured." };
  try {
    const result = await twilio(sid, token).messages.create({ from, to: input.to, body: input.body });
    return { ok: true as const, sid: result.sid };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Unknown Twilio error" };
  }
}
