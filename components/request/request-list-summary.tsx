import Link from "next/link";
import { AlertCircle, CalendarDays, CheckCircle2, MessageCircle, Sparkles, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import type { ConciergeRequest } from "@/lib/types";
import { isMissingRequestContact, requestValueSignal } from "@/lib/concierge/requests";

export function RequestListSummary({
  requests,
  baseHref,
  showLeadAction = true
}: Readonly<{ requests: ConciergeRequest[]; baseHref: string; showLeadAction?: boolean }>) {
  const today = dateString(0);
  const tomorrow = dateString(1);
  const needsReply = requests.filter((request) => ["NEW", "CONTACTED", "PENDING"].includes(request.status)).length;
  const confirmed = requests.filter((request) => request.status === "CONFIRMED").length;
  const missingContact = requests.filter(isMissingRequestContact).length;
  const highIntent = requests.filter((request) => requestValueSignal(request)).length;
  const tonightGuests = requests
    .filter((request) => request.requested_date === today)
    .reduce((sum, request) => sum + request.guest_count, 0);
  const nextAction = missingContact ? "Fix missing contact details first" : needsReply ? "Reply to new leads first" : confirmed ? "Confirmed bookings are ready" : "Inbox is calm";

  return (
    <LuxuryCard className="ops-summary mb-4 overflow-hidden bg-white text-ink-950">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">Live inbox</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">What needs attention</h2>
          <p className="mt-1 text-sm text-slate-500">{nextAction}</p>
        </div>
        {showLeadAction && (
          <Button asChild>
            <Link href="/requests/lead">
              <MessageCircle className="size-4" /> Paste lead
            </Link>
          </Button>
        )}
      </div>

      <div className="ops-metrics grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 md:grid-cols-5 md:divide-y-0">
        <Metric icon={AlertCircle} label="Need reply" value={String(needsReply)} hot={needsReply > 0} />
        <Metric icon={CheckCircle2} label="Confirmed" value={String(confirmed)} />
        <Metric icon={CalendarDays} label="Tonight" value={`${tonightGuests} guests`} />
        <Metric icon={Sparkles} label="High intent" value={String(highIntent)} muted={highIntent === 0} />
        <Metric icon={UserRoundPlus} label="Missing contact" value={String(missingContact)} muted={missingContact === 0} />
      </div>

      <div className="ops-tabs flex gap-2 overflow-x-auto pb-1 text-sm">
        <QuickLink href={baseHref} label="Active" />
        <QuickLink href={`${baseHref}?date=${today}`} label="Today" />
        <QuickLink href={`${baseHref}?date=${tomorrow}`} label="Tomorrow" />
        <QuickLink href={`${baseHref}?status=NEW`} label="New" />
        <QuickLink href={`${baseHref}?status=CONFIRMED`} label="Confirmed" />
        <QuickLink href={`${baseHref}?archived=1`} label="Completed" />
      </div>
    </LuxuryCard>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  muted,
  hot
}: Readonly<{ icon: typeof Sparkles; label: string; value: string; muted?: boolean; hot?: boolean }>) {
  return (
    <div className="metric-cell bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{label}</span>
        <Icon className={muted ? "size-4 text-slate-400" : hot ? "size-4 text-rose-500" : "size-4 text-champagne-700"} />
      </div>
      <p className={hot ? "mt-2 text-2xl font-semibold leading-none tracking-tight text-rose-700" : "mt-2 text-2xl font-semibold leading-none tracking-tight"}>{value}</p>
    </div>
  );
}

function QuickLink({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link
      href={href}
      className="whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:border-champagne-600 hover:text-ink-950"
    >
      {label}
    </Link>
  );
}

function dateString(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
