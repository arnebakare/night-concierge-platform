import Link from "next/link";
import { CalendarDays, CheckCircle2, MessageCircle, Sparkles, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import type { ConciergeRequest } from "@/lib/types";
import { isTemporaryPhone } from "@/lib/sales/funnel";

export function RequestListSummary({
  requests,
  baseHref,
  showLeadAction = true
}: Readonly<{ requests: ConciergeRequest[]; baseHref: string; showLeadAction?: boolean }>) {
  const today = dateString(0);
  const tomorrow = dateString(1);
  const needsReply = requests.filter((request) => ["NEW", "CONTACTED", "PENDING"].includes(request.status)).length;
  const confirmed = requests.filter((request) => request.status === "CONFIRMED").length;
  const missingContact = requests.filter((request) => !request.clients?.phone || isTemporaryPhone(request.clients.phone)).length;
  const tonightGuests = requests
    .filter((request) => request.requested_date === today)
    .reduce((sum, request) => sum + request.guest_count, 0);

  return (
    <LuxuryCard className="mb-4 space-y-4 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-champagne-300">Tonight cockpit</p>
          <h2 className="mt-1 font-serif text-2xl">What needs attention</h2>
        </div>
        {showLeadAction && (
          <Button asChild>
            <Link href="/requests/lead">
              <MessageCircle className="size-4" /> Paste lead
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric icon={Sparkles} label="Need reply" value={String(needsReply)} />
        <Metric icon={CheckCircle2} label="Confirmed" value={String(confirmed)} />
        <Metric icon={CalendarDays} label="Tonight guests" value={String(tonightGuests)} />
        <Metric icon={UserRoundPlus} label="Missing contact" value={String(missingContact)} muted={missingContact === 0} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
        <QuickLink href={baseHref} label="Live" />
        <QuickLink href={`${baseHref}?date=${today}`} label="Today" />
        <QuickLink href={`${baseHref}?date=${tomorrow}`} label="Tomorrow" />
        <QuickLink href={`${baseHref}?status=NEW`} label="New" />
        <QuickLink href={`${baseHref}?status=CONFIRMED`} label="Confirmed" />
        <QuickLink href={`${baseHref}?status=ARRIVED`} label="Archive" />
      </div>
    </LuxuryCard>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  muted
}: Readonly<{ icon: typeof Sparkles; label: string; value: string; muted?: boolean }>) {
  return (
    <div className="rounded-md border border-champagne-700/25 bg-ink-900/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={muted ? "size-4 text-muted-foreground" : "size-4 text-champagne-300"} />
      </div>
      <p className="mt-2 font-serif text-3xl leading-none">{value}</p>
    </div>
  );
}

function QuickLink({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link
      href={href}
      className="whitespace-nowrap rounded-md border border-champagne-700/30 bg-secondary px-3 py-2 text-muted-foreground transition hover:border-champagne-300/60 hover:text-foreground"
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
