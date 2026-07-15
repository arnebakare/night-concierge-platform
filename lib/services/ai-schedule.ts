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
  { name: "La Plage Casanis", category: "Beach club", area: "Elviria", vibe: "beach lunch, stylish daytime, sunset groups", spend: "normal/high", priority: "Wednesday and Sunday higher priority, especially as a daytime start" },
  { name: "Le Jade", category: "After-party", area: "Marbella", vibe: "late intimate after-party", spend: "normal/high", priority: "Wednesday and Sunday higher priority, especially after La Plage Casanis" },
  { name: "Playa Padre", category: "Beach club", area: "Marbella beach", vibe: "boho beach club, music, lunch", spend: "normal/high", priority: "strong beach club alternative" },
  { name: "La Cabane", category: "Beach club", area: "Los Monteros", vibe: "elegant beach club, polished lunch", spend: "high", priority: "high-spend daytime option" },
  { name: "Nikki Beach Marbella", category: "Beach club", area: "Elviria", vibe: "international beach club, champagne groups", spend: "high", priority: "high-spend beach day alternative" },
  { name: "Mamzel", category: "Restaurant", area: "Marbella", vibe: "dinner show, celebration, table energy", spend: "normal/high", priority: "strong dinner anchor" },
  { name: "Motel Particulier", category: "Restaurant", area: "Marbella", vibe: "dinner and late lounge feel", spend: "high", priority: "high-spend dinner/lounge" },
  { name: "Nobu Marbella", category: "Restaurant", area: "Puente Romano", vibe: "premium dinner, international clients", spend: "high", priority: "safe high-spend restaurant recommendation" },
  { name: "Cipriani Marbella", category: "Restaurant", area: "Puente Romano", vibe: "classic high-spend dinner", spend: "high", priority: "high-spend polished dinner" },
  { name: "Nota Blu", category: "Restaurant", area: "Marbella", vibe: "elegant dinner, polished crowd", spend: "high", priority: "high-spend dinner alternative" },
  { name: "Momento", category: "Nightclub", area: "Marbella", vibe: "club night, DJs, VIP tables", spend: "normal/high", priority: "prime late-night club" },
  { name: "Bon Bonniere", category: "Nightclub", area: "Marbella", vibe: "late club, table-driven", spend: "high", priority: "high-spend late option" },
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
      "Include beach clubs, restaurants, and nightclubs/after-parties where suitable.",
      "Each day should have 2-4 stops: day/beach, dinner, late night. Do not force all categories if one day would feel too busy.",
      "For HIGH_SPEND, favor La Cabane, Nikki Beach, Nobu, Cipriani, Nota Blu, Motel Particulier, Bon Bonniere, premium tables.",
      "For NORMAL, keep it polished but not over the top: La Plage Casanis, Playa Padre, Mamzel, Momento, Le Jade.",
      "On Wednesdays and Sundays, give a small higher priority to La Plage Casanis and Le Jade. A good pattern is La Plage Casanis daytime/sunset then Le Jade later.",
      "Do not invent specific DJ names unless provided in events.",
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
      { time: "14:00", venue: "La Plage Casanis", category: "Beach club", area: "Elviria", why: "Strong Wednesday/Sunday starting point with beach lunch and easy social energy.", bookingAngle: "Ask for lunch or beach setup depending on group mood." },
      { time: "21:30", venue: high ? "Nobu Marbella" : "Mamzel", category: "Restaurant", area: high ? "Puente Romano" : "Marbella", why: high ? "Polished high-spend dinner before the late move." : "Fun dinner-show option before continuing.", bookingAngle: "Confirm dinner table size and preferred timing." },
      { time: "01:00", venue: "Le Jade", category: "After-party", area: "Marbella", why: "Best follow-on when Casanis is part of the day.", bookingAngle: "Keep it as the late option if they want to continue." }
    ] : [
      { time: "14:00", venue: high ? "La Cabane" : "Playa Padre", category: "Beach club", area: high ? "Los Monteros" : "Marbella beach", why: high ? "Elegant beach club for a premium client." : "Relaxed but polished beach club start.", bookingAngle: "Ask if they prefer lunch table or beach setup." },
      { time: "21:30", venue: high ? "Cipriani Marbella" : "Mamzel", category: "Restaurant", area: "Marbella", why: high ? "Classic high-spend dinner choice." : "Reliable dinner with atmosphere.", bookingAngle: "Confirm table and group size first." },
      { time: "00:30", venue: high ? "Bon Bonniere" : "Momento", category: "Nightclub", area: "Marbella", why: high ? "Premium late table option." : "Strong club option for the late part of the night.", bookingAngle: "Check table or guestlist based on spend." }
    ];
    return { date, headline: casanisNight ? "Casanis into Le Jade" : high ? "Polished high-spend Marbella trail" : "Easy Marbella day-to-night trail", stops, note: "Confirm availability before promising exact tables." };
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
  const intro = spend === "HIGH_SPEND" ? "I put together a polished Marbella plan for you:" : "I put together a nice Marbella plan for you:";
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
