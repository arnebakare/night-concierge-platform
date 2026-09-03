import type { RequestCategory } from "@/components/request/request-form-steps";
import type { PublicRequestInput } from "@/lib/validation/request";
import type { Club, RequestType } from "@/lib/types";

type DeepLinkParams = Record<string, string | string[] | undefined>;

const optionMap: Record<string, { category: RequestCategory; requestType?: RequestType }> = {
  nightlife: { category: "nightlife" },
  club: { category: "nightlife" },
  clubs: { category: "nightlife" },
  table: { category: "nightlife", requestType: "TABLE" },
  guestlist: { category: "nightlife", requestType: "GUESTLIST" },
  vip: { category: "nightlife", requestType: "VIP_SERVICE" },
  boat: { category: "boat", requestType: "BOAT" },
  boats: { category: "boat", requestType: "BOAT" },
  yacht: { category: "boat", requestType: "BOAT" },
  yachts: { category: "boat", requestType: "BOAT" },
  golf: { category: "golf", requestType: "GOLF" },
  villa: { category: "villa", requestType: "VILLA" },
  villas: { category: "villa", requestType: "VILLA" },
  hotel: { category: "villa", requestType: "VILLA" },
  hotels: { category: "villa", requestType: "VILLA" },
  transfer: { category: "transfer", requestType: "TRANSFER" },
  transfers: { category: "transfer", requestType: "TRANSFER" },
  chauffeur: { category: "transfer", requestType: "TRANSFER" },
  driver: { category: "transfer", requestType: "TRANSFER" },
  schedule: { category: "schedule", requestType: "SCHEDULE" },
  itinerary: { category: "schedule", requestType: "SCHEDULE" },
  planning: { category: "schedule", requestType: "SCHEDULE" },
  package: { category: "package", requestType: "PACKAGE" },
  packages: { category: "package", requestType: "PACKAGE" }
};

export function resolveRequestDeepLink(clubs: Club[], params?: DeepLinkParams) {
  const option = firstParam(params?.option ?? params?.service ?? params?.type)?.toLowerCase().trim();
  const clubSlug = firstParam(params?.club ?? params?.venue)?.toLowerCase().trim();
  const matchedClub = clubSlug ? clubs.find((club) => club.slug === clubSlug) : null;
  const optionConfig = option ? optionMap[option] : null;
  const conciergeClub = clubs.find((club) => club.slug === "marbella-concierge");
  const defaults: Partial<PublicRequestInput> = {};

  if (matchedClub) defaults.clubId = matchedClub.id;

  if (optionConfig?.requestType) {
    defaults.requestType = optionConfig.requestType;
    if (optionConfig.category !== "nightlife" && conciergeClub) defaults.clubId = conciergeClub.id;
  }

  return {
    defaults,
    initialCategory: optionConfig?.category ?? (matchedClub ? "nightlife" as const : undefined),
    startAtStep: optionConfig?.category && optionConfig.category !== "nightlife" ? 3 : matchedClub ? 3 : optionConfig ? 2 : undefined
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
