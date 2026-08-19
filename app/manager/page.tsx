import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { RequestLeadRow } from "@/components/request/request-lead-row";
import { ActionTile } from "@/components/ui/action-tile";
import { CalendarDays, CheckCircle2, HeartHandshake, Inbox, ListPlus, MessageCircle, UserRoundSearch, Users } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getRequestsForProfile } from "@/lib/data/app";
import { fullDateLabel, isMissingRequestContact, requestPriority, requestServiceLabel } from "@/lib/concierge/requests";
import type { ConciergeRequest } from "@/lib/types";

export default async function ManagerPage() {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const requests = await getRequestsForProfile(profile, { limit: 8 });
  const newRequests = requests.filter((request) => request.status === "NEW").length;
  const confirmed = requests.filter((request) => ["CONFIRMED", "ARRIVED"].includes(request.status)).length;
  const completed = requests.filter((request) => request.status === "ARRIVED").length;
  const needsAttention = requests.filter((request) => ["NEW", "CONTACTED", "PENDING"].includes(request.status));
  const missingContact = requests.filter(isMissingRequestContact);
  const visibleRequests = needsAttention.length ? needsAttention : requests.slice(0, 3);

  return (
    <AppShell profile={profile} title="Manager overview" eyebrow="Team command">
      <div className="easy-only space-y-5">
        <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-ink-950 divide-x divide-slate-200">
          <Metric label="Need a reply" value={String(needsAttention.length)} icon={Inbox} />
          <Metric label="Confirmed" value={String(confirmed)} icon={CheckCircle2} />
        </div>
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">What do you need?</h2>
            <Button asChild size="sm" variant="secondary"><Link href="/manager/requests">View all</Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <ActionTile href="/manager/requests" label="Handle requests" icon={Inbox} />
            <ActionTile href="/manager/availability" label="Availability" icon={CalendarDays} />
            <ActionTile href="/manager/clients" label="Find a client" icon={UserRoundSearch} />
            <ActionTile href="/manager/promoters" label="View team" icon={Users} />
            <ActionTile href="/requests/lead" label="Paste lead" icon={MessageCircle} />
            <ActionTile href="/requests/new" label="New request" icon={ListPlus} />
            <ActionTile href="/schedule" label="Suggest schedule" icon={CalendarDays} />
            <ActionTile href="/manager/retention" label="Client care" icon={HeartHandshake} />
          </div>
        </section>
        <ManagerBriefing requests={requests} missingContact={missingContact.length} />
      </div>
      <div className="advanced-only grid overflow-hidden rounded-lg border border-border bg-card md:grid-cols-3 md:divide-x md:divide-border">
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Needs attention</h2>
          <Button asChild variant="secondary" size="sm"><Link href="/requests/lead">Paste lead</Link></Button>
        </div>
        <div className="compact-list grid gap-2">
          {visibleRequests.length ? visibleRequests.map((request) => (
            <RequestLeadRow key={request.id} request={request} href={`/manager/requests/${request.id}`} returnTo="/manager" showActions={false} />
          )) : <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>}
        </div>
      </section>
    </AppShell>
  );
}

function ManagerBriefing({
  requests,
  missingContact
}: Readonly<{ requests: ConciergeRequest[]; missingContact: number }>) {
  const topRequests = requests
    .filter((request) => ["NEW", "CONTACTED", "PENDING", "CONFIRMED"].includes(request.status))
    .slice(0, 3);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 text-ink-950 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-champagne-700">Tonight briefing</p>
          <h2 className="mt-1 text-base font-semibold">Start here</h2>
        </div>
        <Button asChild size="sm" variant="secondary"><Link href="/manager/requests">Inbox</Link></Button>
      </div>
      {missingContact > 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {missingContact} booking{missingContact === 1 ? "" : "s"} need contact details before the team can reply properly.
        </p>
      )}
      <div className="mt-3 grid gap-2">
        {topRequests.length ? topRequests.map((request) => {
          const priority = requestPriority(request);
          return (
            <Link key={request.id} href={`/manager/requests/${request.id}`} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-slate-200 p-2.5 transition hover:bg-slate-50">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{request.clients?.name ?? "Guest"} · {request.clubs?.name ?? "Venue"}</span>
                <span className="block truncate text-xs text-slate-500">{fullDateLabel(request.requested_date)} · {requestServiceLabel(request)}</span>
              </span>
              <span className={priority.tone === "hot" ? "rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"}>
                {priority.label}
              </span>
            </Link>
          );
        }) : <p className="text-sm text-slate-500">Nothing urgent right now.</p>}
      </div>
    </section>
  );
}

function Metric({ label, value, icon: Icon }: Readonly<{ label: string; value: string; icon?: typeof Inbox }>) {
  return (
    <div className="metric-cell p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {Icon && <Icon className="size-4 text-champagne-700" />}
      </div>
      <p className="mt-1 text-2xl font-semibold leading-none tracking-tight text-ink-950">{value}</p>
    </div>
  );
}
