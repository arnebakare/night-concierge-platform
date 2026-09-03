"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { isDemoAuthEnabled } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/services/audit";
import { sendStoredWhatsApp } from "@/lib/services/whatsapp";
import { sendStoredEmail } from "@/lib/services/email";
import { importEventsFromConfiguredSources } from "@/lib/services/event-import";
import { createStripeClient } from "@/lib/services/stripe";
import { customerCodeFromPhone, normalizePhoneNumber } from "@/lib/concierge/phone";
import type { SupabaseClient } from "@supabase/supabase-js";

const statusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["NEW", "CONTACTED", "PENDING", "CONFIRMED", "ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"]),
  returnTo: z.string().optional().or(z.literal(""))
});

export async function updateRequestStatus(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = statusSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
    returnTo: formData.get("returnTo") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/requests");
    revalidatePath("/manager/requests");
    revalidatePath(`/requests/${parsed.data.requestId}`);
    revalidatePath(`/manager/requests/${parsed.data.requestId}`);
    redirectAfterStatusUpdate(parsed.data.status, parsed.data.returnTo);
    return;
  }

  const supabase = await createClient();
  const { data: previous } = await supabase.from("requests").select("status").eq("id", parsed.data.requestId).maybeSingle();
  if (profile.role === "PROMOTER" && previous?.status && ["ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"].includes(previous.status)) {
    throw new Error("A manager must reopen a completed request.");
  }
  const { error } = await supabase.from("requests").update({ status: parsed.data.status }).eq("id", parsed.data.requestId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "REQUEST_STATUS_UPDATED",
    entityType: "requests",
    entityId: parsed.data.requestId,
    metadata: { from: previous?.status ?? null, to: parsed.data.status }
  });

  revalidatePath("/requests");
  revalidatePath("/manager/requests");
  revalidatePath(`/requests/${parsed.data.requestId}`);
  revalidatePath(`/manager/requests/${parsed.data.requestId}`);
  revalidatePath("/dashboard");
  revalidatePath("/manager");
  redirectAfterStatusUpdate(parsed.data.status, parsed.data.returnTo);
}

const requestClientContactSchema = z.object({
  requestId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(40).regex(/^[+\d][\d\s().-]+$/),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  preferredLanguage: z.enum(["en", "es", "sv"]).default("en")
});

export async function updateRequestClientContact(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = requestClientContactSchema.safeParse({
    requestId: formData.get("requestId"),
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    country: formData.get("country") || "",
    preferredLanguage: formData.get("preferredLanguage") || "en"
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath(`/requests/${parsed.data.requestId}`);
    revalidatePath(`/manager/requests/${parsed.data.requestId}`);
    return;
  }

  const supabase = createAdminClient();
  const normalizedPhone = normalizePhoneNumber(parsed.data.phone);
  const clientCode = customerCodeFromPhone(normalizedPhone);
  const [{ data: previous }, { data: phoneOwner }] = await Promise.all([
    supabase.from("clients").select("id, name, phone, country, preferred_language").eq("id", parsed.data.clientId).maybeSingle(),
    supabase.from("clients").select("id, name").eq("client_code", clientCode).maybeSingle()
  ]);
  const targetClientId = phoneOwner?.id ?? parsed.data.clientId;
  if (targetClientId !== parsed.data.clientId) {
    await mergeClientPortfolio(supabase, parsed.data.clientId, targetClientId);
  }
  const { error } = await supabase
    .from("clients")
    .update({
      name: phoneOwner?.id && !/^unknown guest$/i.test(phoneOwner.name) ? phoneOwner.name : parsed.data.name,
      phone: normalizedPhone,
      client_code: clientCode,
      country: parsed.data.country || null,
      preferred_language: parsed.data.preferredLanguage
    })
    .eq("id", targetClientId);
  if (error) throw new Error(error.message);
  await rememberClientAlias(supabase, targetClientId, parsed.data.name, "REQUEST_CONTACT_UPDATE");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "REQUEST_CLIENT_CONTACT_UPDATED",
    entityType: "clients",
    entityId: targetClientId,
    metadata: {
      requestId: parsed.data.requestId,
      requestedClientId: parsed.data.clientId,
      phoneMatchedClientId: phoneOwner?.id ?? null,
      from: previous ?? null,
      to: {
        name: parsed.data.name,
        phone: normalizedPhone,
        country: parsed.data.country || null,
        preferredLanguage: parsed.data.preferredLanguage
      }
    }
  });

  revalidatePath(`/requests/${parsed.data.requestId}`);
  revalidatePath(`/manager/requests/${parsed.data.requestId}`);
  revalidatePath(`/clients/${targetClientId}`);
  revalidatePath(`/manager/clients/${targetClientId}`);
  revalidatePath("/clients");
  revalidatePath("/manager/clients");
}

