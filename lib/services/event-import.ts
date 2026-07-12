import { createAdminClient } from "@/lib/supabase/admin";

type EventSource =
  | {
      kind: "web";
      slug: string;
      clubSlug: string;
      name: string;
      url: string;
    }
  | {
      kind: "recurring";
      slug: string;
      clubSlug: string;
      name: string;
      sourceUrl: string;
      weekdays: number[];
      title: string;
      description: string;
      daysAhead: number;
    }
  | {
      kind: "recurring-program";
      slug: string;
      clubSlug: string;
      name: string;
      url: string;
      programs: Array<{
        weekdays: number[];
        title: string;
        description: string;
      }>;
      daysAhead: number;
    }
  | {
      kind: "monitor";
      slug: string;
      clubSlug: string;
      name: string;
      url: string;
    };

type ImportedEvent = {
  clubSlug: string;
  name: string;
  slug: string;
  eventDate: string;
  description: string | null;
  sourceUrl: string | null;
  sourceKey: string;
};

type ImportRun = {
  source_slug: string;
  source_name: string;
  source_url: string | null;
  status: "OK" | "WARNING" | "FAILED";
  http_status?: number | null;
  message?: string | null;
  events_found: number;
  events_created: number;
};

const EVENT_SOURCES: EventSource[] = [
  { kind: "web", slug: "la-plage-casanis", clubSlug: "la-plage-casanis", name: "La Plage Casanis", url: "https://laplagecasanis.com/whats-on/" },
  {
    kind: "recurring",
    slug: "le-jade-afterparty",
    clubSlug: "le-jade",
    name: "Le Jade",
    sourceUrl: "https://www.instagram.com/lejade.marbella/",
    weekdays: [0, 3],
    title: "Le Jade After Party",
    description: "Recurring after party pattern for La Plage Casanis Wednesdays and Sundays. Confirm manually when programming changes.",
    daysAhead: 45
  },
  {
    kind: "recurring-program",
    slug: "playa-padre-program",
    clubSlug: "playa-padre",
    name: "Playa Padre",
    url: "https://playapadre.com/our-program/",
    programs: [
      { weekdays: [0], title: "Boho Sunday", description: "Recurring Playa Padre Sunday programme. Review the source page for final artist and reservation details." },
      { weekdays: [4], title: "Mezcla with Benchek & Drush", description: "Recurring Thursday techno session with resident DJs Benchek & Drush, imported from Playa Padre programme." }
    ],
    daysAhead: 45
  },
  { kind: "web", slug: "momento", clubSlug: "momento", name: "Momento", url: "https://momentomarbella.com/proximos-eventos/" },
  { kind: "web", slug: "motel-particulier", clubSlug: "motel-particulier", name: "Motel Particulier", url: "https://motelparticulier.com/" },
  { kind: "monitor", slug: "motel-particulier-instagram", clubSlug: "motel-particulier", name: "Motel Particulier Instagram", url: "https://www.instagram.com/motelparticulier/" },
  { kind: "web", slug: "la-cabane", clubSlug: "la-cabane", name: "La Cabane", url: "https://lacabanemarbella.com/en/whats_on/" },
  { kind: "monitor", slug: "bon-bonniere-instagram", clubSlug: "bon-bonniere", name: "Bon Bonniere Instagram", url: "https://www.instagram.com/bonbonniere.marbella/reels/" }
];

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12
};

