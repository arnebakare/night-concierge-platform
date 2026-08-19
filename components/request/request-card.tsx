import { CalendarDays, Clock, MessageCircle, Users, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { RequestStatusBadge } from "@/components/request/request-status-badge";
import { fullDateLabel, isMissingRequestContact, requestDateLabel, requestPriority, requestServiceLabel, requestValueSignal } from "@/lib/concierge/requests";
import type { ConciergeRequest } from "@/lib/types";
import { nextSalesAction } from "@/lib/sales/funnel";
import { formatEnum } from "@/lib/utils";

export function RequestCard({ request, href, audience = "staff" }: Readonly<{ request: ConciergeRequest; href?: string; audience?: "staff" | "client" }>) {
  const service = requestServiceLabel(request);
  const missingContact = isMissingRequestContact(request);
  const priority = requestPriority(request);
  const valueSignal = requestValueSignal(request);
  const card = (
    <LuxuryCard className="group relative overflow-hidden p-0 transition hover:border-champagne-300/55 hover:bg-card">
      <div className={priorityRailClass(priority.tone)} />
      <div className="space-y-2.5 p-3 pl-4 md:p-3.5 md:pl-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold leading-tight text-champagne-50">{request.clients?.name ?? "Guest"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">{request.clubs?.name ?? "Club"} · {service}</p>
          {audience === "staff" && <p className="mt-0.5 text-[11px] text-muted-foreground">{request.promoter?.name ?? "Unassigned"} · {formatEnum(request.source)}</p>}
        </div>
        <RequestStatusBadge status={request.status} />
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-sm">
        <Fact icon={CalendarDays} label={requestDateLabel(request.requested_date)} value={fullDateLabel(request.requested_date)} />
        <Fact icon={Users} label="Guests" value={String(request.guest_count)} />
        <Fact icon={Clock} label="Arrival" value={request.arrival_time ?? "TBC"} />
      </div>
      {request.message && <p className="line-clamp-2 rounded-md bg-secondary/80 p-2 text-xs leading-relaxed text-muted-foreground md:text-sm">{cleanMessage(request.message)}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-champagne-700/30 pt-2 text-xs">
        <span className="rounded-full bg-champagne-300/10 px-2.5 py-1 text-champagne-100">{audience === "client" ? clientStatusHint(request.status) : nextSalesAction(request.status)}</span>
        {valueSignal && <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-100">{valueSignal}</span>}
        <span className={missingContact ? "flex items-center gap-1 text-amber-100" : "flex items-center gap-1 text-muted-foreground"}>
          {missingContact ? <UserRoundPlus className="size-3" /> : <MessageCircle className="size-3" />}
          {missingContact ? "Add contact" : "Client contact"}
        </span>
      </div>
      </div>
    </LuxuryCard>
  );

  if (!href) return card;

  return (
    <Link href={href} className="request-card block transition active:scale-[0.99]">
      {card}
    </Link>
  );
}

function clientStatusHint(status: ConciergeRequest["status"]) {
  if (status === "NEW") return "Received";
  if (status === "CONTACTED") return "Host contacted";
  if (status === "PENDING") return "Checking availability";
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "ARRIVED") return "Completed";
  if (status === "DECLINED") return "Not available";
  if (status === "CANCELLED") return "Cancelled";
  return "Updated";
}

function Fact({
  icon: Icon,
  label,
  value
}: Readonly<{ icon: typeof CalendarDays; label: string; value: string }>) {
  return (
    <div className="rounded-md bg-ink-900/55 p-1.5 text-muted-foreground md:p-2">
      <p className="flex items-center gap-1 text-[11px]"><Icon className="size-3.5 text-champagne-300" />{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function priorityRailClass(tone: ReturnType<typeof requestPriority>["tone"]) {
  if (tone === "hot") return "absolute inset-y-0 left-0 w-1 bg-rose-400";
  if (tone === "warning") return "absolute inset-y-0 left-0 w-1 bg-amber-400";
  if (tone === "success") return "absolute inset-y-0 left-0 w-1 bg-emerald-400";
  return "absolute inset-y-0 left-0 w-1 bg-champagne-300/70";
}

function cleanMessage(message: string) {
  return message.replace(/^Selected service:\s*.+$/m, "").trim() || message;
}
