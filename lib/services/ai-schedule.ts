import type { ConciergeEvent } from "@/lib/types";

export type SpendProfile = "NORMAL" | "HIGH_SPEND";

export type ScheduleStop = {
  time: string;
  venue: string;
  category: "Beach club" | "Restaurant" | "Nightclub" | "After-party";
  area: string;
  why: string;
  bookingAngle: string;
};

export type ScheduleDay = {
  date: string;
  headline: string;
  stops: ScheduleStop[];
  note: string;
};

export type SchedulePlanResult = {
  title: string;
  days: ScheduleDay[];
  whatsappMessage: string;
  modelUsed: string;
  generatedBy: "OPENAI" | "FALLBACK";
};

export type ScheduleInput = {
  dateFrom: string;
  dateTo: string;
  spendProfile: SpendProfile;
  city?: string;
  clientContext?: string;
  events?: ConciergeEvent[];
};

const venueGuide = [
  { name: "La Plage Casanis", category: "Beach club", area: "Elviria", vibe: "beach lunch, stylish daytime, sunset groups, Wednesday/Sunday DJ party until 00:00", spend: "normal/high", priority: "Wednesday and Sunday higher priority as the main party block, not only a restaurant/lunch stop" },
  { name: "Le Jade", category: "After-party", area: "Marbella", vibe: "late intimate after-party", spend: "normal/high", priority: "Wednesday and Sunday higher priority, especially after La Plage Casanis" },
  { name: "Playa Padre", category: "Beach club", area: "Marbella beach", vibe: "boho beach club, music, DJs, party lunch", spend: "normal/high", priority: "strong beach club alternative, especially when a named DJ or programmed party is available" },
  { name: "La Cabane", category: "Beach club", area: "Los Monteros", vibe: "elegant beach club, polished lunch", spend: "high", priority: "high-spend daytime option" },
  { name: "Nikki Beach Marbella", category: "Beach club", area: "Elviria", vibe: "international beach club, champagne groups", spend: "high", priority: "high-spend beach day alternative" },
  { name: "Mamzel", category: "Restaurant", area: "Marbella", vibe: "dinner show, celebration, table energy", spend: "normal/high", priority: "strong dinner anchor on non-Casanis party nights" },
  { name: "Motel Particulier", category: "Restaurant", area: "Marbella", vibe: "dinner and late lounge feel", spend: "high", priority: "high-spend dinner/lounge" },
  { name: "Nobu Marbella", category: "Restaurant", area: "Puente Romano", vibe: "premium dinner, international clients", spend: "high", priority: "safe high-spend restaurant recommendation" },
  { name: "Cipriani Marbella", category: "Restaurant", area: "Puente Romano", vibe: "classic high-spend dinner", spend: "high", priority: "high-spend polished dinner" },
  { name: "Nota Blu", category: "Restaurant", area: "Marbella", vibe: "elegant dinner, polished crowd", spend: "high", priority: "high-spend dinner alternative" },
  { name: "Momento", category: "Nightclub", area: "Marbella", vibe: "club night, DJs, VIP tables", spend: "normal/high", priority: "prime late-night club, prioritize when big DJ names are playing" },
  { name: "Bon Bonniere", category: "Nightclub", area: "Marbella", vibe: "late club, table-driven, DJ-led nights", spend: "high", priority: "high-spend late option, prioritize when big DJ names are playing" },
  { name: "Olivia Valere", category: "Nightclub", area: "Marbella", vibe: "classic Marbella nightclub", spend: "normal/high", priority: "fallback late-night club" }
];

export async function generateSchedulePlan(input: ScheduleInput): Promise<SchedulePlanResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_SCHEDULE_MODEL?.trim() || "gpt-5.1-mini";
  if (!apiKey) return fallbackSchedule(input, model);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: "You are a Marbella nightlife concierge planner. Create useful, realistic customer-ready plans. Return only valid JSON matching the requested shape."
          },
          {
            role: "user",
            content: buildPrompt(input)
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "marbella_schedule_plan",
            schema: scheduleJsonSchema(),
            strict: true
          }
        }
      })
    });
    if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
    const payload = await response.json() as { output_text?: string; output?: unknown };
    const parsed = parseModelJson(payload);
    return { ...parsed, modelUsed: model, generatedBy: "OPENAI" };
  } catch {
    return fallbackSchedule(input, model);
  }
}

