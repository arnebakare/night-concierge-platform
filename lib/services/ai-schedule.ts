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
  failureReason?: string;
};

export type ScheduleInput = {
  dateFrom: string;
  dateTo: string;
  spendProfile: SpendProfile;
  city?: string;
  clientContext?: string;
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
  const model = process.env.OPENAI_SCHEDULE_MODEL?.trim() || "gpt-4.1-mini";
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
        tools: [{
          type: "web_search",
          search_context_size: "low",
          user_location: {
            type: "approximate",
            country: "ES",
            city: "Marbella",
            region: "Andalucia"
          }
        }],
        input: [
          {
            role: "system",
            content: "You are a Marbella nightlife concierge planner. Create useful, realistic customer-ready party plans. Use web search to look for current DJ, artist, event, and club programming when available. Return only valid JSON matching the requested shape."
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
    if (!response.ok) throw new Error(await readOpenAiError(response));
    const payload = await response.json() as { output_text?: string; output?: unknown };
    const parsed = parseModelJson(payload);
    return { ...parsed, whatsappMessage: buildConciergeMessage(parsed.days, input.spendProfile), modelUsed: model, generatedBy: "OPENAI" };
  } catch (error) {
    return fallbackSchedule(input, model, error);
  }
}

function buildPrompt(input: ScheduleInput) {
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
      "Use web search for current public programming on selected dates. Search official venue sites and public social/web results for DJs/artists at La Plage Casanis, Le Jade, Playa Padre, La Cabane, Momento, Motel Particulier, Bonbonniere, Pangea, Sublim Beach, GAIA, Coya, and other relevant Marbella venues.",
      "When a DJ, artist, or named event is found for a venue/date, put it directly in the stop.venue field using this style: 'La Plage Casanis - Arodes' or 'Le Jade - Secret Guest'.",
      "When a stop is a choice between two venues, put both directly in stop.venue using English style, for example: 'GAIA or Coya' or 'Bonbonniere or Pangea'.",
      "Prioritize big DJ names or clearly DJ-led events over generic restaurant stops when they happen during the selected dates.",
      "Do not invent specific DJ names. If no DJ is known, say DJ/programming to confirm rather than naming one.",
      "Do not repeat the same venues every day. Vary the beach club, dinner, and late-night options across the date range unless a specific DJ/event makes repeating a venue the best choice.",
      "For the final WhatsApp message, use a short section per day with English weekday headings, bullet lines, and emojis. Do not include times or category labels in the customer message."
    ],
    knownVenues: venueGuide,
    outputShape: {
      title: "string",
      days: [{ date: "YYYY-MM-DD", headline: "string", stops: [{ time: "string", venue: "string", category: "Beach club|Restaurant|Nightclub|After-party", area: "string", why: "string", bookingAngle: "string" }], note: "string" }]
    }
  });
}

function scheduleJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "days"],
    properties: {
      title: { type: "string" },
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
  if (!text) throw new Error("OpenAI returned no output text.");
  const parsed = parseJsonObject(text) as Omit<SchedulePlanResult, "modelUsed" | "generatedBy">;
  if (!Array.isArray(parsed.days)) throw new Error("OpenAI response did not include schedule days.");
  return parsed;
}

function parseJsonObject(text: string) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(clean);
  } catch (error) {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(clean.slice(start, end + 1));
      } catch {
        // Fall through to the original parse error for the most accurate position.
      }
    }
    throw error;
  }
}

function buildConciergeMessage(days: ScheduleDay[], spend: SpendProfile) {
  const intro = spend === "HIGH_SPEND"
    ? "I put together a strong Marbella party plan:"
    : "I put together a nice Marbella party plan:";

  return [
    intro,
    ...days.flatMap((day) => [
      "",
      formatEnglishDay(day.date),
      ...day.stops.map((stop) => `• ${categoryEmoji(stop.category)} ${stop.venue}`)
    ]),
    "",
    "I can check availability and adjust it depending on the kind of night you want."
  ].join("\n");
}

function categoryEmoji(category: ScheduleStop["category"]) {
  if (category === "Restaurant") return "🍽️";
  if (category === "Nightclub" || category === "After-party") return "🌙";
  return "☀️";
}

function formatEnglishDay(value: string) {
  const date = new Date(`${value}T12:00:00`);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
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

async function readOpenAiError(response: Response) {
  const fallback = `OpenAI request failed with HTTP ${response.status}.`;
  try {
    const payload = await response.json() as { error?: { message?: string; code?: string; type?: string } };
    const details = [
      payload.error?.message,
      payload.error?.code ? `code: ${payload.error.code}` : null,
      payload.error?.type ? `type: ${payload.error.type}` : null
    ].filter(Boolean).join(" · ");
    return details ? `${fallback} ${details}` : fallback;
  } catch {
    return fallback;
  }
}

function fallbackSchedule(input: ScheduleInput, model: string, error?: unknown): SchedulePlanResult {
  const failureReason = readableError(error);
  return {
    title: `${input.city ?? "Marbella"} plan · ${input.dateFrom}${input.dateFrom === input.dateTo ? "" : ` to ${input.dateTo}`}`,
    days: [],
    whatsappMessage: [
      "AI schedule search is not available right now.",
      "",
      `Reason: ${failureReason}`,
      "",
      "Please try again in a moment, or check the OpenAI API key/model settings. I did not create a fake researched itinerary."
    ].join("\n"),
    modelUsed: model,
    generatedBy: "FALLBACK",
    failureReason
  };
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message) return error.message.slice(0, 800);
  if (typeof error === "string" && error.trim()) return error.trim().slice(0, 800);
  return "Unknown OpenAI error.";
}
