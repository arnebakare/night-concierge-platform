import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEnum } from "@/lib/utils";
import type { Club, Profile, RequestStatus, RequestType } from "@/lib/types";

const statuses: RequestStatus[] = ["NEW", "CONTACTED", "PENDING", "CONFIRMED", "ARRIVED", "NO_SHOW", "DECLINED", "CANCELLED"];
const types: RequestType[] = ["GUESTLIST", "TABLE", "VIP_SERVICE", "GENERAL"];

export function RequestFilters({
  action,
  values,
  clubs = [],
  promoters = []
}: Readonly<{ action: string; values: { status?: string; type?: string; date?: string; q?: string; club?: string; promoter?: string }; clubs?: Club[]; promoters?: Profile[] }>) {
  return (
    <form action={action} className="mb-4 rounded-lg border border-champagne-700/40 bg-card/80 p-3">
      <div className="request-filter-grid grid gap-3 md:grid-cols-3 xl:grid-cols-[1.4fr_repeat(5,1fr)_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-champagne-300" />
          <Input name="q" defaultValue={values.q ?? ""} placeholder="Search client, club, phone..." className="pl-9" />
        </div>
        <select
          name="status"
          defaultValue={values.status ?? ""}
          className="h-12 rounded-md border bg-input px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All statuses</option>
          {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </select>
        <select
          name="type"
          defaultValue={values.type ?? ""}
          className="advanced-only h-12 rounded-md border bg-input px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All types</option>
          {types.map((type) => <option key={type} value={type}>{formatEnum(type)}</option>)}
        </select>
        <Input name="date" type="date" defaultValue={values.date ?? ""} />
        {clubs.length > 0 && <select name="club" defaultValue={values.club ?? ""} className="advanced-only h-12 rounded-md border bg-input px-3 text-sm"><option value="">All clubs</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select>}
        {promoters.length > 0 && <select name="promoter" defaultValue={values.promoter ?? ""} className="advanced-only h-12 rounded-md border bg-input px-3 text-sm"><option value="">All promoters</option>{promoters.map((promoter) => <option key={promoter.id} value={promoter.id}>{promoter.name ?? promoter.email}</option>)}</select>}
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Button type="submit" className="w-full">Filter</Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href={action}>Clear</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}

function statusLabel(status: RequestStatus) {
  if (status === "ARRIVED") return "Completed";
  if (status === "CANCELLED") return "Archived";
  return formatEnum(status);
}
