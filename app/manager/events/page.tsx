import { AppShell } from "@/components/layout/app-shell";
import { EventCreateForm } from "@/components/events/event-create-form";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getEventImportRuns, getEventsForProfile } from "@/lib/data/app";
import { runEventImportNow, setEventActive, updateEvent } from "@/lib/actions/management-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default async function ManagerEventsPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const [clubs, events, importRuns] = await Promise.all([getActiveClubsForApp(), getEventsForProfile(), getEventImportRuns()]);
  const latestRuns = latestRunBySource(importRuns);
  const warningRuns = latestRuns.filter((run) => run.status !== "OK");
  return (
    <AppShell profile={profile} title="Events" eyebrow="Programming">
      <LuxuryCard>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl">Event import health</h2>
            <p className="mt-1 text-sm text-muted-foreground">Daily source checks create upcoming events and flag unavailable pages.</p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <div className={warningRuns.length ? "text-sm font-semibold text-amber-300" : "text-sm font-semibold text-emerald-400"}>
              {warningRuns.length ? `${warningRuns.length} source warning${warningRuns.length === 1 ? "" : "s"}` : "All latest checks OK"}
            </div>
            <form action={runEventImportNow}>
              <Button type="submit" variant="secondary" size="sm">Run import now</Button>
            </form>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {latestRuns.slice(0, 8).map((run) => (
            <div key={run.id} className="rounded-md border border-champagne-700/30 bg-background/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{run.source_name}</p>
                <span className={run.status === "OK" ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-amber-300"}>{run.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{run.events_found} found · {run.events_created} created · {new Date(run.created_at).toLocaleString()}</p>
              {run.message && <p className="mt-2 text-xs text-muted-foreground">{run.message}</p>}
            </div>
          ))}
          {!latestRuns.length && <p className="text-sm text-muted-foreground">No cron checks have run yet.</p>}
        </div>
      </LuxuryCard>
      <EventCreateForm clubs={clubs} />
      <div className="space-y-3">
        {events.map((event) => (
          <LuxuryCard key={event.id} className={!event.active ? "opacity-70" : undefined}>
            <div className="flex items-start justify-between gap-3"><p className="font-semibold">{event.name}</p><span className={event.active ? "text-xs font-semibold text-emerald-400" : "text-xs text-muted-foreground"}>{event.active ? "ACTIVE" : "ARCHIVED"}</span></div>
            <p className="text-sm text-muted-foreground">{event.event_date} · {(event.clubs as { name?: string } | null)?.name ?? "Club"}</p>
            {event.description && <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>}
            {(event as { imported_at?: string | null; source_url?: string | null }).imported_at && <p className="mt-2 text-xs text-champagne-300">Imported from source{(event as { source_url?: string | null }).source_url ? ` · ${(event as { source_url?: string | null }).source_url}` : ""}</p>}
            <details className="mt-4"><summary className="cursor-pointer text-sm text-champagne-300">Edit event</summary><form action={updateEvent} className="mt-3 grid gap-2 md:grid-cols-2"><input type="hidden" name="eventId" value={event.id} /><Input name="name" defaultValue={event.name} required /><Input name="slug" defaultValue={event.slug} required /><Input name="eventDate" type="date" defaultValue={event.event_date} required /><select name="clubId" className="h-12 rounded-md border bg-input px-3 text-sm" defaultValue={(event as { club_id?: string }).club_id ?? clubs[0]?.id}>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select><Textarea name="description" defaultValue={event.description ?? ""} className="md:col-span-2" /><Button type="submit" variant="secondary" className="md:col-span-2">Save event</Button></form></details>
            <form action={setEventActive} className="mt-4"><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="active" value={String(!event.active)} /><Button type="submit" variant="outline" className="w-full">{event.active ? "Archive event" : "Reactivate event"}</Button></form>
          </LuxuryCard>
        ))}
        {!events.length && <LuxuryCard className="text-center text-sm text-muted-foreground">No events yet. Create the first one above.</LuxuryCard>}
      </div>
    </AppShell>
  );
}

function latestRunBySource(runs: Array<{ id: string; source_slug: string; source_name: string; status: string; events_found: number; events_created: number; message: string | null; created_at: string }>) {
  const seen = new Set<string>();
  return runs.filter((run) => {
    if (seen.has(run.source_slug)) return false;
    seen.add(run.source_slug);
    return true;
  });
}
