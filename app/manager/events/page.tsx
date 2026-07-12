import { AppShell } from "@/components/layout/app-shell";
import { EventCreateForm } from "@/components/events/event-create-form";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getEventsForProfile } from "@/lib/data/app";
import { setEventActive, updateEvent } from "@/lib/actions/management-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default async function ManagerEventsPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const [clubs, events] = await Promise.all([getActiveClubsForApp(), getEventsForProfile()]);
  return (
    <AppShell profile={profile} title="Events" eyebrow="Programming">
      <EventCreateForm clubs={clubs} />
      <div className="space-y-3">
        {events.map((event) => (
          <LuxuryCard key={event.id} className={!event.active ? "opacity-70" : undefined}>
            <div className="flex items-start justify-between gap-3"><p className="font-semibold">{event.name}</p><span className={event.active ? "text-xs font-semibold text-emerald-400" : "text-xs text-muted-foreground"}>{event.active ? "ACTIVE" : "ARCHIVED"}</span></div>
            <p className="text-sm text-muted-foreground">{event.event_date} · {(event.clubs as { name?: string } | null)?.name ?? "Club"}</p>
            {event.description && <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>}
            <details className="mt-4"><summary className="cursor-pointer text-sm text-champagne-300">Edit event</summary><form action={updateEvent} className="mt-3 grid gap-2 md:grid-cols-2"><input type="hidden" name="eventId" value={event.id} /><Input name="name" defaultValue={event.name} required /><Input name="slug" defaultValue={event.slug} required /><Input name="eventDate" type="date" defaultValue={event.event_date} required /><select name="clubId" className="h-12 rounded-md border bg-input px-3 text-sm" defaultValue={(event as { club_id?: string }).club_id ?? clubs[0]?.id}>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select><Textarea name="description" defaultValue={event.description ?? ""} className="md:col-span-2" /><Button type="submit" variant="secondary" className="md:col-span-2">Save event</Button></form></details>
            <form action={setEventActive} className="mt-4"><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="active" value={String(!event.active)} /><Button type="submit" variant="outline" className="w-full">{event.active ? "Archive event" : "Reactivate event"}</Button></form>
          </LuxuryCard>
        ))}
        {!events.length && <LuxuryCard className="text-center text-sm text-muted-foreground">No events yet. Create the first one above.</LuxuryCard>}
      </div>
    </AppShell>
  );
}
