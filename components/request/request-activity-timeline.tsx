import { CheckCircle2, Circle, MessageCircle, RotateCw, XCircle } from "lucide-react";
import { LuxuryCard } from "@/components/ui/luxury-card";
import type { RequestActivityItem } from "@/lib/data/app";

export function RequestActivityTimeline({ activity }: Readonly<{ activity: RequestActivityItem[] }>) {
  return (
    <LuxuryCard className="request-activity space-y-3 bg-white text-ink-950">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-champagne-700">Follow-up history</p>
        <h3 className="mt-1 text-base font-semibold">What happened</h3>
      </div>
      <div className="grid gap-2">
        {activity.length ? activity.map((item) => <ActivityRow key={item.id} item={item} />) : (
          <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            No follow-up activity yet.
          </p>
        )}
      </div>
    </LuxuryCard>
  );
}

function ActivityRow({ item }: Readonly<{ item: RequestActivityItem }>) {
  const Icon = iconFor(item);
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 rounded-md border border-slate-200 bg-slate-50 p-2.5">
      <span className={iconClass(item.tone)}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold text-slate-950">{item.label}</span>
          <span className="shrink-0 text-[11px] text-slate-500">{timeLabel(item.created_at)}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-600">{item.detail}</span>
      </span>
    </div>
  );
}

function iconFor(item: RequestActivityItem) {
  if (item.tone === "good") return CheckCircle2;
  if (item.tone === "bad") return XCircle;
  if (item.type === "whatsapp") return MessageCircle;
  if (item.type === "status") return RotateCw;
  return Circle;
}

function iconClass(tone: RequestActivityItem["tone"]) {
  const base = "flex size-8 items-center justify-center rounded-full border bg-white";
  if (tone === "good") return `${base} border-emerald-200 text-emerald-700`;
  if (tone === "bad") return `${base} border-red-200 text-red-700`;
  if (tone === "warning") return `${base} border-amber-200 text-amber-700`;
  return `${base} border-slate-200 text-slate-500`;
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
