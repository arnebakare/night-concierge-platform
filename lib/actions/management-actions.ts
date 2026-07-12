"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { isDemoAuthEnabled } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/services/audit";
import { sendStoredWhatsApp } from "@/lib/services/whatsapp";
import { importEventsFromConfiguredSources } from "@/lib/services/event-import";
import type { SupabaseClient } from "@supabase/supabase-js";

const statusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["NEW", "CONTACTED", "PENDING", "CONFIRMED", "ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"])
});

export async function updateRequestStatus(formData: FormData) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const parsed = statusSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status")
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/requests");
    revalidatePath("/manager/requests");
    revalidatePath(`/requests/${parsed.data.requestId}`);
    revalidatePath(`/manager/requests/${parsed.data.requestId}`);
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

const clubSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  city: z.string().min(2),
  address: z.string().optional()
});

export async function createClub(formData: FormData) {
  const profile = await requireProfile(["SUPER_ADMIN"]);
  const parsed = clubSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    city: formData.get("city"),
    address: formData.get("address") || null
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/admin/clubs");
    revalidatePath("/request");
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("clubs").insert(parsed.data).select("id").single();
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

const requestTypesForServices = ["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL"] as const;
const serviceIconNames = ["Calendar", "Crown", "GlassWater", "Music2", "Sparkles", "Sun", "Utensils", "Users", "Waves"] as const;
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
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  instagram: z.string().optional().or(z.literal("")),
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
    vipLevel: formData.get("vipLevel") || "STANDARD",
    status: formData.get("status") || "NORMAL"
  });
  if (!parsed.success) return;

  if (isDemoAuthEnabled()) {
    revalidatePath("/clients");
    revalidatePath("/manager/clients");
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      instagram: parsed.data.instagram || null,
      vip_level: parsed.data.vipLevel,
      status: parsed.data.status,
      created_by_user_id: profile.id
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create client.");

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "CLIENT_CREATED",
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

  const supabase = await createClient();
  const updates: Record<string, string | null> = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      instagram: parsed.data.instagram || null,
      vip_level: parsed.data.vipLevel
  };
  if (profile.role !== "PROMOTER") updates.status = status;
  const { error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", parsed.data.clientId);

  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    userId: profile.id,
    action: "CLIENT_UPDATED",
    entityType: "clients",
    entityId: parsed.data.clientId,
    metadata: { vipLevel: parsed.data.vipLevel, status }
  });

  revalidatePath(`/clients/${parsed.data.clientId}`);
  revalidatePath(`/manager/clients/${parsed.data.clientId}`);
  revalidatePath("/clients");
  revalidatePath("/manager/clients");
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
  if (promoterId) {
    let targetQuery = supabase.from("profiles").select("id").eq("id", promoterId).eq("role", "PROMOTER").eq("active", true);
    if (profile.role === "PROMOTER_MANAGER") targetQuery = targetQuery.eq("manager_id", profile.id);
    const { data: target } = await targetQuery.maybeSingle();
    if (!target) throw new Error("Promoter is not active or outside your team.");
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
  const parsed = clubUpdateSchema.safeParse({ clubId: formData.get("clubId"), name: formData.get("name"), slug: formData.get("slug"), city: formData.get("city"), address: formData.get("address") || undefined });
  if (!parsed.success) return;
  if (isDemoAuthEnabled()) { revalidatePath("/admin/clubs"); return; }
  const { clubId, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("clubs").update(values).eq("id", clubId);
  if (error) throw new Error(error.message);
  await writeAuditLog(supabase, { userId: profile.id, action: "CLUB_UPDATED", entityType: "clubs", entityId: clubId, metadata: { slug: values.slug } });
  revalidatePath("/admin/clubs"); revalidatePath("/request");
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

async function assertPromoterOwnership(supabase: SupabaseClient, profile: Awaited<ReturnType<typeof requireProfile>>, promoterId: string) {
  let query = supabase.from("profiles").select("id").eq("id", promoterId).eq("role", "PROMOTER").eq("active", true);
  if (profile.role === "PROMOTER") query = query.eq("id", profile.id);
  if (profile.role === "PROMOTER_MANAGER") query = query.eq("manager_id", profile.id);
  const { data, error } = await query.maybeSingle();
  if (error || !data) throw new Error("Promoter is inactive or outside your team.");
}
