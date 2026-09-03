"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { publicRequestSchema, manualRequestSchema, type PublicRequestInput } from "@/lib/validation/request";
import { sendRequestWhatsApp } from "@/lib/services/whatsapp";
import { writeAuditLog } from "@/lib/services/audit";
import { hasSupabaseServiceEnv, isDemoAuthEnabled } from "@/lib/env";
import { customerCodeFromPhone, normalizePhoneNumber } from "@/lib/concierge/phone";
import { createHash } from "crypto";

export type RequestActionState = {
  ok: boolean;
  message?: string;
  requestId?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function submitPublicRequest(input: PublicRequestInput): Promise<RequestActionState> {
  const parsed = publicRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  if (!hasSupabaseServiceEnv()) {
    return {
      ok: true,
      requestId: "demo-request",
      message: "Demo submission accepted. Add SUPABASE_SERVICE_ROLE_KEY to persist real requests."
    };
  }

  const supabase = createAdminClient();
  const data = parsed.data;
  const normalizedPhone = normalizePhone(data.phone);
  const requestMessage = withRequestContext(data.message || "", {
    serviceLabel: data.serviceLabel,
    occasionName: data.occasionName,
    occasionDate: data.occasionDate,
    requestedDateEnd: data.requestedDateEnd,
    preferredArea: data.preferredArea,
    occasion: data.occasion,
    boatStyle: data.boatStyle,
    teeTimePreference: data.teeTimePreference,
    bedrooms: data.bedrooms,
    pickupLocation: data.pickupLocation,
    dropoffLocation: data.dropoffLocation,
    packageStyle: data.packageStyle
  });
  const fingerprint = createHash("sha256").update(normalizedPhone).digest("hex");
  const { data: allowed, error: rateError } = await supabase.rpc("consume_public_request_slot", { p_fingerprint: fingerprint, p_limit: 5, p_window_minutes: 10 });
  if (rateError) return { ok: false, message: "Request protection is not configured. Apply the latest database migrations." };
  if (!allowed) return { ok: false, message: "Too many requests were submitted for this number. Please try again in 10 minutes." };
  const attribution = await resolveAttribution(supabase, data.promoterSlug, data.magicToken);

  if (!attribution.ok) return { ok: false, message: attribution.message };
  if (attribution.clubId && attribution.clubId !== data.clubId) {
    return { ok: false, message: "This private link is reserved for a different club." };
  }
  if (attribution.promoterId && !(await isPromoterEligibleForService(supabase, attribution.promoterId, data.requestType))) {
    return { ok: false, message: "This private link is not available for that service. Please choose another option or contact the concierge team." };
  }
  const routingRule = await resolveServiceRoutingRule(supabase, data.requestType);
  const routedPromoterId = attribution.promoterId ?? await resolvePromoterFromRouting(supabase, routingRule, data.requestType) ?? await resolveSingleEligiblePromoterForService(supabase, data.requestType);
  const assignedManagerId = attribution.managerId ?? routingRule?.manager_id ?? await resolveDefaultManagerForClub(supabase, data.clubId);
  const { clientId, status: clientStatus } = await upsertClient(supabase, {
    name: data.name,
    phone: normalizedPhone,
    email: data.email || null,
    instagram: data.instagram || null,
    createdBy: attribution.promoterId
  });
  if (clientStatus === "BLOCKED") return { ok: false, message: "This request cannot be accepted. Please contact the concierge team." };
  if (data.magicToken && attribution.magicLinkId) {
    const nextUseCount = (attribution.useCount ?? 0) + 1;
    const { data: reserved } = await supabase.from("magic_links").update({ use_count: nextUseCount }).eq("id", attribution.magicLinkId).eq("use_count", attribution.useCount ?? 0).eq("active", true).select("id").maybeSingle();
    if (!reserved) return { ok: false, message: "This private link was just used or is no longer available. Please refresh." };
  }

  const { data: request, error } = await supabase
    .from("requests")
    .insert({
      client_id: clientId,
      club_id: data.clubId,
      promoter_id: routedPromoterId,
      assigned_manager_id: assignedManagerId,
      source: attribution.source,
      request_type: data.requestType,
      status: "NEW",
      requested_date: data.requestedDate,
      requested_date_end: data.requestedDateEnd || null,
      arrival_time: data.arrivalTime || null,
      guest_count: data.guestCount,
      budget: data.budget || null,
      message: requestMessage || null
    })
    .select("id, requested_date, request_type, guest_count, source, clubs(name), clients(name, phone), promoter:profiles!requests_promoter_id_fkey(name)")
    .single();

  if (error || !request) return { ok: false, message: error?.message ?? "Could not create request." };

  await supabase.from("audit_logs").insert({ user_id: routedPromoterId, action: "PUBLIC_REQUEST_CREATED", entity_type: "requests", entity_id: request.id, metadata: { source: attribution.source, routedByService: !attribution.promoterId && Boolean(routedPromoterId), routingRuleId: routingRule?.id ?? null } });

  await sendRequestWhatsApp(supabase, {
    requestId: request.id,
    clubName: (request.clubs as { name?: string } | null)?.name ?? "Unknown club",
    requestedDate: request.requested_date,
    requestType: data.serviceLabel ? `${request.request_type} - ${data.serviceLabel}` : request.request_type,
    clientName: (request.clients as { name?: string } | null)?.name ?? data.name,
    phone: (request.clients as { phone?: string } | null)?.phone ?? normalizedPhone,
    guestCount: request.guest_count,
    promoterName: (request.promoter as { name?: string } | null)?.name,
    source: request.source
  });

  return { ok: true, requestId: request.id };
}

export async function createPublicRequest(input: PublicRequestInput): Promise<RequestActionState> {
  const result = await submitPublicRequest(input);
  if (!result.ok) return result;
  redirect(`/request/confirmed?id=${result.requestId}`);
}

export async function createManualRequest(input: unknown): Promise<RequestActionState> {
  const profile = await getCurrentProfile();
  if (!profile || !["SUPER_ADMIN", "PROMOTER_MANAGER", "PROMOTER"].includes(profile.role)) {
    return { ok: false, message: "You are not allowed to create requests." };
  }

  const parsed = manualRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  if (isDemoAuthEnabled()) {
    revalidatePath("/requests");
    redirect("/requests");
  }

  const supabase = createAdminClient();
  const data = parsed.data;
  const normalizedPhone = normalizePhone(data.phone);
  const requestMessage = withRequestContext(data.message || "", {
    serviceLabel: data.serviceLabel,
    occasionName: data.occasionName,
    occasionDate: data.occasionDate,
    requestedDateEnd: data.requestedDateEnd,
    preferredArea: data.preferredArea,
    occasion: data.occasion,
    boatStyle: data.boatStyle,
    teeTimePreference: data.teeTimePreference,
    bedrooms: data.bedrooms,
    pickupLocation: data.pickupLocation,
    dropoffLocation: data.dropoffLocation,
    packageStyle: data.packageStyle
  });
  const { clientId, status: clientStatus } = await upsertClient(supabase, {
    name: data.name,
    phone: normalizedPhone,
    email: data.email || null,
    instagram: data.instagram || null,
    createdBy: profile.id
  });
  if (clientStatus === "BLOCKED") return { ok: false, message: "This client is blocked. A manager must review before creating a new request." };

  const { data: request, error } = await supabase
    .from("requests")
    .insert({
      client_id: clientId,
      club_id: data.clubId,
      promoter_id: profile.role === "PROMOTER" ? profile.id : null,
      assigned_manager_id: profile.role === "PROMOTER_MANAGER" ? profile.id : profile.manager_id,
      source: "MANUAL_ENTRY",
      request_type: data.requestType,
      status: "NEW",
      requested_date: data.requestedDate,
      requested_date_end: data.requestedDateEnd || null,
      arrival_time: data.arrivalTime || null,
      guest_count: data.guestCount,
      budget: data.budget || null,
      message: requestMessage || null,
      internal_summary: data.internalNote || null
    })
    .select("id")
    .single();

  if (error || !request) return { ok: false, message: error?.message ?? "Could not create request." };

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "REQUEST_CREATED",
    entityType: "requests",
    entityId: request.id,
    metadata: { source: "MANUAL_ENTRY" }
  });

  revalidatePath("/requests");
  revalidatePath("/manager/requests");
  redirect(profile.role === "PROMOTER_MANAGER" ? "/manager/requests" : "/requests");
}

