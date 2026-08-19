import { CalendarDays, Clock, Euro, Users } from "lucide-react";
import { RequestStatusBadge } from "@/components/request/request-status-badge";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { fullDateLabel } from "@/lib/concierge/requests";
import type { ClientBookingHistoryItem } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

export function ClientBookingHistory({ history }: Readonly<{ history: ClientBookingHistoryItem[] }>) {
  const confirmed = history.filter((item) => ["CONFIRMED", "ARRIVED"].includes(item.status)).length;
  const guests = history.reduce((total, item) => total + item.guest_count, 0);
  const last = history[0];

  return (
    <LuxuryCard className="client-history space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-champagne-300">Portfolio</p>
          <h2 className="mt-1 text-lg font-semibold">Booking history</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {history.length} request{history.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 bg-white text-ink-950">
        <Metric label="Last" value={last ? fullDateLabel(last.requested_date) : "None"} />
        <Metric label="Confirmed" value={String(confirmed)} />
        <Metric label="Guests" value={String(guests)} />
      </div>

      <div className="compact-list grid gap-2">
        {history.length ? history.slice(0, 10).map((item) => <HistoryRow key={item.id} item={item} />) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            No bookings on this customer portfolio yet.
          </div>
        )}
      </div>
    </LuxuryCard>
  );
}

function HistoryRow({ item }: Readonly<{ item: ClientBookingHistoryItem }>) {
  return (
    <div className="client-row grid gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-ink-950 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{item.clubs?.name ?? "Venue"}</p>
          <RequestStatusBadge status={item.status} />
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{formatEnum(item.request_type)} · {item.promoter?.name ?? item.promoter?.email ?? "Unassigned"}</p>
      </div>
      <div className="grid grid-cols-4 gap-1 text-xs text-slate-500 md:min-w-[360px]">
        <Fact icon={CalendarDays} value={fullDateLabel(item.requested_date)} />
        <Fact icon={Users} value={`${item.guest_count}`} />
        <Fact icon={Clock} value={item.arrival_time ?? "TBC"} />
        <Fact icon={Euro} value={item.budget ?? "-"} />
      </div>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0 border-l border-slate-200 p-2.5 first:border-l-0">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function Fact({ icon: Icon, value }: Readonly<{ icon: typeof CalendarDays; value: string }>) {
  return (
    <span className="flex min-w-0 items-center gap-1 rounded-md bg-slate-50 px-2 py-1.5">
      <Icon className="size-3 shrink-0 text-champagne-700" />
      <span className="truncate">{value}</span>
    </span>
  );
}
