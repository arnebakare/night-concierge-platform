import { Link2, ListPlus, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ActionTile } from "@/components/ui/action-tile";
import { ClientSearch } from "@/components/client/client-search";
import { RequestCard } from "@/components/request/request-card";
import { TonightSummaryCard } from "@/components/promoter/tonight-summary-card";
import { requireProfile } from "@/lib/auth";
import { getRequestsForProfile } from "@/lib/data/app";

export default async function DashboardPage() {
  const profile = await requireProfile(["PROMOTER", "SUPER_ADMIN"]);
  const requests = await getRequestsForProfile(profile, { limit: 12 });
  const tonight = requests.filter((request) => request.requested_date === new Date().toISOString().slice(0, 10));

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
          <ActionTile href="/requests/new" label="New Request" icon={ListPlus} />
          <ActionTile href="/clients" label="Add Client" icon={UserPlus} />
          <ActionTile href="/requests" label="My Guestlist" icon={Users} />
          <ActionTile href="/links" label="My Links" icon={Link2} />
        </div>
        <ClientSearch placeholder="Search client quickly" />
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Upcoming</h2>
          {requests.length ? requests.map((request) => <RequestCard key={request.id} request={request} href={`/requests/${request.id}`} />) : <p className="text-sm text-muted-foreground">No requests yet tonight.</p>}
        </section>
      </div>
    </AppShell>
  );
}
