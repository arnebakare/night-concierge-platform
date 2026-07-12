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
  const config = getWhatsAppConfig(destination);
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
    destination_number: config.destination ?? "",
    message,
    provider: "twilio"
  };

  if (!config.ready) {
    await supabase.from("whatsapp_notifications").insert({
      ...baseRecord,
      status: "FAILED",
      error_message: config.issue
    });
    return { ok: false };
  }

  try {
    const client = twilio(config.sid, config.token);
    const result = await client.messages.create({ from: config.from, to: config.destination, body: message });
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
      error_message: getTwilioErrorMessage(error)
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
  const config = getWhatsAppConfig(input.to);
  if (!config.ready) return { ok: false as const, error: config.issue };
  try {
    const result = await twilio(config.sid, config.token).messages.create({ from: config.from, to: config.destination, body: input.body });
    return { ok: true as const, sid: result.sid };
  } catch (error) {
    return { ok: false as const, error: getTwilioErrorMessage(error) };
  }
}

export function getWhatsAppConfigStatus(destination?: string | null) {
  const config = getWhatsAppConfig(destination ?? process.env.WHATSAPP_DESTINATION_NUMBER ?? null);
  return {
    ready: config.ready,
    issue: config.ready ? null : config.issue,
    accountSidConfigured: Boolean(cleanEnv(process.env.TWILIO_ACCOUNT_SID)),
    authTokenConfigured: Boolean(cleanEnv(process.env.TWILIO_AUTH_TOKEN)),
    from: maskPhone(config.from),
    destination: maskPhone(config.destination),
    fromConfigured: Boolean(config.from),
    destinationConfigured: Boolean(config.destination)
  };
}

function getWhatsAppConfig(destination?: string | null) {
  const sid = cleanEnv(process.env.TWILIO_ACCOUNT_SID);
  const token = cleanEnv(process.env.TWILIO_AUTH_TOKEN);
  const from = normalizeWhatsAppNumber(cleanEnv(process.env.TWILIO_WHATSAPP_FROM));
  const to = normalizeWhatsAppNumber(destination);

  if (!sid || !token || !from || !to) {
    return {
      ready: false as const,
      issue: "Twilio WhatsApp is not fully configured. Check Account SID, Auth Token, WhatsApp sender, and destination number.",
      sid,
      token,
      from,
      destination: to
    };
  }

  if (!sid.startsWith("AC")) {
    return {
      ready: false as const,
      issue: "TWILIO_ACCOUNT_SID must be the Account SID that starts with AC, not an API key SID.",
      sid,
      token,
      from,
      destination: to
    };
  }

  return { ready: true as const, sid, token, from, destination: to };
}

function cleanEnv(value?: string | null) {
  return value?.trim().replace(/^["']|["']$/g, "") || "";
}

function normalizeWhatsAppNumber(value?: string | null) {
  const cleaned = cleanEnv(value);
  if (!cleaned) return "";
  return cleaned.startsWith("whatsapp:") ? cleaned : `whatsapp:${cleaned}`;
}

function maskPhone(value?: string | null) {
  if (!value) return "";
  return value.replace(/(\+\d{2})\d+(\d{2})$/, "$1••••••$2");
}

function getTwilioErrorMessage(error: unknown) {
  const details = typeof error === "object" && error ? error as { message?: unknown; code?: unknown; status?: unknown; moreInfo?: unknown } : null;
  const message = typeof details?.message === "string" ? details.message : error instanceof Error ? error.message : "Unknown Twilio error";
  const code = typeof details?.code === "number" || typeof details?.code === "string" ? String(details.code) : "";
  const status = typeof details?.status === "number" || typeof details?.status === "string" ? String(details.status) : "";

  if (code === "20003" || /authenticate/i.test(message)) {
    return "Twilio authentication failed. In Vercel, check TWILIO_ACCOUNT_SID starts with AC and TWILIO_AUTH_TOKEN is the matching Auth Token from the same Twilio account.";
  }

  return [message, code ? `Code: ${code}` : "", status ? `Status: ${status}` : ""].filter(Boolean).join(" ");
}
