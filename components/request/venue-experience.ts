import { Calendar, CalendarRange, Car, Crown, Flag, GlassWater, Hotel, Music2, Package, ShipWheel, Sparkles, Sun, Utensils, Users, Waves } from "lucide-react";
import type { Club, RequestType } from "@/lib/types";

export type VenueService = {
  id: string;
  label: string;
  description: string;
  priceHint?: string;
  requestType: RequestType;
  icon: typeof Crown;
  iconName?: string;
};

export type VenueExperience = {
  slug: string;
  wordmark: string;
  monogram: string;
  tagline: string;
  mood: string;
  services: VenueService[];
};

const defaultServices: VenueService[] = [
  { id: "guestlist", label: "Guestlist", description: "Names on the list with quick confirmation.", priceHint: "Host confirms entry details", requestType: "GUESTLIST", icon: Users },
  { id: "vip-table", label: "VIP table", description: "Table request with spend and group details.", priceHint: "Minimum spend confirmed by host", requestType: "TABLE", icon: Crown },
  { id: "concierge", label: "Concierge request", description: "Ask for help planning the night.", priceHint: "Personal reply on WhatsApp", requestType: "GENERAL", icon: Sparkles },
  { id: "full-stay", label: "Full stay planning", description: "Boats, restaurants, clubs, transfers, and tailored days.", priceHint: "Host builds the plan", requestType: "SCHEDULE", icon: CalendarRange }
];

export const venueExperiences: Record<string, VenueExperience> = {
  "la-plage-casanis": {
    slug: "la-plage-casanis",
    wordmark: "La Plage Casanis",
    monogram: "LP",
    tagline: "Beachfront lunch, sunset, VIP hosting",
    mood: "Golden hour beach club",
    services: [
      { id: "beach-bed", label: "Beach bed", description: "Daytime sunbed or beach setup.", priceHint: "Availability checked by host", requestType: "VIP_SERVICE", icon: Sun },
      { id: "lunch-table", label: "Lunch table", description: "Restaurant table for lunch or sunset.", priceHint: "Final time confirmed by venue", requestType: "TABLE", icon: Utensils },
      { id: "vip-table", label: "VIP table", description: "Premium table for a hosted group.", priceHint: "Minimum spend confirmed first", requestType: "TABLE", icon: Crown },
      { id: "guestlist", label: "Guestlist", description: "Names for evening access.", priceHint: "Host confirms conditions", requestType: "GUESTLIST", icon: Users },
      { id: "celebration", label: "Celebration setup", description: "Birthday, hen group, or special moment.", priceHint: "Tell us the occasion", requestType: "VIP_SERVICE", icon: Sparkles }
    ]
  },
  "le-jade": {
    slug: "le-jade",
    wordmark: "Le Jade",
    monogram: "LJ",
    tagline: "Late-night after-party energy",
    mood: "After dark",
    services: [
      { id: "after-party", label: "After-party guestlist", description: "Guestlist for the late move.", priceHint: "Door conditions confirmed", requestType: "GUESTLIST", icon: Music2 },
      { id: "vip-table", label: "VIP table", description: "Late table with bottle service.", priceHint: "Minimum spend confirmed first", requestType: "TABLE", icon: Crown },
      { id: "bottle-service", label: "Bottle service", description: "Bottle request for a group.", priceHint: "Bottle options by WhatsApp", requestType: "VIP_SERVICE", icon: GlassWater },
      { id: "group-entry", label: "Group entry", description: "Fast access for larger groups.", priceHint: "Best route confirmed by host", requestType: "GUESTLIST", icon: Users }
    ]
  },
  mamzel: {
    slug: "mamzel",
    wordmark: "Mamzel",
    monogram: "MZ",
    tagline: "Dinner show, tables, celebration groups",
    mood: "Show dinner",
    services: [
      { id: "dinner-show", label: "Dinner show", description: "Dinner reservation with show atmosphere.", priceHint: "Seating and show time confirmed", requestType: "TABLE", icon: Utensils },
      { id: "vip-dinner", label: "VIP dinner table", description: "Premium dinner table for a group.", priceHint: "Best table checked by host", requestType: "TABLE", icon: Crown },
      { id: "late-table", label: "Late table", description: "Late-night table request.", priceHint: "Minimum spend confirmed first", requestType: "TABLE", icon: Music2 },
      { id: "celebration", label: "Celebration package", description: "Birthday, hen group, or special occasion.", priceHint: "Tell us what you need", requestType: "VIP_SERVICE", icon: Sparkles }
    ]
  },
  "playa-padre": {
    slug: "playa-padre",
    wordmark: "Playa Padre",
    monogram: "PP",
    tagline: "Beach club, lunch, music programming",
    mood: "Boho beach",
    services: [
      { id: "beach-club", label: "Beach club", description: "Beach club day booking.", priceHint: "Day setup confirmed by host", requestType: "VIP_SERVICE", icon: Waves },
      { id: "lunch-table", label: "Lunch table", description: "Lunch reservation for a group.", priceHint: "Availability checked first", requestType: "TABLE", icon: Utensils },
      { id: "event-table", label: "Event table", description: "Table for music programming.", priceHint: "DJ/event details confirmed", requestType: "TABLE", icon: Music2 }
    ]
  },
  momento: {
    slug: "momento",
    wordmark: "Momento",
    monogram: "MO",
    tagline: "Club nights, DJs, tables",
    mood: "Prime club",
    services: [
      { id: "guestlist", label: "Guestlist", description: "Club guestlist request.", priceHint: "Door conditions confirmed", requestType: "GUESTLIST", icon: Users },
      { id: "vip-table", label: "VIP table", description: "Table with spend and group details.", priceHint: "Minimum spend confirmed first", requestType: "TABLE", icon: Crown },
      { id: "dj-night", label: "DJ night", description: "Request for a specific event or DJ.", priceHint: "Artist programming checked", requestType: "VIP_SERVICE", icon: Music2 }
    ]
  }
  ,
  "marbella-concierge": {
    slug: "marbella-concierge",
    wordmark: "Marbella Concierge",
    monogram: "MC",
    tagline: "Boats, villas, transfers, golf, and tailored stays",
    mood: "Full-stay concierge",
    services: [
      { id: "yacht-day", label: "Boat or yacht day", description: "Private boat, yacht, skipper, route, and onboard requests.", priceHint: "Options checked by size and date", requestType: "BOAT", icon: ShipWheel },
      { id: "golf-day", label: "Golf booking", description: "Tee times, clubs, buggies, transfers, and lunch after.", priceHint: "Course and tee time confirmed first", requestType: "GOLF", icon: Flag },
      { id: "villa-hotel", label: "Hotel or private villa", description: "Hotel suites, villas, private chef, security, or hosted stay needs.", priceHint: "Tell us dates and group size", requestType: "VILLA", icon: Hotel },
      { id: "chauffeur", label: "Transfers and chauffeur", description: "Airport pickup, driver by the hour, and late-night movement.", priceHint: "Route and vehicle confirmed on WhatsApp", requestType: "TRANSFER", icon: Car },
      { id: "full-schedule", label: "Full schedule planning", description: "Beach clubs, restaurants, nightlife, DJs, and movement across days.", priceHint: "Personal plan sent back", requestType: "SCHEDULE", icon: CalendarRange },
      { id: "tailored-package", label: "Tailored package", description: "A ready-made or custom plan for the whole stay.", priceHint: "Built around your group", requestType: "PACKAGE", icon: Package }
    ]
  }
};

