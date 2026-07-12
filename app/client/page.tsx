import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/request/request-card";
import { requireProfile } from "@/lib/auth";
import { getClientForAccount, getRequestsForProfile } from "@/lib/data/app";
import { LuxuryCard } from "@/components/ui/luxury-card";

export default async function ClientPage() {
  const profile = await requireProfile(["CLIENT", "SUPER_ADMIN"]);
  const [requests, client] = await Promise.all([getRequestsForProfile(profile, { clientOnly: true, limit: 3 }), getClientForAccount(profile.id)]);
  return (
    <AppShell profile={profile} title="Your concierge" eyebrow="Client">
      <Button asChild className="mb-4 w-full md:w-auto" size="lg"><Link href="/request">New request</Link></Button>
      {client && <LuxuryCard className="mb-4"><p className="text-sm text-muted-foreground">Membership</p><div className="mt-2 flex items-center justify-between"><p className="font-serif text-2xl">{client.vip_level}</p><p className="text-xs text-champagne-300">{client.status.replaceAll("_", " ")}</p></div></LuxuryCard>}
      <div className="space-y-3">{requests.length ? requests.map((request) => <RequestCard key={request.id} request={request} href={`/client/requests/${request.id}`} />) : <EmptyRequests />}</div>
    </AppShell>
  );
}

function EmptyRequests() { return <div className="rounded-lg border border-champagne-700/40 bg-card/80 p-8 text-center"><p className="font-serif text-2xl">Your night starts here</p><p className="mt-2 text-sm text-muted-foreground">Submit a request and your concierge will take it from there.</p></div>; }
