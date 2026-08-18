import { cn, formatEnum } from "@/lib/utils";
import type { RequestStatus } from "@/lib/types";

const tone: Record<RequestStatus, string> = {
  NEW: "border-champagne-600/35 bg-champagne-300/20 text-champagne-800",
  CONTACTED: "border-sky-200 bg-sky-50 text-sky-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ARRIVED: "border-green-200 bg-green-50 text-green-700",
  NO_SHOW: "border-zinc-200 bg-zinc-100 text-zinc-600",
  DECLINED: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-zinc-200 bg-zinc-100 text-zinc-600"
};

export function RequestStatusBadge({ status }: Readonly<{ status: RequestStatus }>) {
  return <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", tone[status])}>{statusLabel(status)}</span>;
}

function statusLabel(status: RequestStatus) {
  if (status === "ARRIVED") return "COMPLETED";
  if (status === "CANCELLED") return "ARCHIVED";
  return formatEnum(status);
}
