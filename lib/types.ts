export type Role = "SUPER_ADMIN" | "PROMOTER_MANAGER" | "PROMOTER" | "CLIENT";
export type RequestStatus =
  | "NEW"
  | "CONTACTED"
  | "PENDING"
  | "CONFIRMED"
  | "ARRIVED"
  | "NO_SHOW"
  | "DECLINED"
  | "CANCELLED";
export type RequestType = "GUESTLIST" | "TABLE" | "VIP_SERVICE" | "GENERAL";
export type RequestSource = "PUBLIC_FORM" | "PROMOTER_LINK" | "MAGIC_LINK" | "MANUAL_ENTRY" | "ADMIN_CREATED";

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  manager_id: string | null;
  active: boolean;
};

export type Club = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  image_url: string | null;
  active: boolean;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  instagram: string | null;
  vip_level: "STANDARD" | "SILVER" | "GOLD" | "PLATINUM";
  status: "NORMAL" | "WATCHLIST" | "MANAGER_APPROVAL_REQUIRED" | "BLOCKED";
};

export type ConciergeRequest = {
  id: string;
  client_id: string;
  club_id: string;
  promoter_id: string | null;
  assigned_manager_id: string | null;
  source: RequestSource;
  request_type: RequestType;
  status: RequestStatus;
  requested_date: string;
  arrival_time: string | null;
  guest_count: number;
  budget: string | null;
  message: string | null;
  internal_summary: string | null;
  created_at: string;
  clients?: Pick<Client, "name" | "phone" | "vip_level" | "status"> | null;
  clubs?: Pick<Club, "name" | "city" | "slug"> | null;
  promoter?: Pick<Profile, "name" | "email"> | null;
};
