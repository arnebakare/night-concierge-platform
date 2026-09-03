import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { RemoveRecordPanel } from "@/components/management/remove-record-panel";
import { DepositPanel } from "@/components/payments/deposit-panel";
import { AvailabilityOfferPanel } from "@/components/request/availability-offer-panel";
import { RequestActivityTimeline } from "@/components/request/request-activity-timeline";
import { RequestAssignmentControl } from "@/components/request/request-assignment-control";
import { RequestDetail } from "@/components/request/request-detail";
import { requireProfile } from "@/lib/auth";
import { getMessageTemplates, getPromoterServiceEligibilityForProfile, getRequestActivity, getRequestCommerce, getRequestDetailForStaff, getUsersForAdmin } from "@/lib/data/app";
import type { RequestStatus } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

export default async function AdminRequestDetailPage({
  params,
  searchParams
}: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ updated?: string }> }>) {
  const [profile, { id }, query] = await Promise.all([requireProfile(["SUPER_ADMIN"]), params, searchParams]);
  const request = await getRequestDetailForStaff(id, profile);
  if (!request) notFound();

  const [promoters, templates, eligibility, commerce, activity] = await Promise.all([
    safePanelData(getUsersForAdmin({ role: "PROMOTER", active: "active" }), []),
    safePanelData(getMessageTemplates(), []),
    safePanelData(getPromoterServiceEligibilityForProfile(profile), []),
    safePanelData(getRequestCommerce(request), { slots: [], offers: [], payments: [] }),
    safePanelData(getRequestActivity(request.id), [])
  ]);
  const updated = parseStatus(query.updated);
  const excludedPromoters = new Set(eligibility.filter((item) => item.request_type === request.request_type && !item.eligible).map((item) => item.promoter_id));
  const eligiblePromoters = promoters.filter((promoter) => promoter.id === request.promoter_id || !excludedPromoters.has(promoter.id));

  return (
    <AppShell profile={profile} title="Request detail" eyebrow="Admin">
      <div className="space-y-4">
        {updated && <StatusNotice status={updated} />}
        {request.removed_at && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
            This request has been removed from normal CRM views.
          </div>
        )}
        {request.clients?.removed_at && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
            The linked customer is removed from normal CRM views, but this request is still available.
          </div>
        )}
        <RequestDetail request={request} backHref="/admin/requests" clientHref={`/admin/clients/${request.client_id}`} statusReturnTo={`/admin/requests/${request.id}`} templates={templates} />
        <AvailabilityOfferPanel request={request} slots={commerce.slots} offers={commerce.offers} canManageAvailability templates={templates} />
        <DepositPanel request={request} payments={commerce.payments} returnTo={`/admin/requests/${request.id}`} />
        <RequestActivityTimeline activity={activity} />
        <RequestAssignmentControl requestId={request.id} currentPromoterId={request.promoter_id} promoters={eligiblePromoters} />
        {!request.removed_at && <RemoveRecordPanel recordType="request" recordId={request.id} label="request" />}
      </div>
    </AppShell>
  );
}

async function safePanelData<T>(promise: Promise<T>, fallback: T) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

function parseStatus(value?: string): RequestStatus | null {
  const allowed: RequestStatus[] = ["NEW", "CONTACTED", "PENDING", "CONFIRMED", "ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"];
  return allowed.includes(value as RequestStatus) ? value as RequestStatus : null;
}

function StatusNotice({ status }: Readonly<{ status: RequestStatus }>) {
  const label = status === "ARRIVED" ? "Completed and archived" : status === "CANCELLED" ? "Archived" : formatEnum(status);
  return <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Booking updated: {label}.</div>;
}
