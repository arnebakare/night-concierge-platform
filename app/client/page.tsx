import Link from "next/link";
import { CalendarPlus, Crown, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/request/request-card";
import { requireProfile } from "@/lib/auth";
import { getClientForAccount, getRequestsForProfile } from "@/lib/data/app";
import { LuxuryCard } from "@/components/ui/luxury-card";

export default async function ClientPage() {
  const profile = await requireProfile(["CLIENT", "SUPER_ADMIN"]);
  const [requests, client] = await Promise.all([getRequestsForProfile(profile, { clientOnly: true, limit: 3 }), getClientForAccount(profile.id)]);
  const activeRequests = requests.filter((request) => !["ARRIVED", "CANCELLED", "DECLINED", "NO_SHOW"].includes(request.status)).length;
  return (
    <AppShell profile={profile} title="Your concierge" eyebrow="Client">
      <div className="space-y-4">
        <LuxuryCard className="border-champagne-300/35 bg-[radial-gradient(circle_at_top_right,rgba(216,183,100,0.16),transparent_36%),rgba(17,17,19,0.94)]">
          <p className="text-xs uppercase tracking-[0.2em] text-champagne-300">Welcome back</p>
          <h2 className="mt-2 font-serif text-3xl">Ready when you are.</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Send a request in under a minute and the team will follow up on WhatsApp.</p>
          <Button asChild className="mt-5 w-full" size="lg">
            <Link href="/request"><CalendarPlus className="size-5" /> New request</Link>
          </Button>
        </LuxuryCard>

        {client && (
          <div className="grid grid-cols-2 gap-2">
            <LuxuryCard>
              <Crown className="mb-2 size-5 text-champagne-300" />
              <p className="text-xs text-muted-foreground">Membership</p>
              <p className="mt-1 text-lg font-semibold">{client.vip_level}</p>
            </LuxuryCard>
            <LuxuryCard>
              <MessageCircle className="mb-2 size-5 text-champagne-300" />
              <p className="text-xs text-muted-foreground">Open requests</p>
              <p className="mt-1 text-lg font-semibold">{activeRequests}</p>
            </LuxuryCard>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Latest requests</h2>
          <Button asChild variant="secondary" size="sm"><Link href="/client/requests">View all</Link></Button>
        </div>
        <div className="space-y-3">{requests.length ? requests.map((request) => <RequestCard key={request.id} request={request} href={`/client/requests/${request.id}`} audience="client" />) : <EmptyRequests />}</div>
      </div>
    </AppShell>
  );
}

function EmptyRequests() { return <div className="rounded-lg border border-champagne-700/40 bg-card/80 p-8 text-center"><p className="font-serif text-2xl">Your night starts here</p><p className="mt-2 text-sm text-muted-foreground">Submit a request and a host will take it from there.</p></div>; }
