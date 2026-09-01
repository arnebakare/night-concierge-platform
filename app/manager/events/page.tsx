import { AppShell } from "@/components/layout/app-shell";
import { EventCreateForm } from "@/components/events/event-create-form";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
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
      <LuxuryCard className="mb-4 bg-white text-slate-950">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Event import health</h2>
            <p className="mt-1 text-sm text-slate-500">Daily source checks create upcoming events and flag unavailable pages.</p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <div className={warningRuns.length ? "text-sm font-semibold text-amber-700" : "text-sm font-semibold text-emerald-700"}>
              {warningRuns.length ? `${warningRuns.length} source warning${warningRuns.length === 1 ? "" : "s"}` : "All latest checks OK"}
            </div>
            <form action={runEventImportNow}>
              <StatusSubmitButton label="Run import now" pendingLabel="Checking" variant="secondary" size="sm" className="bg-slate-100 text-slate-900 hover:bg-slate-200" />
            </form>
          </div>
        </div>
        <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200">
          {latestRuns.slice(0, 8).map((run) => (
            <div key={run.id} className="px-3 py-2.5">
              <div className="grid gap-2 md:grid-cols-[minmax(180px,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{run.source_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{run.events_found} found · {run.events_created} created · {new Date(run.created_at).toLocaleString()}</p>
                </div>
                <span className={run.status === "OK" ? "w-fit rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" : "w-fit rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"}>{run.status}</span>
              </div>
              {run.message && <p className="mt-2 text-xs text-slate-500">{run.message}</p>}
            </div>
          ))}
          {!latestRuns.length && <p className="p-5 text-center text-sm text-slate-500">No cron checks have run yet.</p>}
        </div>
      </LuxuryCard>
      <EventCreateForm clubs={clubs} />
      <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white text-center text-slate-950">
        <Metric label="Events" value={events.length} />
        <Metric label="Active" value={events.filter((event) => event.active).length} />
        <Metric label="Imported" value={events.filter((event) => (event as { imported_at?: string | null }).imported_at).length} />
      </div>
      <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {events.map((event) => (
          <div key={event.id} className={`px-3 py-2.5 text-slate-950 ${!event.active ? "opacity-70" : ""}`}>
            <div className="grid gap-2 md:grid-cols-[minmax(180px,1fr)_auto] md:items-start">
              <div className="min-w-0">
                <p className="truncate font-semibold">{event.name}</p>
                <p className="text-sm text-slate-500">{event.event_date} · {(event.clubs as { name?: string } | null)?.name ?? "Club"}</p>
              </div>
              <span className={event.active ? "w-fit rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" : "w-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"}>{event.active ? "Active" : "Archived"}</span>
            </div>
            {event.description && <p className="mt-2 text-sm text-slate-600">{event.description}</p>}
            {(event as { imported_at?: string | null; source_url?: string | null }).imported_at && <p className="mt-2 truncate text-xs text-champagne-700">Imported from source{(event as { source_url?: string | null }).source_url ? ` · ${(event as { source_url?: string | null }).source_url}` : ""}</p>}
            <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Edit event</summary><form action={updateEvent} className="mt-3 grid gap-2 md:grid-cols-2"><input type="hidden" name="eventId" value={event.id} /><Input name="name" defaultValue={event.name} required className="bg-white text-slate-950" /><Input name="slug" defaultValue={event.slug} required className="bg-white text-slate-950" /><Input name="eventDate" type="date" defaultValue={event.event_date} required className="bg-white text-slate-950" /><select name="clubId" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950" defaultValue={(event as { club_id?: string }).club_id ?? clubs[0]?.id}>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select><Textarea name="description" defaultValue={event.description ?? ""} className="bg-white text-slate-950 md:col-span-2" /><StatusSubmitButton label="Save event" pendingLabel="Saving" variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-200 md:col-span-2" /></form></details>
            <form action={setEventActive} className="mt-2"><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="active" value={String(!event.active)} /><StatusSubmitButton label={event.active ? "Archive event" : "Reactivate event"} pendingLabel="Saving" variant="outline" className="w-full" /></form>
          </div>
        ))}
        {!events.length && <LuxuryCard className="text-center text-sm text-muted-foreground">No events yet. Create the first one above.</LuxuryCard>}
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="border-r border-slate-200 p-2.5 last:border-r-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold leading-none">{value}</p>
    </div>
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
