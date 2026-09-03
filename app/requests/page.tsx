import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/request/request-card";
import { RequestFilters } from "@/components/request/request-filters";
import { RequestListSummary } from "@/components/request/request-list-summary";
import { RequestStatusControl } from "@/components/request/request-status-control";
import { requireProfile } from "@/lib/auth";
import { getRequestsForProfile } from "@/lib/data/app";
import { formatEnum } from "@/lib/utils";
import type { RequestStatus, RequestType } from "@/lib/types";

export default async function RequestsPage({
  searchParams
}: Readonly<{ searchParams: Promise<{ status?: string; type?: string; date?: string; q?: string; archived?: string; updated?: string }> }>) {
  const profile = await requireProfile(["PROMOTER", "SUPER_ADMIN"]);
  const filters = await searchParams;
  const archiveMode = filters.archived === "1";
  const rawRequests = await getRequestsForProfile(profile, {
    status: parseStatus(filters.status),
    type: parseType(filters.type),
    date: filters.date || undefined,
    q: filters.q || undefined,
    includeArchived: archiveMode
  });
  const requests = archiveMode && !filters.status ? rawRequests.filter((request) => isArchivedStatus(request.status)) : rawRequests;

  return (
    <AppShell profile={profile} title="My requests" eyebrow="Guestlist">
      {parseStatus(filters.updated) && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          Booking status updated to {statusLabel(filters.updated as RequestStatus)}.
        </div>
      )}
      {archiveMode && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Showing completed and archived requests. <Link href="/requests" className="font-semibold underline">Back to active requests</Link>
        </div>
      )}
      <RequestListSummary requests={requests} baseHref="/requests" />
      <RequestFilters action="/requests" values={filters} />
      <div className="space-y-3">
        {requests.length ? requests.map((request) => (
          <div key={request.id}>
            <RequestCard request={request} href={`/requests/${request.id}`} />
            <RequestStatusControl requestId={request.id} status={request.status} returnTo="/requests" />
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
  const allowed: RequestType[] = ["GUESTLIST", "TABLE", "VIP_SERVICE", "BOAT", "GOLF", "VILLA", "TRANSFER", "SCHEDULE", "PACKAGE", "GENERAL"];
  return allowed.includes(value as RequestType) ? value as RequestType : undefined;
}

function isArchivedStatus(status: RequestStatus) {
  return ["ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"].includes(status);
}

function statusLabel(status: RequestStatus) {
  if (status === "ARRIVED") return "Completed";
  if (status === "CANCELLED") return "Archived";
  return formatEnum(status).toLowerCase();
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
      <p className="font-medium text-ink-950">No bookings found</p>
      <p className="mt-1">Try clearing filters or create a new request.</p>
    </div>
  );
}
