import type { SupabaseClient } from "@supabase/supabase-js";
import { getMetaConfigStatus, sendMetaText } from "@/lib/messaging/meta";

type WhatsAppPayload = {
  requestId: string; clubName: string; requestedDate: string; requestType: string;
  clientName: string; phone: string; guestCount: number; promoterName?: string | null; source: string;
};

export async function sendRequestWhatsApp(supabase: SupabaseClient, payload: WhatsAppPayload) {
  const destination = await getDestination(supabase);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const message = `New VIP Request\n\nClub: ${payload.clubName}\nDate: ${payload.requestedDate}\nType: ${payload.requestType}\nClient: ${payload.clientName}\nPhone: ${payload.phone}\nGuests: ${payload.guestCount}\nPromoter: ${payload.promoterName || "none"}\nSource: ${payload.source}\n\nOpen request:\n${appUrl}/manager/requests?request=${payload.requestId}`;
  const result = destination ? await sendStoredWhatsApp({ to: destination, body: message }) : { ok: false as const, error: "WhatsApp destination is not configured." };
  await supabase.from("whatsapp_notifications").insert({
    request_id: payload.requestId, destination_number: destination ?? "", message, provider: "meta",
    provider_message_id: result.ok ? result.sid : null, status: result.ok ? "SENT" : "FAILED", error_message: result.ok ? null : result.error
  });
  return { ok: result.ok };
}

export async function sendStoredWhatsApp(input: { to: string; body: string }) {
  const accountId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accountId) return { ok: false as const, error: "META_WHATSAPP_PHONE_NUMBER_ID is not configured." };
  try {
    const result = await sendMetaText({ channel: "WHATSAPP", recipientId: normalizeRecipient(input.to), accountId, body: input.body });
    return { ok: true as const, sid: result.messageId };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Meta WhatsApp delivery failed." };
  }
}

export function getWhatsAppConfigStatus(destination?: string | null) {
  const meta = getMetaConfigStatus();
  const normalizedDestination = destination ? normalizeRecipient(destination) : "";
  return {
    ready: meta.whatsappReady && Boolean(normalizedDestination),
    issue: !meta.whatsappToken ? "Meta WhatsApp access token is missing." : !meta.phoneNumberId ? "Meta WhatsApp Phone Number ID is missing." : !normalizedDestination ? "WhatsApp destination is missing." : null,
    accessTokenConfigured: meta.whatsappToken,
    phoneNumberIdConfigured: meta.phoneNumberId,
    from: meta.phoneNumberId ? "Meta Cloud API" : "",
    destination: maskPhone(normalizedDestination),
    fromConfigured: meta.phoneNumberId,
    destinationConfigured: Boolean(normalizedDestination)
  };
}

async function getDestination(supabase: SupabaseClient) {
  if (process.env.WHATSAPP_DESTINATION_NUMBER) return process.env.WHATSAPP_DESTINATION_NUMBER;
  const { data } = await supabase.from("platform_settings").select("value").eq("key", "whatsapp_destination_number").maybeSingle();
  return data?.value ?? null;
}

function normalizeRecipient(value: string) { return value.replace(/^whatsapp:/i, "").replace(/\D/g, ""); }
function maskPhone(value: string) { return value.length > 4 ? `${value.slice(0, 2)}••••••${value.slice(-2)}` : value; }
