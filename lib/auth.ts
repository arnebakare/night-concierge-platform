import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";
import { isDemoAuthEnabled } from "@/lib/env";

const demoProfiles: Record<Role, Profile> = {
  SUPER_ADMIN: {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Admin Noir",
    email: "admin@night.test",
    phone: "+34 600 000 001",
    role: "SUPER_ADMIN",
    manager_id: null,
    active: true
  },
  PROMOTER_MANAGER: {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Julia Casanis",
    email: "julia@casanis.es",
    phone: "+34 600 000 002",
    role: "PROMOTER_MANAGER",
    manager_id: null,
    active: true
  },
  PROMOTER: {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Julia",
    email: "julia2@casanis.es",
    phone: "+34 600 000 003",
    role: "PROMOTER",
    manager_id: "00000000-0000-0000-0000-000000000002",
    active: true
  },
  CLIENT: {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Daniel",
    email: "client@night.test",
    phone: "+34 600 000 004",
    role: "CLIENT",
    manager_id: null,
    active: true
  }
};

export async function getCurrentProfile(): Promise<Profile | null> {
  if (isDemoAuthEnabled()) return demoProfiles.PROMOTER;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}

export async function requireProfile(roles?: Role[]) {
  if (isDemoAuthEnabled()) {
    const role = roles?.[0] ?? "PROMOTER";
    return demoProfiles[role];
  }

  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (!profile.active) redirect("/inactive");
  if (roles?.length && !roles.includes(profile.role)) redirect(roleHome(profile.role));

  return profile;
}

export function roleHome(role: Role) {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "PROMOTER_MANAGER") return "/manager";
  if (role === "CLIENT") return "/client";
  return "/dashboard";
}

export function canManagePromoter(actor: Profile, promoterId: string, managerId?: string | null) {
  return actor.role === "SUPER_ADMIN" || (actor.role === "PROMOTER_MANAGER" && managerId === actor.id) || actor.id === promoterId;
}
