import { cn, formatEnum } from "@/lib/utils";
import type { RequestStatus } from "@/lib/types";

const tone: Record<RequestStatus, string> = {
  NEW: "border-champagne-300/50 bg-champagne-500/15 text-champagne-100",
  CONTACTED: "border-sky-300/40 bg-sky-500/15 text-sky-100",
  PENDING: "border-amber-300/40 bg-amber-500/15 text-amber-100",
  CONFIRMED: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100",
  ARRIVED: "border-green-300/40 bg-green-500/15 text-green-100",
  NO_SHOW: "border-zinc-300/30 bg-zinc-500/15 text-zinc-100",
  DECLINED: "border-red-300/40 bg-red-500/15 text-red-100",
  CANCELLED: "border-zinc-300/30 bg-zinc-500/15 text-zinc-100"
};

export function RequestStatusBadge({ status }: Readonly<{ status: RequestStatus }>) {
  return <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", tone[status])}>{formatEnum(status)}</span>;
}
