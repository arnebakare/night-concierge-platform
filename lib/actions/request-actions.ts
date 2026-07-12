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
  const fingerprint = createHash("sha256").update(normalizedPhone).digest("hex");
  const { data: allowed, error: rateError } = await supabase.rpc("consume_public_request_slot", { p_fingerprint: fingerprint, p_limit: 5, p_window_minutes: 10 });
  if (rateError) return { ok: false, message: "Request protection is not configured. Apply the latest database migrations." };
  if (!allowed) return { ok: false, message: "Too many requests were submitted for this number. Please try again in 10 minutes." };
  const attribution = await resolveAttribution(supabase, data.promoterSlug, data.magicToken);

  if (!attribution.ok) return { ok: false, message: attribution.message };
  if (attribution.clubId && attribution.clubId !== data.clubId) {
    return { ok: false, message: "This private link is reserved for a different club." };
  }
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
      promoter_id: attribution.promoterId,
      assigned_manager_id: attribution.managerId,
      source: attribution.source,
      request_type: data.requestType,
      status: "NEW",
      requested_date: data.requestedDate,
      arrival_time: data.arrivalTime || null,
      guest_count: data.guestCount,
      budget: data.budget || null,
      message: data.message || null
    })
    .select("id, requested_date, request_type, guest_count, source, clubs(name), clients(name, phone), promoter:profiles!requests_promoter_id_fkey(name)")
    .single();

  if (error || !request) return { ok: false, message: error?.message ?? "Could not create request." };

  await supabase.from("audit_logs").insert({ user_id: attribution.promoterId, action: "PUBLIC_REQUEST_CREATED", entity_type: "requests", entity_id: request.id, metadata: { source: attribution.source } });

  await sendRequestWhatsApp(supabase, {
    requestId: request.id,
    clubName: (request.clubs as { name?: string } | null)?.name ?? "Unknown club",
    requestedDate: request.requested_date,
    requestType: request.request_type,
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

  const supabase = await createServerSupabase();
  const data = parsed.data;
  const normalizedPhone = normalizePhone(data.phone);
  let clientId = data.clientId;

  if (!clientId) {
    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        name: data.name,
        phone: normalizedPhone,
        email: data.email || null,
        instagram: data.instagram || null,
        created_by_user_id: profile.id
      })
      .select("id")
      .single();
    if (error || !client) return { ok: false, message: error?.message ?? "Could not create client." };
    clientId = client.id;
  }

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
      arrival_time: data.arrivalTime || null,
      guest_count: data.guestCount,
      budget: data.budget || null,
      message: data.message || null,
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
  const { data: existing } = await supabase.from("clients").select("id, status").eq("phone", input.phone).maybeSingle();
  if (existing?.id) {
    if (existing.status !== "BLOCKED") await supabase
      .from("clients")
      .update({ name: input.name, email: input.email, instagram: input.instagram, ...(profileId ? { profile_id: profileId } : {}) })
      .eq("id", existing.id);
    return { clientId: existing.id, status: existing.status as string };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name,
      phone: input.phone,
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

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return phone.trim().startsWith("+") ? `+${digits}` : digits;
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
