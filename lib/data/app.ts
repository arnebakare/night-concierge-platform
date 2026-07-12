import { createClient } from "@/lib/supabase/server";
import type { Client, Club, ConciergeRequest, Profile, RequestStatus, RequestType } from "@/lib/types";
import { demoClients, demoProfile, demoRequests } from "@/lib/data/demo";
import { isDemoAuthEnabled } from "@/lib/env";

const requestSelect =
  "id, client_id, club_id, promoter_id, assigned_manager_id, source, request_type, status, requested_date, arrival_time, guest_count, budget, message, internal_summary, created_at, clients(name, phone, vip_level, status), clubs(name, city, slug), promoter:profiles!requests_promoter_id_fkey(name, email)";

export type RequestFilters = {
  status?: RequestStatus;
  type?: RequestType;
  date?: string;
  q?: string;
  limit?: number;
  clientOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
  clubId?: string;
  promoterId?: string;
};

export type ClientFilters = {
  q?: string;
};

export type PromoterFilters = {
  q?: string;
};

export async function getRequestsForProfile(profile: Profile, options?: RequestFilters) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("requests")
      .select(requestSelect)
      .order("requested_date", { ascending: true })
      .order("created_at", { ascending: false });

    if (options?.limit) query = query.limit(options.limit);
    if (options?.status) query = query.eq("status", options.status);
    if (options?.type) query = query.eq("request_type", options.type);
    if (options?.date) query = query.eq("requested_date", options.date);
    if (options?.dateFrom) query = query.gte("requested_date", options.dateFrom);
    if (options?.dateTo) query = query.lte("requested_date", options.dateTo);
    if (options?.clubId) query = query.eq("club_id", options.clubId);
    if (options?.promoterId) query = query.eq("promoter_id", options.promoterId);

    if (profile.role === "PROMOTER") query = query.eq("promoter_id", profile.id);
    if (profile.role === "PROMOTER_MANAGER") {
      query = query.or(`assigned_manager_id.eq.${profile.id},promoter_id.in.(${await teamIdsCsv(profile.id)})`);
    }
    if (profile.role === "CLIENT" || options?.clientOnly) {
      const { data: ownedClients } = await supabase.from("clients").select("id").eq("profile_id", profile.id);
      const ownedIds = (ownedClients ?? []).map((client) => client.id);
      if (!ownedIds.length) return [];
      query = query.in("client_id", ownedIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return applyRequestFilters(normalizeRequests(data), options);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    const requests = profile.role === "CLIENT" || options?.clientOnly ? demoRequests.slice(0, 1) : demoRequests;
    return applyRequestFilters(requests, options);
  }
}

export async function getRequestDetail(requestId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("requests").select(requestSelect).eq("id", requestId).single();
    if (error) throw error;
    const [request] = normalizeRequests([data]);
    return request ?? null;
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return demoRequests.find((request) => request.id === requestId) ?? demoRequests[0] ?? null;
  }
}

export async function getClientsForProfile(profile: Profile, filters?: ClientFilters) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, phone, email, instagram, vip_level, status")
      .order("updated_at", { ascending: false })
      .limit(80);
    if (error) throw error;
    return applyClientFilters((data ?? []) as Client[], filters);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return applyClientFilters(demoClients, filters);
  }
}

export type NoteFilters = {
  visibility?: string;
  type?: string;
};

export async function getClientProfile(clientId: string, filters?: NoteFilters) {
  try {
    const supabase = await createClient();
    const [{ data: client, error: clientError }, { data: notes, error: notesError }] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, phone, email, instagram, vip_level, status")
        .eq("id", clientId)
        .single(),
      supabase
        .from("client_notes")
        .select("note_type, visibility, content, created_at, author:profiles!client_notes_author_id_fkey(name)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(30)
    ]);
    if (clientError) throw clientError;
    if (notesError) throw notesError;
    return { client: client as Client, notes: applyNoteFilters(normalizeNotes(notes), filters) };
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return {
      client: demoClients.find((item) => item.id === clientId) ?? demoClients[0],
      notes: applyNoteFilters([
        { note_type: "PREFERENCE", visibility: "GLOBAL", content: "Prefers table near DJ booth and sparkling water on arrival." },
        { note_type: "RELIABILITY", visibility: "PRIVATE_TO_AUTHOR", content: "Usually confirms late but arrives with full group." }
      ], filters)
    };
  }
}

