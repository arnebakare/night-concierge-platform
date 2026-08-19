import { notFound } from "next/navigation";
import { CalendarDays, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CustomerRequestTimeline } from "@/components/request/customer-request-timeline";
import { RequestStatusBadge } from "@/components/request/request-status-badge";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { requireProfile } from "@/lib/auth";
import { getRequestDetail } from "@/lib/data/app";
import { Button } from "@/components/ui/button";
import { cancelClientRequest } from "@/lib/actions/request-actions";
import { formatEnum } from "@/lib/utils";

export default async function ClientRequestDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const profile = await requireProfile(["CLIENT", "SUPER_ADMIN"]);
  const { id } = await params;
  const request = await getRequestDetail(id);
  if (!request) notFound();
  const canCancel = ["NEW", "CONTACTED", "PENDING", "CONFIRMED"].includes(request.status);
  const service = request.message?.match(/^Selected service:\s*(.+)$/m)?.[1];
  const occasion = request.message?.match(/^Selected occasion:\s*(.+)$/m)?.[1];

  return (
    <AppShell profile={profile} title="Request details" eyebrow="Client">
      <div className="space-y-4">
        <LuxuryCard className="border-champagne-300/35 bg-[radial-gradient(circle_at_top_right,rgba(216,183,100,0.16),transparent_36%),rgba(17,17,19,0.94)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-champagne-300">{request.clubs?.name ?? "Venue"}</p>
              <h2 className="mt-2 font-serif text-3xl">{service ?? formatEnum(request.request_type)}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{statusMessage(request.status)}</p>
            </div>
            <RequestStatusBadge status={request.status} />
          </div>
          <div className="mt-4">
            <CustomerRequestTimeline status={request.status} />
          </div>
        </LuxuryCard>

        <LuxuryCard>
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-champagne-300">Booking summary</p>
          <div className="grid grid-cols-3 gap-2">
            <Fact icon={CalendarDays} label="Date" value={request.requested_date} />
            <Fact icon={Users} label="Guests" value={String(request.guest_count)} />
            <Fact icon={MessageCircle} label="Arrival" value={request.arrival_time ?? "TBC"} />
          </div>
          {occasion && <p className="mt-3 rounded-md bg-secondary/70 p-3 text-sm text-muted-foreground">{occasion}</p>}
          {request.budget && <p className="mt-3 text-sm text-muted-foreground">Budget: <span className="text-champagne-100">{request.budget}</span></p>}
        </LuxuryCard>

        <LuxuryCard>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-champagne-300" />
            <div>
              <p className="font-semibold">Concierge update</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">We will contact you using the phone number provided if anything else is needed.</p>
            </div>
          </div>
          {canCancel && profile.role === "CLIENT" && (
            <form action={cancelClientRequest} className="mt-4">
              <input type="hidden" name="requestId" value={request.id} />
              <Button type="submit" variant="outline" className="w-full">Cancel request</Button>
            </form>
          )}
        </LuxuryCard>
      </div>
    </AppShell>
  );
}

function Fact({ icon: Icon, label, value }: Readonly<{ icon: typeof CalendarDays; label: string; value: string }>) {
  return (
    <div className="rounded-md bg-secondary/70 p-2">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="size-3.5 text-champagne-300" />{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function statusMessage(status: string) {
  if (status === "NEW") return "Your request has been received. A host will review it and come back to you.";
  if (status === "CONTACTED") return "A host has reached out and is checking the details with you.";
  if (status === "PENDING") return "The team is checking availability or final details.";
  if (status === "CONFIRMED") return "Your booking is confirmed. The team will share any final arrival details.";
  if (status === "ARRIVED") return "This booking is completed.";
  if (status === "DECLINED") return "This request could not be confirmed.";
  if (status === "CANCELLED") return "This request has been cancelled.";
  return "The team will update you on WhatsApp.";
}
