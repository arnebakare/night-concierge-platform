import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/request/request-card";
import { RequestFilters } from "@/components/request/request-filters";
import { RequestStatusControl } from "@/components/request/request-status-control";
import { RequestStatusBadge } from "@/components/request/request-status-badge";
import { requireProfile } from "@/lib/auth";
import { getActiveClubsForApp, getRequestsForProfile, getTeamPromoters, getUsersForAdmin } from "@/lib/data/app";
import { formatEnum } from "@/lib/utils";
import type { RequestStatus, RequestType } from "@/lib/types";

export default async function ManagerRequestsPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ status?: string; type?: string; date?: string; q?: string; club?: string; promoter?: string; archived?: string }> }>) {
  const profile = await requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]);
  const filters = await searchParams;
  const [requests, clubs, promoters] = await Promise.all([getRequestsForProfile(profile, {
    status: parseStatus(filters.status),
    type: parseType(filters.type),
    date: filters.date || undefined,
    q: filters.q || undefined,
    clubId: filters.club || undefined,
    promoterId: filters.promoter || undefined
  }), getActiveClubsForApp(), profile.role === "SUPER_ADMIN" ? getUsersForAdmin({ role: "PROMOTER", active: "active" }) : getTeamPromoters(profile.id)]);

  return (
    <AppShell profile={profile} title="Request inbox" eyebrow="Manager">
      {filters.archived === "1" && (
        <div className="mb-4 rounded-md border border-champagne-700/40 bg-champagne-300/10 p-3 text-sm text-champagne-100">
          Completed and moved out of the active inbox.
        </div>
      )}
      <RequestFilters action="/manager/requests" values={filters} clubs={clubs} promoters={promoters} />
      <div className="easy-only space-y-3">
        {requests.length ? requests.map((request) => (
          <div key={request.id} className="mx-auto max-w-3xl">
            <RequestCard request={request} href={`/manager/requests/${request.id}`} />
            <RequestStatusControl requestId={request.id} status={request.status} returnTo="/manager/requests" />
          </div>
        )) : <EmptyState />}
      </div>
      <div className="advanced-only space-y-3 md:hidden">
        {requests.length ? requests.map((request) => (
          <div key={request.id}>
            <RequestCard request={request} href={`/manager/requests/${request.id}`} />
            <RequestStatusControl requestId={request.id} status={request.status} returnTo="/manager/requests" />
          </div>
        )) : <EmptyState />}
      </div>
      <div className="advanced-only hidden overflow-hidden rounded-lg border border-champagne-700/40 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-800 text-muted-foreground">
            <tr><th className="p-3">Client</th><th>Club</th><th>Type</th><th>Status</th><th>Date</th><th>Promoter</th></tr>
          </thead>
          <tbody>
            {requests.length ? requests.map((request) => (
              <tr key={request.id} className="border-t border-champagne-700/30">
                <td className="p-3 font-medium">
                  <Link href={`/manager/requests/${request.id}`} className="text-champagne-100 hover:text-champagne-300">
                    {request.clients?.name}
                  </Link>
                </td>
                <td>{request.clubs?.name}</td>
                <td>{formatEnum(request.request_type)}</td>
                <td><RequestStatusBadge status={request.status} /><RequestStatusControl requestId={request.id} status={request.status} returnTo="/manager/requests" /></td>
                <td>{request.requested_date}</td>
                <td>{request.promoter?.name ?? "Unassigned"}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">No requests match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
