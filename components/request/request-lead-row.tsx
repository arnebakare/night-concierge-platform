import { CalendarDays, Clock, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RequestStatusBadge } from "@/components/request/request-status-badge";
import { updateRequestStatus } from "@/lib/actions/management-actions";
import { nextSalesAction } from "@/lib/sales/funnel";
import type { ConciergeRequest, RequestStatus } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const easyActions: Partial<Record<RequestStatus, { status: RequestStatus; label: string; variant?: "default" | "secondary" }[]>> = {
  NEW: [
    { status: "CONTACTED", label: "Contacted", variant: "secondary" },
    { status: "CONFIRMED", label: "Confirm" }
  ],
  CONTACTED: [{ status: "CONFIRMED", label: "Confirm" }],
  PENDING: [{ status: "CONFIRMED", label: "Confirm" }],
  CONFIRMED: [{ status: "ARRIVED", label: "Complete" }]
};

export function RequestLeadRow({
  request,
  href,
  returnTo,
  showActions = true
}: Readonly<{ request: ConciergeRequest; href: string; returnTo?: string; showActions?: boolean }>) {
  const service = request.message?.match(/^Selected service:\s*(.+)$/m)?.[1];
  const actions = showActions ? easyActions[request.status] ?? [] : [];

  return (
    <div className="lead-row rounded-lg border border-champagne-700/35 bg-card shadow-sm transition hover:border-champagne-300/60">
      <div className="grid gap-2 p-2.5 md:grid-cols-[minmax(180px,1.15fr)_minmax(220px,1fr)_auto] md:items-center md:p-3">
        <Link href={href} className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-8 w-1 rounded-full bg-champagne-300" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 md:block">
                <p className="min-w-0 truncate text-sm font-semibold text-foreground md:text-base">{request.clients?.name ?? "Guest"}</p>
                <div className="shrink-0 md:hidden"><RequestStatusBadge status={request.status} /></div>
              </div>
              <p className="truncate text-xs text-muted-foreground">{request.clubs?.name ?? "Club"} · {service ?? formatEnum(request.request_type)}</p>
            </div>
          </div>
        </Link>

        <Link href={href} className="flex items-center gap-2 pl-3 text-xs text-muted-foreground md:hidden">
          <span>{request.requested_date.slice(5)}</span>
          <span>·</span>
          <span>{request.guest_count} guests</span>
          <span>·</span>
          <span>{request.arrival_time ?? "TBC"}</span>
        </Link>

        <Link href={href} className="hidden grid-cols-3 gap-1.5 text-xs text-muted-foreground md:grid">
          <Fact icon={CalendarDays} label="Date" value={request.requested_date.slice(5)} />
          <Fact icon={Users} label="Guests" value={String(request.guest_count)} />
          <Fact icon={Clock} label="Arrival" value={request.arrival_time ?? "TBC"} />
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-1.5 md:gap-2">
          <div className="hidden md:block"><RequestStatusBadge status={request.status} /></div>
          <span className="hidden max-w-44 truncate text-xs text-muted-foreground lg:block">{nextSalesAction(request.status)}</span>
          {actions.map((action) => (
            <form action={updateRequestStatus} key={action.status}>
              <input type="hidden" name="requestId" value={request.id} />
              {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
              <Button type="submit" name="status" value={action.status} variant={action.variant ?? "default"} size="sm">
                {action.label}
              </Button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value
}: Readonly<{ icon: typeof CalendarDays; label: string; value: string }>) {
  return (
    <div className="min-w-0 rounded-md bg-secondary px-2 py-1.5">
      <p className="flex items-center gap-1 text-[11px]"><Icon className="size-3 text-champagne-300" />{label}</p>
      <p className="truncate font-semibold text-foreground">{value}</p>
    </div>
  );
}