export async function cancelClientRequest(formData: FormData) {
  const profile = await getCurrentProfile();
  const requestId = String(formData.get("requestId") ?? "");
  if (!profile || profile.role !== "CLIENT" || !requestId) return;
  if (isDemoAuthEnabled()) { revalidatePath("/client"); revalidatePath("/client/requests"); return; }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("cancel_own_request", { p_request_id: requestId });
  if (error || !data) throw new Error(error?.message ?? "This request can no longer be cancelled.");
  revalidatePath("/client"); revalidatePath("/client/requests"); revalidatePath(`/client/requests/${requestId}`);
}

async function upsertClient(
  supabase: ReturnType<typeof createAdminClient>,
  input: { name: string; phone: string; email: string | null; instagram: string | null; createdBy?: string | null }
) {
  let profileId: string | null = null;
  if (input.email) {
    const { data: matchingProfile } = await supabase.from("profiles").select("id").eq("role", "CLIENT").ilike("email", input.email).maybeSingle();
    profileId = matchingProfile?.id ?? null;
  }
  const clientCode = customerCodeFromPhone(input.phone);
  const { data: existing } = await supabase.from("clients").select("id, status, name").eq("client_code", clientCode).maybeSingle();
  if (existing?.id) {
    if (existing.status !== "BLOCKED") {
      const updates: Record<string, string | null> = {};
      if (input.email) updates.email = input.email;
      if (input.instagram) updates.instagram = input.instagram;
      if (profileId) updates.profile_id = profileId;
      if (!existing.name || /^unknown guest$/i.test(existing.name)) updates.name = input.name;
      if (Object.keys(updates).length) await supabase.from("clients").update(updates).eq("id", existing.id);
      await rememberClientAlias(supabase, existing.id, input.name, "PUBLIC_REQUEST");
    }
    return { clientId: existing.id, status: existing.status as string };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name,
      phone: input.phone,
      client_code: clientCode,
      email: input.email,
      instagram: input.instagram,
      profile_id: profileId,
      created_by_user_id: input.createdBy ?? null
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create client.");
  return { clientId: data.id, status: "NORMAL" };
}

async function rememberClientAlias(supabase: ReturnType<typeof createAdminClient>, clientId: string, name: string, source: string) {
  const cleanName = name.trim();
  if (!cleanName || /^unknown guest$/i.test(cleanName)) return;
  await supabase.from("client_aliases").upsert({ client_id: clientId, name: cleanName, source }, { onConflict: "client_id,name", ignoreDuplicates: true });
}

const normalizePhone = normalizePhoneNumber;

function withRequestContext(
  message: string,
  context: {
    serviceLabel?: string;
    occasionName?: string;
    occasionDate?: string;
    requestedDateEnd?: string;
    preferredArea?: string;
    occasion?: string;
    boatStyle?: string;
    teeTimePreference?: string;
    bedrooms?: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    packageStyle?: string;
  }
) {
  const contextLines = [
    context.serviceLabel?.trim() ? `Selected service: ${context.serviceLabel.trim()}` : null,
    context.occasionName?.trim() ? `Selected occasion: ${context.occasionName.trim()}${context.occasionDate?.trim() ? ` (${context.occasionDate.trim()})` : ""}` : null,
    context.requestedDateEnd?.trim() ? `End date: ${context.requestedDateEnd.trim()}` : null,
    context.preferredArea?.trim() ? `Preferred area: ${context.preferredArea.trim()}` : null,
    context.occasion?.trim() ? `Occasion: ${context.occasion.trim()}` : null,
    context.boatStyle?.trim() ? `Boat style: ${context.boatStyle.trim()}` : null,
    context.teeTimePreference?.trim() ? `Tee time preference: ${context.teeTimePreference.trim()}` : null,
    context.bedrooms?.trim() ? `Bedrooms: ${context.bedrooms.trim()}` : null,
    context.pickupLocation?.trim() ? `Pickup: ${context.pickupLocation.trim()}` : null,
    context.dropoffLocation?.trim() ? `Drop-off: ${context.dropoffLocation.trim()}` : null,
    context.packageStyle?.trim() ? `Package style: ${context.packageStyle.trim()}` : null
  ].filter(Boolean);
  const cleanMessage = message.trim();
  if (!contextLines.length) return cleanMessage;
  return cleanMessage ? `${contextLines.join("\n")}\n\n${cleanMessage}` : contextLines.join("\n");
}

async function resolveAttribution(
  supabase: ReturnType<typeof createAdminClient>,
  promoterSlug?: string,
  magicToken?: string
) {
  if (magicToken) {
    const { data } = await supabase
      .from("magic_links")
      .select("id, promoter_id, club_id, expires_at, max_uses, use_count, active, profiles!magic_links_promoter_id_fkey(manager_id)")
      .eq("token", magicToken)
      .maybeSingle();

    if (!data || !data.active) return { ok: false as const, message: "This private link is no longer active." };
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { ok: false as const, message: "This private link has expired." };
    }
    if (data.max_uses !== null && data.use_count >= data.max_uses) {
      return { ok: false as const, message: "This private link has already been used." };
    }
    return {
      ok: true as const,
      source: "MAGIC_LINK" as const,
      promoterId: data.promoter_id,
      managerId: (data.profiles as { manager_id?: string } | null)?.manager_id ?? null,
      magicLinkId: data.id,
      useCount: data.use_count,
      clubId: data.club_id
    };
  }

  if (promoterSlug) {
    const { data } = await supabase
      .from("promoter_links")
      .select("promoter_id, club_id, active, profiles!promoter_links_promoter_id_fkey(manager_id)")
      .eq("slug", promoterSlug)
      .maybeSingle();
    if (!data || !data.active) return { ok: false as const, message: "This promoter link is no longer active." };
    return {
      ok: true as const,
      source: "PROMOTER_LINK" as const,
      promoterId: data.promoter_id,
      managerId: (data.profiles as { manager_id?: string } | null)?.manager_id ?? null,
      clubId: data.club_id
    };
  }

  return { ok: true as const, source: "PUBLIC_FORM" as const, promoterId: null, managerId: null, clubId: null };
}