export async function getPromoterLinks(profile: Profile) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("promoter_links")
      .select("id, promoter_id, title, slug, active, clubs(name), profiles!promoter_links_promoter_id_fkey(name)")
      .eq(profile.role === "PROMOTER" ? "promoter_id" : "active", profile.role === "PROMOTER" ? profile.id : true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      { id: "demo-link-1", title: "La Plage Casanis VIP Requests", slug: "julia-la-plage-casanis", active: true, clubs: { name: "La Plage Casanis" }, profiles: { name: "Julia" } },
      { id: "demo-link-2", title: "Le Jade Guestlist", slug: "julia-le-jade", active: true, clubs: { name: "Le Jade" }, profiles: { name: "Julia" } },
      { id: "demo-link-3", title: "Mamzel Tables", slug: "julia-mamzel", active: true, clubs: { name: "Mamzel" }, profiles: { name: "Julia" } }
    ];
  }
}

export async function getActiveClubsForApp() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name, slug, city, address, image_url, active")
      .eq("active", true)
      .order("name");
    if (error) throw error;
    return (data ?? []) as Club[];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      { id: "10000000-0000-0000-0000-000000000001", name: "La Plage Casanis", slug: "la-plage-casanis", city: "Marbella", address: null, image_url: null, active: true },
      { id: "10000000-0000-0000-0000-000000000002", name: "Le Jade", slug: "le-jade", city: "Marbella", address: null, image_url: null, active: true },
      { id: "10000000-0000-0000-0000-000000000003", name: "Mamzel", slug: "mamzel", city: "Marbella", address: null, image_url: null, active: true }
    ];
  }
}

export async function getClubsForAdmin() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name, slug, city, address, image_url, active")
      .order("active", { ascending: false })
      .order("name");
    if (error) throw error;
    return (data ?? []) as Club[];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      { id: "10000000-0000-0000-0000-000000000001", name: "La Plage Casanis", slug: "la-plage-casanis", city: "Marbella", address: null, image_url: null, active: true },
      { id: "10000000-0000-0000-0000-000000000002", name: "Le Jade", slug: "le-jade", city: "Marbella", address: null, image_url: null, active: true },
      { id: "10000000-0000-0000-0000-000000000003", name: "Mamzel", slug: "mamzel", city: "Marbella", address: null, image_url: null, active: true }
    ];
  }
}

export async function getClubAssignmentsForAdmin() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("club_users").select("club_id, user_id, role_at_club");
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      { club_id: "10000000-0000-0000-0000-000000000001", user_id: demoProfile.id, role_at_club: "PROMOTER" },
      { club_id: "10000000-0000-0000-0000-000000000002", user_id: demoProfile.id, role_at_club: "PROMOTER" }
    ];
  }
}

export async function getTeamPromoters(managerId: string, filters?: PromoterFilters) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone, role, manager_id, active, requests!requests_promoter_id_fkey(count)")
      .eq("manager_id", managerId)
      .eq("role", "PROMOTER")
      .order("name");
    if (error) throw error;
    return applyPromoterFilters((data ?? []).map((item) => ({ ...item, request_count: Array.isArray(item.requests) ? item.requests[0]?.count ?? 0 : 0 })) as (Profile & { request_count: number })[], filters);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return applyPromoterFilters([
      { ...demoProfile, request_count: 18 },
      { ...demoProfile, id: "demo-promoter-2", name: "Daniel", email: "daniel@casanis.es", request_count: 25 }
    ], filters);
  }
}

export async function getPromoterPerformance(promoterId: string) {
  try {
    const supabase = await createClient();
    const [{ data: promoter, error: promoterError }, { data: requests, error: requestsError }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, phone, role, manager_id, active").eq("id", promoterId).eq("role", "PROMOTER").single(),
      supabase.from("requests").select("id, status, guest_count, requested_date").eq("promoter_id", promoterId).order("requested_date", { ascending: false }).limit(100)
    ]);
    if (promoterError || requestsError) throw promoterError ?? requestsError;
    return { promoter: promoter as Profile, requests: requests ?? [] };
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return {
      promoter: promoterId === "demo-promoter-2" ? { ...demoProfile, id: promoterId, name: "Daniel", email: "daniel@casanis.es" } : demoProfile,
      requests: demoRequests.map((request) => ({ id: request.id, status: request.status, guest_count: request.guest_count, requested_date: request.requested_date }))
    };
  }
}

