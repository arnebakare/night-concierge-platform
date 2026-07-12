import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/request/request-card";
import { RequestFilters } from "@/components/request/request-filters";
import { RequestStatusControl } from "@/components/request/request-status-control";
import { requireProfile } from "@/lib/auth";
import { getRequestsForProfile } from "@/lib/data/app";
import type { RequestStatus, RequestType } from "@/lib/types";

export default async function RequestsPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ status?: string; type?: string; date?: string; q?: string }> }>) {
  const profile = await requireProfile(["PROMOTER", "SUPER_ADMIN"]);
  const filters = await searchParams;
  const requests = await getRequestsForProfile(profile, {
    status: parseStatus(filters.status),
    type: parseType(filters.type),
    date: filters.date || undefined,
    q: filters.q || undefined
  });

  return (
    <AppShell profile={profile} title="My requests" eyebrow="Guestlist">
      <RequestFilters action="/requests" values={filters} />
      <div className="space-y-3">
        {requests.length ? requests.map((request) => (
          <div key={request.id}>
            <RequestCard request={request} href={`/requests/${request.id}`} />
            <RequestStatusControl requestId={request.id} status={request.status} />
          </div>
        )) : <EmptyState />}
      </div>
      <Button asChild className="fixed bottom-24 right-4 z-40 md:hidden" size="lg">
        <Link href="/requests/new"><Plus className="size-5" /> New</Link>
      </Button>
    </AppShell>
  );
}

function parseStatus(value?: string): RequestStatus | undefined {
  const allowed: RequestStatus[] = ["NEW", "CONTACTED", "PENDING", "CONFIRMED", "ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"];
  return allowed.includes(value as RequestStatus) ? value as RequestStatus : undefined;
}

function parseType(value?: string): RequestType | undefined {
  const allowed: RequestType[] = ["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL"];
  return allowed.includes(value as RequestType) ? value as RequestType : undefined;
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-champagne-700/40 bg-card/80 p-6 text-center text-sm text-muted-foreground">
      No requests match these filters.
    </div>
  );
}