export function getVenueExperience(slug?: string | null, fallbackName = "Venue"): VenueExperience {
  if (slug && venueExperiences[slug]) return venueExperiences[slug];
  return {
    slug: slug ?? "venue",
    wordmark: fallbackName,
    monogram: fallbackName.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "VIP",
    tagline: "VIP hosting and concierge requests",
    mood: "Concierge",
    services: defaultServices
  };
}

const iconByName = { Calendar, CalendarRange, Car, Crown, Flag, GlassWater, Hotel, Music2, Package, ShipWheel, Sparkles, Sun, Utensils, Users, Waves };
const requestTypes: RequestType[] = ["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE"];

export function getClubVenueExperience(club?: Club | null): VenueExperience {
  const fallback = getVenueExperience(club?.slug, club?.name);
  if (!club) return fallback;
  const brand = parseBrandConfig(club.brand_config);
  const services = parseServiceConfig(club.service_config);

  return {
    ...fallback,
    wordmark: club.name || fallback.wordmark,
    monogram: brand.monogram || fallback.monogram,
    tagline: brand.tagline || fallback.tagline,
    mood: brand.mood || fallback.mood,
    services: services.length ? services : fallback.services
  };
}

export function serializeServicesForAdmin(club?: Club | null) {
  return getClubVenueExperience(club).services.map(({ id, label, description, priceHint, requestType, iconName }) => ({
    id,
    label,
    description,
    priceHint: priceHint ?? "",
    requestType,
    icon: iconName ?? "Sparkles",
    active: true
  }));
}

function parseBrandConfig(value: Club["brand_config"]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const config = value as Record<string, unknown>;
  return {
    monogram: stringValue(config.monogram),
    tagline: stringValue(config.tagline),
    mood: stringValue(config.mood)
  };
}

function parseServiceConfig(value: Club["service_config"]) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const service = item as Record<string, unknown>;
    const requestType = stringValue(service.requestType);
    if (!requestTypes.includes(requestType as RequestType)) return [];
    const label = stringValue(service.label);
    if (!label) return [];
    const iconName = stringValue(service.icon) || "Sparkles";
    return [{
      id: stringValue(service.id) || `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
      label,
      description: stringValue(service.description) || "Concierge service request.",
      priceHint: stringValue(service.priceHint),
      requestType: requestType as RequestType,
      icon: iconByName[iconName as keyof typeof iconByName] ?? Sparkles,
      iconName
    }];
  });
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
