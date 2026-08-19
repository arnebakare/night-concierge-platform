import { CalendarDays, Link2, ListPlus, MessageCircle, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ActionTile } from "@/components/ui/action-tile";
import { ClientSearch } from "@/components/client/client-search";
import { RequestCard } from "@/components/request/request-card";
import { TonightSummaryCard } from "@/components/promoter/tonight-summary-card";
import { requireProfile } from "@/lib/auth";
import { getRequestsForProfile } from "@/lib/data/app";
import { fullDateLabel, requestPriority, requestServiceLabel } from "@/lib/concierge/requests";

export default async function DashboardPage() {
  const profile = await requireProfile(["PROMOTER", "SUPER_ADMIN"]);
  const requests = await getRequestsForProfile(profile, { limit: 12 });
  const tonight = requests.filter((request) => request.requested_date === new Date().toISOString().slice(0, 10));
  const priorityRequests = requests.filter((request) => ["NEW", "CONTACTED", "PENDING"].includes(request.status)).slice(0, 3);

  return (
    <AppShell profile={profile} title={`Good evening${profile.name ? `, ${profile.name.split(" ")[0]}` : ""}`} eyebrow="Promoter">
      <div className="space-y-5">
        <TonightSummaryCard
          requests={tonight.length}
          confirmed={tonight.filter((item) => item.status === "CONFIRMED").length}
          guests={tonight.reduce((sum, item) => sum + item.guest_count, 0)}
          pending={tonight.filter((item) => ["NEW", "PENDING"].includes(item.status)).length}
        />
        <div className="grid grid-cols-2 gap-3">
          <ActionTile href="/requests/lead" label="Paste WhatsApp Lead" icon={MessageCircle} className="col-span-2" />
          <ActionTile href="/requests/new" label="New Request" icon={ListPlus} />
          <ActionTile href="/clients" label="Add Client" icon={UserPlus} />
          <ActionTile href="/requests" label="My Guestlist" icon={Users} />
          <ActionTile href="/links" label="My Links" icon={Link2} />
          <ActionTile href="/schedule" label="Suggest Plan" icon={CalendarDays} className="col-span-2" />
        </div>
        {!!priorityRequests.length && (
          <section className="rounded-lg border border-champagne-700/35 bg-card/80 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">Needs reply</p>
            <div className="mt-3 grid gap-2">
              {priorityRequests.map((request) => {
                const priority = requestPriority(request);
                return (
                  <Link key={request.id} href={`/requests/${request.id}`} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-champagne-700/25 bg-secondary/60 p-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{request.clients?.name ?? "Guest"} · {request.clubs?.name ?? "Venue"}</span>
                      <span className="block truncate text-xs text-muted-foreground">{fullDateLabel(request.requested_date)} · {requestServiceLabel(request)}</span>
                    </span>
                    <span className="rounded-full bg-champagne-300/10 px-2 py-1 text-xs font-medium text-champagne-100">{priority.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        <ClientSearch placeholder="Search client quickly" />
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Upcoming</h2>
          {requests.length ? requests.map((request) => <RequestCard key={request.id} request={request} href={`/requests/${request.id}`} />) : <p className="text-sm text-muted-foreground">No requests yet tonight.</p>}
        </section>
      </div>
    </AppShell>
  );
}
