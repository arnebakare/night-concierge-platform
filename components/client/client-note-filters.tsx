import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatEnum } from "@/lib/utils";

const visibilities = ["GLOBAL", "CLUB_ONLY", "MANAGER_ONLY", "PRIVATE_TO_AUTHOR"];
const noteTypes = ["PREFERENCE", "SPENDING", "BEHAVIOR", "RELIABILITY", "GUESTLIST", "WARNING", "BLOCKED", "INTERNAL"];

export function ClientNoteFilters({
  action,
  values
}: Readonly<{ action: string; values: { visibility?: string; type?: string } }>) {
  return (
    <form action={action} className="grid gap-2 rounded-lg border border-champagne-700/40 bg-card/80 p-3 md:grid-cols-[1fr_1fr_auto]">
      <select name="visibility" defaultValue={values.visibility ?? ""} className="h-11 rounded-md border bg-input px-3 text-sm text-foreground">
        <option value="">All visibility</option>
        {visibilities.map((item) => <option key={item} value={item}>{formatEnum(item)}</option>)}
      </select>
      <select name="type" defaultValue={values.type ?? ""} className="h-11 rounded-md border bg-input px-3 text-sm text-foreground">
        <option value="">All note types</option>
        {noteTypes.map((item) => <option key={item} value={item}>{formatEnum(item)}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2 md:flex">
        <Button type="submit" variant="secondary">Filter</Button>
        <Button asChild variant="secondary"><Link href={action}>Clear</Link></Button>
      </div>
    </form>
  );
}
