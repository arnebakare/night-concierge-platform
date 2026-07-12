import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/request/request-card";
import { ActionTile } from "@/components/ui/action-tile";
import { CalendarDays, HeartHandshake, Inbox, ListPlus, MessageCircle, UserRoundSearch, Users } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getRequestsForProfile } from "@/lib/data/app";

export default async function ManagerPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const requests = await getRequestsForProfile(profile, { limit: 8 });
  const newRequests = requests.filter((request) => request.status === "NEW").length;
  const confirmed = requests.filter((request) => ["CONFIRMED", "ARRIVED"].includes(request.status)).length;
  const completed = requests.filter((request) => request.status === "ARRIVED").length;
  const needsAttention = requests.filter((request) => ["NEW", "CONTACTED", "PENDING"].includes(request.status));
  const visibleRequests = needsAttention.length ? needsAttention : requests.slice(0, 3);

  return (
    <AppShell profile={profile} title="Manager overview" eyebrow="Team command">
      <div className="easy-only space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Need a reply" value={String(needsAttention.length)} />
          <Metric label="Confirmed" value={String(confirmed)} />
        </div>
        <section>
          <h2 className="mb-3 font-serif text-2xl">What do you need?</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <ActionTile href="/manager/requests" label="Handle requests" icon={Inbox} />
            <ActionTile href="/manager/clients" label="Find a client" icon={UserRoundSearch} />
            <ActionTile href="/manager/promoters" label="View team" icon={Users} />
            <ActionTile href="/requests/lead" label="Paste lead" icon={MessageCircle} />
            <ActionTile href="/requests/new" label="New request" icon={ListPlus} />
            <ActionTile href="/schedule" label="Suggest schedule" icon={CalendarDays} />
            <ActionTile href="/manager/retention" label="Client care" icon={HeartHandshake} />
          </div>
        </section>
      </div>
      <div className="advanced-only grid gap-4 md:grid-cols-3">
        <Metric label="New requests" value={String(newRequests)} />
        <Metric label="Team confirmed" value={String(confirmed)} />
        <Metric label="Completed" value={String(completed)} />
      </div>
      <div className="advanced-only mt-5 flex gap-2 overflow-x-auto pb-1">
        <Button asChild><Link href="/manager/requests">Open inbox</Link></Button>
        <Button asChild variant="secondary"><Link href="/requests/lead">Paste lead</Link></Button>
        <Button asChild variant="secondary"><Link href="/manager/promoters">Manage team</Link></Button>
        <Button asChild variant="secondary"><Link href="/schedule">Suggest schedule</Link></Button>
        <Button asChild variant="secondary"><Link href="/manager/retention">Retention</Link></Button>
        <Button asChild variant="secondary"><Link href="/manager/events">Events</Link></Button>
        <Button asChild variant="secondary"><Link href="/reports">Reports</Link></Button>
        <Button asChild variant="secondary"><Link href="/notifications">WhatsApp delivery</Link></Button>
      </div>
      <section className="mt-5 space-y-3">
        <h2 className="font-serif text-2xl">Needs attention</h2>
        {visibleRequests.length ? visibleRequests.map((request) => <RequestCard key={request.id} request={request} href={`/manager/requests/${request.id}`} />) : <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>}
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return <LuxuryCard><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-serif text-4xl">{value}</p></LuxuryCard>;
}
