import Link from "next/link";
import { CalendarDays, Clock, MapPin, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getEventsForSchedule } from "@/lib/data/app";
import type { ConciergeEvent } from "@/lib/types";

export default async function SchedulePage({
  searchParams
}: Readonly<{ searchParams: Promise<{ date?: string; from?: string; to?: string }> }>) {
  const profile = await requireProfile(["PROMOTER", "PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const startDate = normalizeDate(params.date || params.from) || today;
  const endDate = normalizeDate(params.to) || startDate;
  const from = startDate <= endDate ? startDate : endDate;
  const to = startDate <= endDate ? endDate : startDate;
  const events = await getEventsForSchedule(from, to);
  const schedule = groupEventsByDate(events);

  return (
    <AppShell profile={profile} title="Schedule builder" eyebrow="Concierge plan">
      <div className="space-y-5">
        <LuxuryCard>
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-champagne-700/40 bg-champagne-500/10 p-3 text-champagne-200">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl">Build a client plan</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose one day or a date range. The platform suggests a simple night-by-night schedule from active venue programming.</p>
            </div>
          </div>
          <form action="/schedule" className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne-300">Start date</span>
              <Input name="from" type="date" defaultValue={from} required />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne-300">End date</span>
              <Input name="to" type="date" defaultValue={to} />
            </label>
            <Button type="submit" className="mt-2 min-h-12 md:mt-7">Suggest schedule</Button>
          </form>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <Button asChild variant="outline" size="sm"><Link href={`/schedule?from=${today}`}>Today</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`/schedule?from=${today}&to=${addDays(today, 2)}`}>3 days</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`/schedule?from=${today}&to=${addDays(today, 6)}`}>This week</Link></Button>
          </div>
        </LuxuryCard>

        <LuxuryCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Suggested plan</p>
              <h2 className="font-serif text-2xl">{formatDateRange(from, to)}</h2>
            </div>
            <div className="rounded-md border border-champagne-700/40 px-3 py-2 text-sm text-champagne-200">
              {events.length} option{events.length === 1 ? "" : "s"}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{buildRangeAdvice(events.length, from, to)}</p>
        </LuxuryCard>

        {schedule.length ? (
          <div className="space-y-4">
            {schedule.map(([date, dayEvents]) => (
              <LuxuryCard key={date}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-champagne-300">{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" })}</p>
                    <h3 className="mt-1 font-serif text-2xl">{formatDate(date)}</h3>
                  </div>
                  <CalendarDays className="size-5 text-champagne-300" />
                </div>
                <div className="space-y-3">
                  {dayEvents.map((event, index) => (
                    <ScheduleStop key={event.id} event={event} index={index} total={dayEvents.length} />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button asChild variant="secondary"><Link href={`/requests/new?date=${date}`}>New request</Link></Button>
                  {profile.role === "PROMOTER" ? (
                    <Button asChild variant="outline"><Link href="/requests">Requests</Link></Button>
                  ) : (
                    <Button asChild variant="outline"><Link href={`/manager/events?date=${date}`}>Events</Link></Button>
                  )}
                </div>
              </LuxuryCard>
            ))}
          </div>
        ) : (
          <LuxuryCard className="text-center">
            <p className="font-serif text-2xl">No scheduled events yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Run the event import or add manual events, then this view will build a proper concierge schedule for these dates.</p>
            {profile.role !== "PROMOTER" && <Button asChild className="mt-4"><Link href="/manager/events">Open events</Link></Button>}
          </LuxuryCard>
        )}
      </div>
    </AppShell>
  );
}

function ScheduleStop({ event, index, total }: Readonly<{ event: ConciergeEvent; index: number; total: number }>) {
  const stage = getStage(index, total, event);
  return (
    <div className="rounded-md border border-champagne-700/30 bg-background/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne-300">{stage}</p>
          <h4 className="mt-1 text-lg font-semibold leading-tight">{event.name}</h4>
        </div>
        <span className="shrink-0 rounded-md border border-champagne-700/40 px-2 py-1 text-xs text-champagne-200">{index + 1}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1"><MapPin className="size-4 text-champagne-300" />{event.clubs?.name ?? "Venue"}</span>
        <span className="inline-flex items-center gap-1"><Clock className="size-4 text-champagne-300" />{getSuggestedTime(stage)}</span>
      </div>
      {event.description && <p className="mt-3 text-sm text-muted-foreground">{event.description}</p>}
      <p className="mt-3 text-sm text-champagne-100">{buildStopAdvice(event, stage)}</p>
    </div>
  );
}

function groupEventsByDate(events: ConciergeEvent[]) {
  const grouped = new Map<string, ConciergeEvent[]>();
  for (const event of events) {
    grouped.set(event.event_date, [...(grouped.get(event.event_date) ?? []), event]);
  }
  return [...grouped.entries()].map(([date, dayEvents]) => [date, rankDayEvents(dayEvents)] as const);
}

function rankDayEvents(events: ConciergeEvent[]) {
  const priority = ["la-plage-casanis", "playa-padre", "la-cabane", "mamzel", "momento", "motel-particulier", "le-jade", "bon-bonniere"];
  return [...events].sort((a, b) => {
    const aRank = priority.indexOf(a.clubs?.slug ?? "");
    const bRank = priority.indexOf(b.clubs?.slug ?? "");
    return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank) || a.name.localeCompare(b.name);
  });
}

function getStage(index: number, total: number, event: ConciergeEvent) {
  const text = `${event.name} ${event.description ?? ""} ${event.clubs?.name ?? ""}`;
  if (/after/i.test(text)) return "Late after-party";
  if (total === 1) return "Main recommendation";
  if (index === 0) return "Start here";
  if (index === total - 1) return "Late option";
  return "Prime slot";
}

function getSuggestedTime(stage: string) {
  if (stage === "Start here") return "20:00 - 22:30";
  if (stage === "Late after-party" || stage === "Late option") return "01:00 onwards";
  return "23:00 - 01:00";
}

function buildStopAdvice(event: ConciergeEvent, stage: string) {
  if (stage === "Late after-party") return "Best for clients who already have dinner or beach-club plans and want a second stop.";
  if (/table|vip/i.test(event.name)) return "Lead with table availability and budget fit before confirming.";
  if (/guestlist/i.test(event.name)) return "Good guestlist option; confirm names early and keep the group size clean.";
  return "Use this as a polished recommendation and confirm availability before promising the client.";
}

function buildRangeAdvice(count: number, from: string, to: string) {
  if (!count) return "No events are active for this range yet. Import or add programming first.";
  if (from === to) return "Use this as a one-night plan. Start with the earliest hospitality venue, then move clients into the stronger late option.";
  return "Use this as a multi-day concierge outline. Offer one hero recommendation per night, then keep alternatives ready for table availability.";
}

function normalizeDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "" : value;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateRange(from: string, to: string) {
  if (from === to) return formatDate(from);
  return `${formatDate(from)} to ${formatDate(to)}`;
}