export async function getManagerClubAssignments(managerId: string) {
  try {
    const supabase = await createClient();
    const [{ data: clubs, error: clubError }, { data: assignments, error: assignmentError }] = await Promise.all([
      supabase.from("clubs").select("id, name, slug, city, address, image_url, active").eq("active", true).order("name"),
      supabase.from("club_users").select("id, club_id, user_id, role_at_club").eq("user_id", managerId)
    ]);
    if (clubError || assignmentError) throw clubError ?? assignmentError;
    const assigned = new Set((assignments ?? []).map((item) => item.club_id));
    return ((clubs ?? []) as Club[]).map((club) => ({ ...club, assigned: assigned.has(club.id) }));
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return (await getActiveClubsForApp()).map((club) => ({ ...club, assigned: true }));
  }
}

export async function getMagicLinksForProfile(profile: Profile) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("magic_links")
      .select("id, token, promoter_id, expires_at, max_uses, use_count, active, created_at, clubs(name), profiles!magic_links_promoter_id_fkey(name)")
      .order("created_at", { ascending: false })
      .limit(30);
    if (profile.role === "PROMOTER") query = query.eq("promoter_id", profile.id);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [{ id: "magic-demo-1", token: "vipjulia2026", promoter_id: profile.id, expires_at: null, max_uses: 10, use_count: 2, active: true, created_at: new Date().toISOString(), clubs: { name: "La Plage Casanis" }, profiles: { name: "Julia" } }];
  }
}

export async function getPlatformSetting(key: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("platform_settings").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    return data?.value ?? "";
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return key === "whatsapp_destination_number" ? process.env.WHATSAPP_DESTINATION_NUMBER ?? "" : "";
  }
}

export async function getUsersForAdmin(filters?: { q?: string; role?: string; active?: string }) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone, role, manager_id, active")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return applyUserFilters((data ?? []) as Profile[], filters);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return applyUserFilters([
      { ...demoProfile, role: "SUPER_ADMIN", name: "Admin Noir", email: "admin@night.test" },
      { ...demoProfile, role: "PROMOTER_MANAGER", name: "Julia Casanis", email: "julia@casanis.es" },
      demoProfile,
      { ...demoProfile, role: "CLIENT", name: "Daniel", email: "client@night.test" }
    ] satisfies Profile[], filters);
  }
}

export async function getProfileById(profileId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("id, name, email, phone, role, manager_id, active").eq("id", profileId).single();
    if (error) throw error;
    return data as Profile;
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return demoProfile;
  }
}

export async function getClientForAccount(profileId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("clients").select("id, name, phone, email, instagram, vip_level, status").eq("profile_id", profileId).maybeSingle();
    if (error) throw error;
    return data as Client | null;
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return demoClients[0];
  }
}

export async function getEventsForProfile() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("id, club_id, name, slug, event_date, description, active, clubs(name)")
      .order("event_date", { ascending: true })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      { id: "event-1", name: "La Plage Weekend", slug: "la-plage-weekend", event_date: new Date().toISOString().slice(0, 10), description: "VIP-focused La Plage weekend requests.", active: true, clubs: { name: "La Plage Casanis" } },
      { id: "event-2", name: "Le Jade Night", slug: "le-jade-night", event_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), description: "Le Jade guestlist and table requests.", active: true, clubs: { name: "Le Jade" } }
    ];
  }
}

export async function getAuditLogsForAdmin(filters?: { q?: string; entity?: string }) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at, profiles(name, email)")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw error;
    return applyAuditFilters(data ?? [], filters);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return applyAuditFilters([
      { id: "audit-1", action: "REQUEST_STATUS_UPDATED", entity_type: "requests", entity_id: "r1", metadata: { status: "CONFIRMED" }, created_at: new Date().toISOString(), profiles: { name: "Julia", email: "julia2@casanis.es" } },
      { id: "audit-2", action: "CLIENT_UPDATED", entity_type: "clients", entity_id: "c2", metadata: { vipLevel: "SILVER" }, created_at: new Date().toISOString(), profiles: { name: "Julia Casanis", email: "julia@casanis.es" } }
    ], filters);
  }
}

