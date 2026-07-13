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
  date.setHours(12, 0, 0, 0);
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
  const arrival = inferArrivalTime(text);
  const language = inferLanguage(lower);

  return {
    clientName: "",
    phone,
    clubId: club?.id ?? "",
    requestType,
    requestedDate: inferDate(text),
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
  if (isTemporaryPhone(phone)) return "#";
  const digits = phone?.replace(/\D/g, "") || "";
  if (!digits) return "#";
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function isTemporaryPhone(phone?: string | null) {
  return Boolean(phone?.startsWith("lead-") || /^000\d{10,}$/.test(phone ?? ""));
}

function inferRequestType(lower: string): RequestType {
  if (/\b(table|mesa|bord|vip table|minimum spend)\b/.test(lower)) return "TABLE";
  if (/\b(vip|bottle|botella|service)\b/.test(lower)) return "VIP_SERVICE";
  if (/\b(guestlist|guest list|lista|gästlista)\b/.test(lower)) return "GUESTLIST";
  return "GENERAL";
}

function inferDate(lower: string) {
  const text = lower.toLowerCase();
  const explicit = parseExplicitDate(text);
  if (explicit) return explicit;
  const weekday = parseWeekday(text);
  if (weekday) return weekday;
  if (/\b(day after tomorrow|övermorgon|pasado mañana|pasado manana)\b/.test(text)) return localDateString(2);
  if (/\b(tomorrow|imorgon|mañana|manana)\b/.test(text)) return localDateString(1);
  if (/\b(today|tonight|ikväll|ikvall|hoy|esta noche)\b/.test(text)) return localDateString(0);
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

function parseExplicitDate(text: string) {
  const namedMonth = parseNamedMonthDate(text);
  if (namedMonth) return namedMonth;

  const iso = text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (iso) return toDateString(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const european = text.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])(?:[-/.](20\d{2}|\d{2}))?\b/);
  if (!european) return null;
  const year = normalizeYear(european[3]);
  return futureDateString(year, Number(european[2]), Number(european[1]));
}

function parseNamedMonthDate(text: string) {
  const months = [
    ["jan", "january", "enero", "januari"],
    ["feb", "february", "febrero", "februari"],
    ["mar", "march", "marzo", "mars"],
    ["apr", "april", "abril"],
    ["may", "mayo", "maj"],
    ["jun", "june", "junio", "juni"],
    ["jul", "july", "julio", "juli"],
    ["aug", "august", "agosto", "augusti"],
    ["sep", "sept", "september", "septiembre"],
    ["oct", "october", "octubre", "oktober"],
    ["nov", "november", "noviembre"],
    ["dec", "december", "diciembre", "december"]
  ];
  for (let index = 0; index < months.length; index += 1) {
    const monthName = months[index].join("|");
    const dayBefore = text.match(new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])\\s*(?:st|nd|rd|th)?\\s+(${monthName})\\b`));
    if (dayBefore) return futureDateString(new Date().getFullYear(), index + 1, Number(dayBefore[1]));
    const monthBefore = text.match(new RegExp(`\\b(${monthName})\\s+(0?[1-9]|[12]\\d|3[01])\\b`));
    if (monthBefore) return futureDateString(new Date().getFullYear(), index + 1, Number(monthBefore[2]));
  }
  return null;
}

function parseWeekday(text: string) {
  const weekdays = [
    ["sunday", "söndag", "sondag", "domingo"],
    ["monday", "måndag", "mandag", "lunes"],
    ["tuesday", "tisdag", "martes"],
    ["wednesday", "onsdag", "miércoles", "miercoles"],
    ["thursday", "torsdag", "jueves"],
    ["friday", "fredag", "viernes"],
    ["saturday", "lördag", "lordag", "sábado", "sabado"]
  ];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayDay = today.getDay();
  for (let day = 0; day < weekdays.length; day += 1) {
    if (weekdays[day].some((name) => new RegExp(`\\b${name}\\b`).test(text))) {
      const offset = (day - todayDay + 7) % 7 || 7;
      return localDateString(offset);
    }
  }
  return null;
}

function inferArrivalTime(text: string) {
  const explicit = text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (explicit) return `${explicit[1].padStart(2, "0")}:${explicit[2]}`;
  const compact = text.match(/\b([01]?\d|2[0-3])\s*(pm|am)\b/i);
  if (!compact) return "";
  let hour = Number(compact[1]);
  const suffix = compact[2].toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:00`;
}

function normalizeYear(value?: string) {
  if (!value) return new Date().getFullYear();
  const year = Number(value);
  return year < 100 ? 2000 + year : year;
}

function futureDateString(year: number, month: number, day: number) {
  const candidate = new Date(year, month - 1, day, 12);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (candidate < today && !String(year).startsWith("20")) candidate.setFullYear(candidate.getFullYear() + 1);
  if (candidate < today) candidate.setFullYear(candidate.getFullYear() + 1);
  return toDateString(candidate.getFullYear(), candidate.getMonth() + 1, candidate.getDate());
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