export async function importEventsFromConfiguredSources() {
  const supabase = createAdminClient();
  const { data: clubs, error: clubsError } = await supabase.from("clubs").select("id, slug, name");
  if (clubsError) throw clubsError;

  const clubBySlug = new Map((clubs ?? []).map((club) => [club.slug, club]));
  const runs: ImportRun[] = [];

  for (const source of EVENT_SOURCES) {
    const club = clubBySlug.get(source.clubSlug);
    if (!club) {
      runs.push(runForSource(source, "FAILED", 0, 0, `Club slug "${source.clubSlug}" is missing.`, null));
      continue;
    }

    try {
      const result = await readSource(source);
      const candidates = result.events.filter((event) => clubBySlug.has(event.clubSlug));
      let created = 0;

      for (const event of candidates) {
        const targetClub = clubBySlug.get(event.clubSlug);
        if (!targetClub) continue;
        const { data: existing, error: existingError } = await supabase.from("events").select("id").eq("source_key", event.sourceKey).maybeSingle();
        if (existingError) throw existingError;
        if (existing) continue;
        const { error } = await supabase.from("events").insert({
          club_id: targetClub.id,
          name: event.name,
          slug: event.slug,
          event_date: event.eventDate,
          description: event.description,
          source_url: event.sourceUrl,
          source_key: event.sourceKey,
          imported_at: new Date().toISOString(),
          active: true
        });
        if (error?.code === "23505") continue;
        if (error) throw error;
        created += 1;
      }

      runs.push(runForSource(source, result.status, candidates.length, created, result.message, result.httpStatus));
    } catch (error) {
      runs.push(runForSource(source, "FAILED", 0, 0, getErrorMessage(error), null));
    }
  }

  const { error: runError } = await supabase.from("event_import_runs").insert(runs);
  if (runError) throw runError;

  return {
    sourcesChecked: runs.length,
    eventsFound: runs.reduce((sum, run) => sum + run.events_found, 0),
    eventsCreated: runs.reduce((sum, run) => sum + run.events_created, 0),
    warnings: runs.filter((run) => run.status !== "OK")
  };
}

