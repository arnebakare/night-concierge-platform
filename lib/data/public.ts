import { createAdminClient } from "@/lib/supabase/admin";
import type { Club, ConciergeEvent, ConciergePackage } from "@/lib/types";
import { isDemoAuthEnabled } from "@/lib/env";

export async function getActiveClubs(): Promise<Club[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("clubs")
      .select("id, name, slug, city, address, image_url, active, brand_config, service_config")
      .eq("active", true)
      .order("name");
    return (data ?? []) as Club[];
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      { id: "00000000-0000-0000-0000-000000000001", name: "La Plage Casanis", slug: "la-plage-casanis", city: "Marbella", address: null, image_url: "/venues/la-plage-casanis-logo.png", active: true },
      { id: "00000000-0000-0000-0000-000000000002", name: "Le Jade", slug: "le-jade", city: "Marbella", address: null, image_url: "/venues/le-jade-logo.png", active: true },
      { id: "00000000-0000-0000-0000-000000000003", name: "Mamzel", slug: "mamzel", city: "Marbella", address: null, image_url: "/venues/mamzel-logo.png", active: true },
      { id: "00000000-0000-0000-0000-000000000004", name: "Playa Padre", slug: "playa-padre", city: "Marbella", address: null, image_url: "/venues/playa-padre-logo.png", active: true },
      { id: "00000000-0000-0000-0000-000000000005", name: "Momento", slug: "momento", city: "Marbella", address: null, image_url: "/venues/momento-logo.png", active: true },
      { id: "00000000-0000-0000-0000-000000000006", name: "Motel Particulier", slug: "motel-particulier", city: "Marbella", address: null, image_url: "/venues/motel-particulier-logo.png", active: true },
      { id: "00000000-0000-0000-0000-000000000007", name: "La Cabane", slug: "la-cabane", city: "Marbella", address: null, image_url: "/venues/la-cabane-logo.png", active: true },
      { id: "00000000-0000-0000-0000-000000000008", name: "Bon Bonniere", slug: "bon-bonniere", city: "Marbella", address: null, image_url: "/venues/bon-bonniere-logo.png", active: true }
    ];
  }
}

export async function getPublicUpcomingEvents(): Promise<ConciergeEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const dateTo = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("events")
      .select("id, club_id, name, slug, event_date, description, active, clubs(name, city, slug)")
      .eq("active", true)
      .gte("event_date", today)
      .lte("event_date", dateTo)
      .order("event_date", { ascending: true })
      .order("name", { ascending: true })
      .limit(80);
    if (error) throw error;
    return ((data ?? []) as Array<Omit<ConciergeEvent, "clubs"> & { clubs?: ConciergeEvent["clubs"] | ConciergeEvent["clubs"][] }>).map((event) => ({
      ...event,
      clubs: Array.isArray(event.clubs) ? event.clubs[0] ?? null : event.clubs ?? null
    }));
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    return [
      { id: "public-event-1", club_id: "00000000-0000-0000-0000-000000000001", name: "La Plage Sunset Session", slug: "la-plage-sunset-session", event_date: today, description: "Beach-club lunch, sunset tables, and hosted groups.", active: true, clubs: { name: "La Plage Casanis", city: "Marbella", slug: "la-plage-casanis" } },
      { id: "public-event-2", club_id: "00000000-0000-0000-0000-000000000002", name: "Le Jade After Party", slug: "le-jade-after-party", event_date: today, description: "Late after-party tables and guestlist.", active: true, clubs: { name: "Le Jade", city: "Marbella", slug: "le-jade" } },
      { id: "public-event-3", club_id: "00000000-0000-0000-0000-000000000005", name: "Momento DJ Night", slug: "momento-dj-night", event_date: tomorrow, description: "Club-night option for table or guestlist clients.", active: true, clubs: { name: "Momento", city: "Marbella", slug: "momento" } }
    ];
  }
}

export async function getPublicConciergePackages(): Promise<ConciergePackage[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("concierge_packages")
      .select("id, title, slug, description, request_type, price_hint, tailored_client_id, active, package_items, created_by, created_at, updated_at")
      .eq("active", true)
      .is("tailored_client_id", null)
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw error;
    return ((data ?? []) as Array<Omit<ConciergePackage, "clients" | "package_items"> & { package_items?: unknown }>).map((item) => ({
      ...item,
      package_items: Array.isArray(item.package_items) ? item.package_items.map(String) : [],
      clients: null
    }));
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return [
      {
        id: "public-package-1",
        title: "Marbella Weekend Starter",
        slug: "marbella-weekend-starter",
        description: "Beach club, dinner, nightlife, and transfers shaped around your group.",
        request_type: "PACKAGE",
        price_hint: "Tailored after dates",
        tailored_client_id: null,
        active: true,
        package_items: ["Beach club day", "Dinner reservation", "Nightclub table", "Transfers"],
        created_by: null,
        created_at: new Date().toISOString(),
        clients: null
      }
    ];
  }
}

export async function getPromoterLink(slug: string) {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("promoter_links")
      .select("slug, title, active, club_id, profiles!promoter_links_promoter_id_fkey(name)")
      .eq("slug", slug)
      .maybeSingle();
    return data;
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return { slug, title: "VIP Guestlist", active: true, club_id: null, profiles: { name: "Your Host" } };
  }
}

export async function getMagicLink(token: string) {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("magic_links")
      .select("token, active, club_id, expires_at, max_uses, use_count, clients(name, phone, email, instagram), profiles!magic_links_promoter_id_fkey(name, phone)")
      .eq("token", token)
      .maybeSingle();
    return data;
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return { token, active: true, club_id: null, expires_at: null, max_uses: null, use_count: 0, clients: null, profiles: { name: "Your Host" } };
  }
}
