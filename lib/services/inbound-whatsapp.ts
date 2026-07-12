import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseWhatsAppLead } from "@/lib/sales/funnel";
import type { Club, Profile } from "@/lib/types";

export type TwilioInboundWhatsAppPayload = {
  MessageSid?: string;
  SmsMessageSid?: string;
  From?: string;
  To?: string;
  Body?: string;
  ProfileName?: string;
};

type StaffProfile = Pick<Profile, "id" | "name" | "phone" | "role" | "manager_id">;

export async function handleInboundWhatsApp(payload: TwilioInboundWhatsAppPayload) {
  const supabase = createAdminClient();
  const body = payload.Body?.trim() ?? "";
  const from = normalizeWhatsAppAddress(payload.From);
  const to = normalizeWhatsAppAddress(payload.To);
  const providerMessageId = payload.MessageSid ?? payload.SmsMessageSid ?? null;

  if (!body || !from) {
    return { ok: false, reply: "Please send the booking details in one message." };
  }

  const existing = providerMessageId
    ? await supabase.from("inbound_whatsapp_messages").select("id, created_request_id").eq("provider_message_id", providerMessageId).maybeSingle()
    : { data: null };
  if (existing.data?.created_request_id) {
    return { ok: true, reply: "Already added to Night Concierge." };
  }

  const [{ data: clubsData }, staff] = await Promise.all([
    supabase.from("clubs").select("id, name, slug, city, address, image_url, active, brand_config, service_config").eq("active", true),
    findStaffByPhone(supabase, from)
  ]);
  const clubs = (clubsData ?? []) as Club[];
  const draft = parseWhatsAppLead(body, clubs);
  const selectedClub = clubs.find((club) => club.id === draft.clubId) ?? clubs[0];
  const clientPhone = staff ? extractClientPhone(body) : from.replace(/^whatsapp:/, "");
  const clientName = extractClientName(body) || payload.ProfileName || (staff ? "" : "WhatsApp Guest");
  const missing = [
    !selectedClub ? "venue" : null,
    !clientName ? "client name" : null,
    !clientPhone ? "client WhatsApp" : null
  ].filter(Boolean);

  const inboundId = await insertInboundMessage(supabase, {
    providerMessageId,
    from,
    to,
    body,
    profileName: payload.ProfileName ?? null,
    sourceProfileId: staff?.id ?? null,
    parseResult: { ...draft, clientName, clientPhone, senderRole: staff?.role ?? "CLIENT_OR_UNKNOWN" },
    status: missing.length ? "NEEDS_REVIEW" : "RECEIVED"
  });

  if (missing.length || !selectedClub) {
    return {
      ok: false,
      reply: `I can add this, but I need: ${missing.join(", ")}. Send for example: "Olivia +4670... table Mamzel tomorrow 6 guests 23:30 budget 1500".`
    };
  }

  try {
    const clientId = await upsertClient(supabase, {
      name: clientName,
      phone: clientPhone,
      createdBy: staff?.id ?? null
    });
    const managerId = staff?.role === "PROMOTER_MANAGER" ? staff.id : staff?.manager_id ?? await resolveDefaultManagerForClub(supabase, selectedClub.id);
    const promoterId = staff?.role === "PROMOTER" ? staff.id : null;
    const internalSummary = [
      "Created from inbound WhatsApp.",
      staff ? `Sender: ${staff.name ?? staff.phone ?? "Staff"}` : "Sender: client/direct WhatsApp",
      `Original message:\n${body}`
    ].join("\n\n");

    const { data: request, error } = await supabase
      .from("requests")
      .insert({
        client_id: clientId,
        club_id: selectedClub.id,
        promoter_id: promoterId,
        assigned_manager_id: managerId,
        source: staff ? "MANUAL_ENTRY" : "PUBLIC_FORM",
        request_type: draft.requestType,
        status: "NEW",
        requested_date: draft.requestedDate,
        arrival_time: draft.arrivalTime || null,
        guest_count: draft.guestCount,
        budget: draft.budget || null,
        message: body,
        internal_summary: internalSummary
      })
      .select("id")
      .single();
    if (error || !request) throw new Error(error?.message ?? "Could not create request.");

    await supabase
      .from("inbound_whatsapp_messages")
      .update({ status: "CREATED", matched_client_id: clientId, created_request_id: request.id })
      .eq("id", inboundId);
    await supabase.from("audit_logs").insert({
      user_id: staff?.id ?? null,
      action: "INBOUND_WHATSAPP_REQUEST_CREATED",
      entity_type: "requests",
      entity_id: request.id,
      metadata: { inboundId, providerMessageId, sender: from }
    });

    return {
      ok: true,
      requestId: request.id,
      reply: `Added to Night Concierge: ${clientName} · ${selectedClub.name} · ${draft.requestedDate} · ${draft.guestCount} guests.`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await supabase.from("inbound_whatsapp_messages").update({ status: "FAILED", error_message: message }).eq("id", inboundId);
    return { ok: false, reply: "I could not add this automatically. Please check Night Concierge.", error: message };
  }
}

async function findStaffByPhone(supabase: SupabaseClient, from: string): Promise<StaffProfile | null> {
  const digits = onlyDigits(from);
  const { data } = await supabase
    .from("profiles")
    .select("id, name, phone, role, manager_id")
    .in("role", ["SUPER_ADMIN", "PROMOTER_MANAGER", "PROMOTER"])
    .eq("active", true)
    .not("phone", "is", null);
  return ((data ?? []) as StaffProfile[]).find((profile) => onlyDigits(profile.phone ?? "") === digits) ?? null;
}

async function insertInboundMessage(
  supabase: SupabaseClient,
  input: {
    providerMessageId: string | null;
    from: string;
    to: string;
    body: string;
    profileName: string | null;
    sourceProfileId: string | null;
    parseResult: Record<string, unknown>;
    status: "RECEIVED" | "NEEDS_REVIEW";
  }
) {
  const { data, error } = await supabase
    .from("inbound_whatsapp_messages")
    .upsert({
      provider_message_id: input.providerMessageId,
      from_number: input.from,
      to_number: input.to || null,
      profile_name: input.profileName,
      body: input.body,
      source_profile_id: input.sourceProfileId,
      status: input.status,
      parse_result: input.parseResult
    }, { onConflict: "provider_message_id" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not store inbound WhatsApp message.");
  return data.id as string;
}

async function upsertClient(supabase: SupabaseClient, input: { name: string; phone: string; createdBy: string | null }) {
  const phone = normalizePhone(input.phone);
  const { data: existing } = await supabase.from("clients").select("id, status").eq("phone", phone).maybeSingle();
  if (existing?.id) {
    if (existing.status !== "BLOCKED") await supabase.from("clients").update({ name: input.name }).eq("id", existing.id);
    return existing.id as string;
  }
  const { data, error } = await supabase
    .from("clients")
    .insert({ name: input.name, phone, created_by_user_id: input.createdBy })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create client.");
  return data.id as string;
}

async function resolveDefaultManagerForClub(supabase: SupabaseClient, clubId: string) {
  const { data } = await supabase
    .from("club_users")
    .select("user_id, profiles!inner(role)")
    .eq("club_id", clubId)
    .eq("profiles.role", "PROMOTER_MANAGER")
    .limit(1)
    .maybeSingle();
  return data?.user_id ?? null;
}

function normalizeWhatsAppAddress(value?: string | null) {
  return value?.trim() ?? "";
}

function extractClientPhone(body: string) {
  const match = body.match(/(\+?\d[\d\s().-]{6,}\d)/);
  return match?.[1]?.trim() ?? "";
}

function extractClientName(body: string) {
  const explicit = body.match(/(?:name|client|guest|nombre|namn)\s*[:\-]\s*([A-Za-zÀ-ÿ .'’-]{2,60})/i)?.[1];
  if (explicit) return explicit.trim();
  const beforePhone = body.match(/^([A-Za-zÀ-ÿ .'’-]{2,40})\s+\+?\d/);
  if (beforePhone) return beforePhone[1].trim();
  return "";
}

function normalizePhone(phone: string) {
  const digits = onlyDigits(phone);
  return phone.trim().startsWith("+") ? `+${digits}` : digits;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
