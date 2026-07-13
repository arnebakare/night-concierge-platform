import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, MessageCircle, Phone, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { SalesAssistantPanel } from "@/components/request/sales-assistant-panel";
import { RequestStatusBadge } from "@/components/request/request-status-badge";
import { RequestStatusControl } from "@/components/request/request-status-control";
import { updateRequestClientContact } from "@/lib/actions/management-actions";
import type { ConciergeRequest } from "@/lib/types";
import { isTemporaryPhone, whatsAppHref } from "@/lib/sales/funnel";
import { formatEnum } from "@/lib/utils";

export function RequestDetail({
  request,
  backHref,
  clientHref
}: Readonly<{ request: ConciergeRequest; backHref: string; clientHref: string }>) {
  return (
    <div className="space-y-4">
      <Button asChild variant="secondary" size="sm">
        <Link href={backHref}>
          <ArrowLeft className="size-4" /> Back
        </Link>
      </Button>

      <LuxuryCard className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-champagne-300">{formatEnum(request.source)}</p>
            <h2 className="mt-2 font-serif text-3xl">{request.clients?.name ?? "Guest"}</h2>
            <p className="mt-1 text-muted-foreground">{request.clubs?.name ?? "Club"} · {formatEnum(request.request_type)}</p>
          </div>
          <RequestStatusBadge status={request.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Fact icon={CalendarDays} label="Date" value={request.requested_date} />
          <Fact icon={Clock} label="Arrival" value={request.arrival_time ?? "TBC"} />
          <Fact icon={Users} label="Guests" value={String(request.guest_count)} />
          <Fact icon={MessageCircle} label="Budget" value={request.budget ?? "Not set"} />
        </div>

        <RequestStatusControl requestId={request.id} status={request.status} returnTo={backHref} />
      </LuxuryCard>

      <SalesAssistantPanel request={request} returnTo={backHref} />

      <LuxuryCard className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-champagne-300">Client</p>
            <h3 className="mt-2 text-xl font-semibold">{request.clients?.name ?? "Guest"}</h3>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-4 text-champagne-300" />
              {visiblePhone(request.clients?.phone) || "No phone yet"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="secondary" size="sm">
              <a href={phoneHref(request.clients?.phone)}>
                <Phone className="size-4" /> Call
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={whatsAppHref(request.clients?.phone)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href={clientHref}>
                <User className="size-4" /> Profile
              </Link>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          VIP {request.clients?.vip_level ?? "STANDARD"} · {formatEnum(request.clients?.status ?? "NORMAL")}
        </p>
        <details className="rounded-md border border-champagne-700/30 bg-ink-900/50 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-champagne-100">Add or fix contact details</summary>
          <form action={updateRequestClientContact} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="requestId" value={request.id} />
            <input type="hidden" name="clientId" value={request.client_id} />
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" defaultValue={request.clients?.name ?? ""} placeholder="Client name" required />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input name="phone" defaultValue={visiblePhone(request.clients?.phone)} placeholder="+34..." required />
            </div>
            <Button type="submit" className="sm:col-span-2">Save contact</Button>
          </form>
        </details>
      </LuxuryCard>

      <LuxuryCard>
        <p className="text-sm uppercase tracking-[0.24em] text-champagne-300">Message</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{request.message ?? "No client message added."}</p>
        {request.internal_summary && (
          <p className="mt-3 rounded-md bg-secondary p-3 text-sm text-muted-foreground">{request.internal_summary}</p>
        )}
      </LuxuryCard>
    </div>
  );
}

function phoneHref(phone?: string) {
  if (isTemporaryPhone(phone)) return "#";
  const digits = phone?.replace(/[^\d+]/g, "") || "";
  return digits ? `tel:${digits}` : "#";
}

function visiblePhone(phone?: string | null) {
  return isTemporaryPhone(phone) ? "" : phone ?? "";
}

function Fact({
  icon: Icon,
  label,
  value
}: Readonly<{ icon: typeof CalendarDays; label: string; value: string }>) {
  return (
    <div className="rounded-md bg-ink-900/60 p-3">
      <Icon className="size-4 text-champagne-300" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
