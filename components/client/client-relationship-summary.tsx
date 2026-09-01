import { CalendarDays, CheckCircle2, Clock3, MessageCircle } from "lucide-react";
import { LuxuryCard } from "@/components/ui/luxury-card";
import type { ClientBookingHistoryItem, ClientFollowUpTask, ClientOutreachItem } from "@/lib/types";

export function ClientRelationshipSummary({
  history,
  tasks,
  outreach
}: Readonly<{ history: ClientBookingHistoryItem[]; tasks: ClientFollowUpTask[]; outreach: ClientOutreachItem[] }>) {
  const confirmed = history.filter((item) => ["CONFIRMED", "ARRIVED"].includes(item.status)).length;
  const lastBooking = history[0]?.requested_date ?? null;
  const openTasks = tasks.filter((task) => task.status === "OPEN").length;
  const lastOutreach = outreach[0]?.created_at ?? null;

  return (
    <LuxuryCard className="bg-white text-slate-950">
      <p className="text-xs uppercase tracking-[0.18em] text-champagne-700">At a glance</p>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric icon={CheckCircle2} label="Confirmed" value={String(confirmed)} />
        <Metric icon={CalendarDays} label="Last booking" value={lastBooking ? shortDate(lastBooking) : "None"} />
        <Metric icon={Clock3} label="Open tasks" value={String(openTasks)} />
        <Metric icon={MessageCircle} label="Last care" value={lastOutreach ? shortDate(lastOutreach) : "None"} />
      </div>
    </LuxuryCard>
  );
}

function Metric({ icon: Icon, label, value }: Readonly<{ icon: typeof CalendarDays; label: string; value: string }>) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <Icon className="size-4 text-champagne-700" />
      <p className="mt-2 text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(value.includes("T") ? value : `${value}T12:00:00`));
}
