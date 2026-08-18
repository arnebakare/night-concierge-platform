import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { RequestCard } from "@/components/request/request-card";
import { requireProfile } from "@/lib/auth";
import { getRequestsForProfile } from "@/lib/data/app";

export default async function ClientRequestsPage() {
  const profile = await requireProfile(["CLIENT", "SUPER_ADMIN"]);
  const requests = await getRequestsForProfile(profile, { clientOnly: true });
  return (
    <AppShell profile={profile} title="My requests" eyebrow="Client">
      <div className="mb-4 flex justify-end">
        <Button asChild><Link href="/request">New request</Link></Button>
      </div>
      <div className="space-y-3">
        {requests.length ? requests.map((request) => <RequestCard key={request.id} request={request} href={`/client/requests/${request.id}`} />) : <EmptyState />}
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <LuxuryCard className="text-center">
      <p className="font-serif text-2xl">No requests yet</p>
      <p className="mt-2 text-sm text-muted-foreground">When you send a request, it will appear here with its latest status.</p>
      <Button asChild className="mt-5 w-full">
        <Link href="/request">Start a request</Link>
      </Button>
    </LuxuryCard>
  );
}