function redirectAfterStatusUpdate(status: z.infer<typeof statusSchema>["status"], returnTo?: string) {
  if (!returnTo?.startsWith("/")) return;
  const archived = ["ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"].includes(status);
  if (archived) {
    const detailMatch = returnTo.match(/^\/(manager\/requests|requests)\/[^/?#]+$/);
    if (detailMatch) {
      redirect(`/${detailMatch[1]}?archived=1&updated=${status}`);
    }
  }
  const separator = returnTo.includes("?") ? "&" : "?";
  const params = archived ? `archived=1&updated=${status}` : `updated=${status}`;
  redirect(`${returnTo}${separator}${params}`);
}

const tableCostSchema = z.object({
  requestId: z.string().min(1),
  tableCost: z.string().trim().max(100).optional().or(z.literal(""))
});

const commissionRuleSchema = z.object({
  ruleId: z.string().uuid().optional().or(z.literal("")),
  label: z.string().trim().max(80).optional().or(z.literal("")),
  notes: z.string().trim().max(240).optional().or(z.literal("")),
  promoterId: z.string().uuid().optional().or(z.literal("")),
  clubId: z.string().uuid().optional().or(z.literal("")),
  requestType: z.enum(["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE"]).optional().or(z.literal("")),
  ratePercent: z.coerce.number().min(0).max(100),
  flatFee: z.coerce.number().min(0).max(100000)
});

const depositPaymentSchema = z.object({
  requestId: z.string().min(1),
  clientId: z.string().min(1),
  amount: z.coerce.number().min(5).max(100000),
  currency: z.string().trim().length(3).default("eur"),
  description: z.string().trim().min(3).max(160),
  returnTo: z.string().optional().or(z.literal(""))
});

export async function createDepositPayment(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = depositPaymentSchema.safeParse({
    requestId: formData.get("requestId"),
    clientId: formData.get("clientId"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || "eur",
    description: formData.get("description") || "Booking deposit",
    returnTo: formData.get("returnTo") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath(`/manager/requests/${parsed.data.requestId}`);
    revalidatePath(`/requests/${parsed.data.requestId}`);
    return;
  }

  const supabase = await createClient();
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select("id, requested_date, request_type, guest_count, clients(name, email), clubs(name)")
    .eq("id", parsed.data.requestId)
    .single();
  if (requestError || !request) throw new Error(requestError?.message ?? "Request not found.");

  const amountCents = Math.round(parsed.data.amount * 100);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3001";
  const stripe = createStripeClient();
  const client = Array.isArray(request.clients) ? request.clients[0] : request.clients;
  const club = Array.isArray(request.clubs) ? request.clubs[0] : request.clubs;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl}/request/confirmed?id=${parsed.data.requestId}&payment=success`,
    cancel_url: `${appUrl}${parsed.data.returnTo || `/manager/requests/${parsed.data.requestId}`}`,
    customer_email: client?.email ?? undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: parsed.data.currency.toLowerCase(),
        unit_amount: amountCents,
        product_data: {
          name: parsed.data.description,
          description: `${club?.name ?? "Venue"} · ${request.requested_date} · ${request.guest_count} guests`
        }
      }
    }],
    metadata: {
      request_id: parsed.data.requestId,
      client_id: parsed.data.clientId,
      created_by: profile.id
    },
    payment_intent_data: {
      description: parsed.data.description,
      metadata: {
        request_id: parsed.data.requestId,
        client_id: parsed.data.clientId
      }
    }
  });

  const { data: payment, error } = await supabase
    .from("request_payments")
    .insert({
      request_id: parsed.data.requestId,
      client_id: parsed.data.clientId,
      created_by: profile.id,
      provider_checkout_session_id: session.id,
      amount_cents: amountCents,
      currency: parsed.data.currency.toLowerCase(),
      description: parsed.data.description,
      checkout_url: session.url,
      status: "PENDING"
    })
    .select("id")
    .single();
  if (error || !payment) throw new Error(error?.message ?? "Could not save deposit link.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "DEPOSIT_LINK_CREATED",
    entityType: "request_payments",
    entityId: payment.id,
    metadata: { requestId: parsed.data.requestId, amountCents, currency: parsed.data.currency.toLowerCase() }
  });

  revalidatePath(`/manager/requests/${parsed.data.requestId}`);
  revalidatePath(`/requests/${parsed.data.requestId}`);
  if (session.url) redirect(session.url);
}

export async function saveCommissionRule(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = commissionRuleSchema.safeParse({
    ruleId: formData.get("ruleId") || "",
    label: formData.get("label") || "",
    notes: formData.get("notes") || "",
    promoterId: formData.get("promoterId") || "",
    clubId: formData.get("clubId") || "",
    requestType: formData.get("requestType") || "",
    ratePercent: formData.get("ratePercent"),
    flatFee: formData.get("flatFee")
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/commissions");
    revalidatePath("/manager/commissions");
    return;
  }

  const supabase = await createClient();
  if (parsed.data.promoterId) await assertPromoterOwnership(supabase, profile, parsed.data.promoterId);
  const values = {
    promoter_id: parsed.data.promoterId || null,
    club_id: parsed.data.clubId || null,
    request_type: parsed.data.requestType || null,
    rate_percent: parsed.data.ratePercent,
    flat_fee_cents: Math.round(parsed.data.flatFee * 100),
    label: parsed.data.label || null,
    notes: parsed.data.notes || null,
    created_by: profile.id
  };
  const result = parsed.data.ruleId
    ? await supabase.from("commission_rules").update(values).eq("id", parsed.data.ruleId).select("id").single()
    : await supabase.from("commission_rules").insert(values).select("id").single();
  let { data, error } = result;
  if (error && /label|notes/i.test(error.message)) {
    const legacyValues = {
      promoter_id: values.promoter_id,
      club_id: values.club_id,
      request_type: values.request_type,
      rate_percent: values.rate_percent,
      flat_fee_cents: values.flat_fee_cents,
      created_by: values.created_by
    };
    const fallback = parsed.data.ruleId
      ? await supabase.from("commission_rules").update(legacyValues).eq("id", parsed.data.ruleId).select("id").single()
      : await supabase.from("commission_rules").insert(legacyValues).select("id").single();
    data = fallback.data;
    error = fallback.error;
  }
  if (error || !data) throw new Error(error?.message ?? "Could not save commission rule.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.ruleId ? "COMMISSION_RULE_UPDATED" : "COMMISSION_RULE_CREATED",
    entityType: "commission_rules",
    entityId: data.id,
    metadata: parsed.data
  });

  revalidatePath("/admin/commissions");
  revalidatePath("/manager/commissions");
  revalidatePath("/reports");
}

const availabilitySlotSchema = z.object({
  requestId: z.string().optional().or(z.literal("")),
  clubId: z.string().min(1),
  slotDate: z.string().min(1),
  serviceType: z.enum(["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE"]),
  title: z.string().trim().min(2).max(120),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  minSpend: z.string().trim().max(100).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(200).optional().or(z.literal("")),
  status: z.enum(["AVAILABLE", "LIMITED", "WAITLIST", "SOLD_OUT"]),
  notes: z.string().trim().max(500).optional().or(z.literal(""))
});

export async function createAvailabilitySlot(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = availabilitySlotSchema.safeParse({
    requestId: formData.get("requestId"),
    clubId: formData.get("clubId"),
    slotDate: formData.get("slotDate"),
    serviceType: formData.get("serviceType"),
    title: formData.get("title"),
    area: formData.get("area") || "",
    minSpend: formData.get("minSpend") || "",
    capacity: formData.get("capacity") || "",
    status: formData.get("status") || "AVAILABLE",
    notes: formData.get("notes") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    if (parsed.data.requestId) revalidatePath(`/manager/requests/${parsed.data.requestId}`);
    revalidatePath("/manager/availability");
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("availability_slots").insert({
    club_id: parsed.data.clubId,
    service_type: parsed.data.serviceType,
    slot_date: parsed.data.slotDate,
    title: parsed.data.title,
    area: parsed.data.area || null,
    min_spend: parsed.data.minSpend || null,
    capacity: parsed.data.capacity || null,
    status: parsed.data.status,
    notes: parsed.data.notes || null,
    created_by: profile.id
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not save availability.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "AVAILABILITY_SLOT_CREATED",
    entityType: "availability_slots",
    entityId: data.id,
    metadata: { requestId: parsed.data.requestId || null, clubId: parsed.data.clubId, date: parsed.data.slotDate, status: parsed.data.status }
  });

  if (parsed.data.requestId) {
    revalidatePath(`/manager/requests/${parsed.data.requestId}`);
    revalidatePath(`/requests/${parsed.data.requestId}`);
  }
  revalidatePath("/manager/availability");
}

const availabilitySlotUpdateSchema = availabilitySlotSchema.extend({
  slotId: z.string().min(1),
  active: z.enum(["true", "false"]).transform((value) => value === "true")
});

export async function updateAvailabilitySlot(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = availabilitySlotUpdateSchema.safeParse({
    requestId: formData.get("requestId") || "",
    slotId: formData.get("slotId"),
    clubId: formData.get("clubId"),
    slotDate: formData.get("slotDate"),
    serviceType: formData.get("serviceType"),
    title: formData.get("title"),
    area: formData.get("area") || "",
    minSpend: formData.get("minSpend") || "",
    capacity: formData.get("capacity") || "",
    status: formData.get("status") || "AVAILABLE",
    notes: formData.get("notes") || "",
    active: formData.get("active") || "true"
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/manager/availability");
    if (parsed.data.requestId) revalidatePath(`/manager/requests/${parsed.data.requestId}`);
    return;
  }

  const supabase = await createClient();
  const { data: previous } = await supabase.from("availability_slots").select("status, min_spend, active").eq("id", parsed.data.slotId).maybeSingle();
  const { error } = await supabase
    .from("availability_slots")
    .update({
      club_id: parsed.data.clubId,
      service_type: parsed.data.serviceType,
      slot_date: parsed.data.slotDate,
      title: parsed.data.title,
      area: parsed.data.area || null,
      min_spend: parsed.data.minSpend || null,
      capacity: parsed.data.capacity || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      active: parsed.data.active
    })
    .eq("id", parsed.data.slotId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.active ? "AVAILABILITY_SLOT_UPDATED" : "AVAILABILITY_SLOT_ARCHIVED",
    entityType: "availability_slots",
    entityId: parsed.data.slotId,
    metadata: { from: previous ?? null, to: { status: parsed.data.status, minSpend: parsed.data.minSpend || null, active: parsed.data.active } }
  });

  revalidatePath("/manager/availability");
  if (parsed.data.requestId) revalidatePath(`/manager/requests/${parsed.data.requestId}`);
}

const availabilitySlotStatusSchema = z.object({
  slotId: z.string().min(1),
  requestId: z.string().optional().or(z.literal("")),
  status: z.enum(["AVAILABLE", "LIMITED", "WAITLIST", "SOLD_OUT"]).optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true")
});

export async function setAvailabilitySlotStatus(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = availabilitySlotStatusSchema.safeParse({
    slotId: formData.get("slotId"),
    requestId: formData.get("requestId") || "",
    status: formData.get("status") || undefined,
    active: formData.get("active") || "true"
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/manager/availability");
    if (parsed.data.requestId) revalidatePath(`/manager/requests/${parsed.data.requestId}`);
    return;
  }

  const supabase = await createClient();
  const update: { active: boolean; status?: "AVAILABLE" | "LIMITED" | "WAITLIST" | "SOLD_OUT" } = { active: parsed.data.active };
  if (parsed.data.status) update.status = parsed.data.status;
  const { error } = await supabase.from("availability_slots").update(update).eq("id", parsed.data.slotId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.active ? "AVAILABILITY_SLOT_STATUS_UPDATED" : "AVAILABILITY_SLOT_ARCHIVED",
    entityType: "availability_slots",
    entityId: parsed.data.slotId,
    metadata: { status: parsed.data.status ?? null, active: parsed.data.active }
  });

  revalidatePath("/manager/availability");
  if (parsed.data.requestId) revalidatePath(`/manager/requests/${parsed.data.requestId}`);
}

const requestOfferSchema = z.object({
  requestId: z.string().min(1),
  availabilitySlotId: z.string().min(1).optional().or(z.literal("")),
  venueName: z.string().trim().min(2).max(120),
  offerDate: z.string().min(1),
  serviceLabel: z.string().trim().min(2).max(120),
  arrivalTime: z.string().trim().max(40).optional().or(z.literal("")),
  guestCount: z.coerce.number().int().min(1).max(200),
  minSpend: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(1200),
  destination: z.string().trim().max(40).optional().or(z.literal(""))
});

export async function createRequestOffer(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = requestOfferSchema.safeParse(readOfferForm(formData));
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath(`/manager/requests/${parsed.data.requestId}`);
    revalidatePath(`/requests/${parsed.data.requestId}`);
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("request_offers").insert({
    request_id: parsed.data.requestId,
    availability_slot_id: parsed.data.availabilitySlotId || null,
    created_by: profile.id,
    venue_name: parsed.data.venueName,
    offer_date: parsed.data.offerDate,
    service_label: parsed.data.serviceLabel,
    arrival_time: parsed.data.arrivalTime || null,
    guest_count: parsed.data.guestCount,
    min_spend: parsed.data.minSpend || null,
    message: parsed.data.message
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create offer.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "REQUEST_OFFER_CREATED",
    entityType: "request_offers",
    entityId: data.id,
    metadata: { requestId: parsed.data.requestId, minSpend: parsed.data.minSpend || null }
  });

  revalidatePath(`/manager/requests/${parsed.data.requestId}`);
  revalidatePath(`/requests/${parsed.data.requestId}`);
}

export async function sendRequestOffer(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = requestOfferSchema.safeParse(readOfferForm(formData));
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath(`/manager/requests/${parsed.data.requestId}`);
    revalidatePath(`/requests/${parsed.data.requestId}`);
    return;
  }

  const supabase = await createClient();
  const destination = normalizeWhatsAppDestination(parsed.data.destination);
  const result = destination ? await sendStoredWhatsApp({ to: destination, body: parsed.data.message }) : { ok: false as const, error: "No WhatsApp number on the client." };
  const { data, error } = await supabase.from("request_offers").insert({
    request_id: parsed.data.requestId,
    availability_slot_id: parsed.data.availabilitySlotId || null,
    created_by: profile.id,
    offer_status: result.ok ? "SENT" : "DRAFT",
    venue_name: parsed.data.venueName,
    offer_date: parsed.data.offerDate,
    service_label: parsed.data.serviceLabel,
    arrival_time: parsed.data.arrivalTime || null,
    guest_count: parsed.data.guestCount,
    min_spend: parsed.data.minSpend || null,
    message: parsed.data.message,
    sent_at: result.ok ? new Date().toISOString() : null
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not save offer.");

  if (result.ok) {
    await supabase
      .from("requests")
      .update({ status: "PENDING" })
      .eq("id", parsed.data.requestId)
      .in("status", ["NEW", "CONTACTED"]);
  }

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: result.ok ? "REQUEST_OFFER_SENT" : "REQUEST_OFFER_SEND_FAILED",
    entityType: "request_offers",
    entityId: data.id,
    metadata: { requestId: parsed.data.requestId, destination, success: result.ok, error: result.ok ? null : result.error }
  });

  revalidatePath(`/manager/requests/${parsed.data.requestId}`);
  revalidatePath(`/requests/${parsed.data.requestId}`);
}

const offerStatusSchema = z.object({
  offerId: z.string().min(1),
  requestId: z.string().min(1),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"])
});

export async function updateRequestOfferStatus(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = offerStatusSchema.safeParse({
    offerId: formData.get("offerId"),
    requestId: formData.get("requestId"),
    status: formData.get("status")
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath(`/manager/requests/${parsed.data.requestId}`);
    revalidatePath(`/requests/${parsed.data.requestId}`);
    return;
  }

  const supabase = await createClient();
  const updateValues: { offer_status: z.infer<typeof offerStatusSchema>["status"]; sent_at?: string } = { offer_status: parsed.data.status };
  if (parsed.data.status === "SENT") updateValues.sent_at = new Date().toISOString();

  const { error } = await supabase
    .from("request_offers")
    .update(updateValues)
    .eq("id", parsed.data.offerId);
  if (error) throw new Error(error.message);

  if (parsed.data.status === "ACCEPTED") {
    await supabase.from("requests").update({ status: "CONFIRMED" }).eq("id", parsed.data.requestId);
  }

  if (parsed.data.status === "DECLINED") {
    await supabase.from("requests").update({ status: "DECLINED" }).eq("id", parsed.data.requestId);
  }

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "REQUEST_OFFER_STATUS_UPDATED",
    entityType: "request_offers",
    entityId: parsed.data.offerId,
    metadata: { requestId: parsed.data.requestId, status: parsed.data.status }
  });

  revalidatePath(`/manager/requests/${parsed.data.requestId}`);
  revalidatePath(`/requests/${parsed.data.requestId}`);
  revalidatePath("/manager/requests");
  revalidatePath("/requests");
  revalidatePath("/manager");
  revalidatePath("/dashboard");
}

function readOfferForm(formData: FormData) {
  return {
    requestId: formData.get("requestId"),
    availabilitySlotId: formData.get("availabilitySlotId") || "",
    venueName: formData.get("venueName"),
    offerDate: formData.get("offerDate"),
    serviceLabel: formData.get("serviceLabel"),
    arrivalTime: formData.get("arrivalTime") || "",
    guestCount: formData.get("guestCount"),
    minSpend: formData.get("minSpend") || "",
    message: formData.get("message"),
    destination: formData.get("destination") || ""
  };
}

function normalizeWhatsAppDestination(value?: string) {
  const clean = value?.trim();
  if (!clean) return "";
  return clean.startsWith("whatsapp:") ? clean : `whatsapp:${clean}`;
}

export async function updateRequestTableCost(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = tableCostSchema.safeParse({
    requestId: formData.get("requestId"),
    tableCost: formData.get("tableCost") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/reports");
    return;
  }

  const supabase = await createClient();
  const { data: previous } = await supabase.from("requests").select("budget").eq("id", parsed.data.requestId).maybeSingle();
  const { error } = await supabase
    .from("requests")
    .update({ budget: parsed.data.tableCost || null })
    .eq("id", parsed.data.requestId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "REQUEST_TABLE_COST_UPDATED",
    entityType: "requests",
    entityId: parsed.data.requestId,
    metadata: { from: previous?.budget ?? null, to: parsed.data.tableCost || null }
  });

  revalidatePath("/reports");
  revalidatePath("/requests");
  revalidatePath("/manager/requests");
  revalidatePath(`/requests/${parsed.data.requestId}`);
  revalidatePath(`/manager/requests/${parsed.data.requestId}`);
}

const retentionSchema = z.object({
  clientId: z.string().min(1),
  channel: z.enum(["WHATSAPP", "EMAIL"]),
  destination: z.string().trim().min(3).max(180),
  message: z.string().trim().min(10).max(1200)
});

export async function sendClientRetentionMessage(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = retentionSchema.safeParse({
    clientId: formData.get("clientId"),
    channel: formData.get("channel"),
    destination: formData.get("destination"),
    message: formData.get("message")
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/manager/retention");
    return;
  }

  const supabase = createAdminClient();
  const result = parsed.data.channel === "WHATSAPP"
    ? await sendStoredWhatsApp({ to: parsed.data.destination, body: parsed.data.message })
    : await sendStoredEmail({ to: parsed.data.destination, subject: "A note from your Marbella concierge", body: parsed.data.message });

  const { data: record, error } = await supabase.from("retention_outreach").insert({
    client_id: parsed.data.clientId,
    user_id: profile.id,
    channel: parsed.data.channel,
    destination: parsed.data.destination,
    message: parsed.data.message,
    status: result.ok ? "SENT" : "FAILED",
    provider: parsed.data.channel === "WHATSAPP" ? "twilio" : "resend",
    provider_message_id: result.ok ? ("sid" in result ? result.sid : result.id) ?? null : null,
    error_message: result.ok ? null : result.error,
    automatic: false
  }).select("id").single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "RETENTION_MESSAGE_SENT",
    entityType: "retention_outreach",
    entityId: record.id,
    metadata: { clientId: parsed.data.clientId, channel: parsed.data.channel, success: result.ok }
  });

  revalidatePath("/manager/retention");
}

export async function runEventImportNow() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  if (isDemoAuthEnabled()) {
    revalidatePath("/manager/events");
    return;
  }

  const result = await importEventsFromConfiguredSources();
  const supabase = createAdminClient();
  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "EVENT_IMPORT_RUN",
    entityType: "events",
    entityId: profile.id,
    metadata: result
  });
  revalidatePath("/manager/events");
}

const settingSchema = z.object({
  key: z.literal("whatsapp_destination_number"),
  value: z.string().trim().regex(/^(whatsapp:)?\+[1-9]\d{7,14}$/, "Use an international number such as +34600111222")
});

export async function savePlatformSetting(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = settingSchema.safeParse({
    key: formData.get("key"),
    value: formData.get("value")
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/settings");
    revalidatePath("/admin/settings");
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .upsert(parsed.data, { onConflict: "key" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "PLATFORM_SETTING_UPDATED",
    entityType: "platform_settings",
    entityId: data.id,
    metadata: { key: parsed.data.key }
  });

  revalidatePath("/settings");
  revalidatePath("/admin/settings");
}

const messageTemplateSchema = z.object({
  templateId: z.string().min(1),
  body: z.string().trim().min(20).max(2000),
  active: z.enum(["true", "false"]).transform((value) => value === "true")
});

const packageSchema = z.object({
  packageId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(800).optional().or(z.literal("")),
  requestType: z.enum(["BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE", "VIP_SERVICE", "GENERAL"]),
  priceHint: z.string().trim().max(160).optional().or(z.literal("")),
  tailoredClientId: z.string().uuid().optional().or(z.literal("")),
  packageItems: z.string().trim().max(1200).optional().or(z.literal(""))
});

export async function saveConciergePackage(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = packageSchema.safeParse({
    packageId: formData.get("packageId") || "",
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") || "",
    requestType: formData.get("requestType") || "PACKAGE",
    priceHint: formData.get("priceHint") || "",
    tailoredClientId: formData.get("tailoredClientId") || "",
    packageItems: formData.get("packageItems") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/packages");
    return;
  }

  const supabase = await createClient();
  const values = {
    title: parsed.data.title,
    slug: parsed.data.slug,
    description: parsed.data.description || null,
    request_type: parsed.data.requestType,
    price_hint: parsed.data.priceHint || null,
    tailored_client_id: parsed.data.tailoredClientId || null,
    package_items: (parsed.data.packageItems ?? "").split("\n").map((item) => item.trim()).filter(Boolean),
    created_by: profile.id
  };
  const { data, error } = parsed.data.packageId
    ? await supabase.from("concierge_packages").update(values).eq("id", parsed.data.packageId).select("id").single()
    : await supabase.from("concierge_packages").insert(values).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not save package.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.packageId ? "CONCIERGE_PACKAGE_UPDATED" : "CONCIERGE_PACKAGE_CREATED",
    entityType: "concierge_packages",
    entityId: data.id,
    metadata: { slug: parsed.data.slug, requestType: parsed.data.requestType }
  });

  revalidatePath("/admin/packages");
  revalidatePath("/request");
}

const packageActiveSchema = z.object({
  packageId: z.string().uuid(),
  active: z.enum(["true", "false"]).transform((value) => value === "true")
});

export async function setConciergePackageActive(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = packageActiveSchema.safeParse({
    packageId: formData.get("packageId"),
    active: formData.get("active")
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/packages");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("concierge_packages").update({ active: parsed.data.active }).eq("id", parsed.data.packageId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.active ? "CONCIERGE_PACKAGE_REACTIVATED" : "CONCIERGE_PACKAGE_ARCHIVED",
    entityType: "concierge_packages",
    entityId: parsed.data.packageId,
    metadata: { active: parsed.data.active }
  });

  revalidatePath("/admin/packages");
  revalidatePath("/request");
}

export async function saveMessageTemplate(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = messageTemplateSchema.safeParse({
    templateId: formData.get("templateId"),
    body: formData.get("body"),
    active: formData.get("active") || "true"
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/settings");
    revalidatePath("/admin/settings");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("message_templates")
    .update({ body: parsed.data.body, active: parsed.data.active })
    .eq("id", parsed.data.templateId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "MESSAGE_TEMPLATE_UPDATED",
    entityType: "message_templates",
    entityId: parsed.data.templateId,
    metadata: { active: parsed.data.active }
  });

  revalidatePath("/settings");
  revalidatePath("/admin/settings");
  revalidatePath("/requests");
  revalidatePath("/manager/requests");
}

const clubSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  city: z.string().min(2),
  address: z.preprocess((value) => typeof value === "string" && value.trim() ? value.trim() : null, z.string().max(500).nullable()),
  imageUrl: z.preprocess((value) => typeof value === "string" && value.trim() ? value.trim() : null, z.string().max(500).nullable())
});

export async function createClub(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = clubSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    city: formData.get("city"),
    address: formData.get("address"),
    imageUrl: formData.get("imageUrl")
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/clubs");
    revalidatePath("/request");
    revalidatePath("/p/[promoterSlug]", "page");
    revalidatePath("/m/[token]", "page");
    return;
  }

  const supabase = await createClient();
  const { imageUrl, ...values } = parsed.data;
  const { data, error } = await supabase.from("clubs").insert({ ...values, image_url: imageUrl }).select("id").single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "CLUB_CREATED",
    entityType: "clubs",
    entityId: data.id,
    metadata: { slug: parsed.data.slug }
  });

  revalidatePath("/admin/clubs");
  revalidatePath("/manager/clubs");
}

const clubStatusSchema = z.object({
  clubId: z.string().min(1),
  active: z.enum(["true", "false"]).transform((value) => value === "true")
});

const scheduleVenueTypes = ["BEACH_CLUB", "RESTAURANT", "NIGHTCLUB", "AFTER_PARTY", "HYBRID"] as const;
const scheduleDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const scheduleVenueRuleSchema = z.object({
  ruleId: z.string().trim().optional(),
  venueName: z.string().trim().min(2).max(120),
  venueType: z.enum(scheduleVenueTypes),
  area: z.preprocess((value) => typeof value === "string" && value.trim() ? value.trim() : null, z.string().max(120).nullable()),
  priorityDays: z.array(z.enum(scheduleDays)).max(7),
  weight: z.coerce.number().min(0.1).max(10),
  avoidAfterVenueNames: z.string().trim().max(500),
  guidance: z.preprocess((value) => typeof value === "string" && value.trim() ? value.trim() : null, z.string().max(500).nullable()),
  active: z.enum(["true", "false"]).transform((value) => value === "true")
});

function parseVenueRuleForm(formData: FormData) {
  const days = formData.getAll("priorityDays").map(String);
  const parsed = scheduleVenueRuleSchema.safeParse({
    ruleId: formData.get("ruleId") || "",
    venueName: formData.get("venueName"),
    venueType: formData.get("venueType"),
    area: formData.get("area") || "",
    priorityDays: days,
    weight: formData.get("weight") || 1,
    avoidAfterVenueNames: formData.get("avoidAfterVenueNames") || "",
    guidance: formData.get("guidance") || "",
    active: formData.get("active") || "true"
  });
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    avoidAfterVenueNames: parsed.data.avoidAfterVenueNames
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 12)
  };
}

export async function createScheduleVenueRule(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = parseVenueRuleForm(formData);
  if (!parsed) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/planner");
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_venue_rules")
    .insert({
      venue_name: parsed.venueName,
      venue_type: parsed.venueType,
      area: parsed.area,
      priority_days: parsed.priorityDays,
      weight: parsed.weight,
      avoid_after_venue_names: parsed.avoidAfterVenueNames,
      guidance: parsed.guidance,
      active: parsed.active
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "SCHEDULE_VENUE_RULE_CREATED",
    entityType: "schedule_venue_rules",
    entityId: data.id,
    metadata: { venueName: parsed.venueName, weight: parsed.weight }
  });

  revalidatePath("/admin/planner");
  revalidatePath("/schedule");
}

export async function updateScheduleVenueRule(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = parseVenueRuleForm(formData);
  if (!parsed?.ruleId) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/planner");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_venue_rules")
    .update({
      venue_name: parsed.venueName,
      venue_type: parsed.venueType,
      area: parsed.area,
      priority_days: parsed.priorityDays,
      weight: parsed.weight,
      avoid_after_venue_names: parsed.avoidAfterVenueNames,
      guidance: parsed.guidance,
      active: parsed.active
    })
    .eq("id", parsed.ruleId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "SCHEDULE_VENUE_RULE_UPDATED",
    entityType: "schedule_venue_rules",
    entityId: parsed.ruleId,
    metadata: { venueName: parsed.venueName, weight: parsed.weight, active: parsed.active }
  });

  revalidatePath("/admin/planner");
  revalidatePath("/schedule");
}

const scheduleVenueRuleStatusSchema = z.object({
  ruleId: z.string().min(1),
  active: z.enum(["true", "false"]).transform((value) => value === "true")
});

export async function setScheduleVenueRuleActive(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = scheduleVenueRuleStatusSchema.safeParse({
    ruleId: formData.get("ruleId"),
    active: formData.get("active")
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/planner");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_venue_rules")
    .update({ active: parsed.data.active })
    .eq("id", parsed.data.ruleId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.active ? "SCHEDULE_VENUE_RULE_REACTIVATED" : "SCHEDULE_VENUE_RULE_ARCHIVED",
    entityType: "schedule_venue_rules",
    entityId: parsed.data.ruleId,
    metadata: { active: parsed.data.active }
  });

  revalidatePath("/admin/planner");
  revalidatePath("/schedule");
}

const requestTypesForServices = ["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE"] as const;
const serviceIconNames = ["Calendar", "CalendarRange", "Car", "Crown", "Flag", "GlassWater", "Hotel", "Music2", "Package", "ShipWheel", "Sparkles", "Sun", "Utensils", "Users", "Waves"] as const;
const clubExperienceSchema = z.object({
  clubId: z.string().min(1),
  monogram: z.string().trim().max(8).optional(),
  tagline: z.string().trim().max(140).optional(),
  mood: z.string().trim().max(80).optional(),
  services: z.string().transform((value, context) => {
    try {
      return JSON.parse(value);
    } catch {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Services must be valid JSON." });
      return z.NEVER;
    }
  }).pipe(z.array(z.object({
    id: z.string().trim().min(1).max(80),
    label: z.string().trim().min(2).max(80),
    description: z.string().trim().max(180).optional().default(""),
    priceHint: z.string().trim().max(120).optional().default(""),
    requestType: z.enum(requestTypesForServices),
    icon: z.enum(serviceIconNames).optional().default("Sparkles"),
    active: z.boolean().optional().default(true)
  })).min(1).max(12))
});

export async function updateClubExperience(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = clubExperienceSchema.safeParse({
    clubId: formData.get("clubId"),
    monogram: formData.get("monogram") || "",
    tagline: formData.get("tagline") || "",
    mood: formData.get("mood") || "",
    services: formData.get("services") || "[]"
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/clubs");
    revalidatePath("/request");
    return;
  }

  const supabase = await createClient();
  const brandConfig = {
    monogram: parsed.data.monogram || null,
    tagline: parsed.data.tagline || null,
    mood: parsed.data.mood || null
  };
  const serviceConfig = parsed.data.services.map(({ active, ...service }) => service);
  const { error } = await supabase
    .from("clubs")
    .update({ brand_config: brandConfig, service_config: serviceConfig })
    .eq("id", parsed.data.clubId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "CLUB_EXPERIENCE_UPDATED",
    entityType: "clubs",
    entityId: parsed.data.clubId,
    metadata: { serviceCount: serviceConfig.length }
  });

  revalidatePath("/admin/clubs");
  revalidatePath("/request");
  revalidatePath("/p/[promoterSlug]", "page");
  revalidatePath("/m/[token]", "page");
}

export async function setClubActive(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = clubStatusSchema.safeParse({
    clubId: formData.get("clubId"),
    active: formData.get("active")
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/clubs");
    revalidatePath("/request");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clubs").update({ active: parsed.data.active }).eq("id", parsed.data.clubId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.active ? "CLUB_REACTIVATED" : "CLUB_ARCHIVED",
    entityType: "clubs",
    entityId: parsed.data.clubId,
    metadata: { active: parsed.data.active }
  });

  revalidatePath("/admin/clubs");
  revalidatePath("/manager/clubs");
  revalidatePath("/request");
}

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "PROMOTER_MANAGER", "PROMOTER", "CLIENT"]),
  phone: z.string().optional(),
  managerId: z.string().uuid().optional().or(z.literal(""))
});

export async function createUserProfile(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    phone: formData.get("phone") || "",
    managerId: formData.get("managerId") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/users");
    revalidatePath("/manager/promoters");
    return;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { name: parsed.data.name, role: parsed.data.role }
  });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create user.");

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    role: parsed.data.role,
    manager_id: parsed.data.managerId || null,
    active: true
  });
  if (profileError) throw new Error(profileError.message);

  await admin.from("audit_logs").insert({
    user_id: profile.id,
    action: "USER_CREATED",
    entity_type: "profiles",
    entity_id: data.user.id,
    metadata: { role: parsed.data.role }
  });

  revalidatePath("/admin/users");
}

const userStatusSchema = z.object({
  userId: z.string().min(1),
  active: z.enum(["true", "false"]).transform((value) => value === "true")
});

export async function setUserActive(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = userStatusSchema.safeParse({
    userId: formData.get("userId"),
    active: formData.get("active")
  });
  if (!parsed.success || parsed.data.userId === profile.id) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/users");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ active: parsed.data.active }).eq("id", parsed.data.userId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.active ? "USER_REACTIVATED" : "USER_SUSPENDED",
    entityType: "profiles",
    entityId: parsed.data.userId,
    metadata: { active: parsed.data.active }
  });

  revalidatePath("/admin/users");
  revalidatePath("/manager/promoters");
}

const noteSchema = z.object({
  clientId: z.string().min(1),
  visibility: z.enum(["GLOBAL", "CLUB_ONLY", "MANAGER_ONLY", "PRIVATE_TO_AUTHOR"]),
  noteType: z.enum(["PREFERENCE", "SPENDING", "BEHAVIOR", "RELIABILITY", "GUESTLIST", "WARNING", "BLOCKED", "INTERNAL"]),
  content: z.string().min(3).max(1200),
  clubId: z.string().uuid().optional().or(z.literal("")),
  requestId: z.string().uuid().optional().or(z.literal(""))
});

const followUpTaskSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().trim().min(3).max(180),
  dueDate: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  assignedTo: z.string().uuid().optional().or(z.literal(""))
});

const followUpTaskUpdateSchema = followUpTaskSchema.extend({
  taskId: z.string().uuid()
});

const followUpTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  clientId: z.string().min(1),
  status: z.enum(["DONE", "CANCELLED"])
});

export async function createClientFollowUpTask(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = followUpTaskSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    dueDate: formData.get("dueDate") || "",
    priority: formData.get("priority") || "NORMAL",
    assignedTo: formData.get("assignedTo") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath(`/clients/${parsed.data.clientId}`);
    revalidatePath(`/manager/clients/${parsed.data.clientId}`);
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("client_follow_up_tasks").insert({
    client_id: parsed.data.clientId,
    title: parsed.data.title,
    due_date: parsed.data.dueDate || null,
    priority: parsed.data.priority,
    assigned_to: parsed.data.assignedTo || profile.id,
    created_by: profile.id
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create follow-up task. Apply migration 022 if this is the first time using tasks.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "CLIENT_FOLLOW_UP_TASK_CREATED",
    entityType: "client_follow_up_tasks",
    entityId: data.id,
    metadata: { clientId: parsed.data.clientId, priority: parsed.data.priority, dueDate: parsed.data.dueDate || null }
  });

  revalidatePath(`/clients/${parsed.data.clientId}`);
  revalidatePath(`/manager/clients/${parsed.data.clientId}`);
  revalidatePath("/manager");
  revalidatePath("/manager/retention");
}

export async function updateClientFollowUpTaskStatus(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = followUpTaskStatusSchema.safeParse({
    taskId: formData.get("taskId"),
    clientId: formData.get("clientId"),
    status: formData.get("status")
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath(`/clients/${parsed.data.clientId}`);
    revalidatePath(`/manager/clients/${parsed.data.clientId}`);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("client_follow_up_tasks").update({
    status: parsed.data.status,
    completed_at: parsed.data.status === "DONE" ? new Date().toISOString() : null
  }).eq("id", parsed.data.taskId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "CLIENT_FOLLOW_UP_TASK_UPDATED",
    entityType: "client_follow_up_tasks",
    entityId: parsed.data.taskId,
    metadata: { clientId: parsed.data.clientId, status: parsed.data.status }
  });

  revalidatePath(`/clients/${parsed.data.clientId}`);
  revalidatePath(`/manager/clients/${parsed.data.clientId}`);
  revalidatePath("/manager");
  revalidatePath("/manager/retention");
}

export async function updateClientFollowUpTask(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = followUpTaskUpdateSchema.safeParse({
    taskId: formData.get("taskId"),
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    dueDate: formData.get("dueDate") || "",
    priority: formData.get("priority") || "NORMAL",
    assignedTo: formData.get("assignedTo") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath(`/clients/${parsed.data.clientId}`);
    revalidatePath(`/manager/clients/${parsed.data.clientId}`);
    revalidatePath("/manager");
    revalidatePath("/manager/retention");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("client_follow_up_tasks").update({
    title: parsed.data.title,
    due_date: parsed.data.dueDate || null,
    priority: parsed.data.priority,
    assigned_to: parsed.data.assignedTo || profile.id
  }).eq("id", parsed.data.taskId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "CLIENT_FOLLOW_UP_TASK_EDITED",
    entityType: "client_follow_up_tasks",
    entityId: parsed.data.taskId,
    metadata: { clientId: parsed.data.clientId, priority: parsed.data.priority, dueDate: parsed.data.dueDate || null }
  });

  revalidatePath(`/clients/${parsed.data.clientId}`);
  revalidatePath(`/manager/clients/${parsed.data.clientId}`);
  revalidatePath("/manager");
  revalidatePath("/manager/retention");
}

export async function addClientNote(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = noteSchema.safeParse({
    clientId: formData.get("clientId"),
    visibility: formData.get("visibility"),
    noteType: formData.get("noteType"),
    content: formData.get("content"),
    clubId: formData.get("clubId") || "",
    requestId: formData.get("requestId") || ""
  });
  if (!parsed.success) return;

  if (profile.role === "PROMOTER" && parsed.data.visibility === "MANAGER_ONLY") {
    return;
  }
  if (parsed.data.visibility === "CLUB_ONLY" && !parsed.data.clubId) return;

  if (isDemoAuthEnabled()) {
    revalidatePath(`/clients/${parsed.data.clientId}`);
    revalidatePath(`/manager/clients/${parsed.data.clientId}`);
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .insert({
      client_id: parsed.data.clientId,
      author_id: profile.id,
      visibility: parsed.data.visibility,
      note_type: parsed.data.noteType,
      content: parsed.data.content,
      club_id: parsed.data.clubId || null,
      request_id: parsed.data.requestId || null
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not add note.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "CLIENT_NOTE_CREATED",
    entityType: "client_notes",
    entityId: data.id,
    metadata: {
      clientId: parsed.data.clientId,
      visibility: parsed.data.visibility,
      noteType: parsed.data.noteType
      ,clubId: parsed.data.clubId || null
    }
  });

  revalidatePath(`/clients/${parsed.data.clientId}`);
  revalidatePath(`/manager/clients/${parsed.data.clientId}`);
}

const clientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().trim().min(6).max(30).regex(/^[+\d][\d\s().-]+$/),
  email: z.string().email().optional().or(z.literal("")),
  instagram: z.string().optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  preferredLanguage: z.enum(["en", "es", "sv"]).default("en"),
  vipLevel: z.enum(["STANDARD", "SILVER", "GOLD", "PLATINUM"]),
  status: z.enum(["NORMAL", "WATCHLIST", "MANAGER_APPROVAL_REQUIRED", "BLOCKED"])
});

export async function createClientRecord(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    instagram: formData.get("instagram") || "",
    country: formData.get("country") || "",
    preferredLanguage: formData.get("preferredLanguage") || "en",
    vipLevel: formData.get("vipLevel") || "STANDARD",
    status: formData.get("status") || "NORMAL"
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/clients");
    revalidatePath("/manager/clients");
    return;
  }

  const supabase = createAdminClient();
  const normalizedPhone = normalizePhoneNumber(parsed.data.phone);
  const clientCode = customerCodeFromPhone(normalizedPhone);
  const { data: existing } = await supabase.from("clients").select("id, status, name").eq("client_code", clientCode).maybeSingle();
  const payload = {
      name: existing?.name && !/^unknown guest$/i.test(existing.name) ? existing.name : parsed.data.name,
      phone: normalizedPhone,
      client_code: clientCode,
      email: parsed.data.email || null,
      instagram: parsed.data.instagram || null,
      country: parsed.data.country || null,
      preferred_language: parsed.data.preferredLanguage,
      vip_level: parsed.data.vipLevel,
      status: parsed.data.status,
      created_by_user_id: profile.id
    };
  const { data, error } = existing?.id
    ? await supabase.from("clients").update(payload).eq("id", existing.id).select("id").single()
    : await supabase.from("clients").insert(payload).select("id").single();

  if (error || !data) throw new Error(error?.message ?? "Could not create client.");
  await rememberClientAlias(supabase, data.id, parsed.data.name, "CRM_CREATE");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: existing?.id ? "CLIENT_MATCHED_BY_PHONE" : "CLIENT_CREATED",
    entityType: "clients",
    entityId: data.id,
    metadata: { vipLevel: parsed.data.vipLevel, status: parsed.data.status }
  });

  revalidatePath("/clients");
  revalidatePath("/manager/clients");
}

const clientUpdateSchema = clientSchema.extend({
  clientId: z.string().min(1)
});

export async function updateClientRecord(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = clientUpdateSchema.safeParse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    instagram: formData.get("instagram") || "",
    country: formData.get("country") || "",
    preferredLanguage: formData.get("preferredLanguage") || "en",
    vipLevel: formData.get("vipLevel") || "STANDARD",
    status: formData.get("status") || "NORMAL"
  });
  if (!parsed.success) return;

  const status = parsed.data.status;

  if (isDemoAuthEnabled()) {
    revalidatePath(`/clients/${parsed.data.clientId}`);
    revalidatePath(`/manager/clients/${parsed.data.clientId}`);
    revalidatePath("/clients");
    revalidatePath("/manager/clients");
    return;
  }

  const supabase = createAdminClient();
  const normalizedPhone = normalizePhoneNumber(parsed.data.phone);
  const clientCode = customerCodeFromPhone(normalizedPhone);
  const { data: phoneOwner } = await supabase.from("clients").select("id, name").eq("client_code", clientCode).maybeSingle();
  const targetClientId = phoneOwner?.id ?? parsed.data.clientId;
  if (targetClientId !== parsed.data.clientId) {
    await mergeClientPortfolio(supabase, parsed.data.clientId, targetClientId);
  }
  const updates: Record<string, string | null> = {
      name: phoneOwner?.id && !/^unknown guest$/i.test(phoneOwner.name) ? phoneOwner.name : parsed.data.name,
      phone: normalizedPhone,
      client_code: clientCode,
      email: parsed.data.email || null,
      instagram: parsed.data.instagram || null,
      country: parsed.data.country || null,
      preferred_language: parsed.data.preferredLanguage,
      vip_level: parsed.data.vipLevel
  };
  if (profile.role !== "PROMOTER") updates.status = status;
  const { error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", targetClientId);

  if (error) throw new Error(error.message);
  await rememberClientAlias(supabase, targetClientId, parsed.data.name, "CRM_UPDATE");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "CLIENT_UPDATED",
    entityType: "clients",
    entityId: targetClientId,
    metadata: { requestedClientId: parsed.data.clientId, phoneMatchedClientId: phoneOwner?.id ?? null, vipLevel: parsed.data.vipLevel, status, country: parsed.data.country || null, preferredLanguage: parsed.data.preferredLanguage }
  });

  revalidatePath(`/clients/${targetClientId}`);
  revalidatePath(`/manager/clients/${targetClientId}`);
  revalidatePath("/clients");
  revalidatePath("/manager/clients");
}

const removeRequestSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().trim().max(400).optional().or(z.literal(""))
});

export async function removeRequestFromCrm(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = removeRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    reason: formData.get("reason") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/manager/requests");
    redirect("/manager/requests?removed=request");
  }

  const supabase = createAdminClient();
  await assertRequestRemovalAccess(supabase, profile, parsed.data.requestId);
  const { error } = await supabase
    .from("requests")
    .update({
      removed_at: new Date().toISOString(),
      removed_by: profile.id,
      removal_reason: parsed.data.reason || null
    })
    .eq("id", parsed.data.requestId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "REQUEST_REMOVED_FROM_CRM",
    entityType: "requests",
    entityId: parsed.data.requestId,
    metadata: { reason: parsed.data.reason || null }
  });

  revalidatePath("/manager/requests");
  revalidatePath(`/manager/requests/${parsed.data.requestId}`);
  redirect("/manager/requests?removed=request");
}

const removeClientSchema = z.object({
  clientId: z.string().uuid(),
  reason: z.string().trim().max(400).optional().or(z.literal(""))
});

export async function removeClientFromCrm(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = removeClientSchema.safeParse({
    clientId: formData.get("clientId"),
    reason: formData.get("reason") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/manager/clients");
    redirect("/manager/clients?removed=client");
  }

  const supabase = createAdminClient();
  await assertClientRemovalAccess(supabase, profile, parsed.data.clientId);
  const { error } = await supabase
    .from("clients")
    .update({
      removed_at: new Date().toISOString(),
      removed_by: profile.id,
      removal_reason: parsed.data.reason || null
    })
    .eq("id", parsed.data.clientId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "CLIENT_REMOVED_FROM_CRM",
    entityType: "clients",
    entityId: parsed.data.clientId,
    metadata: { reason: parsed.data.reason || null }
  });

  revalidatePath("/manager/clients");
  revalidatePath(`/manager/clients/${parsed.data.clientId}`);
  redirect("/manager/clients?removed=client");
}

const restoreCrmRecordSchema = z.object({
  recordId: z.string().uuid(),
  recordType: z.enum(["client", "request"])
});

export async function restoreCrmRecord(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = restoreCrmRecordSchema.safeParse({
    recordId: formData.get("recordId"),
    recordType: formData.get("recordType")
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/removed");
    return;
  }

  const supabase = createAdminClient();
  const table = parsed.data.recordType === "client" ? "clients" : "requests";
  const { error } = await supabase
    .from(table)
    .update({ removed_at: null, removed_by: null, removal_reason: null })
    .eq("id", parsed.data.recordId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.recordType === "client" ? "CLIENT_RESTORED_TO_CRM" : "REQUEST_RESTORED_TO_CRM",
    entityType: table,
    entityId: parsed.data.recordId,
    metadata: { restored: true }
  });

  revalidatePath("/admin/removed");
  revalidatePath("/manager/clients");
  revalidatePath("/manager/requests");
}

async function rememberClientAlias(supabase: ReturnType<typeof createAdminClient>, clientId: string, name: string, source: string) {
  const cleanName = name.trim();
  if (!cleanName || /^unknown guest$/i.test(cleanName)) return;
  await supabase.from("client_aliases").upsert({ client_id: clientId, name: cleanName, source }, { onConflict: "client_id,name", ignoreDuplicates: true });
}

async function mergeClientPortfolio(supabase: ReturnType<typeof createAdminClient>, fromClientId: string, toClientId: string) {
  if (fromClientId === toClientId) return;
  const { data: source } = await supabase.from("clients").select("name").eq("id", fromClientId).maybeSingle();
  await rememberClientAlias(supabase, toClientId, source?.name ?? "", "CRM_MERGE");
  await Promise.all([
    supabase.from("requests").update({ client_id: toClientId }).eq("client_id", fromClientId),
    supabase.from("client_notes").update({ client_id: toClientId }).eq("client_id", fromClientId),
    supabase.from("magic_links").update({ client_id: toClientId }).eq("client_id", fromClientId),
    supabase.from("retention_outreach").update({ client_id: toClientId }).eq("client_id", fromClientId),
    supabase.from("schedule_plans").update({ client_id: toClientId }).eq("client_id", fromClientId)
  ]);
}

async function assertRequestRemovalAccess(supabase: ReturnType<typeof createAdminClient>, profile: Awaited<ReturnType<typeof requireProfile>>, requestId: string) {
  if (profile.role === "SUPER_ADMIN") return;
  const { data: request } = await supabase
    .from("requests")
    .select("id, promoter_id, assigned_manager_id, club_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) throw new Error("Request not found.");
  if (request.assigned_manager_id === profile.id) return;

  const [{ data: teamPromoter }, { data: clubAssignment }] = await Promise.all([
    request.promoter_id
      ? supabase.from("profiles").select("id").eq("id", request.promoter_id).eq("manager_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("club_users").select("id").eq("club_id", request.club_id).eq("user_id", profile.id).maybeSingle()
  ]);
  if (teamPromoter || clubAssignment) return;
  throw new Error("You can only remove requests connected to your team or assigned clubs.");
}

async function assertClientRemovalAccess(supabase: ReturnType<typeof createAdminClient>, profile: Awaited<ReturnType<typeof requireProfile>>, clientId: string) {
  if (profile.role === "SUPER_ADMIN") return;
  const [{ data: ownRequest }, { data: createdClient }] = await Promise.all([
    supabase
      .from("requests")
      .select("id")
      .eq("client_id", clientId)
      .or(`assigned_manager_id.eq.${profile.id},promoter_id.in.(${await teamIdsForManager(supabase, profile.id)}),club_id.in.(${await clubIdsForManager(supabase, profile.id)})`)
      .limit(1)
      .maybeSingle(),
    supabase.from("clients").select("id").eq("id", clientId).eq("created_by_user_id", profile.id).maybeSingle()
  ]);
  if (ownRequest || createdClient) return;
  throw new Error("You can only remove clients connected to your team or assigned clubs.");
}

async function teamIdsForManager(supabase: ReturnType<typeof createAdminClient>, managerId: string) {
  const { data } = await supabase.from("profiles").select("id").eq("manager_id", managerId).eq("role", "PROMOTER");
  const ids = (data ?? []).map((item) => item.id);
  return ids.length ? ids.join(",") : "00000000-0000-0000-0000-000000000000";
}

async function clubIdsForManager(supabase: ReturnType<typeof createAdminClient>, managerId: string) {
  const { data } = await supabase.from("club_users").select("club_id").eq("user_id", managerId);
  const ids = (data ?? []).map((item) => item.club_id);
  return ids.length ? ids.join(",") : "00000000-0000-0000-0000-000000000000";
}

const assignmentSchema = z.object({
  requestId: z.string().min(1),
  promoterId: z.string().min(1).or(z.literal(""))
});

export async function assignRequestPromoter(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = assignmentSchema.safeParse({
    requestId: formData.get("requestId"),
    promoterId: formData.get("promoterId") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath(`/manager/requests/${parsed.data.requestId}`);
    revalidatePath("/manager/requests");
    return;
  }

  const supabase = await createClient();
  const promoterId = parsed.data.promoterId || null;
  const { data: request } = await supabase.from("requests").select("request_type").eq("id", parsed.data.requestId).maybeSingle();
  if (promoterId) {
    let targetQuery = supabase.from("profiles").select("id").eq("id", promoterId).eq("role", "PROMOTER").eq("active", true);
    if (profile.role === "PROMOTER_MANAGER") targetQuery = targetQuery.eq("manager_id", profile.id);
    const { data: target } = await targetQuery.maybeSingle();
    if (!target) throw new Error("Promoter is not active or outside your team.");
    if (request?.request_type) {
      const { data: eligibility } = await supabase
        .from("promoter_service_eligibility")
        .select("eligible")
        .eq("promoter_id", promoterId)
        .eq("request_type", request.request_type)
        .maybeSingle();
      if (eligibility?.eligible === false) throw new Error("This promoter is not eligible for this service type.");
    }
  }
  const { error } = await supabase
    .from("requests")
    .update({ promoter_id: promoterId, assigned_manager_id: profile.role === "PROMOTER_MANAGER" ? profile.id : null })
    .eq("id", parsed.data.requestId);

  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "REQUEST_PROMOTER_ASSIGNED",
    entityType: "requests",
    entityId: parsed.data.requestId,
    metadata: { promoterId }
  });

  revalidatePath(`/manager/requests/${parsed.data.requestId}`);
  revalidatePath("/manager/requests");
  revalidatePath("/manager");
}

const eventSchema = z.object({
  clubId: z.string().min(1),
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  eventDate: z.string().min(1),
  description: z.string().optional().or(z.literal(""))
});

export async function createEvent(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = eventSchema.safeParse({
    clubId: formData.get("clubId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    eventDate: formData.get("eventDate"),
    description: formData.get("description") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/manager/events");
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      club_id: parsed.data.clubId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      event_date: parsed.data.eventDate,
      description: parsed.data.description || null
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create event.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "EVENT_CREATED",
    entityType: "events",
    entityId: data.id,
    metadata: { slug: parsed.data.slug }
  });

  revalidatePath("/manager/events");
}

const eventUpdateSchema = eventSchema.extend({ eventId: z.string().min(1) });
export async function updateEvent(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = eventUpdateSchema.safeParse({ eventId: formData.get("eventId"), clubId: formData.get("clubId"), name: formData.get("name"), slug: formData.get("slug"), eventDate: formData.get("eventDate"), description: formData.get("description") || "" });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) { revalidatePath("/manager/events"); return; }
  const { eventId, ...event } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ club_id: event.clubId, name: event.name, slug: event.slug, event_date: event.eventDate, description: event.description || null }).eq("id", eventId);
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, { userId: profile.id, action: "EVENT_UPDATED", entityType: "events", entityId: eventId, metadata: { slug: event.slug } });
  revalidatePath("/manager/events");
}

const magicLinkSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal("")),
  promoterId: z.string().uuid(),
  clubId: z.string().uuid().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
  maxUses: z.coerce.number().int().positive().optional().or(z.literal(""))
});

export async function createMagicLink(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = magicLinkSchema.safeParse({
    clientId: formData.get("clientId") || "",
    promoterId: formData.get("promoterId") || profile.id,
    clubId: formData.get("clubId") || "",
    expiresAt: formData.get("expiresAt") || "",
    maxUses: formData.get("maxUses") || ""
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/links");
    return;
  }

  const supabase = await createClient();
  await assertPromoterOwnership(supabase, profile, parsed.data.promoterId);
  const token = randomUUID().replaceAll("-", "");
  const { data, error } = await supabase
    .from("magic_links")
    .insert({
      token,
      client_id: parsed.data.clientId || null,
      promoter_id: parsed.data.promoterId,
      club_id: parsed.data.clubId || null,
      expires_at: parsed.data.expiresAt || null,
      max_uses: parsed.data.maxUses || null
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create magic link.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "MAGIC_LINK_CREATED",
    entityType: "magic_links",
    entityId: data.id,
    metadata: { token }
  });

  revalidatePath("/links");
}

const entityStatusSchema = z.object({
  entityId: z.string().min(1),
  active: z.enum(["true", "false"]).transform((value) => value === "true")
});

const promoterServiceEligibilitySchema = z.object({
  promoterId: z.string().uuid(),
  requestType: z.enum(["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE"]),
  eligible: z.enum(["true", "false"]).transform((value) => value === "true")
});

const serviceRoutingRuleSchema = z.object({
  requestType: z.enum(["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE"]),
  defaultPromoterId: z.string().uuid().optional().or(z.literal("")),
  fallbackPromoterId: z.string().uuid().optional().or(z.literal("")),
  managerId: z.string().uuid().optional().or(z.literal("")),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
  notes: z.string().trim().max(400).optional().or(z.literal(""))
});

export async function saveServiceRoutingRule(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = serviceRoutingRuleSchema.safeParse({
    requestType: formData.get("requestType"),
    defaultPromoterId: formData.get("defaultPromoterId") || "",
    fallbackPromoterId: formData.get("fallbackPromoterId") || "",
    managerId: formData.get("managerId") || "",
    active: formData.get("active") || "false",
    notes: formData.get("notes") || ""
  });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) { revalidatePath("/admin/routing"); revalidatePath("/manager/routing"); return; }

  const supabase = await createClient();
  const defaultPromoterId = parsed.data.defaultPromoterId || null;
  const fallbackPromoterId = parsed.data.fallbackPromoterId || null;
  if (defaultPromoterId) await assertPromoterOwnership(supabase, profile, defaultPromoterId);
  if (fallbackPromoterId) await assertPromoterOwnership(supabase, profile, fallbackPromoterId);
  const managerId = profile.role === "PROMOTER_MANAGER" ? profile.id : parsed.data.managerId || null;
  if (managerId && profile.role === "SUPER_ADMIN") {
    const { data: manager } = await supabase.from("profiles").select("id").eq("id", managerId).eq("role", "PROMOTER_MANAGER").maybeSingle();
    if (!manager) throw new Error("Selected manager is not a promoter manager.");
  }

  const { data, error } = await supabase
    .from("service_routing_rules")
    .upsert({
      request_type: parsed.data.requestType,
      default_promoter_id: defaultPromoterId,
      fallback_promoter_id: fallbackPromoterId,
      manager_id: managerId,
      active: parsed.data.active,
      notes: parsed.data.notes || null,
      created_by: profile.id
    }, { onConflict: "request_type" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save routing rule.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "SERVICE_ROUTING_RULE_SAVED",
    entityType: "service_routing_rules",
    entityId: data.id,
    metadata: {
      requestType: parsed.data.requestType,
      defaultPromoterId,
      fallbackPromoterId,
      managerId,
      active: parsed.data.active
    }
  });
  revalidatePath("/admin/routing");
  revalidatePath("/manager/routing");
}

export async function setPromoterServiceEligibility(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = promoterServiceEligibilitySchema.safeParse({
    promoterId: formData.get("promoterId"),
    requestType: formData.get("requestType"),
    eligible: formData.get("eligible")
  });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) { revalidatePath("/manager/promoters"); return; }

  const supabase = await createClient();
  await assertPromoterOwnership(supabase, profile, parsed.data.promoterId);
  const { data, error } = await supabase
    .from("promoter_service_eligibility")
    .upsert({
      promoter_id: parsed.data.promoterId,
      request_type: parsed.data.requestType,
      eligible: parsed.data.eligible,
      created_by: profile.id
    }, { onConflict: "promoter_id,request_type" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not update promoter service eligibility.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.eligible ? "PROMOTER_SERVICE_ENABLED" : "PROMOTER_SERVICE_DISABLED",
    entityType: "promoter_service_eligibility",
    entityId: data.id,
    metadata: { promoterId: parsed.data.promoterId, requestType: parsed.data.requestType, eligible: parsed.data.eligible }
  });
  revalidatePath("/manager/promoters");
  revalidatePath("/links");
}

export async function setTeamPromoterActive(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = entityStatusSchema.safeParse({ entityId: formData.get("promoterId"), active: formData.get("active") });
  if (!parsed.success || parsed.data.entityId === profile.id) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/manager/promoters");
    revalidatePath(`/manager/promoters/${parsed.data.entityId}`);
    return;
  }

  const supabase = await createClient();
  let ownership = supabase.from("profiles").select("id").eq("id", parsed.data.entityId).eq("role", "PROMOTER");
  if (profile.role === "PROMOTER_MANAGER") ownership = ownership.eq("manager_id", profile.id);
  const { data: target } = await ownership.maybeSingle();
  if (!target) throw new Error("Promoter is outside your team.");

  const { error } = await supabase.from("profiles").update({ active: parsed.data.active }).eq("id", parsed.data.entityId);
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.active ? "PROMOTER_REACTIVATED" : "PROMOTER_SUSPENDED",
    entityType: "profiles",
    entityId: parsed.data.entityId,
    metadata: { active: parsed.data.active }
  });
  revalidatePath("/manager/promoters");
  revalidatePath(`/manager/promoters/${parsed.data.entityId}`);
}

export async function setEventActive(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = entityStatusSchema.safeParse({ entityId: formData.get("eventId"), active: formData.get("active") });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) { revalidatePath("/manager/events"); return; }

  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ active: parsed.data.active }).eq("id", parsed.data.entityId);
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.active ? "EVENT_REACTIVATED" : "EVENT_ARCHIVED",
    entityType: "events",
    entityId: parsed.data.entityId,
    metadata: { active: parsed.data.active }
  });
  revalidatePath("/manager/events");
}

export async function setMagicLinkActive(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = entityStatusSchema.safeParse({ entityId: formData.get("magicLinkId"), active: formData.get("active") });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) { revalidatePath("/links"); return; }

  const supabase = await createClient();
  let query = supabase.from("magic_links").update({ active: parsed.data.active }).eq("id", parsed.data.entityId);
  if (profile.role === "PROMOTER") query = query.eq("promoter_id", profile.id);
  const { error } = await query;
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.active ? "MAGIC_LINK_REACTIVATED" : "MAGIC_LINK_REVOKED",
    entityType: "magic_links",
    entityId: parsed.data.entityId,
    metadata: { active: parsed.data.active }
  });
  revalidatePath("/links");
}

const clubAssignmentSchema = z.object({
  clubId: z.string().uuid(),
  assigned: z.enum(["true", "false"]).transform((value) => value === "true")
});

export async function setManagerClubAssignment(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = clubAssignmentSchema.safeParse({ clubId: formData.get("clubId"), assigned: formData.get("assigned") });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) { revalidatePath("/manager/clubs"); return; }

  const supabase = await createClient();
  if (parsed.data.assigned) {
    const { error } = await supabase.from("club_users").upsert({ club_id: parsed.data.clubId, user_id: profile.id, role_at_club: "MANAGER" }, { onConflict: "club_id,user_id" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("club_users").delete().eq("club_id", parsed.data.clubId).eq("user_id", profile.id);
    if (error) throw new Error(error.message);
  }
  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.assigned ? "MANAGER_CLUB_ASSIGNED" : "MANAGER_CLUB_REMOVED",
    entityType: "clubs",
    entityId: parsed.data.clubId,
    metadata: { assigned: parsed.data.assigned }
  });
  revalidatePath("/manager/clubs");
}

const promoterLinkSchema = z.object({
  promoterId: z.string().uuid(),
  clubId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(3).max(100),
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/)
});

export async function createPromoterLink(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = promoterLinkSchema.safeParse({ promoterId: formData.get("promoterId"), clubId: formData.get("clubId") || "", title: formData.get("title"), slug: formData.get("slug") });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) { revalidatePath("/links"); return; }
  const supabase = await createClient();
  await assertPromoterOwnership(supabase, profile, parsed.data.promoterId);
  const { data, error } = await supabase.from("promoter_links").insert({ promoter_id: parsed.data.promoterId, club_id: parsed.data.clubId || null, title: parsed.data.title, slug: parsed.data.slug, active: true }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create promoter link.");
  await writeAuditLog(supabase, { userId: profile.id, action: "PROMOTER_LINK_CREATED", entityType: "promoter_links", entityId: data.id, metadata: { slug: parsed.data.slug } });
  revalidatePath("/links");
}

export async function setPromoterLinkActive(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = entityStatusSchema.safeParse({ entityId: formData.get("promoterLinkId"), active: formData.get("active") });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) { revalidatePath("/links"); return; }
  const supabase = await createClient();
  let query = supabase.from("promoter_links").update({ active: parsed.data.active }).eq("id", parsed.data.entityId);
  if (profile.role === "PROMOTER") query = query.eq("promoter_id", profile.id);
  const { error } = await query;
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, { userId: profile.id, action: parsed.data.active ? "PROMOTER_LINK_REACTIVATED" : "PROMOTER_LINK_ARCHIVED", entityType: "promoter_links", entityId: parsed.data.entityId, metadata: { active: parsed.data.active } });
  revalidatePath("/links");
}

const clubUpdateSchema = clubSchema.extend({ clubId: z.string().uuid() });
export async function updateClub(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = clubUpdateSchema.safeParse({ clubId: formData.get("clubId"), name: formData.get("name"), slug: formData.get("slug"), city: formData.get("city"), address: formData.get("address"), imageUrl: formData.get("imageUrl") });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/clubs");
    revalidatePath("/request");
    revalidatePath("/p/[promoterSlug]", "page");
    revalidatePath("/m/[token]", "page");
    return;
  }
  const { clubId, imageUrl, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("clubs").update({ ...values, image_url: imageUrl }).eq("id", clubId);
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, { userId: profile.id, action: "CLUB_UPDATED", entityType: "clubs", entityId: clubId, metadata: { slug: values.slug } });
  revalidatePath("/admin/clubs");
  revalidatePath("/request");
  revalidatePath("/p/[promoterSlug]", "page");
  revalidatePath("/m/[token]", "page");
}

const managerAssignmentSchema = z.object({ userId: z.string().uuid(), managerId: z.string().uuid().optional().or(z.literal("")) });
export async function assignUserManager(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = managerAssignmentSchema.safeParse({ userId: formData.get("userId"), managerId: formData.get("managerId") || "" });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) { revalidatePath("/admin/users"); return; }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ manager_id: parsed.data.managerId || null }).eq("id", parsed.data.userId).eq("role", "PROMOTER");
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, { userId: profile.id, action: "PROMOTER_MANAGER_ASSIGNED", entityType: "profiles", entityId: parsed.data.userId, metadata: { managerId: parsed.data.managerId || null } });
  revalidatePath("/admin/users"); revalidatePath("/manager/promoters");
}

export async function retryWhatsAppNotification(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) return;
  if (isDemoAuthEnabled()) { revalidatePath("/notifications"); return; }
  const supabase = await createClient();
  const { data: notification, error } = await supabase.from("whatsapp_notifications").select("id, destination_number, message, status").eq("id", notificationId).single();
  if (error || !notification) throw new Error(error?.message ?? "Notification not found.");
  const result = await sendStoredWhatsApp({ to: notification.destination_number, body: notification.message });
  const { error: updateError } = await supabase.from("whatsapp_notifications").update(result.ok ? { status: "SENT", provider_message_id: result.sid, error_message: null } : { status: "FAILED", error_message: result.error }).eq("id", notificationId);
  if (updateError) throw new Error(updateError.message);
  await writeAuditLog(supabase, { userId: profile.id, action: "WHATSAPP_NOTIFICATION_RETRIED", entityType: "whatsapp_notifications", entityId: notificationId, metadata: { success: result.ok } });
  revalidatePath("/notifications");
}

const userClubSchema = z.object({ userId: z.string().uuid(), clubId: z.string().uuid(), assigned: z.enum(["true", "false"]).transform((value) => value === "true") });
export async function setUserClubAssignment(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = userClubSchema.safeParse({ userId: formData.get("userId"), clubId: formData.get("clubId"), assigned: formData.get("assigned") });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) { revalidatePath("/admin/users"); return; }
  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("role").eq("id", parsed.data.userId).single();
  if (!target || !["PROMOTER", "PROMOTER_MANAGER"].includes(target.role)) throw new Error("Only promoter staff can be assigned to clubs.");
  if (parsed.data.assigned) {
    const { error } = await supabase.from("club_users").upsert({ club_id: parsed.data.clubId, user_id: parsed.data.userId, role_at_club: target.role === "PROMOTER_MANAGER" ? "MANAGER" : "PROMOTER" }, { onConflict: "club_id,user_id" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("club_users").delete().eq("club_id", parsed.data.clubId).eq("user_id", parsed.data.userId);
    if (error) throw new Error(error.message);
  }
  await writeAuditLog(supabase, { userId: profile.id, action: parsed.data.assigned ? "USER_CLUB_ASSIGNED" : "USER_CLUB_REMOVED", entityType: "profiles", entityId: parsed.data.userId, metadata: { clubId: parsed.data.clubId } });
  revalidatePath("/admin/users"); revalidatePath("/manager/clubs");
}

export async function setCommissionRuleActive(formData: FormData) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = entityStatusSchema.safeParse({ entityId: formData.get("ruleId"), active: formData.get("active") });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/commissions");
    revalidatePath("/manager/commissions");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("commission_rules").update({ active: parsed.data.active }).eq("id", parsed.data.entityId);
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, {
    userId: profile.id,
    action: parsed.data.active ? "COMMISSION_RULE_RESTORED" : "COMMISSION_RULE_ARCHIVED",
    entityType: "commission_rules",
    entityId: parsed.data.entityId,
    metadata: { active: parsed.data.active }
  });
  revalidatePath("/admin/commissions");
  revalidatePath("/manager/commissions");
  revalidatePath("/reports");
}

async function assertPromoterOwnership(supabase: SupabaseClient, profile: Awaited<ReturnType<typeof requireProfile>>, promoterId: string) {
  let query = supabase.from("profiles").select("id").eq("id", promoterId).eq("role", "PROMOTER").eq("active", true);
  if (profile.role === "PROMOTER") query = query.eq("id", profile.id);
  if (profile.role === "PROMOTER_MANAGER") query = query.eq("manager_id", profile.id);
  const { data, error } = await query.maybeSingle();
  if (error || !data) throw new Error("Promoter is inactive or outside your team.");
}
