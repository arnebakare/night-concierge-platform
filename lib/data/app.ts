import { createClient } from "@/lib/supabase/server";
import type { AvailabilitySlot, Client, ClientAlias, ClientBookingHistoryItem, ClientCareSignal, ClientFollowUpTask, ClientOutreachItem, Club, CommissionRule, ConciergeEvent, ConciergePackage, ConciergeRequest, InboundWhatsAppMessage, MessageTemplate, Profile, PromoterServiceEligibility, RequestOffer, RequestPayment, RequestStatus, RequestType, SchedulePlan, ScheduleVenueRule } from "@/lib/types";
import { demoClients, demoProfile, demoRequests } from "@/lib/data/demo";
import { isDemoAuthEnabled } from "@/lib/env";

const requestSelect =
  "id, client_id, club_id, promoter_id, assigned_manager_id, source, request_type, status, requested_date, requested_date_end, arrival_time, guest_count, budget, message, internal_summary, created_at, clients(name, phone, client_code, country, preferred_language, vip_level, status), clubs(name, city, slug), promoter:profiles!requests_promoter_id_fkey(name, email)";

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
  includeArchived?: boolean;
};

export type ClientFilters = {
  q?: string;
};

export type PromoterFilters = {
  q?: string;
};

export type RetentionClient = Client & {
  last_request_date: string | null;
  last_outreach_at: string | null;
  days_since_booking: number | null;
};

export type RequestActivityItem = {
  id: string;
  type: "status" | "offer" | "whatsapp" | "audit";
  label: string;
  detail: string;
  created_at: string;
  tone: "neutral" | "good" | "warning" | "bad";
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
    if (!options?.status && !options?.includeArchived) query = query.not("status", "in", "(ARRIVED,NO_SHOW,DECLINED,CANCELLED)");

    if (profile.role === "PROMOTER") query = query.eq("promoter_id", profile.id);
    if (profile.role === "PROMOTER_MANAGER") {
      const scopedRules = [`assigned_manager_id.eq.${profile.id}`];
      const teamIds = await teamIdsCsv(profile.id);
      const clubIds = await managerClubIdsCsv(profile.id);
      if (teamIds) scopedRules.push(`promoter_id.in.(${teamIds})`);
      if (clubIds) scopedRules.push(`club_id.in.(${clubIds})`);
      query = query.or(scopedRules.join(","));
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

export async function getRequestCommerce(request: ConciergeRequest) {
  try {
    const supabase = await createClient();
    const [{ data: slots, error: slotsError }, { data: offers, error: offersError }, { data: payments, error: paymentsError }] = await Promise.all([
      supabase
        .from("availability_slots")
        .select("id, club_id, service_type, slot_date, title, area, min_spend, capacity, status, notes, active, created_by, created_at, updated_at, clubs(name, city, slug)")
        .eq("club_id", request.club_id)
        .eq("slot_date", request.requested_date)
        .eq("active", true)
        .order("status")
        .order("title"),
      supabase
        .from("request_offers")
        .select("id, request_id, availability_slot_id, created_by, offer_status, venue_name, offer_date, service_label, arrival_time, guest_count, min_spend, message, sent_at, created_at, updated_at, profiles(name, email)")
        .eq("request_id", request.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("request_payments")
        .select("id, request_id, client_id, created_by, provider, provider_checkout_session_id, provider_payment_intent_id, amount_cents, currency, description, status, checkout_url, paid_at, created_at, updated_at, profiles(name, email)")
        .eq("request_id", request.id)
        .order("created_at", { ascending: false })
    ]);
    if (slotsError || offersError || paymentsError) throw slotsError ?? offersError ?? paymentsError;
    return {
      slots: normalizeAvailabilitySlots(slots),
      offers: normalizeRequestOffers(offers),
      payments: normalizeRequestPayments(payments)
    };
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return {
      slots: demoAvailabilitySlots(request),
      offers: demoRequestOffers(request),
      payments: demoRequestPayments(request)
    };
  }
}

export async function getPaymentsForProfile(profile: Profile): Promise<RequestPayment[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("request_payments")
      .select("id, request_id, client_id, created_by, provider, provider_checkout_session_id, provider_payment_intent_id, amount_cents, currency, description, status, checkout_url, paid_at, created_at, updated_at, profiles(name, email), requests(id, club_id, promoter_id, requested_date, clients(name, phone), clubs(name))")
      .order("created_at", { ascending: false })
      .limit(120);

    if (profile.role === "PROMOTER") {
      const { data: ownRequests } = await supabase.from("requests").select("id").eq("promoter_id", profile.id).limit(500);
      const ids = (ownRequests ?? []).map((request) => request.id);
      if (!ids.length) return [];
      query = query.in("request_id", ids);
    }

    if (profile.role === "PROMOTER_MANAGER") {
      const teamIds = await teamIdsCsv(profile.id);
      const clubIds = await managerClubIdsCsv(profile.id);
      const requestQuery = supabase.from("requests").select("id").or([
        `assigned_manager_id.eq.${profile.id}`,
        teamIds ? `promoter_id.in.(${teamIds})` : "",
        clubIds ? `club_id.in.(${clubIds})` : ""
      ].filter(Boolean).join(",")).limit(500);
      const { data: scopedRequests } = await requestQuery;
      const ids = (scopedRequests ?? []).map((request) => request.id);
      if (!ids.length) return [];
      query = query.in("request_id", ids);
    }

    const { data, error } = await query;
    if (error) throw error;
    return normalizeRequestPayments(data);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return demoRequests.flatMap((request) => demoRequestPayments(request));
  }
}

export async function getAvailabilitySlotsForProfile(profile: Profile, options?: { date?: string; clubId?: string }) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("availability_slots")
      .select("id, club_id, service_type, slot_date, title, area, min_spend, capacity, status, notes, active, created_by, created_at, updated_at, clubs(name, city, slug)")
      .eq("active", true)
      .order("slot_date", { ascending: true })
      .order("status")
      .order("title")
      .limit(120);
    if (options?.date) query = query.eq("slot_date", options.date);
    if (options?.clubId) query = query.eq("club_id", options.clubId);
    if (profile.role === "PROMOTER_MANAGER") {
      const clubIds = await managerClubIdsCsv(profile.id);
      if (!clubIds) return [];
      query = query.in("club_id", clubIds.split(","));
    }
    const { data, error } = await query;
    if (error) throw error;
    return normalizeAvailabilitySlots(data);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    const demoRequest = demoRequests[0];
    return demoAvailabilitySlots(demoRequest).filter((slot) => !options?.date || slot.slot_date === options.date);
  }
}

