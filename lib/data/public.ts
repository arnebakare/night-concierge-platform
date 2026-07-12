import { createAdminClient } from "@/lib/supabase/admin";
import type { Club } from "@/lib/types";
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
      { id: "00000000-0000-0000-0000-000000000001", name: "La Plage Casanis", slug: "la-plage-casanis", city: "Marbella", address: null, image_url: null, active: true },
      { id: "00000000-0000-0000-0000-000000000002", name: "Le Jade", slug: "le-jade", city: "Marbella", address: null, image_url: null, active: true },
      { id: "00000000-0000-0000-0000-000000000003", name: "Mamzel", slug: "mamzel", city: "Marbella", address: null, image_url: null, active: true }
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
      .select("token, active, club_id, expires_at, max_uses, use_count, clients(name, phone, email, instagram), profiles!magic_links_promoter_id_fkey(name)")
      .eq("token", token)
      .maybeSingle();
    return data;
  } catch (error) {
    if (!isDemoAuthEnabled()) throw error;
    return { token, active: true, club_id: null, expires_at: null, max_uses: null, use_count: 0, clients: null, profiles: { name: "Your Host" } };
  }
}
