import type { Club, ConciergeRequest, MessageTemplate, RequestStatus, RequestType } from "@/lib/types";
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
  confidence: number;
  missingFields: string[];
};

type SalesRequest = Pick<
  ConciergeRequest,
  "request_type" | "requested_date" | "arrival_time" | "guest_count" | "budget" | "message" | "status"
> & {
  clients?: { name?: string | null; phone?: string | null; country?: string | null; preferred_language?: LeadDraft["language"] | null } | null;
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
  const guests = inferGuestCount(lower);
  const budget = inferBudget(text);
  const arrival = inferArrivalTime(text);
  const language = inferLanguage(lower);
  const clientName = inferClientName(text);
  const missingFields = [
    !phone ? "WhatsApp number" : null,
    !club?.id ? "venue" : null,
    !arrival ? "arrival time" : null,
    !guests ? "guest count" : null,
    !clientName ? "client name" : null
  ].filter((value): value is string => Boolean(value));

  return {
    clientName,
    phone,
    clubId: club?.id ?? "",
    requestType,
    requestedDate: inferDate(text),
    arrivalTime: arrival,
    guestCount: guests ?? (requestType === "TABLE" ? 4 : 2),
    budget,
    message: text,
    language,
    confidence: Math.max(20, 100 - missingFields.length * 16),
    missingFields
  };
}

export function buildAvailabilityMessage(request: SalesRequest) {
  const clientName = request.clients?.name ?? "Client";
  const clubName = request.clubs?.name ?? "Venue";
  const time = request.arrival_time ? ` at ${request.arrival_time}` : "";
  const budget = request.budget ? `\nBudget/table spend: ${request.budget}` : "";
  const message = request.message ? `\nNotes: ${cleanContext(request.message)}` : "";

  return [
    "Can you check this for me?",
    `${clubName} · ${formatEnum(request.request_type)}`,
    `Date: ${formatClientDate(request.requested_date)}${time}`,
    `Client: ${clientName}`,
    `Guests: ${request.guest_count}`,
    `${budget}${message}`,
    "",
    "If that is not possible, what is the closest good option?"
  ].join("\n").replace(/\n{3,}/g, "\n\n");
}

export function buildAvailabilityMessageFromTemplate(request: SalesRequest, template?: MessageTemplate | null) {
  return template?.active ? renderTemplate(template.body, request) : buildAvailabilityMessage(request);
}

export function buildClientReply(request: SalesRequest, language?: LeadDraft["language"]) {
  const selectedLanguage = request.clients?.preferred_language ?? language ?? inferLanguageFromCountry(request.clients?.country);
  const clientName = request.clients?.name?.split(" ")[0] ?? "";
  const clubName = request.clubs?.name ?? "the venue";
  const intro = clientName ? `Hi ${clientName}` : "Hi";

  if (selectedLanguage === "es") {
    return `${intro}, perfecto. Lo miro con ${clubName} para ${formatClientDate(request.requested_date)} para ${request.guest_count} personas y te digo enseguida. Si prefieres una hora o zona concreta, mándamelo por aquí.`;
  }

  if (selectedLanguage === "sv") {
    return `${intro}, absolut. Jag kollar med ${clubName} ${formatClientDate(request.requested_date)} för ${request.guest_count} personer och återkommer snart. Om du vill ha en särskild tid eller plats, skriv det här.`;
  }

  return `${intro}, perfect. I’ll check with ${clubName} for ${formatClientDate(request.requested_date)} for ${request.guest_count} guests and get back to you shortly. If you prefer a specific time or area, just send it here.`;
}

export function buildClientReplyFromTemplate(request: SalesRequest, templates: MessageTemplate[] = [], language?: LeadDraft["language"]) {
  const selectedLanguage = request.clients?.preferred_language ?? language ?? inferLanguageFromCountry(request.clients?.country);
  const template = findTemplate(templates, "client_reply", selectedLanguage);
  return template ? renderTemplate(template.body, request) : buildClientReply(request, language);
}

export function buildClientOfferFromTemplate(
  request: SalesRequest,
  input: { serviceLabel: string; venueName?: string; offerDate?: string; arrivalTime?: string; minSpend?: string },
  templates: MessageTemplate[] = []
) {
  const template = findTemplate(templates, "client_offer", request.clients?.preferred_language ?? "en");
  if (!template) return "";
  return renderTemplate(template.body, request, {
    service_label: input.serviceLabel,
    venue_name: input.venueName ?? request.clubs?.name ?? "the venue",
    date: input.offerDate ? formatClientDate(input.offerDate) : formatClientDate(request.requested_date),
    arrival_offer_line: input.arrivalTime ? ` around ${input.arrivalTime}` : "",
    spend_offer_line: input.minSpend ? ` with ${input.minSpend}` : ""
  });
}

export function buildRetentionMessageFromTemplate(
  client: { name: string; country?: string | null; preferred_language?: LeadDraft["language"] | null },
  templates: MessageTemplate[] = []
) {
  const language = client.preferred_language ?? inferLanguageFromCountry(client.country);
  const template = findTemplate(templates, "retention_checkin", language);
  if (!template) return "";
  const clientName = client.name || "there";
  const firstName = clientName.split(" ").filter(Boolean)[0] || clientName;
  return renderTemplate(template.body, {
    request_type: "GENERAL",
    requested_date: localDateString(0),
    arrival_time: "",
    guest_count: 1,
    budget: "",
    message: "",
    status: "NEW",
    clients: {
      name: clientName,
      country: client.country,
      preferred_language: language
    },
    clubs: {
      name: "Marbella",
      city: "Marbella"
    }
  }, {
    client_first_name: firstName,
    client_name: clientName
  });
}

