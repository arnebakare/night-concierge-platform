import { Button } from "@/components/ui/button";
import { updateRequestStatus } from "@/lib/actions/management-actions";
import type { RequestStatus } from "@/lib/types";
import { formatEnum } from "@/lib/utils";

const statuses: RequestStatus[] = ["NEW", "CONTACTED", "PENDING", "CONFIRMED", "ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"];

const easyActions: Partial<Record<RequestStatus, { status: RequestStatus; label: string; variant?: "default" | "secondary" }[]>> = {
  NEW: [
    { status: "CONTACTED", label: "Contacted", variant: "secondary" },
    { status: "CONFIRMED", label: "Confirm" }
  ],
  CONTACTED: [{ status: "CONFIRMED", label: "Confirm" }],
  PENDING: [{ status: "CONFIRMED", label: "Confirm" }],
  CONFIRMED: [
    { status: "ARRIVED", label: "Arrived" },
    { status: "NO_SHOW", label: "No show", variant: "secondary" }
  ]
};

export function RequestStatusControl({ requestId, status }: Readonly<{ requestId: string; status: RequestStatus }>) {
  const actions = easyActions[status] ?? [];

  return (
    <>
      {actions.length > 0 && (
        <div className="easy-only mt-3 grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <form action={updateRequestStatus} key={action.status}>
              <input type="hidden" name="requestId" value={requestId} />
              <Button className="w-full" type="submit" name="status" value={action.status} variant={action.variant ?? "default"}>
                {action.label}
              </Button>
            </form>
          ))}
        </div>
      )}
      <form action={updateRequestStatus} className="advanced-only mt-3 flex gap-2">
        <input type="hidden" name="requestId" value={requestId} />
        <select
          name="status"
          defaultValue={status}
          className="min-h-11 flex-1 rounded-md border border-champagne-700/40 bg-input px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {formatEnum(item)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Update
        </Button>
      </form>
    </>
  );
}