async function resolveDefaultManagerForClub(supabase: ReturnType<typeof createAdminClient>, clubId: string) {
  const { data } = await supabase
    .from("club_users")
    .select("profiles!club_users_user_id_fkey(id, role, active)")
    .eq("club_id", clubId)
    .ilike("role_at_club", "manager")
    .limit(5);

  const manager = (data ?? [])
    .map((item) => item.profiles as { id?: string; role?: string; active?: boolean } | null)
    .find((profile) => profile?.role === "PROMOTER_MANAGER" && profile.active !== false);

  return manager?.id ?? null;
}

async function isPromoterEligibleForService(supabase: ReturnType<typeof createAdminClient>, promoterId: string, requestType: string) {
  const { data } = await supabase
    .from("promoter_service_eligibility")
    .select("eligible")
    .eq("promoter_id", promoterId)
    .eq("request_type", requestType)
    .maybeSingle();
  return data?.eligible !== false;
}

async function resolveSingleEligiblePromoterForService(supabase: ReturnType<typeof createAdminClient>, requestType: string) {
  const { data: promoters } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "PROMOTER")
    .eq("active", true);
  const promoterIds = (promoters ?? []).map((promoter) => promoter.id);
  if (!promoterIds.length) return null;
  const { data: exclusions } = await supabase
    .from("promoter_service_eligibility")
    .select("promoter_id")
    .eq("request_type", requestType)
    .eq("eligible", false)
    .in("promoter_id", promoterIds);
  const excluded = new Set((exclusions ?? []).map((item) => item.promoter_id));
  const eligible = promoterIds.filter((id) => !excluded.has(id));
  return eligible.length === 1 ? eligible[0] : null;
}