export function findTemplate(templates: MessageTemplate[], key: string, language: LeadDraft["language"] = "en") {
  return templates.find((template) => template.active && template.key === key && template.language === language)
    ?? templates.find((template) => template.active && template.key === key && template.language === "en")
    ?? null;
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

export function inferLanguageFromCountry(country?: string | null): LeadDraft["language"] {
  const value = country?.trim().toLowerCase() ?? "";
  if (!value) return "en";
  if (/\b(spain|españa|espana|spanien|mexico|méxico|argentina|colombia|chile|peru|perú|uruguay|venezuela)\b/.test(value)) return "es";
  if (/\b(sweden|sverige|suecia|svensk|swedish)\b/.test(value)) return "sv";
  return "en";
}

export function isTemporaryPhone(phone?: string | null) {
  return Boolean(phone?.startsWith("lead-") || /^000\d{10,}$/.test(phone ?? ""));
}

function inferRequestType(lower: string): RequestType {
  if (/\b(table|mesa|bord|vip table|minimum spend|min spend|minimum|cabana|sofa)\b/.test(lower)) return "TABLE";
  if (/\b(vip|bottle|botella|service|bottles|champagne)\b/.test(lower)) return "VIP_SERVICE";
  if (/\b(guestlist|guest list|lista|gästlista)\b/.test(lower)) return "GUESTLIST";
  return "GENERAL";
}

function inferClientName(text: string) {
  const patterns = [
    /\b(?:name|client|guest|nombre|namn)\s*[:\-]\s*([A-Za-zÀ-ÿ .'’-]{2,60})/i,
    /\b(?:i am|i'm|im|this is|my name is|name is)\s+([A-ZÅÄÖÁÉÍÓÚÑ][\p{L}'-]{1,}(?:\s+[A-ZÅÄÖÁÉÍÓÚÑ][\p{L}'-]{1,})?)/u,
    /\b(?:soy|me llamo|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][\p{L}'-]{1,}(?:\s+[A-ZÁÉÍÓÚÑ][\p{L}'-]{1,})?)/u,
    /\b(?:jag heter|det är|mitt namn är)\s+([A-ZÅÄÖ][\p{L}'-]{1,}(?:\s+[A-ZÅÄÖ][\p{L}'-]{1,})?)/u
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function inferGuestCount(lower: string) {
  const direct = lower.match(/\b(\d{1,3})\s*(pax|people|persons|guests|guest|personer|pers|personas|friends|girls|guys|boys|ladies|total)\b/)?.[1];
  if (direct) return Number(direct);
  const forNumber = lower.match(/\b(?:for|för|para|table for|bord för|mesa para)\s+(\d{1,3})\b/)?.[1];
  if (forNumber) return Number(forNumber);
  const group = lower.match(/\b(?:we are|we're|were|somos|vi är|vi ar)\s+(\d{1,3})\b/)?.[1];
  if (group) return Number(group);
  return null;
}

function inferBudget(text: string) {
  const explicit = text.match(/(?:€|eur|budget|max|min|spend|minimum|gasto|presupuesto|pris|budget)\s*[:\-]?\s*(€?\s?\d{2,6}(?:[.,]\d{3})?\s?(?:€|eur|k)?)/i)?.[1];
  if (explicit) return explicit.trim();
  const shorthand = text.match(/\b(\d+(?:[.,]\d)?\s?k)\b/i)?.[1];
  return shorthand?.trim() ?? "";
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

function renderTemplate(template: string, request: SalesRequest, overrides: Record<string, string | number> = {}) {
  const clientName = request.clients?.name ?? "Client";
  const venueName = request.clubs?.name ?? "the venue";
  const notes = request.message ? cleanContext(request.message) : "";
  const values: Record<string, string | number> = {
    client_name: clientName,
    client_first_name: clientName.split(" ").filter(Boolean)[0] ?? "there",
    venue_name: venueName,
    date: formatClientDate(request.requested_date),
    arrival_time: request.arrival_time ?? "",
    arrival_line: request.arrival_time ? ` at ${request.arrival_time}` : "",
    arrival_offer_line: request.arrival_time ? ` around ${request.arrival_time}` : "",
    guest_count: request.guest_count,
    request_type: formatEnum(request.request_type),
    budget: request.budget ?? "",
    budget_line: request.budget ? `\nBudget/table spend: ${request.budget}` : "",
    spend_offer_line: request.budget ? ` with ${request.budget}` : "",
    notes,
    notes_line: notes ? `\nNotes: ${notes}` : "",
    service_label: formatEnum(request.request_type),
    ...overrides
  };
  return template.replace(/\{\{([a-z_]+)\}\}/g, (_, key: string) => String(values[key] ?? ""));
}

function formatClientDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
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
  const nightHour = text.match(/\b(?:at|around|sobre|a las|kl|klockan)\s*([01]?\d|2[0-3])\b/i)?.[1];
  if (nightHour) {
    const rawHour = Number(nightHour);
    const hour = rawHour >= 8 && rawHour <= 12 ? rawHour + 12 : rawHour;
    return `${String(hour).padStart(2, "0")}:00`;
  }
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
