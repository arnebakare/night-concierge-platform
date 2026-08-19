import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AvailabilityOfferPanel } from "@/components/request/availability-offer-panel";
import { RequestAssignmentControl } from "@/components/request/request-assignment-control";
import { RequestDetail } from "@/components/request/request-detail";
import { requireProfile } from "@/lib/auth";
import { getMessageTemplates, getRequestCommerce, getRequestDetail, getTeamPromoters, getUsersForAdmin } from "@/lib/data/app";
import type { RequestStatus } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

export default async function ManagerRequestDetailPage({
  params,
  searchParams
}: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ updated?: string }> }>) {
  const [profile, { id }, query] = await Promise.all([requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]), params, searchParams]);
  const [request, promoters, templates] = await Promise.all([
    getRequestDetail(id),
    profile.role === "SUPER_ADMIN" ? getUsersForAdmin({ role: "PROMOTER", active: "active" }) : getTeamPromoters(profile.id),
    getMessageTemplates()
  ]);

  if (!request) notFound();
  const commerce = await getRequestCommerce(request);
  const updated = parseStatus(query.updated);

  return (
    <AppShell profile={profile} title="Request detail" eyebrow="Manager inbox">
      <div className="space-y-4">
        {updated && <StatusNotice status={updated} />}
        <RequestDetail request={request} backHref="/manager/requests" clientHref={`/manager/clients/${request.client_id}`} statusReturnTo={`/manager/requests/${request.id}`} templates={templates} />
        <AvailabilityOfferPanel request={request} slots={commerce.slots} offers={commerce.offers} canManageAvailability templates={templates} />
        <RequestAssignmentControl requestId={request.id} currentPromoterId={request.promoter_id} promoters={promoters} />
      </div>
    </AppShell>
  );
}

function parseStatus(value?: string): RequestStatus | null {
  const allowed: RequestStatus[] = ["NEW", "CONTACTED", "PENDING", "CONFIRMED", "ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"];
  return allowed.includes(value as RequestStatus) ? value as RequestStatus : null;
}

function StatusNotice({ status }: Readonly<{ status: RequestStatus }>) {
  const label = status === "ARRIVED" ? "Completed and archived" : status === "CANCELLED" ? "Archived" : formatEnum(status);
  return <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Booking updated: {label}.</div>;
}