export async function getClientsForProfile(profile: Profile, filters?: ClientFilters) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, phone, client_code, email, instagram, country, preferred_language, vip_level, status")
      .order("updated_at", { ascending: false })
      .limit(80);
    if (error) throw error;
    return applyClientFilters((data ?? []) as Client[], filters);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return applyClientFilters(demoClients, filters);
  }
}

export async function getRetentionClientsForProfile(profile: Profile, days = 45): Promise<RetentionClient[]> {
  const today = new Date();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, phone, email, instagram, country, preferred_language, vip_level, status, requests(requested_date, created_at), retention_outreach(created_at)")
      .neq("status", "BLOCKED")
      .limit(120);
    if (error) throw error;
    return buildRetentionClients(data, days, today);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return buildRetentionClients(demoClients.map((client, index) => ({
      ...client,
      requests: index === 0 ? [{ requested_date: new Date(Date.now() - 62 * 86400000).toISOString().slice(0, 10), created_at: new Date(Date.now() - 62 * 86400000).toISOString() }] : [],
      retention_outreach: index === 1 ? [{ created_at: new Date(Date.now() - 12 * 86400000).toISOString() }] : []
    })), days, today);
  }
}

export async function getOpenFollowUpTasksForProfile(profile: Profile, options?: { priority?: "HIGH" | "NORMAL" | "LOW"; dueBefore?: string }): Promise<ClientFollowUpTask[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("client_follow_up_tasks")
      .select("id, client_id, assigned_to, created_by, title, due_date, priority, status, completed_at, created_at, updated_at, assignee:profiles!client_follow_up_tasks_assigned_to_fkey(name, email), creator:profiles!client_follow_up_tasks_created_by_fkey(name, email), clients(name, phone)")
      .eq("status", "OPEN")
      .order("priority", { ascending: false })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (profile.role === "PROMOTER") query = query.eq("assigned_to", profile.id);
    if (options?.priority) query = query.eq("priority", options.priority);
    if (options?.dueBefore) query = query.lte("due_date", options.dueBefore);
    const { data, error } = await query;
    if (error) throw error;
    return normalizeClientFollowUpTasks(data);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [{
      id: "task-demo-1",
      client_id: "c1",
      assigned_to: profile.id,
      created_by: profile.id,
      title: "Send weekend options",
      due_date: new Date().toISOString().slice(0, 10),
      priority: "HIGH",
      status: "OPEN",
      completed_at: null,
      created_at: new Date().toISOString(),
      assignee: { name: profile.name, email: profile.email },
      creator: { name: profile.name, email: profile.email }
    }];
  }
}

export async function getClientCareSignalsForProfile(profile: Profile): Promise<Record<string, ClientCareSignal>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("client_follow_up_tasks")
      .select("client_id, due_date, priority, status, assigned_to")
      .eq("status", "OPEN")
      .limit(500);
    if (profile.role === "PROMOTER") query = query.eq("assigned_to", profile.id);
    const { data, error } = await query;
    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);
    return ((data as Array<Pick<ClientFollowUpTask, "client_id" | "due_date" | "priority" | "status">> | null) ?? []).reduce<Record<string, ClientCareSignal>>((signals, task) => {
      const existing = signals[task.client_id] ?? {
        client_id: task.client_id,
        open_tasks: 0,
        overdue_tasks: 0,
        high_priority_tasks: 0,
        next_due_date: null
      };
      existing.open_tasks += 1;
      if (task.due_date && task.due_date < today) existing.overdue_tasks += 1;
      if (task.priority === "HIGH") existing.high_priority_tasks += 1;
      if (task.due_date && (!existing.next_due_date || task.due_date < existing.next_due_date)) {
        existing.next_due_date = task.due_date;
      }
      signals[task.client_id] = existing;
      return signals;
    }, {});
  } catch (error) {
    if (!isDemoAuthEnabled()) return {};
    return {
      c1: {
        client_id: "c1",
        open_tasks: 1,
        overdue_tasks: 0,
        high_priority_tasks: 1,
        next_due_date: new Date().toISOString().slice(0, 10)
      }
    };
  }
}

export type NoteFilters = {
  visibility?: string;
  type?: string;
};

