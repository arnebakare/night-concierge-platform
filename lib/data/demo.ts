import type { Client, ConciergeRequest, Profile } from "@/lib/types";

export const demoProfile: Profile = {
  id: "00000000-0000-0000-0000-000000000010",
  name: "Julia",
  email: "julia2@casanis.es",
  phone: "+34 600 111 222",
  role: "PROMOTER",
  manager_id: "00000000-0000-0000-0000-000000000011",
  active: true
};

export const demoRequests: ConciergeRequest[] = [
  {
    id: "r1",
    client_id: "c1",
    club_id: "club1",
    promoter_id: demoProfile.id,
    assigned_manager_id: demoProfile.manager_id,
    source: "PROMOTER_LINK",
    request_type: "TABLE",
    status: "NEW",
    requested_date: new Date().toISOString().slice(0, 10),
    arrival_time: "01:00",
    guest_count: 6,
    budget: "1500",
    message: "Birthday table, prefers premium vodka.",
    internal_summary: null,
    created_at: new Date().toISOString(),
    clients: { name: "Daniel", phone: "+34 611 222 333", vip_level: "GOLD", status: "NORMAL" },
    clubs: { name: "La Plage Casanis", city: "Marbella", slug: "la-plage-casanis" }
  },
  {
    id: "r2",
    client_id: "c2",
    club_id: "club1",
    promoter_id: demoProfile.id,
    assigned_manager_id: demoProfile.manager_id,
    source: "MANUAL_ENTRY",
    request_type: "GUESTLIST",
    status: "PENDING",
    requested_date: new Date().toISOString().slice(0, 10),
    arrival_time: "00:30",
    guest_count: 4,
    budget: null,
    message: "Needs confirmation before midnight.",
    internal_summary: null,
    created_at: new Date().toISOString(),
    clients: { name: "Olivia", phone: "+34 622 333 444", vip_level: "SILVER", status: "NORMAL" },
    clubs: { name: "Le Jade", city: "Marbella", slug: "le-jade" }
  }
];

export const demoClients: Client[] = [
  { id: "c1", name: "Daniel", phone: "+34 611 222 333", email: "daniel@example.com", instagram: "@daniel", vip_level: "GOLD", status: "NORMAL" },
  { id: "c2", name: "Olivia", phone: "+34 622 333 444", email: null, instagram: "@olivia", vip_level: "SILVER", status: "NORMAL" },
  { id: "c3", name: "Daniel", phone: "+34 633 444 555", email: "daniel.vip@example.com", instagram: "@danielvip", vip_level: "PLATINUM", status: "MANAGER_APPROVAL_REQUIRED" }
];