async function readSource(source: EventSource): Promise<{ events: ImportedEvent[]; status: "OK" | "WARNING"; message: string | null; httpStatus: number | null }> {
  if (source.kind === "recurring") {
    const events = buildRecurringEvents(source);
    return { events, status: "OK", message: `Created ${events.length} recurring candidates.`, httpStatus: null };
  }

  const response = await fetch(source.url, {
    headers: {
      "user-agent": "NightConciergePlatform/1.0 (+https://night-concierge-platform.vercel.app)",
      accept: "text/html,application/xhtml+xml"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    return { events: [], status: "WARNING", message: `Source returned HTTP ${response.status}.`, httpStatus: response.status };
  }

  const html = await response.text();
  if (source.kind === "monitor") {
    return { events: [], status: "OK", message: "Source reachable. Instagram sources are monitor-only unless a stable feed/API is connected.", httpStatus: response.status };
  }
  if (source.kind === "recurring-program") {
    const events = buildProgramEvents(source);
    return { events, status: "OK", message: `Created ${events.length} recurring programme candidates.`, httpStatus: response.status };
  }

  const events = extractEventsFromHtml(source, html);
  return {
    events,
    status: events.length ? "OK" : "WARNING",
    message: events.length ? `Found ${events.length} event candidate(s).` : "Source reachable, but no event dates were confidently parsed.",
    httpStatus: response.status
  };
}

function extractEventsFromHtml(source: Extract<EventSource, { kind: "web" }>, html: string) {
  const jsonLdEvents = extractJsonLdEvents(source, html);
  if (jsonLdEvents.length) return jsonLdEvents;

  const structuredEvents = extractStructuredEvents(source, html);
  if (structuredEvents.length) return structuredEvents;

  const text = stripHtml(html);
  const events = new Map<string, ImportedEvent>();
  const dates = [...findIsoDates(text), ...findNumericDates(text), ...findNamedMonthDates(text)];

  for (const date of dates) {
    if (isPastDate(date)) continue;
    const name = buildEventName(source.name, date);
    const sourceKey = `${source.slug}:${date}:${slugify(name)}`;
    events.set(sourceKey, {
      clubSlug: source.clubSlug,
      name,
      slug: `${slugify(name)}-${date}`,
      eventDate: date,
      description: `Imported from ${source.name}. Review source page for final programming details.`,
      sourceUrl: source.url,
      sourceKey
    });
  }

  return [...events.values()].slice(0, 20);
}

function extractStructuredEvents(source: Extract<EventSource, { kind: "web" }>, html: string) {
  if (source.slug === "la-plage-casanis") return extractLaPlageEvents(source, html);
  if (source.slug === "momento") return extractMomentoEvents(source, html);
  return [];
}

function extractLaPlageEvents(source: Extract<EventSource, { kind: "web" }>, html: string) {
  const lines = htmlToLines(html);
  const events: ImportedEvent[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const dayMatch = lines[index].match(/^(0?[1-9]|[12]\d|3[01])$/);
    if (!dayMatch) continue;
    const monthLine = lines.slice(index + 1, index + 5).find((line) => /^(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(line));
    if (!monthLine) continue;
    const month = monthLine.split(/\s+/)[0].toLowerCase();
    const eventDate = normalizeDate(`${new Date().getFullYear()}-${MONTHS[month]}-${dayMatch[1]}`);
    if (!eventDate || isPastDate(eventDate)) continue;
    const artist = lines
      .slice(index + 2, index + 10)
      .find((line) => isLikelyArtistName(line) && !/^(book|buy|image|sunday|wednesday)$/i.test(line));
    if (!artist) continue;
    events.push(buildImportedEvent(source, artist, eventDate, `Imported from La Plage Casanis What's On programme.`));
  }

  return dedupeBySourceKey(events).slice(0, 40);
}

function extractMomentoEvents(source: Extract<EventSource, { kind: "web" }>, html: string) {
  const lines = htmlToLines(html);
  const events: ImportedEvent[] = [];
  const monthNames = Object.keys(MONTHS).join("|");
  const eventLine = new RegExp(`^(.+?)\\s+-\\s+((?:\\d{1,2}\\s+(?:${monthNames})(?:\\s*\\/\\s*)?)+)$`, "i");

  for (const line of lines) {
    const match = line.match(eventLine);
    if (!match) continue;
    const artist = cleanArtistName(match[1]);
    if (!isLikelyArtistName(artist)) continue;
    const dates = [...match[2].matchAll(new RegExp(`(\\d{1,2})\\s+(${monthNames})`, "gi"))]
      .map((dateMatch) => normalizeDate(`${new Date().getFullYear()}-${MONTHS[dateMatch[2].toLowerCase()]}-${dateMatch[1]}`))
      .filter(Boolean)
      .filter((date) => !isPastDate(date));
    for (const eventDate of dates) {
      events.push(buildImportedEvent(source, artist, eventDate, `Imported from Momento proximos eventos programme.`));
    }
  }

  return dedupeBySourceKey(events).slice(0, 50);
}

function extractJsonLdEvents(source: Extract<EventSource, { kind: "web" }>, html: string) {
  const events: ImportedEvent[] = [];
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];

  for (const script of scripts) {
    const json = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      const parsed = JSON.parse(json);
      const items = flattenJsonLd(parsed).filter((item) => item?.["@type"] === "Event" || (Array.isArray(item?.["@type"]) && item["@type"].includes("Event")));
      for (const item of items) {
        const date = normalizeDate(String(item.startDate ?? item.startTime ?? ""));
        if (!date || isPastDate(date)) continue;
        const itemName = cleanText(String(item.name ?? buildEventName(source.name, date)));
        const sourceUrl = typeof item.url === "string" ? item.url : source.url;
        const sourceKey = `${source.slug}:${date}:${slugify(itemName)}`;
        events.push({
          clubSlug: source.clubSlug,
          name: itemName,
          slug: `${slugify(itemName)}-${date}`,
          eventDate: date,
          description: cleanText(String(item.description ?? `Imported from ${source.name}.`)),
          sourceUrl,
          sourceKey
        });
      }
    } catch {
      continue;
    }
  }

  return dedupeBySourceKey(events).slice(0, 30);
}

function flattenJsonLd(input: unknown): Record<string, unknown>[] {
  if (Array.isArray(input)) return input.flatMap(flattenJsonLd);
  if (!input || typeof input !== "object") return [];
  const item = input as Record<string, unknown>;
  const graph = Array.isArray(item["@graph"]) ? item["@graph"].flatMap(flattenJsonLd) : [];
  return [item, ...graph];
}

function buildRecurringEvents(source: Extract<EventSource, { kind: "recurring" }>) {
  const events: ImportedEvent[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  for (let i = 0; i <= source.daysAhead; i += 1) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() + i);
    if (!source.weekdays.includes(date.getDay())) continue;
    const eventDate = date.toISOString().slice(0, 10);
    const name = `${source.title} ${eventDate}`;
    events.push({
      clubSlug: source.clubSlug,
      name: source.title,
      slug: `${slugify(source.title)}-${eventDate}`,
      eventDate,
      description: source.description,
      sourceUrl: source.sourceUrl,
      sourceKey: `${source.slug}:${eventDate}`
    });
  }

  return events;
}

function buildProgramEvents(source: Extract<EventSource, { kind: "recurring-program" }>) {
  return source.programs.flatMap((program, programIndex) => buildRecurringEvents({
    kind: "recurring",
    slug: `${source.slug}-${programIndex}-${slugify(program.title)}`,
    clubSlug: source.clubSlug,
    name: source.name,
    sourceUrl: source.url,
    weekdays: program.weekdays,
    title: program.title,
    description: program.description,
    daysAhead: source.daysAhead
  }));
}

