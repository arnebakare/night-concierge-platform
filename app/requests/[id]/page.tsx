import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { RequestDetail } from "@/components/request/request-detail";
import { requireProfile } from "@/lib/auth";
import { getRequestDetail } from "@/lib/data/app";

export default async function RequestDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const [profile, { id }] = await Promise.all([requireProfile(["PROMOTER", "SUPER_ADMIN"]), params]);
  const request = await getRequestDetail(id);

  if (!request) notFound();

  return (
    <AppShell profile={profile} title="Request detail" eyebrow="Guestlist">
      <RequestDetail request={request} backHref="/requests" clientHref={`/clients/${request.client_id}`} />
    </AppShell>
  );
}
