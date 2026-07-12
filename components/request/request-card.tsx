import { CalendarDays, Clock, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { RequestStatusBadge } from "@/components/request/request-status-badge";
import type { ConciergeRequest } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

export function RequestCard({ request, href }: Readonly<{ request: ConciergeRequest; href?: string }>) {
  const card = (
    <LuxuryCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{request.clients?.name ?? "Guest"}</p>
          <p className="text-sm text-muted-foreground">{request.clubs?.name ?? "Club"} · {formatEnum(request.request_type)}</p>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><CalendarDays className="size-4 text-champagne-300" />{request.requested_date}</span>
        <span className="flex items-center gap-1"><Users className="size-4 text-champagne-300" />{request.guest_count}</span>
        <span className="flex items-center gap-1"><Clock className="size-4 text-champagne-300" />{request.arrival_time ?? "TBC"}</span>
      </div>
      {request.message && <p className="rounded-md bg-secondary p-3 text-sm text-muted-foreground">{request.message}</p>}
      <div className="flex items-center justify-between border-t border-champagne-700/30 pt-3 text-xs text-muted-foreground">
        <span>{formatEnum(request.source)}</span>
        <span className="flex items-center gap-1"><MessageCircle className="size-3" /> Client contact</span>
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
