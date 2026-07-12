import { CalendarDays, CheckCircle2, Clock, Users } from "lucide-react";
import { LuxuryCard } from "@/components/ui/luxury-card";

export function TonightSummaryCard({
  requests,
  confirmed,
  guests,
  pending
}: Readonly<{ requests: number; confirmed: number; guests: number; pending: number }>) {
  return (
    <LuxuryCard className="bg-gradient-to-br from-card to-champagne-700/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-champagne-300">Tonight</p>
          <h2 className="mt-2 font-serif text-3xl">{requests} requests</h2>
        </div>
        <CalendarDays className="size-8 text-champagne-300" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric icon={CheckCircle2} label="Confirmed" value={confirmed} />
        <Metric icon={Users} label="Guests" value={guests} />
        <Metric icon={Clock} label="Pending" value={pending} />
      </div>
    </LuxuryCard>
  );
}

function Metric({ icon: Icon, label, value }: Readonly<{ icon: typeof Users; label: string; value: number }>) {
  return (
    <div className="rounded-md bg-ink-900/60 p-3">
      <Icon className="size-4 text-champagne-300" />
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
