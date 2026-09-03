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
export type RequestType = "GUESTLIST" | "TABLE" | "VIP_SERVICE" | "GENERAL" | "BOAT" | "GOLF" | "VILLA" | "TRANSFER" | "SCHEDULE" | "PACKAGE";
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
  venue_kind?: string | null;
  brand_config?: Record<string, unknown> | null;
  service_config?: unknown[] | null;
};

export type ConciergePackage = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  request_type: RequestType;
  price_hint: string | null;
  tailored_client_id: string | null;
  active: boolean;
  package_items: string[];
  created_by: string | null;
  created_at: string;
  updated_at?: string;
  clients?: Pick<Client, "name" | "phone"> | null;
};

export type ConciergeEvent = {
  id: string;
  club_id: string;
  name: string;
  slug: string;
  event_date: string;
  description: string | null;
  active: boolean;
  source_url?: string | null;
  source_key?: string | null;
  imported_at?: string | null;
  clubs?: Pick<Club, "name" | "city" | "slug"> | null;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  client_code?: string | null;
  email: string | null;
  instagram: string | null;
  country?: string | null;
  preferred_language?: "en" | "es" | "sv" | null;
  vip_level: "STANDARD" | "SILVER" | "GOLD" | "PLATINUM";
  status: "NORMAL" | "WATCHLIST" | "MANAGER_APPROVAL_REQUIRED" | "BLOCKED";
};

export type ClientAlias = {
  name: string;
  source: string;
  created_at: string;
};

export type ClientBookingHistoryItem = {
  id: string;
  requested_date: string;
  arrival_time: string | null;
  guest_count: number;
  request_type: RequestType;
  status: RequestStatus;
  budget: string | null;
  created_at: string;
  clubs?: Pick<Club, "name" | "city" | "slug"> | null;
  promoter?: Pick<Profile, "name" | "email"> | null;
};

export type ClientOutreachItem = {
  id: string;
  channel: "WHATSAPP" | "EMAIL";
  destination: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  automatic: boolean;
  created_at: string;
  profiles?: Pick<Profile, "name" | "email"> | null;
};

export type ClientFollowUpTask = {
  id: string;
  client_id: string;
  assigned_to: string | null;
  created_by: string | null;
  title: string;
  due_date: string | null;
  priority: "LOW" | "NORMAL" | "HIGH";
  status: "OPEN" | "DONE" | "CANCELLED";
  completed_at: string | null;
  created_at: string;
  updated_at?: string;
  assignee?: Pick<Profile, "name" | "email"> | null;
  creator?: Pick<Profile, "name" | "email"> | null;
  clients?: Pick<Client, "name" | "phone"> | null;
};

export type ClientCareSignal = {
  client_id: string;
  open_tasks: number;
  overdue_tasks: number;
  high_priority_tasks: number;
  next_due_date: string | null;
};

export type MessageTemplate = {
  id: string;
  key: string;
  label: string;
  channel: "WHATSAPP" | "EMAIL" | "INTERNAL";
  language: "en" | "es" | "sv";
  body: string;
  active: boolean;
  updated_at?: string | null;
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
  clients?: Pick<Client, "name" | "phone" | "client_code" | "country" | "preferred_language" | "vip_level" | "status"> | null;
  clubs?: Pick<Club, "name" | "city" | "slug"> | null;
  promoter?: Pick<Profile, "name" | "email"> | null;
};

export type SchedulePlan = {
  id: string;
  user_id: string | null;
  client_id: string | null;
  title: string;
  city: string;
  date_from: string;
  date_to: string;
  spend_profile: "NORMAL" | "HIGH_SPEND";
  prompt_text: string | null;
  message: string;
  plan: Record<string, unknown>;
  source: "APP" | "WHATSAPP";
  created_at: string;
  clients?: Pick<Client, "name" | "phone"> | null;
  profiles?: Pick<Profile, "name" | "email"> | null;
};

export type ScheduleVenueRule = {
  id: string;
  venue_name: string;
  venue_type: "BEACH_CLUB" | "RESTAURANT" | "NIGHTCLUB" | "AFTER_PARTY" | "HYBRID";
  area: string | null;
  priority_days: string[];
  weight: number;
  avoid_after_venue_names: string[];
  guidance: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AvailabilitySlot = {
  id: string;
  club_id: string;
  service_type: RequestType;
  slot_date: string;
  title: string;
  area: string | null;
  min_spend: string | null;
  capacity: number | null;
  status: "AVAILABLE" | "LIMITED" | "WAITLIST" | "SOLD_OUT";
  notes: string | null;
  active: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  clubs?: Pick<Club, "name" | "city" | "slug"> | null;
};

export type RequestOffer = {
  id: string;
  request_id: string;
  availability_slot_id: string | null;
  created_by: string | null;
  offer_status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  venue_name: string;
  offer_date: string;
  service_label: string;
  arrival_time: string | null;
  guest_count: number;
  min_spend: string | null;
  message: string;
  sent_at: string | null;
  created_at: string;
  updated_at?: string;
  profiles?: Pick<Profile, "name" | "email"> | null;
};

export type RequestPayment = {
  id: string;
  request_id: string;
  client_id: string | null;
  created_by: string | null;
  provider: "stripe" | string;
  provider_checkout_session_id: string | null;
  provider_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  description: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
  checkout_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at?: string;
  profiles?: Pick<Profile, "name" | "email"> | null;
  requests?: {
    id: string;
    requested_date?: string | null;
    clients?: Pick<Client, "name" | "phone"> | null;
    clubs?: Pick<Club, "name"> | null;
  } | null;
};

export type CommissionRule = {
  id: string;
  promoter_id: string | null;
  club_id: string | null;
  request_type: RequestType | null;
  rate_percent: number;
  flat_fee_cents: number;
  label?: string | null;
  notes?: string | null;
  active: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  profiles?: Pick<Profile, "name" | "email"> | null;
  clubs?: Pick<Club, "name" | "slug"> | null;
};

export type InboundWhatsAppMessage = {
  id: string;
  provider: string;
  provider_message_id: string | null;
  from_number: string;
  to_number: string | null;
  profile_name: string | null;
  body: string;
  source_profile_id: string | null;
  matched_client_id: string | null;
  created_request_id: string | null;
  created_schedule_plan_id?: string | null;
  status: "RECEIVED" | "CREATED" | "NEEDS_REVIEW" | "IGNORED" | "FAILED";
  parse_result: Record<string, unknown>;
  error_message: string | null;
  alert_sent_at?: string | null;
  created_at: string;
};