export async function getClientProfile(clientId: string, filters?: NoteFilters) {
  try {
    const supabase = await createClient();
    const [{ data: client, error: clientError }, { data: notes, error: notesError }, { data: aliases, error: aliasError }, { data: history, error: historyError }, { data: outreach, error: outreachError }, tasksResult] = await Promise.all([
      supabase
        .from("clients")
        .select("id, name, phone, client_code, email, instagram, country, preferred_language, vip_level, status")
        .eq("id", clientId)
        .single(),
      supabase
        .from("client_notes")
        .select("note_type, visibility, content, created_at, author:profiles!client_notes_author_id_fkey(name)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(30)
      ,
      supabase
        .from("client_aliases")
        .select("name, source, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(12)
      ,
      supabase
        .from("requests")
        .select("id, requested_date, arrival_time, guest_count, request_type, status, budget, created_at, clubs(name, city, slug), promoter:profiles!requests_promoter_id_fkey(name, email)")
        .eq("client_id", clientId)
        .order("requested_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20)
      ,
      supabase
        .from("retention_outreach")
        .select("id, channel, destination, message, status, automatic, created_at, profiles(name, email)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20)
      ,
      supabase
        .from("client_follow_up_tasks")
        .select("id, client_id, assigned_to, created_by, title, due_date, priority, status, completed_at, created_at, updated_at, assignee:profiles!client_follow_up_tasks_assigned_to_fkey(name, email), creator:profiles!client_follow_up_tasks_created_by_fkey(name, email)")
        .eq("client_id", clientId)
        .order("status", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(30)
    ]);
    if (clientError) throw clientError;
    if (notesError) throw notesError;
    if (aliasError) throw aliasError;
    if (historyError) throw historyError;
    if (outreachError) throw outreachError;
    return {
      client: client as Client,
      notes: applyNoteFilters(normalizeNotes(notes), filters),
      aliases: (aliases ?? []) as ClientAlias[],
      history: normalizeClientHistory(history),
      outreach: normalizeClientOutreach(outreach),
      tasks: tasksResult.error ? [] : normalizeClientFollowUpTasks(tasksResult.data)
    };
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return {
      client: demoClients.find((item) => item.id === clientId) ?? demoClients[0],
      aliases: [{ name: "Daniel Sjoestrand", source: "Demo", created_at: new Date().toISOString() }],
      history: demoRequests
        .filter((request) => request.client_id === clientId || clientId === "c1")
        .slice(0, 6)
        .map((request) => ({
          id: request.id,
          requested_date: request.requested_date,
          arrival_time: request.arrival_time,
          guest_count: request.guest_count,
          request_type: request.request_type,
          status: request.status,
          budget: request.budget,
          created_at: request.created_at,
          clubs: request.clubs,
          promoter: request.promoter
        })),
      notes: applyNoteFilters([
        { note_type: "PREFERENCE", visibility: "GLOBAL", content: "Prefers table near DJ booth and sparkling water on arrival." },
        { note_type: "RELIABILITY", visibility: "PRIVATE_TO_AUTHOR", content: "Usually confirms late but arrives with full group." }
      ], filters),
      outreach: [{
        id: "outreach-demo-1",
        channel: "WHATSAPP",
        destination: "+34600000000",
        message: "Hi Daniel, hope you are well. Are you back in Marbella soon?",
        status: "SENT",
        automatic: false,
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
        profiles: { name: "Julia", email: "julia@casanis.es" }
      }] satisfies ClientOutreachItem[],
      tasks: [{
        id: "task-demo-1",
        client_id: clientId,
        assigned_to: demoProfile.id,
        created_by: demoProfile.id,
        title: "Ask if they are coming back to Marbella this weekend",
        due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        priority: "NORMAL",
        status: "OPEN",
        completed_at: null,
        created_at: new Date().toISOString(),
        assignee: { name: "Julia", email: "julia@casanis.es" },
        creator: { name: "Julia", email: "julia@casanis.es" }
      }] satisfies ClientFollowUpTask[]
    };
  }
}

export async function getPromoterLinks(profile: Profile) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("promoter_links")
      .select("id, promoter_id, title, slug, active, clubs(name), profiles!promoter_links_promoter_id_fkey(name)")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (profile.role === "PROMOTER") query = query.eq("promoter_id", profile.id);
    const { data, error } = await query;
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
    let { data, error } = await supabase
      .from("clubs")
      .select("id, name, slug, city, address, image_url, active, venue_kind, brand_config, service_config")
      .eq("active", true)
      .order("name");
    if (error && /venue_kind/i.test(error.message)) {
      const fallback = await supabase
        .from("clubs")
        .select("id, name, slug, city, address, image_url, active, brand_config, service_config")
        .eq("active", true)
        .order("name");
      data = fallback.data?.map((club) => ({ ...club, venue_kind: "VENUE" })) ?? null;
      error = fallback.error;
    }
    if (error) throw error;
    return (data ?? []) as Club[];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      { id: "10000000-0000-0000-0000-000000000001", name: "La Plage Casanis", slug: "la-plage-casanis", city: "Marbella", address: null, image_url: "/venues/la-plage-casanis-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000002", name: "Le Jade", slug: "le-jade", city: "Marbella", address: null, image_url: "/venues/le-jade-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000003", name: "Mamzel", slug: "mamzel", city: "Marbella", address: null, image_url: "/venues/mamzel-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000004", name: "Playa Padre", slug: "playa-padre", city: "Marbella", address: null, image_url: "/venues/playa-padre-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000005", name: "Momento", slug: "momento", city: "Marbella", address: null, image_url: "/venues/momento-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000006", name: "Motel Particulier", slug: "motel-particulier", city: "Marbella", address: null, image_url: "/venues/motel-particulier-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000007", name: "La Cabane", slug: "la-cabane", city: "Marbella", address: null, image_url: "/venues/la-cabane-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000008", name: "Bon Bonniere", slug: "bon-bonniere", city: "Marbella", address: null, image_url: "/venues/bon-bonniere-logo.png", active: true }
    ];
  }
}

export async function getClubsForAdmin() {
  try {
    const supabase = await createClient();
    let { data, error } = await supabase
      .from("clubs")
      .select("id, name, slug, city, address, image_url, active, venue_kind, brand_config, service_config")
      .order("active", { ascending: false })
      .order("name");
    if (error && /venue_kind/i.test(error.message)) {
      const fallback = await supabase
        .from("clubs")
        .select("id, name, slug, city, address, image_url, active, brand_config, service_config")
        .order("active", { ascending: false })
        .order("name");
      data = fallback.data?.map((club) => ({ ...club, venue_kind: "VENUE" })) ?? null;
      error = fallback.error;
    }
    if (error) throw error;
    return (data ?? []) as Club[];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      { id: "10000000-0000-0000-0000-000000000001", name: "La Plage Casanis", slug: "la-plage-casanis", city: "Marbella", address: null, image_url: "/venues/la-plage-casanis-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000002", name: "Le Jade", slug: "le-jade", city: "Marbella", address: null, image_url: "/venues/le-jade-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000003", name: "Mamzel", slug: "mamzel", city: "Marbella", address: null, image_url: "/venues/mamzel-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000004", name: "Playa Padre", slug: "playa-padre", city: "Marbella", address: null, image_url: "/venues/playa-padre-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000005", name: "Momento", slug: "momento", city: "Marbella", address: null, image_url: "/venues/momento-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000006", name: "Motel Particulier", slug: "motel-particulier", city: "Marbella", address: null, image_url: "/venues/motel-particulier-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000007", name: "La Cabane", slug: "la-cabane", city: "Marbella", address: null, image_url: "/venues/la-cabane-logo.png", active: true },
      { id: "10000000-0000-0000-0000-000000000008", name: "Bon Bonniere", slug: "bon-bonniere", city: "Marbella", address: null, image_url: "/venues/bon-bonniere-logo.png", active: true }
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

export async function getPromoterServiceEligibilityForProfile(profile: Profile): Promise<PromoterServiceEligibility[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("promoter_service_eligibility")
      .select("id, promoter_id, request_type, eligible, notes, created_by, created_at, updated_at, profiles(name, email)")
      .order("request_type");
    if (profile.role === "PROMOTER") query = query.eq("promoter_id", profile.id);
    if (profile.role === "PROMOTER_MANAGER") {
      const teamIds = await teamIdsCsv(profile.id);
      if (!teamIds) return [];
      query = query.in("promoter_id", teamIds.split(","));
    }
    const { data, error } = await query;
    if (error) throw error;
    return normalizePromoterEligibility(data);
  } catch (error) {
    if (error instanceof Error && /promoter_service_eligibility/i.test(error.message)) return [];
    if (!isDemoAuthEnabled()) throw error;
    return [];
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
    let { data: clubs, error: clubError } = await supabase
      .from("clubs")
      .select("id, name, slug, city, address, image_url, active, venue_kind")
      .eq("active", true)
      .order("name");
    if (clubError && /venue_kind/i.test(clubError.message)) {
      const fallback = await supabase
        .from("clubs")
        .select("id, name, slug, city, address, image_url, active")
        .eq("active", true)
        .order("name");
      clubs = fallback.data?.map((club) => ({ ...club, venue_kind: "VENUE" })) ?? null;
      clubError = fallback.error;
    }
    const { data: assignments, error: assignmentError } = await supabase
      .from("club_users")
      .select("id, club_id, user_id, role_at_club")
      .eq("user_id", managerId);
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
      .select("id, token, promoter_id, expires_at, max_uses, use_count, active, created_at, clubs(name), profiles!magic_links_promoter_id_fkey(name, phone)")
      .order("created_at", { ascending: false })
      .limit(30);
    if (profile.role === "PROMOTER") query = query.eq("promoter_id", profile.id);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [{ id: "magic-demo-1", token: "vipjulia2026", promoter_id: profile.id, expires_at: null, max_uses: 10, use_count: 2, active: true, created_at: new Date().toISOString(), clubs: { name: "La Plage Casanis" }, profiles: { name: "Julia", phone: "+34 600 111 222" } }];
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

export async function getMessageTemplates() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("message_templates")
      .select("id, key, label, channel, language, body, active, updated_at")
      .order("key")
      .order("language");
    if (error) throw error;
    return (data ?? []) as MessageTemplate[];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return demoMessageTemplates();
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

export async function getCommissionRulesForProfile(profile: Profile): Promise<CommissionRule[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("commission_rules")
      .select("id, promoter_id, club_id, request_type, rate_percent, flat_fee_cents, label, notes, active, created_by, created_at, updated_at, profiles(name, email), clubs(name, slug)")
      .order("active", { ascending: false })
      .order("created_at", { ascending: false });

    if (profile.role === "PROMOTER_MANAGER") {
      const teamIds = await teamIdsCsv(profile.id);
      const scopedRules = ["promoter_id.is.null"];
      if (teamIds) scopedRules.push(`promoter_id.in.(${teamIds})`);
      query = query.or(scopedRules.join(","));
    }

    let { data, error } = await query.limit(100);
    if (error && /label|notes/i.test(error.message)) {
      const fallback = await supabase
        .from("commission_rules")
        .select("id, promoter_id, club_id, request_type, rate_percent, flat_fee_cents, active, created_by, created_at, updated_at, profiles(name, email), clubs(name, slug)")
        .order("active", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      data = fallback.data?.map((rule) => ({ ...rule, label: null, notes: null })) ?? null;
      error = fallback.error;
    }
    if (error) throw error;
    return normalizeCommissionRules(data);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      { id: "rule-demo-1", promoter_id: null, club_id: null, request_type: "TABLE", rate_percent: 10, flat_fee_cents: 0, active: true, created_by: demoProfile.id, profiles: null, clubs: null },
      { id: "rule-demo-2", promoter_id: "demo-promoter-2", club_id: null, request_type: "VIP_SERVICE", rate_percent: 12.5, flat_fee_cents: 5000, active: true, created_by: demoProfile.id, profiles: { name: "Daniel", email: "daniel@casanis.es" }, clubs: null }
    ];
  }
}

export async function getConciergePackagesForProfile(profile: Profile): Promise<ConciergePackage[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("concierge_packages")
      .select("id, title, slug, description, request_type, price_hint, tailored_client_id, active, package_items, created_by, created_at, updated_at, clients(name, phone)")
      .order("active", { ascending: false })
      .order("created_at", { ascending: false });
    if (profile.role === "PROMOTER") query = query.eq("active", true);
    const { data, error } = await query.limit(100);
    if (error) throw error;
    return normalizeConciergePackages(data);
  } catch (error) {
    if (error instanceof Error && /concierge_packages/i.test(error.message)) return [];
    if (!isDemoAuthEnabled()) throw error;
    return [
      {
        id: "package-demo-1",
        title: "Marbella Weekend Starter",
        slug: "marbella-weekend-starter",
        description: "Beach club, dinner, nightlife, and transfers.",
        request_type: "PACKAGE",
        price_hint: "Tailored after dates and group size",
        tailored_client_id: null,
        active: true,
        package_items: ["Beach club day", "Dinner reservation", "Nightclub table or guestlist", "Transfer plan"],
        created_by: demoProfile.id,
        created_at: new Date().toISOString(),
        clients: null
      }
    ];
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
    const { data, error } = await supabase.from("clients").select("id, name, phone, client_code, email, instagram, country, preferred_language, vip_level, status").eq("profile_id", profileId).maybeSingle();
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
      .select("id, club_id, name, slug, event_date, description, active, source_url, source_key, imported_at, clubs(name)")
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

export async function getEventsForSchedule(from: string, to: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("id, club_id, name, slug, event_date, description, active, source_url, source_key, imported_at, clubs(name, city, slug)")
      .eq("active", true)
      .gte("event_date", from)
      .lte("event_date", to)
      .order("event_date", { ascending: true })
      .order("name", { ascending: true })
      .limit(120);
    if (error) throw error;
    return ((data ?? []) as Array<Omit<ConciergeEvent, "clubs"> & { clubs?: ConciergeEvent["clubs"] | ConciergeEvent["clubs"][] }>).map((event) => ({
      ...event,
      clubs: Array.isArray(event.clubs) ? event.clubs[0] ?? null : event.clubs ?? null
    }));
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    return [
      { id: "schedule-1", club_id: "club-1", name: "La Plage Sunset Session", slug: "la-plage-sunset-session", event_date: today, description: "Start clients with a polished beach-club dinner and sunset booking.", active: true, clubs: { name: "La Plage Casanis", city: "Marbella", slug: "la-plage-casanis" } },
      { id: "schedule-2", club_id: "club-2", name: "Le Jade After Party", slug: "le-jade-after-party", event_date: today, description: "Late-night after-party option for clients who want to continue.", active: true, clubs: { name: "Le Jade", city: "Marbella", slug: "le-jade" } },
      { id: "schedule-3", club_id: "club-3", name: "Momento Guestlist", slug: "momento-guestlist", event_date: tomorrow, description: "Club-night option for table or guestlist clients.", active: true, clubs: { name: "Momento", city: "Marbella", slug: "momento" } }
    ].filter((event) => event.event_date >= from && event.event_date <= to) as ConciergeEvent[];
  }
}

export async function getSchedulePlansForProfile(profile: Profile) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("schedule_plans")
      .select("id, user_id, client_id, title, city, date_from, date_to, spend_profile, prompt_text, message, plan, source, created_at, clients(name, phone), profiles(name, email)")
      .order("created_at", { ascending: false })
      .limit(30);
    if (profile.role === "PROMOTER") query = query.eq("user_id", profile.id);
    const { data, error } = await query;
    if (error) throw error;
    return normalizeSchedulePlans(data);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return demoSchedulePlans();
  }
}

export async function getSchedulePlanDetail(planId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("schedule_plans")
      .select("id, user_id, client_id, title, city, date_from, date_to, spend_profile, prompt_text, message, plan, source, created_at, clients(name, phone), profiles(name, email)")
      .eq("id", planId)
      .single();
    if (error) throw error;
    return normalizeSchedulePlans([data])[0] ?? null;
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return demoSchedulePlans().find((plan) => plan.id === planId) ?? demoSchedulePlans()[0] ?? null;
  }
}

export async function getScheduleVenueRules(options?: { activeOnly?: boolean }) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("schedule_venue_rules")
      .select("id, venue_name, venue_type, area, priority_days, weight, avoid_after_venue_names, guidance, active, created_at, updated_at")
      .order("active", { ascending: false })
      .order("weight", { ascending: false })
      .order("venue_name");
    if (options?.activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) throw error;
    return normalizeScheduleVenueRules(data);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    const rules = demoScheduleVenueRules();
    return options?.activeOnly ? rules.filter((rule) => rule.active) : rules;
  }
}