function buildImportedEvent(source: Extract<EventSource, { kind: "web" }>, artist: string, eventDate: string, description: string): ImportedEvent {
  const name = cleanArtistName(artist);
  const sourceKey = `${source.slug}:${eventDate}:${slugify(name)}`;
  return {
    clubSlug: source.clubSlug,
    name,
    slug: `${slugify(name)}-${eventDate}`,
    eventDate,
    description,
    sourceUrl: source.url,
    sourceKey
  };
}

function runForSource(source: EventSource, status: ImportRun["status"], found: number, created: number, message: string | null, httpStatus: number | null): ImportRun {
  return {
    source_slug: source.slug,
    source_name: source.name,
    source_url: source.kind === "recurring" ? source.sourceUrl : source.url,
    status,
    http_status: httpStatus,
    message,
    events_found: found,
    events_created: created
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error) {
    const maybeError = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [maybeError.message, maybeError.details, maybeError.hint, maybeError.code].filter(
      (part): part is string => typeof part === "string" && part.length > 0
    );
    if (parts.length) return parts.join(" ");
  }
  return "Unknown import error.";
}

function findIsoDates(text: string) {
  return unique([...text.matchAll(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g)].map((match) => normalizeDate(match[0])).filter(Boolean));
}

function findNumericDates(text: string) {
  const year = new Date().getFullYear();
  return unique(
    [...text.matchAll(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])(?:[-/.](20\d{2}))?\b/g)]
      .map((match) => normalizeDate(`${match[3] ?? year}-${match[2]}-${match[1]}`))
      .filter(Boolean)
  );
}

function findNamedMonthDates(text: string) {
  const year = new Date().getFullYear();
  const monthNames = Object.keys(MONTHS).join("|");
  const dayMonth = new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])\\s+(?:de\\s+)?(${monthNames})(?:\\s+(20\\d{2}))?\\b`, "gi");
  const monthDay = new RegExp(`\\b(${monthNames})\\s+(0?[1-9]|[12]\\d|3[01])(?:,?\\s+(20\\d{2}))?\\b`, "gi");
  const dates = [
    ...[...text.matchAll(dayMonth)].map((match) => normalizeDate(`${match[3] ?? year}-${MONTHS[match[2].toLowerCase()]}-${match[1]}`)),
    ...[...text.matchAll(monthDay)].map((match) => normalizeDate(`${match[3] ?? year}-${MONTHS[match[1].toLowerCase()]}-${match[2]}`))
  ];
  return unique(dates.filter(Boolean));
}

function normalizeDate(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isPastDate(input: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${input}T00:00:00.000Z`) < today;
}

function buildEventName(clubName: string, date: string) {
  return `${clubName} Programming ${date}`;
}

function stripHtml(html: string) {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function htmlToLines(html: string) {
  const readableText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(h[1-6]|p|div|li|a|span|section|article)>/gi, "\n")
    .replace(/<img[^>]+alt=["']([^"']+)["'][^>]*>/gi, "\n$1\n")
    .replace(/<[^>]+>/g, " ");

  return readableText
    .split(/\n/)
    .flatMap((line) => line.split(/ {2,}/))
    .map((line) => cleanText(decodeHtml(line)))
    .filter(Boolean)
    .filter((line, index, all) => all.indexOf(line) === index);
}

function isLikelyArtistName(value: string) {
  const normalized = cleanArtistName(value);
  if (normalized.length < 3 || normalized.length > 70) return false;
  if (/\b(book|booking|reservas|privacy|cookie|copyright|menu|image|program|season|temporada)\b/i.test(normalized)) return false;
  return /[a-zA-ZÀ-ÿ]/.test(normalized);
}

function cleanArtistName(value: string) {
  return decodeHtml(value)
    .replace(/\s*-\s*\d{1,2}\s+[a-záéíóúñ]+(?:\s*\/\s*\d{1,2}\s+[a-záéíóúñ]+)*\s*$/i, "")
    .replace(/^\+?\s*/, "")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, "&");
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function dedupeBySourceKey(events: ImportedEvent[]) {
  return [...new Map(events.map((event) => [event.sourceKey, event])).values()];
}
