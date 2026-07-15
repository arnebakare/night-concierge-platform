import Link from "next/link";
import { CalendarDays, Clock, MapPin, MessageCircle, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { CopyMessageButton } from "@/components/request/copy-message-button";
import { attachSchedulePlanClient } from "@/lib/actions/schedule-actions";
import type { Client, SchedulePlan } from "@/lib/types";
import type { ScheduleDay } from "@/lib/services/ai-schedule";

export function SchedulePlanView({
  plan,
  clients = []
}: Readonly<{ plan: SchedulePlan; clients?: Client[] }>) {
  const days = readDays(plan.plan);

  return (
    <div className="space-y-4">
      <LuxuryCard className="space-y-4 border-champagne-300/35 bg-[radial-gradient(circle_at_top_right,rgba(216,183,100,0.14),transparent_36%),rgba(17,17,19,0.94)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-champagne-300">{plan.city} · {plan.spend_profile === "HIGH_SPEND" ? "High spend" : "Normal"}</p>
            <h2 className="mt-2 font-serif text-3xl">{plan.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{formatDate(plan.date_from)}{plan.date_from === plan.date_to ? "" : ` to ${formatDate(plan.date_to)}`} · {plan.source === "WHATSAPP" ? "Created from WhatsApp" : "Created in app"}</p>
          </div>
          <div className="flex gap-2">
            <CopyMessageButton text={plan.message} label="Copy message" />
            <Button asChild variant="secondary" size="sm">
              <a href={`https://wa.me/?text=${encodeURIComponent(plan.message)}`} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </Button>
          </div>
        </div>

        <form action={attachSchedulePlanClient} className="grid gap-2 rounded-md border border-champagne-700/30 bg-ink-900/60 p-3 md:grid-cols-[1fr_auto]">
          <input type="hidden" name="planId" value={plan.id} />
          <select name="clientId" defaultValue={plan.client_id ?? ""} className="h-11 rounded-md border bg-input px-3 text-sm">
            <option value="">No customer attached</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.phone}</option>)}
          </select>
          <Button type="submit" variant="secondary">
            <UserRoundPlus className="size-4" /> Attach
          </Button>
        </form>
      </LuxuryCard>

      <LuxuryCard>
        <p className="text-xs uppercase tracking-[0.2em] text-champagne-300">Customer message</p>
        <p className="mt-3 whitespace-pre-line rounded-md bg-secondary/70 p-4 text-sm leading-relaxed text-muted-foreground">{plan.message}</p>
      </LuxuryCard>

      <div className="space-y-4">
        {days.map((day) => (
          <LuxuryCard key={day.date}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-champagne-300">{formatWeekday(day.date)}</p>
                <h3 className="mt-1 font-serif text-2xl">{day.headline}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(day.date)}</p>
              </div>
              <CalendarDays className="size-5 text-champagne-300" />
            </div>
            <div className="space-y-3">
              {day.stops.map((stop, index) => (
                <div key={`${day.date}-${stop.venue}-${index}`} className="rounded-md border border-champagne-700/30 bg-background/45 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">{stop.category}</p>
                      <h4 className="mt-1 text-lg font-semibold">{stop.venue}</h4>
                    </div>
                    <span className="rounded-md border border-champagne-700/40 px-2 py-1 text-xs text-champagne-200">{index + 1}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock className="size-4 text-champagne-300" />{stop.time}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="size-4 text-champagne-300" />{stop.area}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{stop.why}</p>
                  <p className="mt-2 text-sm text-champagne-100">{stop.bookingAngle}</p>
                </div>
              ))}
            </div>
            {day.note && <p className="mt-4 rounded-md bg-secondary/60 p-3 text-sm text-muted-foreground">{day.note}</p>}
          </LuxuryCard>
        ))}
      </div>

      <Button asChild variant="secondary" className="w-full">
        <Link href="/schedule/plans">Back to saved trails</Link>
      </Button>
    </div>
  );
}

function readDays(plan: Record<string, unknown>) {
  const days = plan.days;
  return Array.isArray(days) ? days as ScheduleDay[] : [];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatWeekday(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(new Date(`${value}T12:00:00`));
}
