import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { RequestCard } from "@/components/request/request-card";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getRequestDetail } from "@/lib/data/app";
import { Button } from "@/components/ui/button";
import { cancelClientRequest } from "@/lib/actions/request-actions";

export default async function ClientRequestDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const profile = await requireProfile(["CLIENT", "SUPER_ADMIN"]);
  const { id } = await params;
  const request = await getRequestDetail(id);
  if (!request) notFound();
  const canCancel = ["NEW", "CONTACTED", "PENDING", "CONFIRMED"].includes(request.status);
  return <AppShell profile={profile} title="Request details" eyebrow="Client"><RequestCard request={request} /><LuxuryCard className="mt-4"><p className="font-semibold">Concierge update</p><p className="mt-2 text-sm text-muted-foreground">Your request is {request.status.toLowerCase().replaceAll("_", " ")}. We will contact you using the phone number provided if anything else is needed.</p>{canCancel && profile.role === "CLIENT" && <form action={cancelClientRequest} className="mt-4"><input type="hidden" name="requestId" value={request.id} /><Button type="submit" variant="outline" className="w-full">Cancel request</Button></form>}</LuxuryCard></AppShell>;
}