function buildPrompt(input: ScheduleInput) {
  const events = (input.events ?? []).map((event) => ({
    date: event.event_date,
    name: event.name,
    venue: event.clubs?.name,
    description: event.description
  }));

  return JSON.stringify({
    task: "Build a per-day Marbella trail for a promoter to send to a client on WhatsApp.",
    city: input.city ?? "Marbella",
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    spendProfile: input.spendProfile,
    clientContext: input.clientContext || "",
    rules: [
      "The customer is mainly a party/nightlife client. Build the day around music, DJs, beach-club parties, dinner only when it improves the night, and late club/after-party energy.",
      "Include beach clubs, restaurants, and nightclubs/after-parties where suitable, but prioritize party flow over a generic tourist itinerary.",
      "Each day should have 2-4 stops: party beach/daytime, optional dinner, late night/after-party. Do not force dinner if the party block already runs late.",
      "For HIGH_SPEND, favor La Cabane, Nikki Beach, Nobu, Cipriani, Nota Blu, Motel Particulier, Bon Bonniere, premium tables.",
      "For NORMAL, keep it polished but not over the top: La Plage Casanis, Playa Padre, Mamzel, Momento, Le Jade.",
      "On Wednesdays and Sundays, give a clear higher priority to La Plage Casanis and Le Jade. Treat La Plage Casanis as a party with DJs until 00:00, not only as lunch or dinner.",
      "On Wednesdays and Sundays, do not schedule dinner between La Plage Casanis and Le Jade unless the client context explicitly asks for dinner. A good pattern is La Plage Casanis party until 00:00, then Le Jade later.",
      "Use knownEvents to identify DJs, artists, parties, and special occasions. If a DJ or artist is known for that date, include the name in the stop why/bookingAngle and in the WhatsApp message.",
      "Prioritize big DJ names or clearly DJ-led events over generic restaurant stops when they happen during the selected dates.",
      "Do not invent specific DJ names. If no DJ is known, say DJ/programming to confirm rather than naming one.",
      "Keep the WhatsApp message clean, short, and friendly. No exaggerated VIP wording."
    ],
    knownVenues: venueGuide,
    knownEvents: events,
    outputShape: {
      title: "string",
      days: [{ date: "YYYY-MM-DD", headline: "string", stops: [{ time: "string", venue: "string", category: "Beach club|Restaurant|Nightclub|After-party", area: "string", why: "string", bookingAngle: "string" }], note: "string" }],
      whatsappMessage: "string"
    }
  });
}

function scheduleJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "days", "whatsappMessage"],
    properties: {
      title: { type: "string" },
      whatsappMessage: { type: "string" },
      days: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["date", "headline", "stops", "note"],
          properties: {
            date: { type: "string" },
            headline: { type: "string" },
            note: { type: "string" },
            stops: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["time", "venue", "category", "area", "why", "bookingAngle"],
                properties: {
                  time: { type: "string" },
                  venue: { type: "string" },
                  category: { type: "string", enum: ["Beach club", "Restaurant", "Nightclub", "After-party"] },
                  area: { type: "string" },
                  why: { type: "string" },
                  bookingAngle: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  };
}

function parseModelJson(payload: { output_text?: string; output?: unknown }) {
  const text = payload.output_text || extractOutputText(payload.output) || "";
  const parsed = JSON.parse(text) as Omit<SchedulePlanResult, "modelUsed" | "generatedBy">;
  return parsed;
}

function extractOutputText(output: unknown): string {
  if (!Array.isArray(output)) return "";
  return output.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) return [];
    return content.flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? [text] : [];
    });
  }).join("\n");
}

function fallbackSchedule(input: ScheduleInput, model: string): SchedulePlanResult {
  const days = dateRange(input.dateFrom, input.dateTo).map((date) => {
    const day = new Date(`${date}T12:00:00`).getDay();
    const casanisNight = day === 0 || day === 3;
    const high = input.spendProfile === "HIGH_SPEND";
    const stops: ScheduleStop[] = casanisNight ? [
      { time: "17:00", venue: "La Plage Casanis", category: "Beach club", area: "Elviria", why: "Wednesday/Sunday party block with DJs running through sunset until 00:00.", bookingAngle: "Ask for table/beach setup and confirm the DJ programming before promising names." },
      { time: "00:30", venue: "Le Jade", category: "After-party", area: "Marbella", why: "Natural after-party move after La Plage without breaking the flow for dinner.", bookingAngle: "Keep it as the late option if they want to continue after Casanis." }
    ] : [
      { time: "16:00", venue: high ? "La Cabane" : "Playa Padre", category: "Beach club", area: high ? "Los Monteros" : "Marbella beach", why: high ? "Elegant beach club with the right table energy if programming is strong." : "Music-led beach club start with party potential.", bookingAngle: "Ask if they prefer a party table, lunch table, or beach setup." },
      { time: "21:30", venue: high ? "Cipriani Marbella" : "Mamzel", category: "Restaurant", area: "Marbella", why: high ? "Classic high-spend dinner choice." : "Reliable dinner with atmosphere.", bookingAngle: "Confirm table and group size first." },
      { time: "00:30", venue: high ? "Bon Bonniere" : "Momento", category: "Nightclub", area: "Marbella", why: high ? "Premium late table option, especially if a strong DJ is playing." : "Strong DJ/table option for the late part of the night.", bookingAngle: "Check DJ programming, table minimum, or guestlist based on spend." }
    ];
    return { date, headline: casanisNight ? "La Plage party into Le Jade" : high ? "High-spend party trail" : "Marbella party trail", stops, note: "Confirm availability and DJ programming before promising exact tables." };
  });

  return {
    title: `${input.city ?? "Marbella"} plan · ${input.dateFrom}${input.dateFrom === input.dateTo ? "" : ` to ${input.dateTo}`}`,
    days,
    whatsappMessage: buildWhatsAppMessage(days, input.spendProfile),
    modelUsed: model,
    generatedBy: "FALLBACK"
  };
}

function buildWhatsAppMessage(days: ScheduleDay[], spend: SpendProfile) {
  const intro = spend === "HIGH_SPEND" ? "I put together a strong Marbella party plan for you:" : "I put together a nice Marbella party plan for you:";
  return [
    intro,
    ...days.flatMap((day) => [
      "",
      `${formatDisplayDate(day.date)} - ${day.headline}`,
      ...day.stops.map((stop) => `${stop.time} · ${stop.venue} (${stop.category})`)
    ]),
    "",
    "I can check availability and adjust it depending on what kind of day/night you prefer."
  ].join("\n");
}

function dateRange(from: string, to: string) {
  const dates: string[] = [];
  const cursor = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (cursor <= end && dates.length < 14) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}