export async function getEventImportRuns() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_import_runs")
      .select("id, source_slug, source_name, source_url, status, http_status, message, events_found, events_created, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      {
        id: "run-1",
        source_slug: "la-plage-casanis",
        source_name: "La Plage Casanis",
        source_url: "https://laplagecasanis.com/whats-on/",
        status: "OK",
        http_status: 200,
        message: "Found 2 event candidates.",
        events_found: 2,
        events_created: 2,
        created_at: new Date().toISOString()
      }
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

export async function getInboundWhatsAppHistory(): Promise<InboundWhatsAppMessage[]> {
  try {
    const supabase = await createClient();
    let { data, error } = await supabase
      .from("inbound_whatsapp_messages")
      .select("id, provider, provider_message_id, from_number, to_number, profile_name, body, source_profile_id, matched_client_id, created_request_id, created_schedule_plan_id, status, parse_result, error_message, alert_sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error && error.message.toLowerCase().includes("alert_sent_at")) {
      const fallback = await supabase
        .from("inbound_whatsapp_messages")
        .select("id, provider, provider_message_id, from_number, to_number, profile_name, body, source_profile_id, matched_client_id, created_request_id, created_schedule_plan_id, status, parse_result, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(80);
      data = fallback.data?.map((item) => ({ ...item, alert_sent_at: null })) ?? null;
      error = fallback.error;
    }
    if (error) throw error;
    return (data ?? []) as InboundWhatsAppMessage[];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      {
        id: "inbound-demo-1",
        provider: "twilio",
        provider_message_id: "SM_inbound_demo",
        from_number: "whatsapp:+46700000000",
        to_number: "whatsapp:+14155238886",
        profile_name: "Julia",
        body: "schedule 6-9 aug high spend",
        source_profile_id: demoProfile.id,
        matched_client_id: null,
        created_request_id: null,
        created_schedule_plan_id: "demo-plan",
        status: "CREATED",
        parse_result: { command: "schedule" },
        error_message: null,
        created_at: new Date().toISOString()
      }
    ];
  }
}

