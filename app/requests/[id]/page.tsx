import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AvailabilityOfferPanel } from "@/components/request/availability-offer-panel";
import { RequestDetail } from "@/components/request/request-detail";
import { requireProfile } from "@/lib/auth";
import { getRequestCommerce, getRequestDetail } from "@/lib/data/app";
import type { RequestStatus } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

export default async function RequestDetailPage({
  params,
  searchParams
}: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ updated?: string }> }>) {
  const [profile, { id }, query] = await Promise.all([requireProfile(["PROMOTER", "SUPER_ADMIN"]), params, searchParams]);
  const request = await getRequestDetail(id);

  if (!request) notFound();
  const commerce = await getRequestCommerce(request);
  const updated = parseStatus(query.updated);

  return (
    <AppShell profile={profile} title="Request detail" eyebrow="Guestlist">
      <div className="space-y-4">
        {updated && <StatusNotice status={updated} />}
        <RequestDetail request={request} backHref="/requests" clientHref={`/clients/${request.client_id}`} statusReturnTo={`/requests/${request.id}`} />
        <AvailabilityOfferPanel request={request} slots={commerce.slots} offers={commerce.offers} canManageAvailability={profile.role === "SUPER_ADMIN"} />
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
