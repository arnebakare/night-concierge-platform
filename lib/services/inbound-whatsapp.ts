import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseWhatsAppLead } from "@/lib/sales/funnel";
import { generateSchedulePlan, type SpendProfile } from "@/lib/services/ai-schedule";
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
    ? await supabase.from("inbound_whatsapp_messages").select("id, created_request_id, created_schedule_plan_id").eq("provider_message_id", providerMessageId).maybeSingle()
    : { data: null };
  if (existing.data?.created_schedule_plan_id) {
    return { ok: true, reply: "Schedule already created in Night Concierge." };
  }
  if (existing.data?.created_request_id) {
    return { ok: true, reply: "Already added to Night Concierge." };
  }

  const [{ data: clubsData }, staff] = await Promise.all([
    supabase.from("clubs").select("id, name, slug, city, address, image_url, active, brand_config, service_config").eq("active", true),
    findStaffByPhone(supabase, from)
  ]);
  const clubs = (clubsData ?? []) as Club[];
  if (isScheduleCommand(body)) {
    return createScheduleFromWhatsApp(supabase, {
      body,
      from,
      to,
      providerMessageId,
      profileName: payload.ProfileName ?? null,
      staff
    });
  }

  const draft = parseWhatsAppLead(body, clubs);
  const selectedClub = clubs.find((club) => club.id === draft.clubId) ?? clubs[0];
  const clientPhone = staff ? extractClientPhone(body) : from.replace(/^whatsapp:/, "");
  const clientName = extractClientName(body) || (!staff ? payload.ProfileName : "") || "Unknown guest";
  const fallbackPhone = clientPhone || fallbackLeadPhone(providerMessageId, from);
  const missing = [
    !selectedClub ? "venue" : null
  ].filter(Boolean);

  const inboundId = await insertInboundMessage(supabase, {
    providerMessageId,
    from,
    to,
    body,
    profileName: payload.ProfileName ?? null,
    sourceProfileId: staff?.id ?? null,
    parseResult: { ...draft, clientName, clientPhone: clientPhone || null, senderRole: staff?.role ?? "CLIENT_OR_UNKNOWN" },
    status: missing.length ? "NEEDS_REVIEW" : "RECEIVED"
  });

  if (missing.length || !selectedClub) {
    return {
      ok: false,
      reply: `I can add this, but I need: ${missing.join(", ")}. Example: "table Mamzel tomorrow 6 guests 23:30 budget 1500".`
    };
  }

  try {
    const clientId = await upsertClient(supabase, {
      name: clientName,
      phone: fallbackPhone,
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
      reply: `Added: ${clientName} · ${selectedClub.name} · ${draft.requestedDate} · ${draft.guestCount} guests.`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await supabase.from("inbound_whatsapp_messages").update({ status: "FAILED", error_message: message }).eq("id", inboundId);
    return { ok: false, reply: "I could not add this automatically. Please check Night Concierge.", error: message };
  }
}

async function createScheduleFromWhatsApp(
  supabase: SupabaseClient,
  input: {
    body: string;
    from: string;
    to: string;
    providerMessageId: string | null;
    profileName: string | null;
    staff: StaffProfile | null;
  }
) {
  const parsed = parseScheduleCommand(input.body);
  const inboundId = await insertInboundMessage(supabase, {
    providerMessageId: input.providerMessageId,
    from: input.from,
    to: input.to,
    body: input.body,
    profileName: input.profileName,
    sourceProfileId: input.staff?.id ?? null,
    parseResult: { command: "schedule", ...parsed },
    status: parsed ? "RECEIVED" : "NEEDS_REVIEW"
  });

  if (!parsed) {
    return {
      ok: false,
      reply: 'Send like: "schedule 4-8 aug high spend" or "schedule 2026-08-04 to 2026-08-08 normal".'
    };
  }

  const generated = await generateSchedulePlan({
    dateFrom: parsed.from,
    dateTo: parsed.to,
    spendProfile: parsed.spendProfile,
    city: "Marbella",
    clientContext: "Generated from WhatsApp command."
  });

  const { data, error } = await supabase
    .from("schedule_plans")
    .insert({
      user_id: input.staff?.id ?? null,
      title: generated.title,
      city: "Marbella",
      date_from: parsed.from,
      date_to: parsed.to,
      spend_profile: parsed.spendProfile,
      prompt_text: input.body,
      message: generated.whatsappMessage,
      plan: generated,
      source: "WHATSAPP"
    })
    .select("id")
    .single();
  if (error || !data) {
    await supabase.from("inbound_whatsapp_messages").update({ status: "FAILED", error_message: error?.message ?? "Could not save schedule." }).eq("id", inboundId);
    return { ok: false, reply: "I could not create the schedule. Please check Night Concierge." };
  }

  await supabase
    .from("inbound_whatsapp_messages")
    .update({ status: "CREATED", created_schedule_plan_id: data.id })
    .eq("id", inboundId);
  await supabase.from("audit_logs").insert({
    user_id: input.staff?.id ?? null,
    action: "SCHEDULE_PLAN_CREATED_FROM_WHATSAPP",
    entity_type: "schedule_plans",
    entity_id: data.id,
    metadata: { from: parsed.from, to: parsed.to, spendProfile: parsed.spendProfile }
  });

  return { ok: true, reply: formatScheduleReply(generated.whatsappMessage, data.id) };
}

function formatScheduleReply(message: string, planId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const link = appUrl ? `${appUrl}/schedule/plans/${planId}` : "";
  return [
    message,
    link ? `Saved in Night Concierge: ${link}` : "Saved in Night Concierge."
  ].join("\n\n");
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

function isScheduleCommand(body: string) {
  return /^\s*(schedule|plan|trail)\b/i.test(body);
}

function parseScheduleCommand(body: string): { from: string; to: string; spendProfile: SpendProfile } | null {
  const lower = body.toLowerCase();
  const spendProfile: SpendProfile = /high\s*spend|vip|premium|high/i.test(lower) ? "HIGH_SPEND" : "NORMAL";
  const isoRange = lower.match(/\b(20\d{2}-\d{2}-\d{2})\s*(?:to|-|until)\s*(20\d{2}-\d{2}-\d{2})\b/);
  if (isoRange) return normalizeRange(isoRange[1], isoRange[2], spendProfile);

  const monthRange = lower.match(/\b(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s+([a-zåäöáéíóúñ]+)\b/i);
  if (monthRange) {
    const month = monthNumber(monthRange[3]);
    if (!month) return null;
    const year = inferYear(month);
    const from = toDateString(year, month, Number(monthRange[1]));
    const to = toDateString(year, month, Number(monthRange[2] ?? monthRange[1]));
    return normalizeRange(from, to, spendProfile);
  }

  return null;
}

function normalizeRange(from: string, to: string, spendProfile: SpendProfile) {
  return from <= to ? { from, to, spendProfile } : { from: to, to: from, spendProfile };
}

function monthNumber(value: string) {
  const months = [
    ["jan", "january", "enero", "januari"],
    ["feb", "february", "febrero", "februari"],
    ["mar", "march", "marzo", "mars"],
    ["apr", "april", "abril"],
    ["may", "mayo", "maj"],
    ["jun", "june", "junio", "juni"],
    ["jul", "july", "julio", "juli"],
    ["aug", "august", "agosto", "augusti"],
    ["sep", "sept", "september", "septiembre"],
    ["oct", "october", "octubre", "oktober"],
    ["nov", "november", "noviembre"],
    ["dec", "december", "diciembre"]
  ];
  const index = months.findIndex((names) => names.includes(value.toLowerCase()));
  return index === -1 ? null : index + 1;
}

function inferYear(month: number) {
  const now = new Date();
  const year = now.getFullYear();
  return month < now.getMonth() + 1 ? year + 1 : year;
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
  if (phone.startsWith("lead-")) return phone;
  const digits = onlyDigits(phone);
  return phone.trim().startsWith("+") ? `+${digits}` : digits;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function fallbackLeadPhone(providerMessageId: string | null, from: string) {
  const sid = providerMessageId ? onlyDigits(providerMessageId).slice(-10) : "";
  return `lead-${sid || onlyDigits(from).slice(-10) || Date.now()}`;
}
