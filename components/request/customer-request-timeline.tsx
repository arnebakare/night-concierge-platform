import { CheckCircle2, Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import type { RequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const steps = [
  { key: "NEW", label: "Received", icon: CheckCircle2 },
  { key: "CONTACTED", label: "Host reply", icon: MessageCircle },
  { key: "PENDING", label: "Checking", icon: Clock3 },
  { key: "CONFIRMED", label: "Confirmed", icon: ShieldCheck }
] as const;

const statusIndex: Partial<Record<RequestStatus, number>> = {
  NEW: 0,
  CONTACTED: 1,
  PENDING: 2,
  CONFIRMED: 3,
  ARRIVED: 3
};

export function CustomerRequestTimeline({ status }: Readonly<{ status: RequestStatus }>) {
  const current = statusIndex[status] ?? 0;
  const isClosed = ["CANCELLED", "DECLINED", "NO_SHOW"].includes(status);

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const active = !isClosed && index <= current;
        return (
          <div
            key={step.key}
            className={cn(
              "rounded-xl border px-1.5 py-2 text-center",
              active ? "border-champagne-400/45 bg-champagne-300/12 text-champagne-50" : "border-champagne-700/24 bg-ink-950/42 text-muted-foreground"
            )}
          >
            <Icon className={cn("mx-auto size-4", active ? "text-champagne-300" : "text-muted-foreground")} />
            <p className="mt-1 truncate text-[10px] font-semibold">{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}