export async function getNotificationHistory() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("whatsapp_notifications").select("id, request_id, destination_number, provider, provider_message_id, status, error_message, created_at, requests(clients(name), clubs(name))").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      { id: "notice-1", request_id: "r1", destination_number: "+34600000000", provider: "twilio", provider_message_id: "SM_demo", status: "SENT", error_message: null, created_at: new Date().toISOString(), requests: { clients: { name: "Daniel" }, clubs: { name: "La Plage Casanis" } } },
      { id: "notice-2", request_id: "r2", destination_number: "+34600000000", provider: "twilio", provider_message_id: null, status: "FAILED", error_message: "Demo credentials are not configured.", created_at: new Date().toISOString(), requests: { clients: { name: "Olivia" }, clubs: { name: "Le Jade" } } }
    ];
  }
}

async function teamIdsCsv(managerId: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("id").eq("manager_id", managerId);
    return (data ?? []).map((item) => item.id).join(",");
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return "";
  }
}

function normalizeRequests(data: unknown): ConciergeRequest[] {
  return ((data as ConciergeRequest[] | null) ?? []).map((request) => ({
    ...request,
    clients: Array.isArray(request.clients) ? request.clients[0] : request.clients,
    clubs: Array.isArray(request.clubs) ? request.clubs[0] : request.clubs,
    promoter: Array.isArray(request.promoter) ? request.promoter[0] : request.promoter
  }));
}

function normalizeNotes(data: unknown) {
  return ((data as { note_type: string; visibility: string; content: string; created_at?: string; author?: { name?: string } | { name?: string }[] | null }[] | null) ?? []).map((note) => ({
    ...note,
    author: Array.isArray(note.author) ? note.author[0] : note.author
  }));
}

function applyRequestFilters(requests: ConciergeRequest[], filters?: RequestFilters) {
  if (!filters) return requests;
  const query = filters.q?.trim().toLowerCase();

  return requests.filter((request) => {
    if (filters.status && request.status !== filters.status) return false;
    if (filters.type && request.request_type !== filters.type) return false;
    if (filters.date && request.requested_date !== filters.date) return false;
    if (filters.dateFrom && request.requested_date < filters.dateFrom) return false;
    if (filters.dateTo && request.requested_date > filters.dateTo) return false;
    if (filters.clubId && request.club_id !== filters.clubId) return false;
    if (filters.promoterId && request.promoter_id !== filters.promoterId) return false;
    if (!query) return true;

    return [
      request.clients?.name,
      request.clients?.phone,
      request.clubs?.name,
      request.promoter?.name,
      request.message,
      request.budget
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
}

function applyUserFilters(users: Profile[], filters?: { q?: string; role?: string; active?: string }) {
  const query = filters?.q?.trim().toLowerCase();
  return users.filter((user) => {
    if (filters?.role && user.role !== filters.role) return false;
    if (filters?.active === "active" && !user.active) return false;
    if (filters?.active === "suspended" && user.active) return false;
    return !query || `${user.name ?? ""} ${user.email ?? ""} ${user.phone ?? ""}`.toLowerCase().includes(query);
  });
}

function applyAuditFilters<T extends { action: string; entity_type: string; entity_id: string }>(logs: T[], filters?: { q?: string; entity?: string }) {
  const query = filters?.q?.trim().toLowerCase();
  return logs.filter((log) => (!filters?.entity || log.entity_type === filters.entity) && (!query || `${log.action} ${log.entity_type} ${log.entity_id}`.toLowerCase().includes(query)));
}

function applyPromoterFilters<T extends Profile>(promoters: T[], filters?: PromoterFilters): T[] {
  const query = filters?.q?.trim().toLowerCase();
  if (!query) return promoters;
  return promoters.filter((promoter) => `${promoter.name ?? ""} ${promoter.email ?? ""} ${promoter.phone ?? ""}`.toLowerCase().includes(query));
}

function applyClientFilters(clients: Client[], filters?: ClientFilters) {
  const query = filters?.q?.trim().toLowerCase();
  if (!query) return clients;

  return clients.filter((client) =>
    [
      client.name,
      client.phone,
      client.email,
      client.instagram,
      client.vip_level,
      client.status
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  );
}

function applyNoteFilters(
  notes: { note_type: string; visibility: string; content: string; created_at?: string; author?: { name?: string } | null }[],
  filters?: NoteFilters
) {
  return notes.filter((note) => {
    if (filters?.visibility && note.visibility !== filters.visibility) return false;
    if (filters?.type && note.note_type !== filters.type) return false;
    return true;
  });
}
