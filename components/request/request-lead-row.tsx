import { ArrowRight, CalendarDays, Clock, MessageCircle, Sparkles, Users, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { RequestStatusBadge } from "@/components/request/request-status-badge";
import { StatusSubmitButton } from "@/components/request/status-submit-button";
import { updateRequestStatus } from "@/lib/actions/management-actions";
import { compactDate, isMissingRequestContact, requestDateRangeLabel, requestFreshnessLabel, requestPriority, requestServiceLabel, requestValueSignal, whatsappContactHref } from "@/lib/concierge/requests";
import type { ConciergeRequest, RequestStatus } from "@/lib/types";

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
  const service = requestServiceLabel(request);
  const actions = showActions ? easyActions[request.status] ?? [] : [];
  const priority = requestPriority(request);
  const missingContact = isMissingRequestContact(request);
  const valueSignal = requestValueSignal(request);
  const replyHref = whatsappContactHref(request.clients?.phone, buildQuickReply(request));

  return (
    <div className="lead-row rounded-lg border border-slate-200 bg-white text-ink-950 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="grid gap-2 p-2.5 md:grid-cols-[minmax(220px,1.05fr)_minmax(240px,1fr)_auto] md:items-center md:px-3 md:py-2">
        <Link href={href} className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={priorityBarClass(priority.tone)} aria-hidden="true" />
            <div className="min-w-0">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:block">
                <p className="min-w-0 truncate text-[15px] font-semibold leading-tight text-slate-950">{request.clients?.name ?? "Guest"}</p>
                <div className="shrink-0 md:hidden">
                  <RequestStatusBadge status={request.status} />
                </div>
              </div>
              <p className="mt-0.5 truncate text-[13px] text-slate-600">{request.clubs?.name ?? "Club"} · {service}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{request.promoter?.name ?? "Unassigned"} · {requestFreshnessLabel(request.created_at)}</p>
            </div>
          </div>
        </Link>

        <Link href={href} className="flex items-center gap-2 pl-3 text-[13px] font-medium text-slate-600 md:hidden">
          <span>{compactDate(request.requested_date)}</span>
          <span className="text-slate-300">·</span>
          <span>{request.guest_count} guests</span>
          <span className="text-slate-300">·</span>
          <span>{request.arrival_time ?? "TBC"}</span>
        </Link>

        <Link href={href} className="hidden grid-cols-3 gap-1 text-xs text-slate-500 md:grid">
          <Fact icon={CalendarDays} label="Date" value={requestDateRangeLabel(request)} />
          <Fact icon={Users} label="Guests" value={String(request.guest_count)} />
          <Fact icon={Clock} label="Arrival" value={request.arrival_time ?? "TBC"} />
        </Link>

        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:justify-end md:gap-2">
          <div className="hidden md:block"><RequestStatusBadge status={request.status} /></div>
          <span className={priorityPillClass(priority.tone)}>{priority.label}</span>
          {valueSignal && <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 sm:inline-flex"><Sparkles className="size-3" />{valueSignal}</span>}
          {missingContact ? (
            <Link href={href} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-amber-50 px-2.5 text-xs font-semibold text-amber-800">
              <UserRoundPlus className="size-3.5" /> Contact
            </Link>
          ) : (
            <a href={replyHref} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200">
              <MessageCircle className="size-3.5" /> WhatsApp
            </a>
          )}
          {actions.map((action) => (
            <form action={updateRequestStatus} key={action.status} className="min-w-0">
              <input type="hidden" name="requestId" value={request.id} />
              {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
              <StatusSubmitButton className="w-full" value={action.status} label={action.label} pendingLabel="Saving" variant={action.variant ?? "default"} size="sm" />
            </form>
          ))}
          {!actions.length && (
            <Link href={href} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200">
              Open <ArrowRight className="size-3.5" />
            </Link>
          )}
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
    <div className="min-w-0 border-l border-slate-200 px-2 first:border-l-0">
      <p className="flex items-center gap-1 text-[11px]"><Icon className="size-3 text-champagne-700" />{label}</p>
      <p className="truncate text-sm font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function priorityBarClass(tone: ReturnType<typeof requestPriority>["tone"]) {
  if (tone === "hot") return "h-9 w-1 rounded-full bg-rose-400";
  if (tone === "warning") return "h-9 w-1 rounded-full bg-amber-400";
  if (tone === "success") return "h-9 w-1 rounded-full bg-emerald-400";
  return "h-9 w-1 rounded-full bg-slate-300";
}

function priorityPillClass(tone: ReturnType<typeof requestPriority>["tone"]) {
  const base = "hidden rounded-full px-2 py-1 text-xs font-medium md:inline-flex";
  if (tone === "hot") return `${base} bg-rose-50 text-rose-700`;
  if (tone === "warning") return `${base} bg-amber-50 text-amber-700`;
  if (tone === "success") return `${base} bg-emerald-50 text-emerald-700`;
  return `${base} bg-slate-100 text-slate-600`;
}

function buildQuickReply(request: ConciergeRequest) {
  const firstName = request.clients?.name?.split(" ").filter(Boolean)[0] ?? "";
  const clubName = request.clubs?.name ?? "the venue";
  const date = requestDateRangeLabel(request);
  return `Hi ${firstName || "there"}, I am checking ${clubName} for ${date} for ${request.guest_count} guests and will come back shortly.`;
}
