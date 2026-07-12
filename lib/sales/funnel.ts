import type { Club, ConciergeRequest, RequestStatus, RequestType } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

export type LeadDraft = {
  clientName: string;
  phone: string;
  clubId: string;
  requestType: RequestType;
  requestedDate: string;
  arrivalTime: string;
  guestCount: number;
  budget: string;
  message: string;
  language: "en" | "es" | "sv";
};

type SalesRequest = Pick<
  ConciergeRequest,
  "request_type" | "requested_date" | "arrival_time" | "guest_count" | "budget" | "message" | "status"
> & {
  clients?: { name?: string | null; phone?: string | null } | null;
  clubs?: { name?: string | null; city?: string | null } | null;
};

export function localDateString(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function parseWhatsAppLead(raw: string, clubs: Club[]): LeadDraft {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const club = clubs.find((item) => lower.includes(item.name.toLowerCase()) || lower.includes(item.slug.replaceAll("-", " "))) ?? clubs[0];
  const requestType = inferRequestType(lower);
  const phone = text.match(/(\+?\d[\d\s().-]{6,}\d)/)?.[1]?.trim() ?? "";
  const guests = lower.match(/(\d{1,3})\s*(pax|people|persons|guests|guest|personer|pers|personas|personas?)/)?.[1];
  const budget = text.match(/(?:€|eur|budget|max|min|spend|gasto|presupuesto|pris|budget)\s*[:\-]?\s*(€?\s?\d{2,6}(?:\s?€)?)/i)?.[1] ?? "";
  const arrival = text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/)?.[0]?.replace(".", ":") ?? "";
  const language = inferLanguage(lower);

  return {
    clientName: "",
    phone,
    clubId: club?.id ?? "",
    requestType,
    requestedDate: inferDate(lower),
    arrivalTime: arrival,
    guestCount: guests ? Number(guests) : requestType === "TABLE" ? 4 : 2,
    budget,
    message: text,
    language
  };
}

export function buildAvailabilityMessage(request: SalesRequest) {
  const clientName = request.clients?.name ?? "Client";
  const clubName = request.clubs?.name ?? "Venue";
  const time = request.arrival_time ? ` at ${request.arrival_time}` : "";
  const budget = request.budget ? `\nBudget/table spend: ${request.budget}` : "";
  const message = request.message ? `\nNotes: ${cleanContext(request.message)}` : "";

  return [
    `Can we do this?`,
    `${clubName} · ${formatEnum(request.request_type)}`,
    `Date: ${request.requested_date}${time}`,
    `Client: ${clientName}`,
    `Guests: ${request.guest_count}`,
    `${budget}${message}`,
    "",
    "If not, what is the closest option?"
  ].join("\n").replace(/\n{3,}/g, "\n\n");
}

export function buildClientReply(request: SalesRequest, language: LeadDraft["language"] = "en") {
  const clientName = request.clients?.name?.split(" ")[0] ?? "";
  const clubName = request.clubs?.name ?? "the venue";
  const intro = clientName ? `Hi ${clientName}` : "Hi";

  if (language === "es") {
    return `${intro}, perfecto. Lo miro con ${clubName} para el ${request.requested_date} para ${request.guest_count} personas y te digo enseguida. Si quieres alguna hora o zona específica, mándamelo por aquí.`;
  }

  if (language === "sv") {
    return `${intro}, absolut. Jag kollar med ${clubName} den ${request.requested_date} för ${request.guest_count} personer och återkommer snart. Om du vill ha en särskild tid eller plats, skriv det här.`;
  }

  return `${intro}, perfect. I’ll check with ${clubName} for ${request.requested_date} for ${request.guest_count} guests and get back to you shortly. If you prefer a specific time or area, just send it here.`;
}

export function buildUpsellIdeas(request: SalesRequest) {
  const text = `${request.message ?? ""} ${request.request_type}`.toLowerCase();
  const ideas = ["Ask if they prefer earlier or later arrival"];

  if (request.request_type === "GUESTLIST") ideas.push("Mention a small table if they want it easier");
  if (request.request_type === "TABLE" || request.request_type === "VIP_SERVICE") ideas.push("Ask if they want any drinks ready");
  if (text.includes("birthday") || text.includes("cumple") || text.includes("födelsedag")) ideas.push("Ask if they want anything simple arranged for the birthday");
  if ((request.clubs?.name ?? "").toLowerCase().includes("plage")) ideas.push("Mention Le Jade later if they want to continue");
  ideas.push("Ask if they need help before or after the booking");

  return Array.from(new Set(ideas)).slice(0, 4);
}

export function nextSalesAction(status: RequestStatus) {
  if (status === "NEW") return "Reply and check availability";
  if (status === "CONTACTED") return "Get venue confirmation";
  if (status === "PENDING") return "Send answer to client";
  if (status === "CONFIRMED") return "Ready to host";
  if (status === "ARRIVED") return "Completed";
  if (status === "DECLINED" || status === "CANCELLED" || status === "NO_SHOW") return "Archived";
  return "Next step";
}

export function whatsAppHref(phone?: string | null, message?: string) {
  const digits = phone?.replace(/\D/g, "") || "";
  if (!digits) return "#";
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

function inferRequestType(lower: string): RequestType {
  if (/\b(table|mesa|bord|vip table|minimum spend)\b/.test(lower)) return "TABLE";
  if (/\b(vip|bottle|botella|service)\b/.test(lower)) return "VIP_SERVICE";
  if (/\b(guestlist|guest list|lista|gästlista)\b/.test(lower)) return "GUESTLIST";
  return "GENERAL";
}

function inferDate(lower: string) {
  if (/\b(tomorrow|imorgon|mañana|manana)\b/.test(lower)) return localDateString(1);
  return localDateString(0);
}

function inferLanguage(lower: string): LeadDraft["language"] {
  if (/\b(hola|mesa|personas|mañana|manana|gracias|quiero)\b/.test(lower)) return "es";
  if (/\b(hej|bord|personer|imorgon|ikväll|ikvall|tack|vill)\b/.test(lower)) return "sv";
  return "en";
}

function cleanContext(message: string) {
  return message.replace(/^Selected (service|occasion):.+$/gm, "").trim();
}
