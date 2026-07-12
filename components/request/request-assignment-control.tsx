import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LuxuryCard } from "@/components/ui/luxury-card";
import { assignRequestPromoter } from "@/lib/actions/management-actions";
import type { Profile } from "@/lib/types";

export function RequestAssignmentControl({
  requestId,
  currentPromoterId,
  promoters
}: Readonly<{ requestId: string; currentPromoterId?: string | null; promoters: Profile[] }>) {
  return (
    <LuxuryCard>
      <form action={assignRequestPromoter} className="space-y-3">
        <input type="hidden" name="requestId" value={requestId} />
        <div className="flex items-center gap-2">
          <UserPlus className="size-5 text-champagne-300" />
          <h2 className="font-serif text-2xl">Assign promoter</h2>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <select
            name="promoterId"
            defaultValue={currentPromoterId ?? ""}
            className="h-12 rounded-md border bg-input px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Unassigned</option>
            {promoters.map((promoter) => (
              <option key={promoter.id} value={promoter.id}>
                {promoter.name ?? promoter.email}
              </option>
            ))}
          </select>
          <Button type="submit">Assign</Button>
        </div>
      </form>
    </LuxuryCard>
  );
}
