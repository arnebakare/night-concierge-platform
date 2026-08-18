import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RequestFilters } from "@/components/request/request-filters";
import { RequestLeadRow } from "@/components/request/request-lead-row";
import { RequestListSummary } from "@/components/request/request-list-summary";
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
  const archiveMode = filters.archived === "1";
  const [rawRequests, clubs, promoters] = await Promise.all([getRequestsForProfile(profile, {
    status: parseStatus(filters.status),
    type: parseType(filters.type),
    date: filters.date || undefined,
    q: filters.q || undefined,
    clubId: filters.club || undefined,
    promoterId: filters.promoter || undefined,
    includeArchived: archiveMode
  }), getActiveClubsForApp(), profile.role === "SUPER_ADMIN" ? getUsersForAdmin({ role: "PROMOTER", active: "active" }) : getTeamPromoters(profile.id)]);
  const requests = archiveMode && !filters.status ? rawRequests.filter((request) => isArchivedStatus(request.status)) : rawRequests;

  return (
    <AppShell profile={profile} title="Request inbox" eyebrow="Manager">
      {archiveMode && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Showing completed and archived requests. <Link href="/manager/requests" className="font-semibold underline">Back to active inbox</Link>
        </div>
      )}
      <RequestListSummary requests={requests} baseHref="/manager/requests" />
      <RequestFilters action="/manager/requests" values={filters} clubs={clubs} promoters={promoters} />
      <div className="easy-only compact-list grid gap-2">
        {requests.length ? requests.map((request) => (
          <RequestLeadRow key={request.id} request={request} href={`/manager/requests/${request.id}`} returnTo="/manager/requests" />
        )) : <EmptyState archived={archiveMode} />}
      </div>
      <div className="advanced-only compact-list grid gap-2 md:hidden">
        {requests.length ? requests.map((request) => (
          <RequestLeadRow key={request.id} request={request} href={`/manager/requests/${request.id}`} returnTo="/manager/requests" />
        )) : <EmptyState archived={archiveMode} />}
      </div>
      <div className="advanced-only hidden overflow-hidden rounded-lg border border-champagne-700/40 bg-card md:block">
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
                <td><RequestStatusBadge status={request.status} /></td>
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

function isArchivedStatus(status: RequestStatus) {
  return ["ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"].includes(status);
}

function EmptyState({ archived = false }: Readonly<{ archived?: boolean }>) {
  return (
    <div className="rounded-lg border border-champagne-700/40 bg-card/80 p-6 text-center text-sm text-muted-foreground">
      {archived ? "No completed or archived requests match these filters." : "No active requests match these filters."}
    </div>
  );
}
