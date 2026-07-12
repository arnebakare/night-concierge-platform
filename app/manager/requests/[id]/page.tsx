import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { RequestAssignmentControl } from "@/components/request/request-assignment-control";
import { RequestDetail } from "@/components/request/request-detail";
import { requireProfile } from "@/lib/auth";
import { getRequestDetail, getTeamPromoters, getUsersForAdmin } from "@/lib/data/app";

export default async function ManagerRequestDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const [profile, { id }] = await Promise.all([requireProfile(["PROMOTER_MANAGER", "SUPER_ADMIN"]), params]);
  const [request, promoters] = await Promise.all([getRequestDetail(id), profile.role === "SUPER_ADMIN" ? getUsersForAdmin({ role: "PROMOTER", active: "active" }) : getTeamPromoters(profile.id)]);

  if (!request) notFound();

  return (
    <AppShell profile={profile} title="Request detail" eyebrow="Manager inbox">
      <div className="space-y-4">
        <RequestDetail request={request} backHref="/manager/requests" clientHref={`/manager/clients/${request.client_id}`} />
        <RequestAssignmentControl requestId={request.id} currentPromoterId={request.promoter_id} promoters={promoters} />
      </div>
    </AppShell>
  );
}
