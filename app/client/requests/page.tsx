import { AppShell } from "@/components/layout/app-shell";
import { RequestCard } from "@/components/request/request-card";
import { requireProfile } from "@/lib/auth";
import { getRequestsForProfile } from "@/lib/data/app";

export default async function ClientRequestsPage() {
  const profile = await requireProfile(["CLIENT", "SUPER_ADMIN"]);
  const requests = await getRequestsForProfile(profile, { clientOnly: true });
  return (
    <AppShell profile={profile} title="My requests" eyebrow="Client">
      <div className="space-y-3">{requests.length ? requests.map((request) => <RequestCard key={request.id} request={request} href={`/client/requests/${request.id}`} />) : <div className="rounded-lg border border-champagne-700/40 bg-card/80 p-8 text-center text-sm text-muted-foreground">You have no requests yet.</div>}</div>
    </AppShell>
  );
}