async function resolveServiceRoutingRule(supabase: ReturnType<typeof createAdminClient>, requestType: string) {
  const { data, error } = await supabase
    .from("service_routing_rules")
    .select("id, request_type, default_promoter_id, fallback_promoter_id, manager_id, active")
    .eq("request_type", requestType)
    .eq("active", true)
    .maybeSingle();
  if (error && /service_routing_rules/i.test(error.message)) return null;
  if (error) throw new Error(error.message);
  return data as { id: string; default_promoter_id: string | null; fallback_promoter_id: string | null; manager_id: string | null } | null;
}

async function resolvePromoterFromRouting(
  supabase: ReturnType<typeof createAdminClient>,
  routingRule: { default_promoter_id: string | null; fallback_promoter_id: string | null } | null,
  requestType: string
) {
  const candidates = [routingRule?.default_promoter_id, routingRule?.fallback_promoter_id].filter((id): id is string => Boolean(id));
  for (const promoterId of candidates) {
    const [{ data: promoter }, eligible] = await Promise.all([
      supabase.from("profiles").select("id, active, role").eq("id", promoterId).maybeSingle(),
      isPromoterEligibleForService(supabase, promoterId, requestType)
    ]);
    if (promoter?.active !== false && promoter?.role === "PROMOTER" && eligible) return promoterId;
  }
  return null;
}