export async function getRequestActivity(requestId: string): Promise<RequestActivityItem[]> {
  try {
    const supabase = await createClient();
    const [{ data: logs, error: logError }, { data: notifications, error: notificationError }, { data: offers, error: offerError }, { data: payments, error: paymentError }] = await Promise.all([
      supabase
        .from("audit_logs")
        .select("id, action, metadata, created_at, profiles(name, email)")
        .eq("entity_type", "requests")
        .eq("entity_id", requestId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("whatsapp_notifications")
        .select("id, provider, provider_message_id, status, error_message, created_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("request_offers")
        .select("id, offer_status, service_label, min_spend, sent_at, created_at, profiles(name, email)")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("request_payments")
        .select("id, amount_cents, currency, description, status, paid_at, created_at, profiles(name, email)")
        .eq("request_id", requestId)
        .order("created_at", { ascending: false })
        .limit(20)
    ]);
    if (logError || notificationError || offerError || paymentError) throw logError ?? notificationError ?? offerError ?? paymentError;
    return [
      ...normalizeActivityLogs(logs),
      ...normalizeActivityNotifications(notifications),
      ...normalizeActivityOffers(offers),
      ...normalizeActivityPayments(payments)
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 12);
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      { id: "activity-1", type: "status", label: "Status updated", detail: "Moved to confirmed by Julia", created_at: new Date().toISOString(), tone: "good" },
      { id: "activity-2", type: "offer", label: "Deposit link created", detail: "€500 booking deposit", created_at: new Date(Date.now() - 10 * 60000).toISOString(), tone: "neutral" },
      { id: "activity-3", type: "whatsapp", label: "WhatsApp sent", detail: "Notification sent to manager", created_at: new Date(Date.now() - 18 * 60000).toISOString(), tone: "good" }
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

async function managerClubIdsCsv(managerId: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("club_users").select("club_id").eq("user_id", managerId);
    return (data ?? []).map((item) => item.club_id).join(",");
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

function normalizeActivityLogs(data: unknown): RequestActivityItem[] {
  return ((data as Array<{ id: string; action: string; metadata?: Record<string, unknown> | null; created_at: string; profiles?: { name?: string | null; email?: string | null } | null }> | null) ?? [])
    .map((log) => {
      const from = typeof log.metadata?.from === "string" ? log.metadata.from : "";
      const to = typeof log.metadata?.to === "string" ? log.metadata.to : "";
      const actor = log.profiles?.name ?? log.profiles?.email ?? "Team";
      return {
        id: `audit-${log.id}`,
        type: log.action === "REQUEST_STATUS_UPDATED" ? "status" : "audit",
        label: activityLabel(log.action),
        detail: from && to ? `${actor} changed ${from.toLowerCase()} to ${to.toLowerCase()}` : actor,
        created_at: log.created_at,
        tone: to === "CONFIRMED" || to === "ARRIVED" ? "good" : to === "DECLINED" || to === "CANCELLED" || to === "NO_SHOW" ? "bad" : "neutral"
      } satisfies RequestActivityItem;
    });
}

function normalizeActivityNotifications(data: unknown): RequestActivityItem[] {
  return ((data as Array<{ id: string; provider: string; provider_message_id?: string | null; status: string; error_message?: string | null; created_at: string }> | null) ?? [])
    .map((notice) => ({
      id: `whatsapp-${notice.id}`,
      type: "whatsapp",
      label: notice.status === "SENT" ? "WhatsApp sent" : "WhatsApp failed",
      detail: notice.status === "SENT" ? `${notice.provider} ${notice.provider_message_id ?? ""}`.trim() : notice.error_message ?? "Delivery failed",
      created_at: notice.created_at,
      tone: notice.status === "SENT" ? "good" : "bad"
    }));
}

function normalizeActivityOffers(data: unknown): RequestActivityItem[] {
  return ((data as Array<{ id: string; offer_status: string; service_label: string; min_spend?: string | null; sent_at?: string | null; created_at: string; profiles?: { name?: string | null; email?: string | null } | null }> | null) ?? [])
    .map((offer) => ({
      id: `offer-${offer.id}`,
      type: "offer",
      label: offer.offer_status === "ACCEPTED" ? "Offer accepted" : offer.offer_status === "SENT" ? "Offer sent" : "Offer saved",
      detail: `${offer.service_label}${offer.min_spend ? ` · ${offer.min_spend}` : ""} · ${offer.profiles?.name ?? offer.profiles?.email ?? "Team"}`,
      created_at: offer.sent_at ?? offer.created_at,
      tone: offer.offer_status === "ACCEPTED" ? "good" : offer.offer_status === "DECLINED" || offer.offer_status === "EXPIRED" ? "bad" : "neutral"
    }));
}

function normalizeActivityPayments(data: unknown): RequestActivityItem[] {
  return ((data as Array<{ id: string; amount_cents: number; currency: string; description: string; status: string; paid_at?: string | null; created_at: string; profiles?: { name?: string | null; email?: string | null } | null }> | null) ?? [])
    .map((payment) => ({
      id: `payment-${payment.id}`,
      type: "offer",
      label: payment.status === "PAID" ? "Deposit paid" : payment.status === "FAILED" ? "Deposit failed" : payment.status === "CANCELLED" ? "Deposit cancelled" : "Deposit link created",
      detail: `${formatMoney(payment.amount_cents, payment.currency)} · ${payment.description} · ${payment.profiles?.name ?? payment.profiles?.email ?? "Team"}`,
      created_at: payment.paid_at ?? payment.created_at,
      tone: payment.status === "PAID" ? "good" : payment.status === "FAILED" || payment.status === "CANCELLED" ? "bad" : "neutral"
    }));
}

function activityLabel(action: string) {
  if (action === "REQUEST_STATUS_UPDATED") return "Status updated";
  if (action === "PUBLIC_REQUEST_CREATED") return "Request created";
  if (action === "REQUEST_CLIENT_CONTACT_UPDATED") return "Contact updated";
  if (action === "REQUEST_ASSIGNED") return "Promoter assigned";
  return action.toLowerCase().replaceAll("_", " ");
}

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(amountCents / 100);
}

function normalizeClientHistory(data: unknown): ClientBookingHistoryItem[] {
  return ((data as ClientBookingHistoryItem[] | null) ?? []).map((request) => ({
    ...request,
    clubs: Array.isArray(request.clubs) ? request.clubs[0] : request.clubs,
    promoter: Array.isArray(request.promoter) ? request.promoter[0] : request.promoter
  }));
}

function normalizeClientOutreach(data: unknown): ClientOutreachItem[] {
  return ((data as Array<Omit<ClientOutreachItem, "profiles"> & { profiles?: ClientOutreachItem["profiles"] | ClientOutreachItem["profiles"][] | null }> | null) ?? []).map((item) => ({
    ...item,
    profiles: Array.isArray(item.profiles) ? item.profiles[0] ?? null : item.profiles ?? null
  }));
}

function normalizeClientFollowUpTasks(data: unknown): ClientFollowUpTask[] {
  return ((data as Array<Omit<ClientFollowUpTask, "assignee" | "creator" | "clients"> & { assignee?: ClientFollowUpTask["assignee"] | ClientFollowUpTask["assignee"][] | null; creator?: ClientFollowUpTask["creator"] | ClientFollowUpTask["creator"][] | null; clients?: ClientFollowUpTask["clients"] | ClientFollowUpTask["clients"][] | null }> | null) ?? []).map((task) => ({
    ...task,
    assignee: Array.isArray(task.assignee) ? task.assignee[0] ?? null : task.assignee ?? null,
    creator: Array.isArray(task.creator) ? task.creator[0] ?? null : task.creator ?? null,
    clients: Array.isArray(task.clients) ? task.clients[0] ?? null : task.clients ?? null
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
    if (!filters.status && !filters.includeArchived && ["ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"].includes(request.status)) return false;
    if (!query) return true;

    return [
      request.clients?.name,
      request.clients?.phone,
      request.clients?.client_code,
      request.clubs?.name,
      request.promoter?.name,
      request.message,
      request.budget
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
}

function buildRetentionClients(data: unknown, days: number, today: Date): RetentionClient[] {
  const cutoffMs = days * 86400000;
  return ((data as Array<Client & {
    requests?: Array<{ requested_date?: string | null; created_at?: string | null }> | null;
    retention_outreach?: Array<{ created_at?: string | null }> | null;
  }> | null) ?? [])
    .map((client) => {
      const requestDates = (client.requests ?? [])
        .map((request) => request.requested_date ?? request.created_at?.slice(0, 10) ?? null)
        .filter((value): value is string => Boolean(value))
        .sort()
        .reverse();
      const lastRequestDate = requestDates[0] ?? null;
      const lastOutreach = (client.retention_outreach ?? [])
        .map((item) => item.created_at ?? null)
        .filter((value): value is string => Boolean(value))
        .sort()
        .reverse()[0] ?? null;
      const daysSince = lastRequestDate ? Math.floor((today.getTime() - new Date(`${lastRequestDate}T12:00:00`).getTime()) / 86400000) : null;
      return {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        instagram: client.instagram,
        country: client.country,
        preferred_language: client.preferred_language,
        vip_level: client.vip_level,
        status: client.status,
        last_request_date: lastRequestDate,
        last_outreach_at: lastOutreach,
        days_since_booking: daysSince
      };
    })
    .filter((client) => client.days_since_booking === null || client.days_since_booking * 86400000 >= cutoffMs)
    .sort((a, b) => (b.days_since_booking ?? 9999) - (a.days_since_booking ?? 9999));
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

function normalizePromoterEligibility(data: unknown): PromoterServiceEligibility[] {
  return ((data as Array<Omit<PromoterServiceEligibility, "profiles"> & { profiles?: PromoterServiceEligibility["profiles"] | PromoterServiceEligibility["profiles"][] | null }> | null) ?? []).map((item) => ({
    ...item,
    profiles: Array.isArray(item.profiles) ? item.profiles[0] ?? null : item.profiles ?? null
  }));
}

function applyClientFilters(clients: Client[], filters?: ClientFilters) {
  const query = filters?.q?.trim().toLowerCase();
  if (!query) return clients;

  return clients.filter((client) =>
    [
      client.name,
      client.phone,
      client.client_code,
      client.email,
      client.instagram,
      client.vip_level,
      client.status
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  );
}

function normalizeSchedulePlans(data: unknown): SchedulePlan[] {
  return ((data as Array<Omit<SchedulePlan, "clients" | "profiles"> & {
    clients?: SchedulePlan["clients"] | SchedulePlan["clients"][] | null;
    profiles?: SchedulePlan["profiles"] | SchedulePlan["profiles"][] | null;
  }> | null) ?? []).map((plan) => ({
    ...plan,
    clients: Array.isArray(plan.clients) ? plan.clients[0] ?? null : plan.clients ?? null,
    profiles: Array.isArray(plan.profiles) ? plan.profiles[0] ?? null : plan.profiles ?? null
  }));
}

function normalizeScheduleVenueRules(data: unknown): ScheduleVenueRule[] {
  return ((data as ScheduleVenueRule[] | null) ?? []).map((rule) => ({
    ...rule,
    weight: Number(rule.weight),
    priority_days: Array.isArray(rule.priority_days) ? rule.priority_days : [],
    avoid_after_venue_names: Array.isArray(rule.avoid_after_venue_names) ? rule.avoid_after_venue_names : []
  }));
}

function normalizeAvailabilitySlots(data: unknown): AvailabilitySlot[] {
  return ((data as Array<Omit<AvailabilitySlot, "clubs"> & { clubs?: AvailabilitySlot["clubs"] | AvailabilitySlot["clubs"][] | null }> | null) ?? []).map((slot) => ({
    ...slot,
    clubs: Array.isArray(slot.clubs) ? slot.clubs[0] ?? null : slot.clubs ?? null
  }));
}

function normalizeRequestOffers(data: unknown): RequestOffer[] {
  return ((data as Array<Omit<RequestOffer, "profiles"> & { profiles?: RequestOffer["profiles"] | RequestOffer["profiles"][] | null }> | null) ?? []).map((offer) => ({
    ...offer,
    profiles: Array.isArray(offer.profiles) ? offer.profiles[0] ?? null : offer.profiles ?? null
  }));
}

function normalizeRequestPayments(data: unknown): RequestPayment[] {
  return ((data as Array<Omit<RequestPayment, "profiles"> & { profiles?: RequestPayment["profiles"] | RequestPayment["profiles"][] | null }> | null) ?? []).map((payment) => ({
    ...payment,
    profiles: Array.isArray(payment.profiles) ? payment.profiles[0] ?? null : payment.profiles ?? null
  }));
}

function normalizeCommissionRules(data: unknown): CommissionRule[] {
  return ((data as Array<Omit<CommissionRule, "profiles" | "clubs"> & { profiles?: CommissionRule["profiles"] | CommissionRule["profiles"][] | null; clubs?: CommissionRule["clubs"] | CommissionRule["clubs"][] | null }> | null) ?? []).map((rule) => ({
    ...rule,
    rate_percent: Number(rule.rate_percent),
    flat_fee_cents: Number(rule.flat_fee_cents),
    profiles: Array.isArray(rule.profiles) ? rule.profiles[0] ?? null : rule.profiles ?? null,
    clubs: Array.isArray(rule.clubs) ? rule.clubs[0] ?? null : rule.clubs ?? null
  }));
}

function normalizeConciergePackages(data: unknown): ConciergePackage[] {
  return ((data as Array<Omit<ConciergePackage, "clients" | "package_items"> & { package_items?: unknown; clients?: ConciergePackage["clients"] | ConciergePackage["clients"][] | null }> | null) ?? []).map((item) => ({
    ...item,
    package_items: Array.isArray(item.package_items) ? item.package_items.map(String) : [],
    clients: Array.isArray(item.clients) ? item.clients[0] ?? null : item.clients ?? null
  }));
}

function demoAvailabilitySlots(request: ConciergeRequest): AvailabilitySlot[] {
  return [
    {
      id: "demo-slot-main",
      club_id: request.club_id,
      service_type: request.request_type,
      slot_date: request.requested_date,
      title: "Main room table",
      area: request.clubs?.name ?? "Venue",
      min_spend: request.budget || "From 1k",
      capacity: Math.max(request.guest_count, 6),
      status: "AVAILABLE",
      notes: "Demo option. Confirm final details with venue.",
      active: true,
      created_by: null,
      clubs: request.clubs ?? null
    },
    {
      id: "demo-slot-waitlist",
      club_id: request.club_id,
      service_type: request.request_type,
      slot_date: request.requested_date,
      title: "Backup option",
      area: request.clubs?.name ?? "Venue",
      min_spend: "To confirm",
      capacity: request.guest_count,
      status: "LIMITED",
      notes: "Use if main room is no longer available.",
      active: true,
      created_by: null,
      clubs: request.clubs ?? null
    }
  ];
}

function demoRequestOffers(request: ConciergeRequest): RequestOffer[] {
  return [{
    id: "demo-offer-1",
    request_id: request.id,
    availability_slot_id: "demo-slot-main",
    created_by: demoProfile.id,
    offer_status: "DRAFT",
    venue_name: request.clubs?.name ?? "Venue",
    offer_date: request.requested_date,
    service_label: "Main room table",
    arrival_time: request.arrival_time,
    guest_count: request.guest_count,
    min_spend: request.budget || "From 1k",
    message: buildDemoOfferMessage(request),
    sent_at: null,
    created_at: new Date().toISOString(),
    profiles: { name: demoProfile.name, email: demoProfile.email }
  }];
}

function demoRequestPayments(request: ConciergeRequest): RequestPayment[] {
  return [{
    id: "demo-payment-1",
    request_id: request.id,
    client_id: request.client_id,
    created_by: demoProfile.id,
    provider: "stripe",
    provider_checkout_session_id: "cs_demo",
    provider_payment_intent_id: null,
    amount_cents: 50000,
    currency: "eur",
    description: "Demo booking deposit",
    status: "PENDING",
    checkout_url: null,
    paid_at: null,
    created_at: new Date().toISOString(),
    profiles: { name: demoProfile.name, email: demoProfile.email }
  }];
}

function buildDemoOfferMessage(request: ConciergeRequest) {
  return `Hi ${request.clients?.name ?? ""}, I checked ${request.clubs?.name ?? "the venue"} for ${request.requested_date}.\n\nThey can do a table for ${request.guest_count} guests${request.arrival_time ? ` around ${request.arrival_time}` : ""}${request.budget ? ` with ${request.budget}` : ""}.\n\nShould I hold this option for you?`;
}

function demoMessageTemplates(): MessageTemplate[] {
  const now = new Date().toISOString();
  return [
    { id: "template-client-en", key: "client_reply", label: "Reply to client", channel: "WHATSAPP", language: "en", body: "Hi {{client_first_name}}, perfect. I’ll check with {{venue_name}} for {{date}} for {{guest_count}} guests and get back to you shortly.", active: true, updated_at: now },
    { id: "template-venue-en", key: "venue_check", label: "Ask venue", channel: "WHATSAPP", language: "en", body: "Can you check this for me?\n\n{{venue_name}} · {{request_type}}\nDate: {{date}}{{arrival_line}}\nClient: {{client_name}}\nGuests: {{guest_count}}{{budget_line}}{{notes_line}}", active: true, updated_at: now },
    { id: "template-offer-en", key: "client_offer", label: "Offer to client", channel: "WHATSAPP", language: "en", body: "Hi {{client_first_name}}, I checked {{venue_name}} for {{date}}.\n\nThey can do {{service_label}} for {{guest_count}} guests{{arrival_offer_line}}{{spend_offer_line}}.\n\nWould you like me to try to hold it for you?", active: true, updated_at: now }
  ];
}

function demoScheduleVenueRules(): ScheduleVenueRule[] {
  return [
    { id: "demo-rule-1", venue_name: "La Plage Casanis", venue_type: "BEACH_CLUB", area: "Elviria", priority_days: ["WEDNESDAY", "SUNDAY"], weight: 3.5, avoid_after_venue_names: [], guidance: "Party with DJs until 00:00 on Wednesdays and Sundays. Do not place dinner between La Plage and Le Jade.", active: true },
    { id: "demo-rule-2", venue_name: "Le Jade", venue_type: "AFTER_PARTY", area: "Marbella", priority_days: ["WEDNESDAY", "SUNDAY"], weight: 3.25, avoid_after_venue_names: [], guidance: "Natural after-party after La Plage Casanis on Wednesdays and Sundays.", active: true },
    { id: "demo-rule-3", venue_name: "Motel Particulier", venue_type: "HYBRID", area: "Marbella", priority_days: [], weight: 1.05, avoid_after_venue_names: ["Bon Bonniere"], guidance: "Dinner and late lounge. Avoid pairing with Bon Bonniere unless the customer wants a very heavy night.", active: true },
    { id: "demo-rule-4", venue_name: "Bon Bonniere", venue_type: "NIGHTCLUB", area: "Marbella", priority_days: [], weight: 1.25, avoid_after_venue_names: ["Motel Particulier"], guidance: "Late table-driven club. Prioritize when a big DJ is playing.", active: true },
    { id: "demo-rule-5", venue_name: "Momento", venue_type: "NIGHTCLUB", area: "Marbella", priority_days: [], weight: 1.4, avoid_after_venue_names: [], guidance: "Prime late-night club, especially with a known DJ.", active: true }
  ];
}

function demoSchedulePlans(): SchedulePlan[] {
  const today = new Date().toISOString().slice(0, 10);
  return [{
    id: "demo-schedule-plan",
    user_id: demoProfile.id,
    client_id: null,
    title: "Marbella plan · demo",
    city: "Marbella",
    date_from: today,
    date_to: today,
    spend_profile: "HIGH_SPEND",
    prompt_text: "Demo high-spend client",
    message: "I put together a strong Marbella party plan for you:\n\nToday - La Plage party into Le Jade\n17:00 · La Plage Casanis (Beach club)\n00:30 · Le Jade (After-party)\n\nI can check availability, DJ programming, and adjust it depending on what kind of night you prefer.",
    plan: {
      title: "Marbella demo plan",
      days: [{
        date: today,
        headline: "La Plage party into Le Jade",
        stops: [
          { time: "17:00", venue: "La Plage Casanis", category: "Beach club", area: "Elviria", why: "Wednesday/Sunday party block with DJs through sunset until 00:00.", bookingAngle: "Ask for table setup and confirm DJ programming." },
          { time: "00:30", venue: "Le Jade", category: "After-party", area: "Marbella", why: "Natural after-party move after La Plage.", bookingAngle: "Keep as the late option." }
        ],
        note: "Confirm availability and DJ programming before promising exact tables."
      }]
    },
    source: "APP",
    created_at: new Date().toISOString(),
    clients: null,
    profiles: { name: demoProfile.name, email: demoProfile.email }
  }];
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
