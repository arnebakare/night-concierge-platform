import { CalendarDays, Clock, MessageCircle, Users, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { RequestStatusBadge } from "@/components/request/request-status-badge";
import type { ConciergeRequest } from "@/lib/types";
import { isTemporaryPhone, nextSalesAction } from "@/lib/sales/funnel";
import { formatEnum } from "@/lib/utils";

export function RequestCard({ request, href }: Readonly<{ request: ConciergeRequest; href?: string }>) {
  const service = request.message?.match(/^Selected service:\s*(.+)$/m)?.[1];
  const missingContact = !request.clients?.phone || isTemporaryPhone(request.clients.phone);
  const card = (
    <LuxuryCard className="group relative overflow-hidden p-0 transition hover:border-champagne-300/55 hover:bg-card">
      <div className="absolute inset-y-0 left-0 w-1 bg-champagne-300/70" />
      <div className="space-y-3 p-4 pl-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold leading-tight">{request.clients?.name ?? "Guest"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{request.clubs?.name ?? "Club"} · {service ?? formatEnum(request.request_type)}</p>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <Fact icon={CalendarDays} label={dateLabel(request.requested_date)} value={request.requested_date.slice(5)} />
        <Fact icon={Users} label="Guests" value={String(request.guest_count)} />
        <Fact icon={Clock} label="Arrival" value={request.arrival_time ?? "TBC"} />
      </div>
      {request.message && !service && <p className="line-clamp-3 rounded-md bg-secondary/80 p-3 text-sm leading-relaxed text-muted-foreground">{request.message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-champagne-700/30 pt-3 text-xs">
        <span className="rounded-full bg-champagne-300/10 px-2.5 py-1 text-champagne-100">{nextSalesAction(request.status)}</span>
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
    <Link href={href} className="block transition active:scale-[0.99]">
      {card}
    </Link>
  );
}

function Fact({
  icon: Icon,
  label,
  value
}: Readonly<{ icon: typeof CalendarDays; label: string; value: string }>) {
  return (
    <div className="rounded-md bg-ink-900/55 p-2 text-muted-foreground">
      <p className="flex items-center gap-1 text-[11px]"><Icon className="size-3.5 text-champagne-300" />{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function dateLabel(value: string) {
  const today = dateString(0);
  if (value === today) return "Today";
  if (value === dateString(1)) return "Tomorrow";
  return "Date";
}

function dateString(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
