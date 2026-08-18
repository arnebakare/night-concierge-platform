import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AvailabilityOfferPanel } from "@/components/request/availability-offer-panel";
import { RequestDetail } from "@/components/request/request-detail";
import { requireProfile } from "@/lib/auth";
import { getRequestCommerce, getRequestDetail } from "@/lib/data/app";

export default async function RequestDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const [profile, { id }] = await Promise.all([requireProfile(["PROMOTER", "SUPER_ADMIN"]), params]);
  const request = await getRequestDetail(id);

  if (!request) notFound();
  const commerce = await getRequestCommerce(request);

  return (
    <AppShell profile={profile} title="Request detail" eyebrow="Guestlist">
      <div className="space-y-4">
        <RequestDetail request={request} backHref="/requests" clientHref={`/clients/${request.client_id}`} />
        <AvailabilityOfferPanel request={request} slots={commerce.slots} offers={commerce.offers} canManageAvailability={profile.role === "SUPER_ADMIN"} />
      </div>
    </AppShell>
  );
}
